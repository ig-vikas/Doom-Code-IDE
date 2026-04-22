import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { OLLAMA_CONFIG } from '../../../config/aiModels';
import type {
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
} from '../../../types/ai';
import { PromptTemplates } from '../promptTemplates';
import { retryHandler } from '../retryHandler';
import { BaseAIProvider } from './baseProvider';

export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    super(OLLAMA_CONFIG);
    this.baseUrl = baseUrl;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await retryHandler.executeWithRetry(
        async () => {
          const result = await invoke<{
            success: boolean;
            data?: {
              response: string;
              eval_count?: number;
              prompt_eval_count?: number;
            };
            error?: string;
          }>('ai_complete', {
            provider: 'ollama',
            endpoint: `${this.baseUrl}/api/generate`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              prompt: this.buildPrompt(request),
              stream: false,
              options: {
                temperature: request.settings.temperature || 0.1,
                top_p: request.settings.topP || 0.95,
                num_predict: request.settings.maxTokens || 256,
                stop: request.settings.stopSequences,
              },
            }),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[Ollama] retry ${attempt}:`, error);
        }
      );

      const completionText = response.response || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: `ollama-${Date.now()}`,
        requestId: request.id,
        provider: 'ollama',
        modelId: request.modelId,
        completions: [
          {
            text: cleanedText,
            displayText: cleanedText,
            insertText: cleanedText,
          },
        ],
        usage: {
          promptTokens: response.prompt_eval_count || 0,
          completionTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
          estimatedCost: 0,
        },
        timing: {
          requestStart: startTime,
          complete: Date.now(),
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        id: this.generateRequestId(),
        requestId: request.id,
        provider: 'ollama',
        modelId: request.modelId,
        completions: [],
        timing: {
          requestStart: startTime,
          complete: Date.now(),
          latencyMs: Date.now() - startTime,
        },
        error: {
          code: 'COMPLETION_FAILED',
          message: String(error),
          retryable: true,
        },
      };
    }
  }

  streamComplete(
    request: CompletionRequest,
    onChunk: (text: string) => void,
    onComplete: (response: CompletionResponse) => void,
    onError: (error: Error) => void
  ): () => void {
    const startTime = Date.now();
    let cancelled = false;
    let fullText = '';
    let firstTokenTime: number | undefined;
    let unlistenFn: UnlistenFn | null = null;

    const setup = async () => {
      unlistenFn = await listen<{
        request_id: string;
        chunk_type: 'chunk' | 'complete' | 'error';
        data: string;
      }>(`ai-stream-${request.id}`, (event) => {
        if (cancelled) {
          return;
        }

        const payload = event.payload;

        if (payload.chunk_type === 'chunk') {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }
          fullText += payload.data;
          onChunk(payload.data);
        } else if (payload.chunk_type === 'complete') {
          const cleanedText = this.parseCompletionText(fullText);
          onComplete({
            id: `ollama-${Date.now()}`,
            requestId: request.id,
            provider: 'ollama',
            modelId: request.modelId,
            completions: [
              {
                text: cleanedText,
                displayText: cleanedText,
                insertText: cleanedText,
              },
            ],
            timing: {
              requestStart: startTime,
              firstToken: firstTokenTime,
              complete: Date.now(),
              latencyMs: Date.now() - startTime,
            },
          });
          if (unlistenFn) {
            unlistenFn();
          }
        } else if (payload.chunk_type === 'error') {
          onError(new Error(payload.data));
          if (unlistenFn) {
            unlistenFn();
          }
        }
      });

      await invoke('ai_stream_complete', {
        requestId: request.id,
        endpoint: `${this.baseUrl}/api/generate`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.modelId,
          prompt: this.buildPrompt(request),
          stream: true,
          options: {
            temperature: request.settings.temperature || 0.1,
            num_predict: request.settings.maxTokens || 256,
          },
        }),
      });
    };

    setup().catch((error) => onError(error as Error));

    return () => {
      cancelled = true;
      if (unlistenFn) {
        unlistenFn();
      }
      void invoke('cancel_ai_request', { requestId: request.id }).catch(() => {});
    };
  }

  async testConnection(): Promise<ConnectionTestResponse> {
    try {
      await invoke<string[]>('list_ollama_models', { baseUrl: this.baseUrl });
      return { success: true, message: 'Connected to Ollama' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      return await invoke<string[]>('list_ollama_models', { baseUrl: this.baseUrl });
    } catch {
      return [];
    }
  }

  private buildPrompt(request: CompletionRequest): string {
    const { prompt } = request;
    const commentIntent = PromptTemplates.detectCommentIntent(prompt.prefix || '');
    const systemPrompt = PromptTemplates.buildEnhancedSystemPrompt(
      prompt.language,
      commentIntent.isComment,
      commentIntent.commentType
    );
    const userPrompt = PromptTemplates.buildEnhancedUserPrompt(prompt, commentIntent);

    if (!prompt.forceStructuredPrompt && this.supportsFIM() && prompt.suffix && prompt.suffix.trim()) {
      return `<|fim_prefix|>${prompt.prefix || ''}<|fim_suffix|>${prompt.suffix}<|fim_middle|>`;
    }

    return `${systemPrompt}

${userPrompt}`;
  }
}
