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
    return `You are an inline code completion engine for ${language}. Continue the code naturally from the exact cursor marker $0.

Rules:
- Output ONLY the code that should be inserted at $0
- Treat $0 as the exact insertion point and never include $0 in your answer
- Continue smoothly from the code before $0 into the code after $0
- Do NOT repeat any code already present before or after $0
- If the nearby code clearly contains a critical bug risk such as out-of-bounds access, an infinite loop, broken termination, wrong index math, null access, or another severe logic mistake, prefer the safest correction
- When a direct safe correction is not certain, emit a short corrective comment in the file's native comment syntax at $0 that points to the critical mistake
- Prefer fixing the critical mistake directly instead of only describing it whenever the intended correction is clear
- Do NOT wrap output in markdown code blocks or backticks
- Do NOT include explanations, comments about what you did, or any preamble
- If the cursor is after a comment describing intent, generate the code it describes
- If input.txt context is provided, use it only when it helps infer the intended continuation or expected I/O
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
    const cursorMarker = prompt.cursorMarker || '$0';
    const contextFiles = prompt.contextFiles || [];
    const sections = [
      `FILE: ${prompt.filePath}`,
      `LANGUAGE: ${prompt.language}`,
      `CURSOR: line ${prompt.cursorPosition.line}, column ${prompt.cursorPosition.column}`,
      'TASK: Continue the code exactly at the $0 marker, keep strong continuity with the surrounding code, and correct any obvious critical bug near the cursor with code or a short corrective comment.',
      'CODE WITH CURSOR:',
      `${prefix}${cursorMarker}${suffix}`,
    ];

    for (const contextFile of contextFiles) {
      sections.push(
        `${contextFile.label.toUpperCase()} CONTEXT (${contextFile.path})${contextFile.truncated ? ' [truncated]' : ''}:`,
        contextFile.content
      );
    }

    return sections.join('\n\n');
  }
}
