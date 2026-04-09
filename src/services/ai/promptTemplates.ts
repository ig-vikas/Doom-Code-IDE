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

  static buildEnhancedSystemPrompt(
    language: string,
    isCommentDriven: boolean,
    commentType?: CommentIntentType
  ): string {
    return `You are a precise inline code completion engine.

STRICT RULES:
- Return ONLY the code to insert at cursor position
- DO NOT repeat any existing code
- DO NOT include code that's already written
- NO explanations, NO markdown, NO backticks
- Just raw code to insert
- If nothing to suggest, return empty string

Language: ${language}
${isCommentDriven ? `Comment-driven completion: ${commentType}` : 'Standard completion'}`;
  }

  static buildEnhancedUserPrompt(
    prompt: CompletionPrompt,
    commentIntent: { isComment: boolean; extractedIntent: string }
  ): string {
    const filePath = prompt.filePath || 'untitled';
    const language = prompt.language || 'plaintext';
    const prefix = prompt.prefix || '';
    const suffix = prompt.suffix || '';

    if (commentIntent.isComment && commentIntent.extractedIntent) {
      return `File: ${filePath}
Language: ${language}

COMMENT INTENT: ${commentIntent.extractedIntent}

CODE BEFORE CURSOR:
${prefix}

█ CURSOR POSITION █

CODE AFTER CURSOR:
${suffix}

Return ONLY the code to insert at cursor that implements the comment intent:`;
    }

    return `File: ${filePath}
Language: ${language}

CODE BEFORE CURSOR:
${prefix}

█ CURSOR POSITION █

CODE AFTER CURSOR:
${suffix}

Return ONLY the text to insert at cursor:`;
  }
}
