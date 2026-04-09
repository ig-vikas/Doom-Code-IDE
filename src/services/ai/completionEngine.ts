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

class CompletionEngine {
  private currentRequest: { id: string; cancel: () => void } | null = null;
  private cache: Map<string, { completion: Completion; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000;

  constructor() {
    this.startCacheCleaner();
  }

  async requestCompletion(
    position: { lineNumber: number; column: number },
    triggerKind: 'auto' | 'manual'
  ): Promise<Completion | null> {
    const aiStore = useAIStore.getState();
    const editorStore = useEditorStore.getState();
    const resolvedModelId = resolveActiveProviderModelId(aiStore.config);

    console.log('[Completion Engine] requestCompletion called', {
      position,
      triggerKind,
      aiEnabled: aiStore.config.enabled,
      provider: aiStore.config.activeProvider,
      model: resolvedModelId,
      status: aiStore.status,
    });

    if (!aiStore.config.enabled) {
      console.log('[Completion Engine] AI not enabled');
      return null;
    }

    this.cancelCurrentRequest();

    const activeTab = editorStore.getActiveTab();
    if (!activeTab) {
      console.warn('[Completion Engine] No active tab found');
      return null;
    }

    const activeFilePath = activeTab.path || `untitled://${activeTab.id}/${activeTab.name || 'untitled'}`;
    console.log('[Completion Engine] Active file path:', activeFilePath);

    try {
      console.log('[Completion Engine] Building context...');
      const context = await buildContext(activeFilePath, position, aiStore.config.context);
      console.log('[Completion Engine] Context built:', {
        language: context.language,
        prefixLength: context.prefix.length,
        hasSuffix: context.hasSuffix,
        estimatedTokens: context.estimatedTokens,
      });

      const cacheKey = this.getCacheKey(context, position);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        aiStore.setPendingSuggestion(cached.completion);
        return cached.completion;
      }

      const requestId = this.generateRequestId();
      const request: CompletionRequest = {
        id: requestId,
        provider: aiStore.config.activeProvider,
        modelId: resolvedModelId,
        prompt: {
          type: context.hasSuffix ? 'fim' : 'completion',
          prefix: context.prefix,
          suffix: context.suffix,
          language: context.language,
          filePath: context.filePath,
          cursorPosition: {
            line: position.lineNumber,
            column: position.column,
          },
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

      console.log('[Completion Engine] Getting provider:', request.provider);
      const provider = await providerRegistry.getProvider(request.provider);
      console.log('[Completion Engine] Provider obtained, supports streaming:', provider.supportsStreaming());

      let response: CompletionResponse;
      if (provider.supportsStreaming()) {
        try {
          response = await this.streamCompletion(request, provider);
          if (!this.hasUsableCompletion(response)) {
            aiStore.addActivityLog({
              type: 'system',
              message: `Streaming returned no text for ${request.provider}; falling back to non-streaming completion.`,
            });
            response = await provider.complete(request);
          }
        } catch (streamError) {
          aiStore.addActivityLog({
            type: 'error',
            message: `Streaming failed for ${request.provider}; retrying non-streaming completion.`,
          });
          console.warn('Streaming completion failed, falling back to non-streaming:', streamError);
          response = await provider.complete(request);
        }
      } else {
        response = await provider.complete(request);
      }

      return this.handleResponse(response, cacheKey);
    } catch (error) {
      console.error('[Completion Engine] Completion error:', error);
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

  private async streamCompletion(
    request: CompletionRequest,
    provider: BaseAIProvider
  ): Promise<CompletionResponse> {
    const aiStore = useAIStore.getState();

    return new Promise((resolve, reject) => {
      let fullText = '';

      const cancel = provider.streamComplete(
        request,
        (chunk: string) => {
          fullText += chunk;
          aiStore.setStatus('streaming');
          aiStore.setPendingSuggestion({
            text: fullText,
            displayText: fullText,
            insertText: fullText,
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

      this.currentRequest = { id: request.id, cancel };
    });
  }

  private handleResponse(response: CompletionResponse, cacheKey: string): Completion | null {
    const aiStore = useAIStore.getState();

    aiStore.setLastCompletion(response);
    aiStore.setStatus('idle');

    if (response.error) {
      console.error('Completion error:', response.error);
      return null;
    }

    const completion = response.completions[0];
    if (completion && completion.insertText.trim()) {
      this.cache.set(cacheKey, {
        completion,
        timestamp: Date.now(),
      });

      aiStore.setPendingSuggestion(completion);
      return completion;
    }

    return null;
  }

  acceptSuggestion(): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;

    if (suggestion) {
      aiStore.recordAcceptedCompletion(
        aiStore.lastCompletion?.usage?.completionTokens || 0,
        aiStore.lastCompletion?.usage?.estimatedCost || 0
      );

      aiStore.setPendingSuggestion(null);
      return suggestion.insertText;
    }

    return null;
  }

  rejectSuggestion(): void {
    const aiStore = useAIStore.getState();

    if (aiStore.pendingSuggestion) {
      aiStore.recordRejectedCompletion();
      aiStore.setPendingSuggestion(null);
    }
  }

  acceptPartialSuggestion(wordCount: number = 1): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;

    if (!suggestion) {
      return null;
    }

    const words = suggestion.insertText.split(/(\s+)/);
    const toAcceptCount = Math.min(wordCount * 2, words.length);
    const toAccept = words.slice(0, toAcceptCount).join('');
    const remaining = words.slice(toAcceptCount).join('');

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

  private getCacheKey(context: ContextResult, position: { lineNumber: number; column: number }): string {
    return `${context.filePath}:${position.lineNumber}:${position.column}:${context.prefix.slice(-100)}`;
  }

  private hasUsableCompletion(response: CompletionResponse): boolean {
    const text = response.completions[0]?.insertText || '';
    return text.trim().length > 0 && !response.error;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private startCacheCleaner(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const completionEngine = new CompletionEngine();

function resolveActiveProviderModelId(config: AIConfiguration): string {
  switch (config.activeProvider) {
    case 'openrouter':
      return config.providers.openrouter.customModelInput || config.providers.openrouter.modelId;
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
