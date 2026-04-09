import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { OPENROUTER_CONFIG } from '../../../config/aiModels';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
} from '../../../types/ai';
import { PromptTemplates } from '../promptTemplates';
import { retryHandler } from '../retryHandler';
import { BaseAIProvider } from './baseProvider';

export class OpenRouterProvider extends BaseAIProvider {
  private siteUrl: string;
  private siteName: string;

  constructor(siteUrl?: string, siteName?: string) {
    super(OPENROUTER_CONFIG);
    this.siteUrl = siteUrl || 'https://doomcode.dev';
    this.siteName = siteName || 'Doom Code IDE';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
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
            provider: 'openrouter',
            endpoint: `${this.config.baseUrl}/chat/completions`,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'HTTP-Referer': this.siteUrl,
              'X-Title': this.siteName,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              messages,
              max_tokens: request.settings.maxTokens || 256,
              temperature: request.settings.temperature || 0.1,
              top_p: request.settings.topP || 0.95,
              stop: request.settings.stopSequences,
              stream: false,
            }),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[OpenRouter] retry ${attempt}:`, error);
        }
      );

      const completionText = response.choices[0]?.message?.content || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: response.id,
        requestId: request.id,
        provider: 'openrouter',
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
                request.modelId,
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
      return {
        id: this.generateRequestId(),
        requestId: request.id,
        provider: 'openrouter',
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

    const messages = this.buildMessages(request);

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
            provider: 'openrouter',
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
        endpoint: `${this.config.baseUrl}/chat/completions`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
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
        provider: 'openrouter',
        apiKey: this.apiKey,
        baseUrl: this.config.baseUrl,
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private buildMessages(request: CompletionRequest): ChatMessage[] {
    const { prompt } = request;

    if (prompt.messages) {
      return prompt.messages;
    }

    const commentIntent = PromptTemplates.detectCommentIntent(prompt.prefix || '');
    const systemPrompt = PromptTemplates.buildEnhancedSystemPrompt(
      prompt.language,
      commentIntent.isComment,
      commentIntent.commentType
    );
    const userPrompt = PromptTemplates.buildEnhancedUserPrompt(prompt, commentIntent);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.config.models.find((candidate) => candidate.id === modelId);
    if (!model || model.costPer1kInput === undefined || model.costPer1kOutput === undefined) {
      return 0;
    }

    return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
  }
}
