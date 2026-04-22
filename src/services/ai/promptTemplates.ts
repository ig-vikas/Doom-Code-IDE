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
   * Enhanced system prompt optimized for AI parsing and adherence.
   * Uses structured format with explicit constraints and examples.
   */
  static buildEnhancedSystemPrompt(
    language: string,
    _isCommentDriven: boolean,
    _commentType?: CommentIntentType
  ): string {
    return `# ROLE
You are a precise inline code completion engine for ${language}.

# PRIMARY DIRECTIVE
Generate ONLY the code that should appear at the exact cursor position marked by $0.

# CRITICAL RULES (Priority Order)

## 1. CURSOR HANDLING
- $0 marks the EXACT insertion point
- NEVER include $0 in your output
- Continue seamlessly from code before $0 to code after $0
- Treat $0 as an invisible boundary

## 2. CODE CONTINUITY
- NEVER repeat existing code from before $0
- NEVER duplicate code from after $0
- Ensure syntactic continuity across the $0 boundary
- Complete the immediate statement, expression, or block

## 3. BUG DETECTION & CORRECTION
Critical bugs requiring immediate attention:
- Array/buffer out-of-bounds access
- Infinite loops (missing/wrong termination)
- Off-by-one errors in index calculations
- Null/undefined dereferencing
- Type mismatches causing runtime errors
- Missing return statements in non-void functions
- Resource leaks (unclosed files, connections)

When critical bug detected:
a) IF correction is certain → Fix directly at $0
b) IF correction is uncertain → Insert concise warning comment in native syntax

Example correction priorities:
BAD:  for(i=0; i<=arr.length; i++)  // Off-by-one
GOOD: for(i=0; i<arr.length; i++)

## 4. COMMENT-DRIVEN COMPLETION
- If cursor follows descriptive comment → Implement described functionality
- Match comment's intent precisely
- Maintain comment's specified behavior/constraints

## 5. OUTPUT FORMAT (STRICT)
FORBIDDEN:
❌ Markdown code blocks (\`\`\`)
❌ Backticks (\`)
❌ Explanatory text
❌ Meta-commentary
❌ Preambles or postscripts
❌ "Here's the code..." style intros

REQUIRED:
✓ Raw code only
✓ Proper indentation matching context
✓ Language-native syntax
✓ Empty string if no valid completion exists

## 6. CODE QUALITY
- Match existing indentation style (tabs vs spaces)
- Follow naming conventions from context
- Use consistent brace placement
- Maintain spacing patterns
- Prefer conciseness over verbosity
- Limit completion to current logical scope

# DECISION TREE

\`\`\`
Is there a critical bug near $0?
├─ YES, correction certain
│  └─ Output: Fixed code
├─ YES, correction uncertain  
│  └─ Output: // WARNING: [specific issue]
└─ NO bugs detected
   ├─ After descriptive comment?
   │  └─ Output: Implementation of comment
   ├─ Mid-statement?
   │  └─ Output: Statement completion
   ├─ Mid-expression?
   │  └─ Output: Expression completion
   └─ No clear intent?
      └─ Output: Empty string
\`\`\`

# EXAMPLES

Input:
\`\`\`
const items = [1,2,3];
for(let i=0; i<=$0items.length; i++) {
\`\`\`
Output:
\`\`\`
<
\`\`\`
(Fixes off-by-one)

Input:
\`\`\`
// Calculate factorial recursively
function factorial(n) {
  $0
\`\`\`
Output:
\`\`\`
if (n <= 1) return 1;
  return n * factorial(n - 1);
\`\`\`

Input:
\`\`\`
const user = null;
console.log(user.$0name);
\`\`\`
Output:
\`\`\`
// WARNING: Null reference - add null check before access
\`\`\`

# TERMINATION
If no meaningful completion can be determined, output exactly: ""`;
  }

  /**
   * Structured user prompt optimized for AI comprehension.
   * Uses clear sections and explicit task definition.
   */
  static buildEnhancedUserPrompt(
    prompt: CompletionPrompt,
    _commentIntent: { isComment: boolean; extractedIntent: string }
  ): string {
    const prefix = prompt.prefix || '';
    const suffix = prompt.suffix || '';
    const cursorMarker = prompt.cursorMarker || '$0';
    const contextFiles = prompt.contextFiles || [];

    // Analyze context for better task description
    const hasComment = _commentIntent.isComment;
    const hasSuffix = suffix.trim().length > 0;
    const taskDescription = hasComment
      ? `Implement functionality described in the comment before $0`
      : hasSuffix
      ? `Complete code to bridge prefix and suffix seamlessly`
      : `Complete the current statement/block`;

    const sections = [
      '# CONTEXT',
      `File: ${prompt.filePath}`,
      `Language: ${prompt.language}`,
      `Cursor: Line ${prompt.cursorPosition.line}, Column ${prompt.cursorPosition.column}`,
      '',
      '# TASK',
      taskDescription,
      '',
      '# REQUIREMENTS',
      '1. Generate code for $0 position only',
      '2. Check for critical bugs near cursor',
      '3. Maintain syntactic continuity',
      '4. Match existing code style',
      hasComment ? '5. Fulfill comment intent' : '',
      '',
      '# CODE',
      '```' + prompt.language,
      `${prefix}${cursorMarker}${suffix}`,
      '```',
    ].filter(Boolean);

    // Add context files if available
    if (contextFiles.length > 0) {
      sections.push('', '# RELATED CONTEXT');
      for (const contextFile of contextFiles) {
        sections.push(
          '',
          `## ${contextFile.label.toUpperCase()}: ${contextFile.path}${contextFile.truncated ? ' [TRUNCATED]' : ''}`,
          '```' + (contextFile.path.split('.').pop() || ''),
          contextFile.content,
          '```'
        );
      }
    }

    // Add explicit output instruction
    sections.push(
      '',
      '# OUTPUT INSTRUCTIONS',
      'Respond with ONLY the raw code to insert at $0.',
      'No markdown, no explanations, no wrapping.',
      'If no completion needed, respond with empty string.'
    );

    return sections.join('\n');
  }
}