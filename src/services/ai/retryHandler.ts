export class RetryHandler {
  private maxRetries = 3;

  private baseDelay = 1000;

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: unknown) => void
  ): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (this.isNonRetryableError(error) || attempt === this.maxRetries) {
          throw error;
        }

        const delay = this.baseDelay * 2 ** attempt;
        onRetry?.(attempt + 1, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private isNonRetryableError(error: unknown): boolean {
    const message = String((error as { message?: string })?.message || error || '');
    if (message.includes('401') || message.includes('Invalid API key')) {
      return true;
    }
    if (message.includes('400') || message.includes('Invalid request')) {
      return true;
    }
    return false;
  }
}

export const retryHandler = new RetryHandler();
