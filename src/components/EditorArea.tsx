import { useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useAIStore } from '../stores/aiStore';
import { completionEngine } from '../services/ai/completionEngine';

interface UseInlineCompletionOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  enabled?: boolean;
  monaco?: typeof import('monaco-editor') | null;
  activeTab?: { id: string; path?: string; language?: string; content?: string } | null;
}

// ── Inject ghost-text styles once ──────────────────────────────────
let stylesInjected = false;
function injectGhostTextStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'ai-ghost-text-styles';
  style.textContent = `
    .ai-ghost-text {
      color: #6b7280 !important;
      opacity: 0.7 !important;
      font-style: italic !important;
      pointer-events: none !important;
      user-select: none !important;
    }
    .ai-ghost-text-multiline {
      color: #6b7280 !important;
      opacity: 0.7 !important;
      font-style: italic !important;
      pointer-events: none !important;
      user-select: none !important;
      white-space: pre !important;
    }
  `;
  document.head.appendChild(style);
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
      !event.altKey &&
      !event.shiftKey
    );
  }

  if (acceptKey === 'enter') {
    return (
      event.keyCode === monaco.KeyCode.Enter &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    );
  }

  // ctrl+enter
  return (
    event.keyCode === monaco.KeyCode.Enter &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey
  );
}

