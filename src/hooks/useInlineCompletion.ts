import { useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useAIStore } from '../stores/aiStore';
import { completionEngine } from '../services/ai/completionEngine';

interface UseInlineCompletionOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  enabled?: boolean;
  monaco?: typeof import('monaco-editor') | null;
  activeTab?: unknown;
}

function isAcceptShortcutPressed(
  event: monaco.IKeyboardEvent,
  acceptKey: 'tab' | 'enter' | 'ctrl+enter'
): boolean {
  if (acceptKey === 'tab') {
    return (
      event.keyCode === monaco.KeyCode.Tab &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    );
  }

  if (acceptKey === 'enter') {
    return (
      event.keyCode === monaco.KeyCode.Enter &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    );
  }

  return (
    event.keyCode === monaco.KeyCode.Enter &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey
  );
}

export function useInlineCompletion({ editor, enabled = true }: UseInlineCompletionOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const lastPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);

  const aiConfig = useAIStore((state) => state.config);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);
  const status = useAIStore((state) => state.status);

  const updateGhostText = useCallback(
    (text: string | null, position: monaco.Position) => {
      if (!editor) {
        return;
      }

      if (!text || !text.trim()) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        return;
      }

      console.log('[AI Inline] Updating ghost text:', text.substring(0, 50));

      const lines = text.split('\n');
      const firstLine = lines[0];
      const restLines = lines.slice(1);
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      if (firstLine) {
        decorations.push({
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          options: {
            after: {
              content: firstLine,
              inlineClassName: 'ai-ghost-text',
              cursorStops: monaco.editor.InjectedTextCursorStops.None,
            },
            inlineClassName: 'ai-ghost-text-decoration',
            zIndex: 1200,
          },
        });
      }

      const model = editor.getModel();
      const maxLine = model?.getLineCount() || position.lineNumber;
      if (restLines.length > 0 && aiConfig.completion.multiLineEnabled) {
        for (let index = 0; index < restLines.length; index += 1) {
          const targetLine = position.lineNumber + index + 1;
          if (targetLine > maxLine + 1) {
            break;
          }
          decorations.push({
            range: new monaco.Range(targetLine, 1, targetLine, 1),
            options: {
              before: {
                content: restLines[index] + '\n',
                inlineClassName: 'ai-ghost-text-multiline',
                cursorStops: monaco.editor.InjectedTextCursorStops.None,
              },
              inlineClassName: 'ai-ghost-text-multiline-decoration',
              zIndex: 1200,
            },
          });
        }
      }

      console.log('[AI Inline] Applying', decorations.length, 'decorations');
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
      console.log('[AI Inline] Decorations applied:', decorationsRef.current);
    },
    [editor, aiConfig.completion.multiLineEnabled]
  );

  const triggerCompletion = useCallback(
    async (position: { lineNumber: number; column: number }, triggerKind: 'auto' | 'manual') => {
      console.log('[AI Inline] triggerCompletion called', {
        position,
        triggerKind,
        hasEditor: !!editor,
        aiEnabled: aiConfig.enabled,
        enabled,
      });

      if (!editor || !aiConfig.enabled || !enabled) {
        console.log('[AI Inline] Early return - conditions not met');
        return;
      }

      // Get the model to check file type
      const model = editor.getModel();
      const languageId = model?.getLanguageId?.();
      
      // Skip suggestions for plain text files
      if (languageId === 'plaintext' || languageId === 'text') {
        console.log('[AI Inline] Skipping completion for text file');
        return;
      }

      lastPositionRef.current = position;

      try {
        console.log('[AI Inline] Requesting completion from engine...');
        const completion = await completionEngine.requestCompletion(position, triggerKind);
        console.log('[AI Inline] Completion received:', completion ? completion.text.substring(0, 50) : 'null');
        
        const currentPosition = editor.getPosition();

        if (
          currentPosition &&
          currentPosition.lineNumber === position.lineNumber &&
          Math.abs(currentPosition.column - position.column) <= 1 &&
          completion
        ) {
          console.log('[AI Inline] Updating ghost text');
          updateGhostText(completion.displayText || completion.text, currentPosition);
        } else {
          console.log('[AI Inline] Not showing completion - position mismatch or no completion');
        }
      } catch (error) {
        console.error('[AI Inline] Completion trigger error:', error);
      }
    },
    [editor, aiConfig.enabled, enabled, updateGhostText]
  );

  const acceptSuggestion = useCallback((): boolean => {
    if (!editor || !pendingSuggestion) {
      return false;
    }

    const position = editor.getPosition();
    if (!position) {
      return false;
    }

    const insertText = completionEngine.acceptSuggestion();
    if (!insertText) {
      return false;
    }

    const lines = insertText.split('\n');
    editor.executeEdits('ai-completion', [
      {
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: insertText,
      },
    ]);

    const newLine = position.lineNumber + lines.length - 1;
    const newColumn = lines.length === 1 ? position.column + insertText.length : lines[lines.length - 1].length + 1;

    editor.setPosition({ lineNumber: newLine, column: newColumn });
    editor.focus();
    updateGhostText(null, position);

    return true;
  }, [editor, pendingSuggestion, updateGhostText]);

  const rejectSuggestion = useCallback(() => {
    if (!pendingSuggestion) {
      return;
    }

    completionEngine.rejectSuggestion();
    const position = editor?.getPosition();
    if (position) {
      updateGhostText(null, position);
    }
  }, [editor, pendingSuggestion, updateGhostText]);

  const acceptPartialSuggestion = useCallback(
    (wordCount: number = 1): boolean => {
      if (!editor || !pendingSuggestion) {
        return false;
      }

      const position = editor.getPosition();
      if (!position) {
        return false;
      }

      const insertText = completionEngine.acceptPartialSuggestion(wordCount);
      if (!insertText) {
        return false;
      }

      editor.executeEdits('ai-completion-partial', [
        {
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          text: insertText,
        },
      ]);

      const newColumn = position.column + insertText.length;
      editor.setPosition({ lineNumber: position.lineNumber, column: newColumn });
      editor.focus();

      const remaining = useAIStore.getState().pendingSuggestion;
      if (remaining) {
        updateGhostText(
          remaining.displayText || remaining.text,
          new monaco.Position(position.lineNumber, newColumn)
        );
      } else {
        updateGhostText(null, position);
      }

      return true;
    },
    [editor, pendingSuggestion, updateGhostText]
  );

  useEffect(() => {
    if (!editor || !aiConfig.enabled || !enabled) {
      return;
    }

    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      completionEngine.cancelCurrentRequest();

      const position = editor.getPosition();
      if (position) {
        updateGhostText(null, position);
      }

      if (!aiConfig.completion.autoTrigger) {
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        const currentPosition = editor.getPosition();
        if (currentPosition) {
          void triggerCompletion(currentPosition, 'auto');
        }
      }, aiConfig.completion.triggerDelay);
    });

    const cursorDisposable = editor.onDidChangeCursorPosition((event) => {
      if (
        lastPositionRef.current &&
        (event.position.lineNumber !== lastPositionRef.current.lineNumber ||
          Math.abs(event.position.column - lastPositionRef.current.column) > 1)
      ) {
        rejectSuggestion();
      }
    });

    // Priority shortcut handling so accept/reject works even when Monaco default bindings conflict.
    const keydownDisposable = editor.onKeyDown((event) => {
      const hasSuggestion = !!useAIStore.getState().pendingSuggestion;
      if (!hasSuggestion) {
        return;
      }

      if (isAcceptShortcutPressed(event, aiConfig.completion.acceptKey)) {
        event.preventDefault();
        event.stopPropagation();
        acceptSuggestion();
        return;
      }

      if (event.keyCode === monaco.KeyCode.Escape) {
        event.preventDefault();
        event.stopPropagation();
        rejectSuggestion();
      }
    });

    const acceptAction = editor.addAction({
      id: 'ai.acceptSuggestion',
      label: 'Accept AI Suggestion',
      keybindings: [],
      run: () => {
        acceptSuggestion();
      },
    });

    const rejectAction = editor.addAction({
      id: 'ai.rejectSuggestion',
      label: 'Reject AI Suggestion',
      keybindings: [],
      run: () => {
        rejectSuggestion();
      },
    });

    const partialAcceptAction = editor.addAction({
      id: 'ai.acceptPartialSuggestion',
      label: 'Accept Next Word',
      keybindings: [
        aiConfig.completion.partialAcceptKey === 'ctrl+right'
          ? monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow
          : monaco.KeyMod.Alt | monaco.KeyCode.RightArrow,
      ],
      run: () => {
        if (!acceptPartialSuggestion(1)) {
          editor.trigger('keyboard', 'cursorWordEndRight', {});
        }
      },
    });

    const manualTriggerAction = editor.addAction({
      id: 'ai.triggerSuggestion',
      label: 'Trigger AI Suggestion',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Backslash],
      run: () => {
        const currentPosition = editor.getPosition();
        if (currentPosition) {
          void triggerCompletion(currentPosition, 'manual');
        }
      },
    });

    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
      keydownDisposable.dispose();
      acceptAction.dispose();
      rejectAction.dispose();
      partialAcceptAction.dispose();
      manualTriggerAction.dispose();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    };
  }, [
    editor,
    aiConfig.enabled,
    aiConfig.completion.autoTrigger,
    aiConfig.completion.triggerDelay,
    aiConfig.completion.acceptKey,
    aiConfig.completion.partialAcceptKey,
    enabled,
    triggerCompletion,
    acceptSuggestion,
    rejectSuggestion,
    acceptPartialSuggestion,
    updateGhostText,
  ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const position = editor.getPosition();
    if (position && pendingSuggestion) {
      updateGhostText(pendingSuggestion.displayText || pendingSuggestion.text, position);
    } else if (position && !pendingSuggestion) {
      updateGhostText(null, position);
    }
  }, [editor, pendingSuggestion, updateGhostText]);

  return {
    triggerCompletion,
    acceptSuggestion,
    rejectSuggestion,
    acceptPartialSuggestion,
    isLoading: status === 'loading' || status === 'streaming',
    hasSuggestion: !!pendingSuggestion,
    showInlineHint: aiConfig.ui.showInlineHints && !!pendingSuggestion,
    hintText:
      aiConfig.completion.acceptKey === 'enter'
        ? 'Enter to accept'
        : aiConfig.completion.acceptKey === 'ctrl+enter'
          ? 'Ctrl+Enter to accept'
          : 'Tab to accept',
  };
}

