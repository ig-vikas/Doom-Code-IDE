import type { ChatMessage } from '../../types/ai';

export function estimateTokens(value: string): number {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 0;
  }

  return Math.ceil(normalized.length / 4) + Math.ceil((normalized.match(/\n/g) ?? []).length / 2);
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => total + estimateTokens(message.content) + 6, 0);
}

export function clampTextByEstimatedTokens(value: string, maxTokens: number): string {
  if (estimateTokens(value) <= maxTokens) {
    return value;
  }

  const approxChars = Math.max(64, maxTokens * 4);
  return value.slice(0, approxChars);
}

