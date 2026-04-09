import type {
  CompletionRequest,
  CompletionResponse,
  ConnectionTestResponse,
  ProviderConfig,
} from '../../../types/ai';

export abstract class BaseAIProvider {
  protected config: ProviderConfig;
  protected apiKey = '';

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  abstract streamComplete(
    request: CompletionRequest,
    onChunk: (text: string) => void,
    onComplete: (response: CompletionResponse) => void,
    onError: (error: Error) => void
  ): () => void;

  abstract testConnection(): Promise<ConnectionTestResponse>;

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  getConfig(): ProviderConfig {
    return this.config;
  }

  getModels() {
    return this.config.models;
  }

  supportsStreaming(): boolean {
    return this.config.supportsStreaming;
  }

  supportsFIM(): boolean {
    return this.config.supportsFIM;
  }

  requiresApiKey(): boolean {
    return this.config.requiresApiKey;
  }

  protected generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  protected parseCompletionText(text: string): string {
    return text
      .replace(/^```\w*\n?/, '')
      .replace(/\n?```$/, '')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }
}
