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

// ── Inject ghost-text styles once ──────────────────────────────────
let stylesInjected = false;
function injectGhostTextStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'ai-ghost-text-styles';
  style.textContent = `
    .ai-ghost-text {
      color: #6b7280 !important;
      opacity: 0.6 !important;
      font-style: italic !important;
      pointer-events: none !important;
    }
    .ai-ghost-text-multiline {
      color: #6b7280 !important;
      opacity: 0.6 !important;
      font-style: italic !important;
      pointer-events: none !important;
      white-space: pre !important;
    }
    .ai-ghost-text-line {
      /* Empty — the injectedText handles the styling via inlineClassName */
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
}: UseInlineCompletionOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decorationsCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const lastTriggerPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
  const requestIdRef = useRef(0); // monotonic counter for cancellation
  const widgetRef = useRef<monaco.editor.IOverlayWidget | null>(null);
  const ghostLinesRef = useRef<string[]>([]);

  const aiConfig = useAIStore((state) => state.config);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);
  const status = useAIStore((state) => state.status);

  // Inject CSS on mount
  useEffect(() => {
    injectGhostTextStyles();
  }, []);

  // Create decorations collection once per editor
  useEffect(() => {
    if (!editor) {
      decorationsCollectionRef.current = null;
      return;
    }
    decorationsCollectionRef.current = editor.createDecorationsCollection([]);
    return () => {
      decorationsCollectionRef.current?.clear();
      decorationsCollectionRef.current = null;
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
    ghostLinesRef.current = [];
  }, [editor]);

  /**
   * Render ghost text decorations in the editor.
   *
   * Strategy:
   *  - First line: injected `after` text on the cursor line (inline decoration)
   *  - Remaining lines: overlay widget positioned below the cursor line
   *    (Monaco doesn't natively support multi-line injected text well)
   */
  const updateGhostText = useCallback(
    (text: string | null, position: monaco.Position) => {
      if (!editor || !decorationsCollectionRef.current) {
        return;
      }

      // Clear everything first
      removeOverlayWidget();

      if (!text || !text.trim()) {
        decorationsCollectionRef.current.set([]);
        return;
      }

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

      decorationsCollectionRef.current.set(decorations);

      // ── Multi-line: overlay widget ──
      if (restLines.length > 0 && aiConfig.completion.multiLineEnabled) {
        ghostLinesRef.current = restLines;

        const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
        const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
        const topForPosition = editor.getTopForLineNumber(position.lineNumber);
        const scrollTop = editor.getScrollTop();
        const editorLayout = editor.getLayoutInfo();

        const widgetId = 'ai-ghost-multiline-' + Date.now();

        const domNode = document.createElement('div');
        domNode.style.pointerEvents = 'none';
        domNode.style.zIndex = '1200';
        domNode.style.position = 'absolute';
        domNode.style.fontFamily = fontInfo.fontFamily;
        domNode.style.fontSize = `${fontInfo.fontSize}px`;
        domNode.style.lineHeight = `${lineHeight}px`;
        domNode.style.fontWeight = fontInfo.fontWeight;
        domNode.style.letterSpacing = `${fontInfo.letterSpacing}px`;
        domNode.style.color = '#6b7280';
        domNode.style.opacity = '0.6';
        domNode.style.fontStyle = 'italic';
        domNode.style.whiteSpace = 'pre';
        domNode.style.paddingLeft = `${editorLayout.contentLeft}px`;

        // Build multi-line content
        domNode.textContent = restLines.join('\n');

        const widget: monaco.editor.IOverlayWidget = {
          getId: () => widgetId,
          getDomNode: () => domNode,
          getPosition: () => null, // we position manually
        };

        editor.addOverlayWidget(widget);
        widgetRef.current = widget;

        // Position the widget below the current line
        const top = topForPosition - scrollTop + lineHeight;
        domNode.style.top = `${top}px`;
        domNode.style.left = '0px';

        // Update position on scroll
        // (We'll clean this up when the widget is removed)
      }
    },
    [editor, aiConfig.completion.multiLineEnabled, removeOverlayWidget]
  );

  /**
   * Trigger a completion request. Validates context before sending.
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

      // For auto-trigger, skip if cursor is at a completely empty first line
      if (triggerKind === 'auto' && position.lineNumber <= 1) {
        const lineContent = model.getLineContent(position.lineNumber) || '';
        if (lineContent.trim().length === 0) {
          return;
        }
      }

      // Also skip auto-trigger if the current line up to cursor is only whitespace
      if (triggerKind === 'auto') {
        const lineContent = model.getLineContent(position.lineNumber) || '';
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        // Allow trigger if there's at least some non-whitespace context
        // But also allow if there's content on previous lines (user is in the middle of code)
        if (textBeforeCursor.trim().length === 0 && position.lineNumber <= 1) {
          return;
        }
      }

      lastTriggerPositionRef.current = position;

      // Increment request ID for cancellation
      const thisRequestId = ++requestIdRef.current;

      try {
        const completion = await completionEngine.requestCompletion(
          position,
          triggerKind
        );

        // Check if this request is still the latest one
        if (requestIdRef.current !== thisRequestId) {
          return; // A newer request has been made; discard this result
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
        if (requestIdRef.current !== thisRequestId) {
          return; // stale request, ignore error
        }
        console.error('[AI Inline] Completion error:', error);
      }
    },
    [editor, aiConfig.enabled, enabled, updateGhostText]
  );

  /**
   * Accept the current pending suggestion — insert text at cursor.
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

    // Clear ghost text BEFORE inserting to avoid visual artifacts
    removeOverlayWidget();
    decorationsCollectionRef.current?.set([]);

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
  }, [editor, pendingSuggestion, removeOverlayWidget]);

  /**
   * Reject (dismiss) the current pending suggestion.
   */
  const rejectSuggestion = useCallback(() => {
    if (!pendingSuggestion) {
      return;
    }

    completionEngine.rejectSuggestion();
    removeOverlayWidget();
    decorationsCollectionRef.current?.set([]);
  }, [pendingSuggestion, removeOverlayWidget]);

  /**
   * Accept the next N words from the pending suggestion (partial accept).
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
        removeOverlayWidget();
        decorationsCollectionRef.current?.set([]);
      }

      return true;
    },
    [editor, pendingSuggestion, updateGhostText, removeOverlayWidget]
  );

  // ── Main effect: wire up editor events ──
  useEffect(() => {
    if (!editor || !aiConfig.enabled || !enabled) {
      return;
    }

    // On content change: cancel pending, debounce auto-trigger
    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel in-flight request
      requestIdRef.current++;
      completionEngine.cancelCurrentRequest();

      // Clear ghost text immediately
      removeOverlayWidget();
      decorationsCollectionRef.current?.set([]);

      // Also dismiss pending suggestion in the store so state is consistent
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
    });

    // On cursor position change: dismiss if moved to a different line
    const cursorDisposable = editor.onDidChangeCursorPosition((event) => {
      if (
        lastTriggerPositionRef.current &&
        event.position.lineNumber !== lastTriggerPositionRef.current.lineNumber
      ) {
        const currentSuggestion = useAIStore.getState().pendingSuggestion;
        if (currentSuggestion) {
          completionEngine.rejectSuggestion();
          removeOverlayWidget();
          decorationsCollectionRef.current?.set([]);
        }
      }
    });

    // On scroll: reposition the multi-line overlay widget
    const scrollDisposable = editor.onDidScrollChange(() => {
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
    });

    // Priority shortcut handling
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
      scrollDisposable.dispose();
      keydownDisposable.dispose();
      acceptAction.dispose();
      rejectAction.dispose();
      partialAcceptAction.dispose();
      manualTriggerAction.dispose();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      removeOverlayWidget();
      decorationsCollectionRef.current?.set([]);
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
    removeOverlayWidget,
  ]);

  // ── Sync ghost text with pendingSuggestion store changes ──
  useEffect(() => {
    if (!editor) {
      return;
    }

    const position = editor.getPosition();
    if (!position) return;

    if (pendingSuggestion) {
      const displayText = pendingSuggestion.displayText || pendingSuggestion.text;
      if (displayText && displayText.trim()) {
        updateGhostText(displayText, position);
      }
    } else {
      removeOverlayWidget();
      decorationsCollectionRef.current?.set([]);
    }
  }, [editor, pendingSuggestion, updateGhostText, removeOverlayWidget]);

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