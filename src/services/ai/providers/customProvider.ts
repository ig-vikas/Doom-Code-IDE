import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { CUSTOM_PROVIDER_CONFIG } from '../../../config/aiModels';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
  CustomProviderConfig,
} from '../../../types/ai';
import { PromptTemplates } from '../promptTemplates';
import { retryHandler } from '../retryHandler';
import { BaseAIProvider } from './baseProvider';

export class CustomProvider extends BaseAIProvider {
  private baseUrl = '';
  private headers: Record<string, string> = {};
  private requestTemplate: CustomProviderConfig['requestTemplate'] = 'openai';

  constructor() {
    super(CUSTOM_PROVIDER_CONFIG);
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '');
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
  }

  setRequestTemplate(template: CustomProviderConfig['requestTemplate']) {
    this.requestTemplate = template;
  }

  override supportsStreaming(): boolean {
    return this.requestTemplate !== 'anthropic' && this.config.supportsStreaming;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const { endpoint, headers, body } = this.buildPayload(request, false);

    try {
      const response = await retryHandler.executeWithRetry(
        async () => {
          const result = await invoke<{
            success: boolean;
            data?: {
              id?: string;
              choices?: Array<{ text?: string; message?: { content: string } }>;
              content?: Array<{ text?: string }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            };
            error?: string;
          }>('ai_complete', {
            provider: 'custom',
            endpoint,
            headers,
            body: JSON.stringify(body),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[CustomProvider] retry ${attempt}:`, error);
        }
      );

      const completionText =
        response.choices?.[0]?.message?.content
        || response.choices?.[0]?.text
        || response.content?.[0]?.text
        || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: response.id || `custom-${Date.now()}`,
        requestId: request.id,
        provider: 'custom',
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
              promptTokens: response.usage.prompt_tokens || 0,
              completionTokens: response.usage.completion_tokens || 0,
              totalTokens:
                response.usage.total_tokens
                || (response.usage.prompt_tokens || 0) + (response.usage.completion_tokens || 0),
              estimatedCost: 0,
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

    const { endpoint, headers, body } = this.buildPayload(request, true);

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
            id: `custom-${Date.now()}`,
            requestId: request.id,
            provider: 'custom',
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
        endpoint,
        headers,
        body: JSON.stringify(body),
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
        request: {
          provider: 'custom',
          api_key: this.apiKey,
          base_url: this.baseUrl,
          request_template: this.requestTemplate,
          headers: this.headers,
        },
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private buildPayload(request: CompletionRequest, stream: boolean) {
    const baseHeaders = { ...this.headers };

    if (this.requestTemplate === 'anthropic') {
      const endpoint = `${this.baseUrl}/messages`;
      const messages = this.buildMessages(request).filter((message) => message.role !== 'system');
      const system = this.buildMessages(request).find((message) => message.role === 'system')?.content;

      return {
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': this.apiKey,
          ...baseHeaders,
        },
        body: {
          model: request.modelId,
          system,
          messages: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          max_tokens: request.settings.maxTokens || 256,
          temperature: request.settings.temperature || 0.1,
          stop_sequences: request.settings.stopSequences,
          stream,
        },
      };
    }

    if (this.requestTemplate === 'custom') {
      return {
        endpoint: this.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...baseHeaders,
        },
        body: {
          model: request.modelId,
          prompt: request.prompt.prefix || '',
          prefix: request.prompt.prefix,
          suffix: request.prompt.suffix,
          messages: request.prompt.messages || this.buildMessages(request),
          language: request.prompt.language,
          max_tokens: request.settings.maxTokens || 256,
          temperature: request.settings.temperature || 0.1,
          top_p: request.settings.topP || 0.95,
          stop: request.settings.stopSequences,
          stream,
        },
      };
    }

    return {
      endpoint: `${this.baseUrl}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        ...baseHeaders,
      },
      body: {
        model: request.modelId,
        messages: this.buildMessages(request),
        max_tokens: request.settings.maxTokens || 256,
        temperature: request.settings.temperature || 0.1,
        top_p: request.settings.topP || 0.95,
        stop: request.settings.stopSequences,
        stream,
      },
    };
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
      provider: 'custom',
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
}