export function useInlineCompletion({
  editor,
  enabled = true,
  activeTab,
}: UseInlineCompletionOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decorationsCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const lastTriggerPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
  const requestIdRef = useRef(0);
  const widgetRef = useRef<monaco.editor.IOverlayWidget | null>(null);
  const currentGhostTextRef = useRef<string | null>(null);

  const aiConfig = useAIStore((state) => state.config);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);
  const status = useAIStore((state) => state.status);

  // Inject CSS on first render
  useEffect(() => {
    injectGhostTextStyles();
  }, []);

  // Initialize completion engine with editor context
  useEffect(() => {
    if (!editor) return;
    
    // If completionEngine has a setEditor method, call it
    if (typeof (completionEngine as any).setEditor === 'function') {
      (completionEngine as any).setEditor(editor);
    }
    
    return () => {
      if (typeof (completionEngine as any).setEditor === 'function') {
        (completionEngine as any).setEditor(null);
      }
    };
  }, [editor]);

  // Create decorations collection per editor instance
  useEffect(() => {
    if (!editor) {
      decorationsCollectionRef.current = null;
      return;
    }
    
    // Use the newer API if available, fallback to old one
    if (typeof editor.createDecorationsCollection === 'function') {
      decorationsCollectionRef.current = editor.createDecorationsCollection([]);
    }
    
    return () => {
      if (decorationsCollectionRef.current) {
        decorationsCollectionRef.current.clear();
        decorationsCollectionRef.current = null;
      }
    };
  }, [editor]);

  /**
   * Remove the multi-line overlay widget
   */
  const removeOverlayWidget = useCallback(() => {
    if (!editor || !widgetRef.current) return;
    try {
      editor.removeOverlayWidget(widgetRef.current);
    } catch {
      // widget may already be removed
    }
    widgetRef.current = null;
  }, [editor]);

  /**
   * Clear all ghost text (decorations + widget)
   */
  const clearGhostText = useCallback(() => {
    removeOverlayWidget();
    currentGhostTextRef.current = null;
    
    if (decorationsCollectionRef.current) {
      decorationsCollectionRef.current.clear();
    } else if (editor) {
      // Fallback for older Monaco versions
      (editor as any)._ghostDecorations = editor.deltaDecorations(
        (editor as any)._ghostDecorations || [],
        []
      );
    }
  }, [editor, removeOverlayWidget]);

  /**
   * Render ghost text decorations in the editor.
   */
  const updateGhostText = useCallback(
    (text: string | null, position: monaco.Position) => {
      if (!editor) return;

      // Clear existing first
      clearGhostText();

      if (!text || !text.trim()) {
        return;
      }

      currentGhostTextRef.current = text;
      const lines = text.split('\n');
      const firstLine = lines[0] || '';
      const restLines = lines.slice(1);
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // ── First line: inject after cursor ──
      if (firstLine) {
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
          },
        });
      }

      // Apply decorations
      if (decorationsCollectionRef.current) {
        decorationsCollectionRef.current.set(decorations);
      } else {
        // Fallback for older Monaco
        (editor as any)._ghostDecorations = editor.deltaDecorations(
          (editor as any)._ghostDecorations || [],
          decorations
        );
      }

      // ── Multi-line: overlay widget ──
      if (restLines.length > 0 && aiConfig.completion.multiLineEnabled) {
        const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
        const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
        const topForPosition = editor.getTopForLineNumber(position.lineNumber);
        const scrollTop = editor.getScrollTop();
        const editorLayout = editor.getLayoutInfo();

        // Calculate left offset based on cursor column
        const model = editor.getModel();
        const lineContent = model?.getLineContent(position.lineNumber) || '';
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        
        const widgetId = 'ai-ghost-multiline-' + Date.now();

        const domNode = document.createElement('div');
        domNode.className = 'ai-ghost-multiline-widget';
        domNode.style.cssText = `
          pointer-events: none;
          z-index: 100;
          position: absolute;
          font-family: ${fontInfo.fontFamily};
          font-size: ${fontInfo.fontSize}px;
          line-height: ${lineHeight}px;
          font-weight: ${fontInfo.fontWeight};
          color: #6b7280;
          opacity: 0.7;
          font-style: italic;
          white-space: pre;
          padding-left: ${editorLayout.contentLeft}px;
        `;

        domNode.textContent = restLines.join('\n');

        const widget: monaco.editor.IOverlayWidget = {
          getId: () => widgetId,
          getDomNode: () => domNode,
          getPosition: () => null,
        };

        editor.addOverlayWidget(widget);
        widgetRef.current = widget;

        // Position below the current line
        const top = topForPosition - scrollTop + lineHeight;
        domNode.style.top = `${top}px`;
        domNode.style.left = '0px';
      }
    },
    [editor, aiConfig.completion.multiLineEnabled, clearGhostText]
  );

  /**
   * Trigger a completion request
   */
  const triggerCompletion = useCallback(
    async (
      position: { lineNumber: number; column: number },
      triggerKind: 'auto' | 'manual'
    ) => {
      if (!editor || !aiConfig.enabled || !enabled) {
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const languageId = model.getLanguageId?.();
      if (languageId === 'plaintext' || languageId === 'text') {
        return;
      }

      // For auto-trigger, require some context
      if (triggerKind === 'auto') {
        const lineContent = model.getLineContent(position.lineNumber) || '';
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        
        // Skip if line is empty and we're at the beginning
        if (textBeforeCursor.trim().length === 0 && position.lineNumber <= 1) {
          return;
        }
        
        // Skip if the line only has whitespace and no previous content
        const fullContent = model.getValue();
        if (fullContent.trim().length < 5) {
          return; // Need at least some context
        }
      }

      lastTriggerPositionRef.current = position;
      const thisRequestId = ++requestIdRef.current;

      try {
        // Get the full content to pass to completion engine
        const fullContent = model.getValue();
        const language = model.getLanguageId();
        
        // Try to pass context if the completion engine supports it
        let completion;
        if (typeof (completionEngine as any).requestCompletionWithContext === 'function') {
          completion = await (completionEngine as any).requestCompletionWithContext({
            position,
            triggerKind,
            content: fullContent,
            language,
            filePath: activeTab?.path,
          });
        } else {
          completion = await completionEngine.requestCompletion(position, triggerKind);
        }

        // Check if this request is still the latest
        if (requestIdRef.current !== thisRequestId) {
          return;
        }

        const currentPosition = editor.getPosition();

        if (
          currentPosition &&
          currentPosition.lineNumber === position.lineNumber &&
          Math.abs(currentPosition.column - position.column) <= 2 &&
          completion
        ) {
          const displayText = completion.displayText || completion.text;
          if (displayText && displayText.trim()) {
            updateGhostText(displayText, currentPosition);
          }
        }
      } catch (error) {
        if (requestIdRef.current !== thisRequestId) return;
        console.error('[AI Inline] Completion error:', error);
      }
    },
    [editor, aiConfig.enabled, enabled, activeTab?.path, updateGhostText]
  );

  /**
   * Accept the current pending suggestion
   */
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

    // Clear ghost text first
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
    const newColumn =
      lines.length === 1
        ? position.column + insertText.length
        : lines[lines.length - 1].length + 1;

    editor.setPosition({ lineNumber: newLine, column: newColumn });
    editor.focus();

    return true;
  }, [editor, pendingSuggestion, clearGhostText]);

  /**
   * Reject the current pending suggestion
   */
  const rejectSuggestion = useCallback(() => {
    if (!pendingSuggestion) return;

    completionEngine.rejectSuggestion();
    clearGhostText();
  }, [pendingSuggestion, clearGhostText]);

  /**
   * Accept partial suggestion (next N words)
   */
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
        clearGhostText();
      }

      return true;
    },
    [editor, pendingSuggestion, updateGhostText, clearGhostText]
  );

  // ── Main effect: wire up editor events ──
  useEffect(() => {
    if (!editor || !aiConfig.enabled || !enabled) {
      return;
    }

    const disposables: monaco.IDisposable[] = [];

    // On content change
    disposables.push(
      editor.onDidChangeModelContent(() => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Cancel in-flight request
        requestIdRef.current++;
        completionEngine.cancelCurrentRequest();
        clearGhostText();

        // Dismiss pending suggestion
        const currentSuggestion = useAIStore.getState().pendingSuggestion;
        if (currentSuggestion) {
          completionEngine.rejectSuggestion();
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
      })
    );

    // On cursor position change
    disposables.push(
      editor.onDidChangeCursorPosition((event) => {
        if (
          lastTriggerPositionRef.current &&
          event.position.lineNumber !== lastTriggerPositionRef.current.lineNumber
        ) {
          const currentSuggestion = useAIStore.getState().pendingSuggestion;
          if (currentSuggestion) {
            completionEngine.rejectSuggestion();
            clearGhostText();
          }
        }
      })
    );

    // On scroll: reposition overlay widget
    disposables.push(
      editor.onDidScrollChange(() => {
        if (!widgetRef.current || !lastTriggerPositionRef.current) return;

        const domNode = widgetRef.current.getDomNode();
        if (!domNode) return;

        const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
        const topForPosition = editor.getTopForLineNumber(
          lastTriggerPositionRef.current.lineNumber
        );
        const scrollTop = editor.getScrollTop();
        const top = topForPosition - scrollTop + lineHeight;
        domNode.style.top = `${top}px`;
      })
    );

    // Priority shortcut handling
    disposables.push(
      editor.onKeyDown((event) => {
        const hasSuggestion = !!useAIStore.getState().pendingSuggestion;
        if (!hasSuggestion) return;

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
      })
    );

    // Editor actions
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
      run: () => rejectSuggestion(),
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
      disposables.forEach((d) => d.dispose());
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

  // ── Sync ghost text with pendingSuggestion store changes ──
  useEffect(() => {
    if (!editor) return;

    const position = editor.getPosition();
    if (!position) return;

    if (pendingSuggestion) {
      const displayText = pendingSuggestion.displayText || pendingSuggestion.text;
      if (displayText && displayText.trim()) {
        updateGhostText(displayText, position);
      }
    } else {
      clearGhostText();
    }
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

export default useInlineCompletion as any;