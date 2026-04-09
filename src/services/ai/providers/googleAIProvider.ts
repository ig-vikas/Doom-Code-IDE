import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { GOOGLE_AI_CONFIG } from '../../../config/aiModels';
import type {
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
} from '../../../types/ai';
import { PromptTemplates } from '../promptTemplates';
import { retryHandler } from '../retryHandler';
import { BaseAIProvider } from './baseProvider';

type SafetyLevel = 'none' | 'low' | 'medium' | 'high';

export class GoogleAIProvider extends BaseAIProvider {
  private safetySettings: SafetyLevel = 'none';

  constructor(safetySettings: SafetyLevel = 'none') {
    super(GOOGLE_AI_CONFIG);
    this.safetySettings = safetySettings;
  }

  setSafetySettings(level: SafetyLevel) {
    this.safetySettings = level;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const contents = this.buildContents(request);

    const endpoint = `${this.config.baseUrl}/models/${request.modelId}:generateContent?key=${this.apiKey}`;

    try {
      const response = await retryHandler.executeWithRetry(
        async () => {
          const result = await invoke<{
            success: boolean;
            data?: {
              candidates?: Array<{
                content: { parts: Array<{ text: string }> };
              }>;
              usageMetadata?: {
                promptTokenCount: number;
                candidatesTokenCount: number;
                totalTokenCount: number;
              };
            };
            error?: string;
          }>('ai_complete', {
            provider: 'google',
            endpoint,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents,
              generationConfig: {
                maxOutputTokens: request.settings.maxTokens || 256,
                temperature: request.settings.temperature || 0.1,
                topP: request.settings.topP || 0.95,
                stopSequences: request.settings.stopSequences,
              },
              safetySettings: this.getSafetyConfig(),
            }),
          });

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Unknown error');
          }

          return result.data;
        },
        (attempt, error) => {
          console.log(`[GoogleAI] retry ${attempt}:`, error);
        }
      );

      const completionText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanedText = this.parseCompletionText(completionText);

      return {
        id: `google-${Date.now()}`,
        requestId: request.id,
        provider: 'google',
        modelId: request.modelId,
        completions: [
          {
            text: cleanedText,
            displayText: cleanedText,
            insertText: cleanedText,
          },
        ],
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount,
              completionTokens: response.usageMetadata.candidatesTokenCount,
              totalTokens: response.usageMetadata.totalTokenCount,
              estimatedCost: this.estimateCost(
                request.modelId,
                response.usageMetadata.promptTokenCount,
                response.usageMetadata.candidatesTokenCount
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
        provider: 'google',
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

    const contents = this.buildContents(request);

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
            id: `google-${Date.now()}`,
            requestId: request.id,
            provider: 'google',
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

      const endpoint = `${this.config.baseUrl}/models/${request.modelId}:streamGenerateContent?key=${this.apiKey}`;

      await invoke('ai_stream_complete', {
        requestId: request.id,
        endpoint,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.settings.maxTokens || 256,
            temperature: request.settings.temperature || 0.1,
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
      const result = await invoke<ConnectionTestResponse>('test_ai_connection', {
        provider: 'google',
        apiKey: this.apiKey,
        baseUrl: this.config.baseUrl,
      });
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private buildContents(request: CompletionRequest) {
    const { prompt } = request;
    const commentIntent = PromptTemplates.detectCommentIntent(prompt.prefix || '');
    const systemPrompt = PromptTemplates.buildEnhancedSystemPrompt(
      prompt.language,
      commentIntent.isComment,
      commentIntent.commentType
    );
    const userPrompt = PromptTemplates.buildEnhancedUserPrompt(prompt, commentIntent);

    return [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ];
  }

  private getSafetyConfig() {
    const threshold =
      this.safetySettings === 'none'
        ? 'BLOCK_NONE'
        : this.safetySettings === 'low'
          ? 'BLOCK_ONLY_HIGH'
          : this.safetySettings === 'medium'
            ? 'BLOCK_MEDIUM_AND_ABOVE'
            : 'BLOCK_LOW_AND_ABOVE';

    return [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold },
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
