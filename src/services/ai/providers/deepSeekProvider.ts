import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { DEEPSEEK_CONFIG } from '../../../config/aiModels';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
} from '../../../types/ai';
import { PromptTemplates } from '../promptTemplates';
import { retryHandler } from '../retryHandler';
import { BaseAIProvider } from './baseProvider';

const DEEPSEEK_FIM_BEGIN = '<\uFF5Cfim\u2581begin\uFF5C>';
const DEEPSEEK_FIM_HOLE = '<\uFF5Cfim\u2581hole\uFF5C>';
const DEEPSEEK_FIM_END = '<\uFF5Cfim\u2581end\uFF5C>';

export class DeepSeekProvider extends BaseAIProvider {
  private useFIM = true;

  constructor(useFIM: boolean = true) {
    super(DEEPSEEK_CONFIG);
    this.useFIM = useFIM;
  }

  setUseFIM(useFIM: boolean) {
    this.useFIM = useFIM;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    if (!request.prompt.forceStructuredPrompt && this.useFIM && request.prompt.suffix && request.prompt.suffix.trim()) {
      return this.completeFIM(request, startTime);
    }

    return this.completeChat(request, startTime);
  }

  private async completeFIM(
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const fimPrompt = `${DEEPSEEK_FIM_BEGIN}${request.prompt.prefix || ''}${DEEPSEEK_FIM_HOLE}${request.prompt.suffix || ''}${DEEPSEEK_FIM_END}`;

    try {
      const response = await retryHandler.executeWithRetry(
        async () => {
          const result = await invoke<{
            success: boolean;
            data?: {
              id: string;
              choices: Array<{ text?: string; message?: { content: string } }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            };
            error?: string;
          }>('ai_complete', {
            provider: 'deepseek',
            endpoint: `${this.config.baseUrl}/v1/completions`,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              prompt: fimPrompt,
              max_tokens: request.settings.maxTokens || 256,
              temperature: request.settings.temperature || 0.1,
              stop: [...(request.settings.stopSequences || []), DEEPSEEK_FIM_END],
            }),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[DeepSeek:FIM] retry ${attempt}:`, error);
        }
      );

      const completionText = response.choices[0]?.text || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: response.id,
        requestId: request.id,
        provider: 'deepseek',
        modelId: request.modelId,
        completions: [
          {
            text: cleanedText,
            displayText: cleanedText,
            insertText: cleanedText,
          },
        ],
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
              estimatedCost: this.estimateCost(
                response.usage.prompt_tokens,
                response.usage.completion_tokens
              ),
            }
          : undefined,
        timing: {
          requestStart: startTime,
          complete: Date.now(),
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorResponse(request, startTime, String(error));
    }
  }

  private async completeChat(
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const messages = this.buildMessages(request);

    try {
      const response = await retryHandler.executeWithRetry(
        async () => {
          const result = await invoke<{
            success: boolean;
            data?: {
              id: string;
              choices: Array<{ message: { content: string } }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            };
            error?: string;
          }>('ai_complete', {
            provider: 'deepseek',
            endpoint: `${this.config.baseUrl}/v1/chat/completions`,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              messages,
              max_tokens: request.settings.maxTokens || 256,
              temperature: request.settings.temperature || 0.1,
              stop: request.settings.stopSequences,
            }),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[DeepSeek] retry ${attempt}:`, error);
        }
      );

      const completionText = response.choices[0]?.message?.content || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: response.id,
        requestId: request.id,
        provider: 'deepseek',
        modelId: request.modelId,
        completions: [
          {
            text: cleanedText,
            displayText: cleanedText,
            insertText: cleanedText,
          },
        ],
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
              estimatedCost: this.estimateCost(
                response.usage.prompt_tokens,
                response.usage.completion_tokens
              ),
            }
          : undefined,
        timing: {
          requestStart: startTime,
          complete: Date.now(),
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorResponse(request, startTime, String(error));
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
            id: `completion-${request.id}`,
            requestId: request.id,
            provider: 'deepseek',
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

      const messages = this.buildMessages(request);

      await invoke('ai_stream_complete', {
        requestId: request.id,
        endpoint: `${this.config.baseUrl}/v1/chat/completions`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.modelId,
          messages,
          max_tokens: request.settings.maxTokens || 256,
          temperature: request.settings.temperature || 0.1,
          stream: true,
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
      const result = await invoke<ConnectionTestResponse>('test_ai_connection', {
        provider: 'deepseek',
        apiKey: this.apiKey,
        baseUrl: this.config.baseUrl,
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private buildMessages(request: CompletionRequest): ChatMessage[] {
    if (request.prompt.messages) {
      return request.prompt.messages;
    }

    const commentIntent = PromptTemplates.detectCommentIntent(request.prompt.prefix || '');
    const systemPrompt = PromptTemplates.buildEnhancedSystemPrompt(
      request.prompt.language,
      commentIntent.isComment,
      commentIntent.commentType
    );
    const userPrompt = PromptTemplates.buildEnhancedUserPrompt(request.prompt, commentIntent);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private createErrorResponse(
    request: CompletionRequest,
    startTime: number,
    error?: string
  ): CompletionResponse {
    return {
      id: this.generateRequestId(),
      requestId: request.id,
      provider: 'deepseek',
      modelId: request.modelId,
      completions: [],
      timing: {
        requestStart: startTime,
        complete: Date.now(),
        latencyMs: Date.now() - startTime,
      },
      error: {
        code: 'COMPLETION_FAILED',
        message: error || 'Unknown error',
        retryable: true,
      },
    };
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1_000_000) * 0.14 + (outputTokens / 1_000_000) * 0.28;
  }
}
