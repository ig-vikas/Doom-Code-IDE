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

  /**
   * Clean model output to extract only raw code for inline insertion.
   * Handles common model artifacts: markdown fences, thinking tags,
   * preamble text, trailing incomplete statements, etc.
   */
  protected parseCompletionText(text: string): string {
    let cleaned = text;

    // 1. Strip <think>...</think> reasoning blocks (DeepSeek, etc.)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Strip markdown code fences (```language ... ```)
    //    Handle both full fences and partial (unclosed) fences
    const fenceMatch = cleaned.match(/^```\w*\n([\s\S]*?)(?:\n```\s*$|$)/);
    if (fenceMatch) {
      cleaned = fenceMatch[1];
    } else {
      // Partial fences at start/end
      cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // 3. Strip common model preambles
    const preamblePatterns = [
      /^(?:Here(?:'s| is) (?:the |my |your )?(?:code|completion|suggestion|implementation)[:\s]*\n*)/i,
      /^(?:Sure[,!.]?\s*(?:Here(?:'s| is)[:\s]*)?)\n*/i,
      /^(?:The (?:code|completion|following)[:\s]*\n*)/i,
      /^(?:I'll |Let me |I would )[^\n]*\n*/i,
      /^(?:Based on [^\n]*\n*)/i,
      /^(?:Continuing [^\n]*\n*)/i,
    ];
    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 4. Strip trailing explanation lines (lines starting with common commentary)
    const lines = cleaned.split('\n');
    let endIndex = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (
        trimmed.startsWith('// Note:') ||
        trimmed.startsWith('// This ') ||
        trimmed.startsWith('// The ') ||
        trimmed.startsWith('# Note:') ||
        trimmed.startsWith('# This ') ||
        trimmed === '```' ||
        trimmed.startsWith('Note:') ||
        trimmed.startsWith('This code ') ||
        trimmed.startsWith('The above ')
      ) {
        endIndex = i;
      } else if (trimmed.length > 0) {
        break;
      }
    }
    if (endIndex < lines.length) {
      cleaned = lines.slice(0, endIndex).join('\n');
    }

    // 5. Remove leading blank lines, preserve trailing newline structure
    cleaned = cleaned.replace(/^\n+/, '');

    // 6. Remove trailing blank lines (but keep one trailing newline if content ends with one)
    cleaned = cleaned.replace(/\n{3,}$/g, '\n\n').replace(/\n+$/, '');

    return cleaned;
  }
}
