// completionEngine.ts
import type {
  AIConfiguration,
  Completion,
  CompletionRequest,
  CompletionResponse,
} from '../../types/ai';
import { useAIStore } from '../../stores/aiStore';
import { useEditorStore } from '../../stores/editorStore';
import type { BaseAIProvider } from './providers/baseProvider';
import { buildContext, type ContextResult } from './contextBuilder';
import { providerRegistry } from './providers/providerRegistry';

// Tuned for speed: small LRU-style cache, short TTL
const CACHE_MAX = 50;
const CACHE_TTL = 30_000; // 30 s — stale completions are rarely useful

class CompletionEngine {
  private currentRequest: { id: string; cancel: () => void } | null = null;
  private cache: Map<string, { completion: Completion; timestamp: number }> = new Map();

  constructor() {
    this.startCacheCleaner();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async requestCompletion(
    position: { lineNumber: number; column: number },
    triggerKind: 'auto' | 'manual'
  ): Promise<Completion | null> {
    const aiStore = useAIStore.getState();
    const editorStore = useEditorStore.getState();

    if (!aiStore.config.enabled) return null;

    // Cancel any in-flight request immediately so we don't waste tokens
    this.cancelCurrentRequest();

    const activeTab = editorStore.getActiveTab();
    if (!activeTab) return null;

    const activeFilePath =
      activeTab.path ??
      `untitled://${activeTab.id}/${activeTab.name ?? 'untitled'}`;

    const resolvedModelId = resolveActiveProviderModelId(aiStore.config);

    try {
      const context = await buildContext(
        activeFilePath,
        position,
        aiStore.config.context
      );

      // Fast path: cache hit
      const cacheKey = this.getCacheKey(context, position);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        aiStore.setPendingSuggestion(cached.completion);
        return cached.completion;
      }

      const requestId = this.generateRequestId();
      const request: CompletionRequest = {
        id: requestId,
        provider: aiStore.config.activeProvider,
        modelId: resolvedModelId,
        prompt: {
          type: 'completion',
          prefix: context.prefix,
          suffix: context.suffix,
          language: context.language,
          filePath: context.filePath,
          cursorPosition: { line: position.lineNumber, column: position.column },
          cursorMarker: '$0',
          ...(context.contextFiles.length > 0
            ? { contextFiles: context.contextFiles }
            : {}),
          forceStructuredPrompt: true,
        },
        settings: aiStore.config.completion,
        metadata: {
          timestamp: Date.now(),
          fileLanguage: context.language,
          filePath: context.filePath,
          triggerKind,
          contextTokens: context.estimatedTokens,
        },
      };

      aiStore.setCurrentRequest(request);
      aiStore.setStatus('loading');
      aiStore.addActivityLog({
        type: 'request',
        message: `Requesting completion from ${request.provider}/${request.modelId} (${triggerKind}).`,
      });

      const provider = await providerRegistry.getProvider(request.provider);
      const response = await this.executeCompletion(request, provider);

      return this.handleResponse(response, cacheKey);
    } catch (error) {
      // Ignore cancellation errors — they're intentional
      if (isCancellation(error)) return null;

      console.error('[CompletionEngine]', error);
      aiStore.setStatus('error');
      aiStore.addActivityLog({
        type: 'error',
        message: `Completion failed: ${String(error)}`,
      });
      return null;
    } finally {
      aiStore.setCurrentRequest(null);
    }
  }

  acceptSuggestion(): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;
    if (!suggestion) return null;

