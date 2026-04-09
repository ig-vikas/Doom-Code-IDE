import type { CompletionPrompt } from '../../types/ai';

export type CommentIntentType = 'todo' | 'description' | 'docstring' | 'normal';

export interface CommentIntentResult {
  isComment: boolean;
  commentType: CommentIntentType;
  extractedIntent: string;
}

export class PromptTemplates {
  static detectCommentIntent(prefix: string): CommentIntentResult {
    const lastLine = prefix.split('\n').pop() || '';
    const trimmed = lastLine.trim();

    if (/(TODO:|FIXME:|HACK:|NOTE:)/i.test(trimmed)) {
      const match = trimmed.match(/(?:TODO:|FIXME:|HACK:|NOTE:)\s*(.+)/i);
      return {
        isComment: true,
        commentType: 'todo',
        extractedIntent: match?.[1] || trimmed,
      };
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      const content = trimmed.replace(/^(\/\/|#)\s*/, '');
      const isDescriptive = content.length > 20
        && (content.includes('function')
          || content.includes('create')
          || content.includes('implement')
          || content.includes('calculate'));

      return {
        isComment: true,
        commentType: isDescriptive ? 'description' : 'normal',
        extractedIntent: content,
      };
    }

    if (trimmed.startsWith('/**') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      return {
        isComment: true,
        commentType: 'docstring',
        extractedIntent: 'Generate documentation',
      };
    }

    return { isComment: false, commentType: 'normal', extractedIntent: '' };
  }

  /**
   * Concise system prompt — VS Code / Copilot style.
   * The model should act as a code completion engine: no chat, no explanations.
   */
  static buildEnhancedSystemPrompt(
    language: string,
    _isCommentDriven: boolean,
    _commentType?: CommentIntentType
  ): string {
    return `You are an inline code completion engine for ${language}. Continue the code naturally from the cursor position.

Rules:
- Output ONLY the code that should be inserted at the cursor
- Do NOT repeat any code already present before or after the cursor
- Do NOT wrap output in markdown code blocks or backticks
- Do NOT include explanations, comments about what you did, or any preamble
- If the cursor is after a comment describing intent, generate the code it describes
- Keep completions concise: prefer completing the current statement or block
- Match the existing code style, indentation, and naming conventions
- Return empty string if no meaningful completion exists`;
  }

  /**
   * Minimal FIM-style user prompt. Just shows the code context around the cursor.
   * No verbose framing — the model sees prefix, a cursor marker, and suffix.
   */
  static buildEnhancedUserPrompt(
    prompt: CompletionPrompt,
    _commentIntent: { isComment: boolean; extractedIntent: string }
  ): string {
    const prefix = prompt.prefix || '';
    const suffix = prompt.suffix || '';

    // Pure FIM-style: prefix + cursor + suffix
    // The model's job is to output what goes at <CURSOR>
    if (suffix.trim()) {
      return `${prefix}<CURSOR>${suffix}`;
    }

    // No suffix — simple completion from the end of prefix
    return prefix;
  }
}
