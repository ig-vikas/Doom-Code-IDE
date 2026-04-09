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
import type * as monaco from 'monaco-editor';

class CompletionEngine {
  private currentRequest: { id: string; cancel: () => void } | null = null;
  private cache: Map<string, { completion: Completion; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30s - shorter TTL for more relevant completions
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor() {
    this.startCacheCleaner();
  }

  /**
   * Set the active editor instance for direct content access
   */
  setEditor(editor: monaco.editor.IStandaloneCodeEditor | null): void {
    this.editor = editor;
  }

  /**
   * Get the current editor content directly from Monaco
   */
  private getEditorContent(): { content: string; language: string; filePath: string } | null {
    // Try to get content directly from editor first (most accurate)
    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        return {
          content: model.getValue(),
          language: model.getLanguageId() || 'plaintext',
          filePath: model.uri.toString(),
        };
      }
    }

    // Fallback to editor store
    const editorStore = useEditorStore.getState();
    const activeTab = editorStore.getActiveTab();
    if (activeTab) {
      return {
        content: activeTab.content || '',
        language: activeTab.language || 'plaintext',
        filePath: activeTab.path || `untitled://${activeTab.id}/${activeTab.name || 'untitled'}`,
      };
    }

    return null;
  }

  /**
   * Get cursor position from editor
   */
  private getCursorPosition(): { lineNumber: number; column: number } | null {
    if (this.editor) {
      const position = this.editor.getPosition();
      if (position) {
        return { lineNumber: position.lineNumber, column: position.column };
      }
    }
    return null;
  }

  async requestCompletion(
    position: { lineNumber: number; column: number },
    triggerKind: 'auto' | 'manual'
  ): Promise<Completion | null> {
    const aiStore = useAIStore.getState();
    const resolvedModelId = resolveActiveProviderModelId(aiStore.config);

    if (!aiStore.config.enabled) {
      console.debug('[Completion Engine] AI is disabled');
      return null;
    }

    // Cancel any pending request
    this.cancelCurrentRequest();

    // Get editor content
    const editorContent = this.getEditorContent();
    if (!editorContent) {
      console.debug('[Completion Engine] No active editor content');
      return null;
    }

    const { content, language, filePath } = editorContent;

    // Skip if content is too short for meaningful completion
    if (content.trim().length < 3 && triggerKind === 'auto') {
      console.debug('[Completion Engine] Content too short for auto-trigger');
      return null;
    }

    // Skip for plaintext
    if (language === 'plaintext' || language === 'text') {
      console.debug('[Completion Engine] Skipping plaintext');
      return null;
    }

    try {
      // Build context from content directly
      const context = this.buildContextFromContent(content, position, language, filePath);

      if (!context.prefix.trim() && triggerKind === 'auto') {
        console.debug('[Completion Engine] Empty prefix for auto-trigger');
        return null;
      }

      // Check cache
      const cacheKey = this.getCacheKey(context, position);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.debug('[Completion Engine] Returning cached completion');
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
        message: `Requesting completion from ${request.provider}/${request.modelId} (${triggerKind})`,
      });

      console.debug('[Completion Engine] Requesting completion:', {
        provider: request.provider,
        model: request.modelId,
        prefixLength: context.prefix.length,
        suffixLength: context.suffix.length,
        triggerKind,
      });

      const provider = await providerRegistry.getProvider(request.provider);

      let response: CompletionResponse;
      if (provider.supportsStreaming()) {
        try {
          response = await this.streamCompletion(request, provider);
          if (!this.hasUsableCompletion(response)) {
            aiStore.addActivityLog({
              type: 'system',
              message: `Streaming returned no text; falling back to non-streaming.`,
            });
            response = await provider.complete(request);
          }
        } catch (streamError) {
          console.warn('[Completion Engine] Streaming failed, falling back:', streamError);
          aiStore.addActivityLog({
            type: 'error',
            message: `Streaming failed; retrying non-streaming.`,
          });
          response = await provider.complete(request);
        }
      } else {
        response = await provider.complete(request);
      }

      return this.handleResponse(response, cacheKey);
    } catch (error) {
      console.error('[Completion Engine] Error:', error);
      aiStore.setStatus('error');
      aiStore.addActivityLog({
        type: 'error',
        message: `Completion failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return null;
    } finally {
      aiStore.setCurrentRequest(null);
    }
  }

  /**
   * Build context directly from content string
   */
  private buildContextFromContent(
    content: string,
    position: { lineNumber: number; column: number },
    language: string,
    filePath: string
  ): ContextResult {
    const lines = content.split('\n');
    
    // Calculate cursor offset
    let cursorOffset = 0;
    for (let i = 0; i < position.lineNumber - 1; i++) {
      cursorOffset += (lines[i]?.length ?? 0) + 1; // +1 for newline
    }
    cursorOffset += position.column - 1;

    const prefix = content.substring(0, cursorOffset);
    const suffix = content.substring(cursorOffset);

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedTokens = Math.ceil((prefix.length + suffix.length) / 4);

    return {
      prefix,
      suffix,
      language,
      filePath,
      hasSuffix: suffix.trim().length > 0,
      estimatedTokens,
      linesBefore: position.lineNumber - 1,
      linesAfter: lines.length - position.lineNumber,
    };
  }

  private async streamCompletion(
    request: CompletionRequest,
    provider: BaseAIProvider
  ): Promise<CompletionResponse> {
    const aiStore = useAIStore.getState();

    return new Promise((resolve, reject) => {
      let fullText = '';
      let isResolved = false;

      const cancel = provider.streamComplete(
        request,
        (chunk: string) => {
          if (isResolved) return;
          fullText += chunk;
          aiStore.setStatus('streaming');
          aiStore.setPendingSuggestion({
            text: fullText,
            displayText: fullText,
            insertText: fullText,
          });
        },
        (response: CompletionResponse) => {
          if (isResolved) return;
          isResolved = true;
          aiStore.setLastCompletion(response);
          aiStore.setStatus('idle');
          resolve(response);
        },
        (error: Error) => {
          if (isResolved) return;
          isResolved = true;
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
      console.error('[Completion Engine] Response error:', response.error);
      aiStore.addActivityLog({
        type: 'error',
        message: `Provider returned error: ${response.error}`,
      });
      return null;
    }

    const completion = response.completions[0];
    if (completion && completion.insertText.trim()) {
      console.debug('[Completion Engine] Got completion:', completion.insertText.substring(0, 50) + '...');
      
      // Normalize the completion
      const normalizedCompletion: Completion = {
        text: completion.text || completion.insertText,
        displayText: completion.displayText || completion.insertText,
        insertText: completion.insertText,
        range: completion.range,
        documentation: completion.documentation,
      };

      this.cache.set(cacheKey, {
        completion: normalizedCompletion,
        timestamp: Date.now(),
      });

      aiStore.setPendingSuggestion(normalizedCompletion);
      aiStore.addActivityLog({
        type: 'system',
        message: `Received completion: ${normalizedCompletion.insertText.substring(0, 30).replace(/\n/g, '↵')}...`,
      });
      
      return normalizedCompletion;
    }

    console.debug('[Completion Engine] No usable completion in response');
    return null;
  }

  acceptSuggestion(): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;

    if (suggestion) {
      const insertText = suggestion.insertText;
      
      aiStore.recordAcceptedCompletion(
        aiStore.lastCompletion?.usage?.completionTokens || 0,
        aiStore.lastCompletion?.usage?.estimatedCost || 0
      );
      aiStore.addActivityLog({
        type: 'system',
        message: `Accepted completion: ${insertText.substring(0, 30).replace(/\n/g, '↵')}...`,
      });

      aiStore.setPendingSuggestion(null);
      return insertText;
    }

    return null;
  }

  rejectSuggestion(): void {
    const aiStore = useAIStore.getState();

    if (aiStore.pendingSuggestion) {
      aiStore.recordRejectedCompletion();
      aiStore.addActivityLog({
        type: 'system',
        message: 'Rejected completion',
      });
      aiStore.setPendingSuggestion(null);
    }
  }

  acceptPartialSuggestion(wordCount: number = 1): string | null {
    const aiStore = useAIStore.getState();
    const suggestion = aiStore.pendingSuggestion;

    if (!suggestion) {
      return null;
    }

    // Split by word boundaries while preserving whitespace
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

    aiStore.addActivityLog({
      type: 'system',
      message: `Accepted partial: "${toAccept.replace(/\n/g, '↵')}"`,
    });

    return toAccept;
  }

  cancelCurrentRequest(): void {
    if (this.currentRequest) {
      console.debug('[Completion Engine] Cancelling request:', this.currentRequest.id);
      try {
        this.currentRequest.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      this.currentRequest = null;
    }

    const aiStore = useAIStore.getState();
    if (aiStore.status === 'loading' || aiStore.status === 'streaming') {
      aiStore.setStatus('idle');
    }
    // Don't clear pending suggestion here - let the hook handle that
  }

  private getCacheKey(
    context: ContextResult,
    position: { lineNumber: number; column: number }
  ): string {
    // Use a hash of the last N characters of prefix for cache key
    const prefixEnd = context.prefix.slice(-200);
    const hash = this.simpleHash(prefixEnd);
    return `${context.filePath}:${position.lineNumber}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private hasUsableCompletion(response: CompletionResponse): boolean {
    if (response.error) return false;
    const text = response.completions[0]?.insertText || '';
    return text.trim().length > 0;
  }

  clearCache(): void {
    this.cache.clear();
    console.debug('[Completion Engine] Cache cleared');
  }

  private startCacheCleaner(): void {
    setInterval(() => {
      const now = Date.now();
      let cleared = 0;
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
          cleared++;
        }
      }
      if (cleared > 0) {
        console.debug(`[Completion Engine] Cleared ${cleared} stale cache entries`);
      }
    }, 30000);
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Get completion engine status for debugging
   */
  getStatus(): {
    hasEditor: boolean;
    cacheSize: number;
    hasPendingRequest: boolean;
  } {
    return {
      hasEditor: this.editor !== null,
      cacheSize: this.cache.size,
      hasPendingRequest: this.currentRequest !== null,
    };
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

// Export type for ContextResult if needed
export type { ContextResult };