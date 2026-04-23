import { useCallback, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useAIStore } from '../stores/aiStore';
import { completionEngine } from '../services/ai/completionEngine';

interface UseInlineCompletionOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  enabled?: boolean;
  monaco?: typeof import('monaco-editor') | null;
  activeTab?: unknown;
}

export function useInlineCompletion({ editor, enabled = true }: UseInlineCompletionOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const anchorPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
  const decorationsCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const widgetRef = useRef<monaco.editor.IContentWidget | null>(null);
  const suggestionContextKeyRef = useRef<monaco.editor.IContextKey<boolean> | null>(null);
  const acceptTabContextKeyRef = useRef<monaco.editor.IContextKey<boolean> | null>(null);
  const acceptEnterContextKeyRef = useRef<monaco.editor.IContextKey<boolean> | null>(null);
  const acceptCtrlEnterContextKeyRef = useRef<monaco.editor.IContextKey<boolean> | null>(null);
  const viewZoneIdRef = useRef<string | null>(null);

  const aiConfig = useAIStore((state) => state.config);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);
  const status = useAIStore((state) => state.status);
  const acceptSuggestionRef = useRef<() => boolean>(() => false);
  const rejectSuggestionRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!editor) {
      decorationsCollectionRef.current = null;
      suggestionContextKeyRef.current = null;
      acceptTabContextKeyRef.current = null;
      acceptEnterContextKeyRef.current = null;
      acceptCtrlEnterContextKeyRef.current = null;
      return;
    }

    decorationsCollectionRef.current = editor.createDecorationsCollection([]);
    suggestionContextKeyRef.current = editor.createContextKey('aiInlineSuggestionVisible', false);
    acceptTabContextKeyRef.current = editor.createContextKey('aiInlineAcceptTab', false);
    acceptEnterContextKeyRef.current = editor.createContextKey('aiInlineAcceptEnter', false);
    acceptCtrlEnterContextKeyRef.current = editor.createContextKey('aiInlineAcceptCtrlEnter', false);
    return () => {
      suggestionContextKeyRef.current?.set(false);
      acceptTabContextKeyRef.current?.set(false);
      acceptEnterContextKeyRef.current?.set(false);
      acceptCtrlEnterContextKeyRef.current?.set(false);
      decorationsCollectionRef.current?.clear();
      decorationsCollectionRef.current = null;
      suggestionContextKeyRef.current = null;
      acceptTabContextKeyRef.current = null;
      acceptEnterContextKeyRef.current = null;
      acceptCtrlEnterContextKeyRef.current = null;
    };
  }, [editor]);

  const removeContentWidget = useCallback(() => {
    if (!editor || !widgetRef.current) {
      return;
    }

    try {
      editor.removeContentWidget(widgetRef.current);
    } catch {
      // Widget may already be gone during teardown.
    }

    widgetRef.current = null;
  }, [editor]);

  const removeViewZone = useCallback(() => {
    if (!editor || !viewZoneIdRef.current) {
      return;
    }

    try {
      editor.changeViewZones((changeAccessor) => {
        if (viewZoneIdRef.current) {
          changeAccessor.removeZone(viewZoneIdRef.current);
          viewZoneIdRef.current = null;
        }
      });
    } catch {
      // View zone may already be gone during teardown.
    }
  }, [editor]);

  const clearGhostText = useCallback(() => {
    removeContentWidget();
    removeViewZone();
    decorationsCollectionRef.current?.set([]);
    anchorPositionRef.current = null;
    suggestionContextKeyRef.current?.set(false);
  }, [removeContentWidget, removeViewZone]);

  const renderMultilineWidget = useCallback(
    (lines: string[], position: monaco.Position) => {
      if (!editor || lines.length === 0) {
        return;
      }

      removeContentWidget();
      removeViewZone();

      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
      
      // Create a view zone to push content down
      editor.changeViewZones((changeAccessor) => {
        const domNode = document.createElement('div');
        domNode.className = 'ai-ghost-text-widget ai-ghost-text-multiline';
        domNode.style.pointerEvents = 'none';
        domNode.style.whiteSpace = 'pre';
        domNode.style.fontFamily = editor.getOption(monaco.editor.EditorOption.fontFamily);
        domNode.style.fontSize = `${editor.getOption(monaco.editor.EditorOption.fontSize)}px`;
        domNode.style.lineHeight = `${lineHeight}px`;
        domNode.style.paddingLeft = '4px';
        editor.applyFontInfo(domNode);

        // Render each line separately to handle empty lines properly
        lines.forEach((line, index) => {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'ai-ghost-text';
          lineDiv.style.minHeight = `${lineHeight}px`;
          lineDiv.style.lineHeight = `${lineHeight}px`;
          
          // For empty lines, add a zero-width space to maintain height
          lineDiv.textContent = line.length > 0 ? line : '\u200B';
          
          domNode.appendChild(lineDiv);
        });

        const viewZoneId = changeAccessor.addZone({
          afterLineNumber: position.lineNumber,
          heightInLines: lines.length,
          domNode: domNode,
          suppressMouseDown: true,
        });

        viewZoneIdRef.current = viewZoneId;
      });
    },
    [editor, removeContentWidget, removeViewZone]
  );

  const updateGhostText = useCallback(
    (text: string | null, position: monaco.Position) => {
      if (!editor || !decorationsCollectionRef.current) {
        return;
      }

      removeContentWidget();
      removeViewZone();

      if (!text || !text.trim()) {
        decorationsCollectionRef.current.set([]);
        anchorPositionRef.current = null;
        suggestionContextKeyRef.current?.set(false);
        return;
      }

      anchorPositionRef.current = {
        lineNumber: position.lineNumber,
        column: position.column,
      };
      suggestionContextKeyRef.current?.set(true);

      const lines = text.split('\n');
      const firstLine = lines[0] ?? '';
      const restLines = lines.slice(1);
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      if (firstLine.length > 0) {
        decorations.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            after: {
              content: firstLine,
              inlineClassName: 'ai-ghost-text',
              cursorStops: monaco.editor.InjectedTextCursorStops.None,
            },
            zIndex: 1400,
          },
        });
      }

      decorationsCollectionRef.current.set(decorations);

      if (restLines.length > 0 && aiConfig.completion.multiLineEnabled) {
        renderMultilineWidget(restLines, position);
      }
    },
    [editor, aiConfig.completion.multiLineEnabled, removeContentWidget, removeViewZone, renderMultilineWidget]
  );

  const triggerCompletion = useCallback(
    async (position: { lineNumber: number; column: number }, triggerKind: 'auto' | 'manual') => {
      if (!editor || !aiConfig.enabled || !enabled) {
        return;
      }

      const model = editor.getModel();
      const languageId = model?.getLanguageId?.();
      if (languageId === 'plaintext' || languageId === 'text') {
        return;
      }

      if (triggerKind === 'auto' && position.lineNumber <= 1) {
        const lineContent = model?.getLineContent(position.lineNumber) || '';
        if (lineContent.trim().length === 0) {
          return;
        }
      }

      const requestId = ++requestIdRef.current;
      anchorPositionRef.current = {
        lineNumber: position.lineNumber,
        column: position.column,
      };

      try {
        const completion = await completionEngine.requestCompletion(position, triggerKind);

        if (requestIdRef.current !== requestId) {
          return;
        }

        const currentPosition = editor.getPosition();
        if (
          currentPosition
          && currentPosition.lineNumber === position.lineNumber
          && currentPosition.column === position.column
          && completion
        ) {
          updateGhostText(completion.displayText || completion.text, currentPosition);
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        console.error('[AI Inline] Completion error:', error);
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

    clearGhostText();

    const lines = insertText.split('\n');
    editor.executeEdits('ai-completion', [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: insertText,
      },
    ]);

    const newLine = position.lineNumber + lines.length - 1;
    const newColumn = lines.length === 1
      ? position.column + insertText.length
      : (lines[lines.length - 1]?.length ?? 0) + 1;

    editor.setPosition({ lineNumber: newLine, column: newColumn });
    editor.focus();

    return true;
  }, [editor, pendingSuggestion, clearGhostText]);
  acceptSuggestionRef.current = acceptSuggestion;

  const rejectSuggestion = useCallback(() => {
    if (useAIStore.getState().pendingSuggestion) {
      completionEngine.rejectSuggestion();
    }
    clearGhostText();
  }, [clearGhostText]);
  rejectSuggestionRef.current = rejectSuggestion;

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
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: insertText,
        },
      ]);

      const lines = insertText.split('\n');
      const newLine = position.lineNumber + lines.length - 1;
      const newColumn = lines.length === 1
        ? position.column + insertText.length
        : (lines[lines.length - 1]?.length ?? 0) + 1;

      editor.setPosition({ lineNumber: newLine, column: newColumn });
      editor.focus();

      const remaining = useAIStore.getState().pendingSuggestion;
      if (remaining) {
        updateGhostText(
          remaining.displayText || remaining.text,
          new monaco.Position(newLine, newColumn)
        );
      } else {
        clearGhostText();
      }

      return true;
    },
    [editor, pendingSuggestion, updateGhostText, clearGhostText]
  );

  useEffect(() => {
    acceptTabContextKeyRef.current?.set(aiConfig.completion.acceptKey === 'tab');
    acceptEnterContextKeyRef.current?.set(aiConfig.completion.acceptKey === 'enter');
    acceptCtrlEnterContextKeyRef.current?.set(aiConfig.completion.acceptKey === 'ctrl+enter');
  }, [aiConfig.completion.acceptKey]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        acceptSuggestionRef.current();
      },
      'aiInlineSuggestionVisible && aiInlineAcceptTab'
    );
    editor.addCommand(
      monaco.KeyCode.Enter,
      () => {
        acceptSuggestionRef.current();
      },
      'aiInlineSuggestionVisible && aiInlineAcceptEnter'
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        acceptSuggestionRef.current();
      },
      'aiInlineSuggestionVisible && aiInlineAcceptCtrlEnter'
    );
    editor.addCommand(
      monaco.KeyCode.Escape,
      () => {
        rejectSuggestionRef.current();
      },
      'aiInlineSuggestionVisible'
    );
  }, [editor]);

  useEffect(() => {
    if (!editor || !aiConfig.enabled || !enabled) {
      return;
    }

    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      requestIdRef.current += 1;
      completionEngine.cancelCurrentRequest();
      if (useAIStore.getState().pendingSuggestion) {
        completionEngine.rejectSuggestion();
      }
      clearGhostText();

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
      const anchor = anchorPositionRef.current;
      if (
        anchor
        && (
          event.position.lineNumber !== anchor.lineNumber
          || event.position.column !== anchor.column
        )
      ) {
        requestIdRef.current += 1;
        completionEngine.cancelCurrentRequest();
        rejectSuggestion();
      }
    });

    const acceptAction = editor.addAction({
      id: 'ai.acceptSuggestion',
      label: 'Accept AI Suggestion',
      keybindings: [],
      precondition: 'aiInlineSuggestionVisible',
      run: () => {
        acceptSuggestion();
      },
    });

    const rejectAction = editor.addAction({
      id: 'ai.rejectSuggestion',
      label: 'Reject AI Suggestion',
      keybindings: [],
      precondition: 'aiInlineSuggestionVisible',
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
      precondition: 'aiInlineSuggestionVisible',
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
      acceptAction.dispose();
      rejectAction.dispose();
      partialAcceptAction.dispose();
      manualTriggerAction.dispose();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      clearGhostText();
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
    clearGhostText,
  ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (pendingSuggestion) {
      const anchor = anchorPositionRef.current;
      const currentPosition = editor.getPosition();
      if (
        !anchor
        || !currentPosition
        || currentPosition.lineNumber !== anchor.lineNumber
        || currentPosition.column !== anchor.column
      ) {
        completionEngine.rejectSuggestion();
        clearGhostText();
        return;
      }

      updateGhostText(
        pendingSuggestion.displayText || pendingSuggestion.text,
        new monaco.Position(anchor.lineNumber, anchor.column)
      );
      return;
    }

    clearGhostText();
  }, [editor, pendingSuggestion, updateGhostText, clearGhostText]);

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