    aiStore.recordAcceptedCompletion(
      aiStore.lastCompletion?.usage?.completionTokens ?? 0,
      aiStore.lastCompletion?.usage?.estimatedCost ?? 0
    );
    aiStore.setPendingSuggestion(null);
    return suggestion.insertText;
  }

  rejectSuggestion(): void {
    const aiStore = useAIStore.getState();
    if (!aiStore.pendingSuggestion) return;
    aiStore.recordRejectedCompletion();
    aiStore.setPendingSuggestion(null);
  }

  /**
   * Accepts the next `wordCount` words of the pending suggestion and leaves
   * the remainder queued so the user can keep accepting incrementally.
   */
  acceptPartialSuggestion(wordCount = 1): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;
    if (!suggestion) return null;

    // Split on whitespace boundaries while preserving the delimiters
    const parts = suggestion.insertText.split(/(\s+)/);
    const takeCount = Math.min(wordCount * 2, parts.length);
    const toAccept = parts.slice(0, takeCount).join('');
    const remaining = parts.slice(takeCount).join('');

    if (remaining.trim()) {
      aiStore.setPendingSuggestion({
        ...suggestion,
        text: remaining,
        displayText: remaining,
        insertText: remaining,
      });
    } else {
      aiStore.setPendingSuggestion(null);
    }

    return toAccept;
  }

  cancelCurrentRequest(): void {
    if (this.currentRequest) {
      this.currentRequest.cancel();
      this.currentRequest = null;
    }
    const aiStore = useAIStore.getState();
    aiStore.setStatus('idle');
    aiStore.setPendingSuggestion(null);
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Tries streaming first; falls back to a single non-streaming call.
   * Both paths share the same error boundary in `requestCompletion`.
   */
  private async executeCompletion(
    request: CompletionRequest,
    provider: BaseAIProvider
  ): Promise<CompletionResponse> {
    if (!provider.supportsStreaming()) {
      return provider.complete(request);
    }

    try {
      const response = await this.streamCompletion(request, provider);
      if (this.hasUsableCompletion(response)) return response;

      useAIStore.getState().addActivityLog({
        type: 'system',
        message: `Streaming returned empty text; falling back to non-streaming.`,
      });
    } catch (streamError) {
      if (isCancellation(streamError)) throw streamError; // propagate

      useAIStore.getState().addActivityLog({
        type: 'error',
        message: `Streaming failed; retrying non-streaming.`,
      });
      console.warn('[CompletionEngine] Stream error, falling back:', streamError);
    }

    return provider.complete(request);
  }

  private streamCompletion(
    request: CompletionRequest,
    provider: BaseAIProvider
  ): Promise<CompletionResponse> {
    const aiStore = useAIStore.getState();

    return new Promise((resolve, reject) => {
      let accumulated = '';

      const cancel = provider.streamComplete(
        request,
        (chunk: string) => {
          accumulated += chunk;
          aiStore.setStatus('streaming');
          aiStore.setPendingSuggestion({
            text: accumulated,
            displayText: accumulated,
            insertText: accumulated,
          });
        },
        (response: CompletionResponse) => {
          aiStore.setLastCompletion(response);
          aiStore.setStatus('idle');
          resolve(response);
        },
        (error: Error) => {
          aiStore.setStatus('error');
          reject(error);
        }
      );

      // Register cancel handle so cancelCurrentRequest() works
      this.currentRequest = { id: request.id, cancel };
    });
  }

  private handleResponse(
    response: CompletionResponse,
    cacheKey: string
  ): Completion | null {
    const aiStore = useAIStore.getState();
    aiStore.setLastCompletion(response);
    aiStore.setStatus('idle');

    if (response.error) {
      console.error('[CompletionEngine] Response error:', response.error);
      return null;
    }

    const completion = response.completions[0];
    if (!completion?.insertText.trim()) return null;

    this.cacheSet(cacheKey, completion);
    aiStore.setPendingSuggestion(completion);
    return completion;
  }

  // ─── Cache ─────────────────────────────────────────────────────────────────

  /**
   * LRU-style insert: evict the oldest entry when the cap is reached.
   */
  private cacheSet(key: string, completion: Completion): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { completion, timestamp: Date.now() });
  }

  private startCacheCleaner(): void {
    // Run every 30 s to stay in sync with CACHE_TTL
    setInterval(() => {
      const cutoff = Date.now() - CACHE_TTL;
      for (const [key, value] of this.cache) {
        if (value.timestamp < cutoff) this.cache.delete(key);
      }
    }, 30_000);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /**
   * Cache key uses only the last 150 chars of the prefix (the nearest context
   * is what actually drives the completion) and the first 100 of the suffix.
   */
  private getCacheKey(
    context: ContextResult,
    position: { lineNumber: number; column: number }
  ): string {
    const filesKey = context.contextFiles
      .map((f) => `${f.path}:${f.content.slice(0, 100)}`)
      .join('|');

    return [
      context.filePath,
      position.lineNumber,
      position.column,
      context.prefix.slice(-150),
      (context.suffix ?? '').slice(0, 100),
      filesKey,
    ].join('\x00'); // null-byte separator avoids collisions
  }

  private hasUsableCompletion(response: CompletionResponse): boolean {
    return (
      !response.error &&
      (response.completions[0]?.insertText ?? '').trim().length > 0
    );
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const completionEngine = new CompletionEngine();

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isCancellation(error: unknown): boolean {
  if (!error) return false;
  const msg = String((error as Error).message ?? error).toLowerCase();
  return msg.includes('cancel') || msg.includes('abort');
}

function resolveActiveProviderModelId(config: AIConfiguration): string {
  switch (config.activeProvider) {
    case 'openrouter':
      return (
        config.providers.openrouter.customModelInput ||
        config.providers.openrouter.modelId
      );
    case 'deepseek':
      return config.providers.deepseek.model;
    case 'google':
      return config.providers.google.model;
    case 'huggingface':
      return config.providers.huggingface.modelId;
    case 'ollama':
      return config.providers.ollama.model;
    case 'custom':
      return config.providers.custom.modelId || config.activeModelId;
    default:
      return config.activeModelId;
  }
}