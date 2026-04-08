import { useCallback, useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore, useThemeStore, useSettingsStore, useEditorSchemeStore, useUIStore } from '../stores';
import { useAutoSave } from '../hooks/useAutoSave';
import { writeFileContent } from '../services/fileService';
import { useNotificationStore } from '../stores';
import { setActiveEditor } from '../services/commandService';
import { useSnippetStore } from '../stores/snippetStore';
import { formatTimestamp } from '../utils/timestamp';
import type { FileTab, SplitNode } from '../types';
import TabBar, { TAB_DRAG_TYPE } from './TabBar';
import { VscSplitHorizontal, VscSplitVertical, VscClose } from 'react-icons/vsc';

// Track globally whether snippets have been registered (avoids duplicates)
let snippetsRegistered = false;

// Global tab drag tracking — so we can show overlay over Monaco during drags
let globalDragActive = false;
const dragListeners = new Set<(active: boolean) => void>();

function setGlobalDragActive(active: boolean) {
  globalDragActive = active;
  dragListeners.forEach((fn) => fn(active));
}

function useGlobalDragActive() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const handler = (v: boolean) => setActive(v);
    dragListeners.add(handler);
    return () => { dragListeners.delete(handler); };
  }, []);
  return active;
}

// Listen for any tab drag start/end at the window level
if (typeof window !== 'undefined') {
  let dragSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  const clearDragState = () => {
    setGlobalDragActive(false);
    if (dragSafetyTimer) { clearTimeout(dragSafetyTimer); dragSafetyTimer = null; }
  };
  window.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target?.closest?.('.tab')) {
      setGlobalDragActive(true);
      // Safety: force-clear after 5s in case dragend never fires
      if (dragSafetyTimer) clearTimeout(dragSafetyTimer);
      dragSafetyTimer = setTimeout(clearDragState, 5000);
    }
  }, true);
  window.addEventListener('dragend', () => {
    clearDragState();
  }, true);
  window.addEventListener('drop', () => {
    clearDragState();
  }, true);
}

export default function EditorArea() {
  const layout = useEditorStore((s) => s.layout);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
      <SplitNodeRenderer node={layout} path={[]} />
    </div>
  );
}

// ======================== RESIZABLE SPLIT RENDERER ========================
function SplitNodeRenderer({ node, path }: { node: SplitNode; path: number[] }) {
  const updateSplitSizes = useEditorStore((s) => s.updateSplitSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localSizes, setLocalSizes] = useState<number[]>(node.type === 'split' ? node.sizes : []);
  const sizesRef = useRef(localSizes);
  sizesRef.current = localSizes;

  // Sync sizes from store
  useEffect(() => {
    if (node.type === 'split') {
      setLocalSizes(node.sizes);
    }
  }, [node]);

  if (node.type === 'leaf') {
    return <EditorGroup groupId={node.id} tabs={node.tabs} activeTabId={node.activeTabId} />;
  }

  const isHorizontal = node.direction === 'horizontal';

  const handleMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    const startPos = isHorizontal ? e.clientX : e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const totalSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
    const startSizes = [...sizesRef.current];

    const handleMouseMove = (ev: MouseEvent) => {
      const currentPos = isHorizontal ? ev.clientX : ev.clientY;
      const deltaPx = currentPos - startPos;
      const deltaPct = (deltaPx / totalSize) * 100;

      const newSizes = [...startSizes];
      const minSize = 10;
      let s1 = startSizes[idx] + deltaPct;
      let s2 = startSizes[idx + 1] - deltaPct;

      if (s1 < minSize) { s2 -= (minSize - s1); s1 = minSize; }
      if (s2 < minSize) { s1 -= (minSize - s2); s2 = minSize; }

      newSizes[idx] = s1;
      newSizes[idx + 1] = s2;
      setLocalSizes(newSizes);
      sizesRef.current = newSizes;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Persist to store
      updateSplitSizes(path, sizesRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={containerRef}
      className={`split-pane ${node.direction}`}
      style={{ flex: 1, overflow: 'hidden' }}
    >
      {node.children.map((child, idx) => {
        const sizeVal = localSizes[idx] ?? (100 / node.children.length);
        const sizeStyle = isHorizontal
          ? { width: `calc(${sizeVal}% - ${idx > 0 ? 1.5 : 0}px)`, height: '100%' }
          : { height: `calc(${sizeVal}% - ${idx > 0 ? 1.5 : 0}px)`, width: '100%' };
        return (
          <div key={child.type === 'leaf' ? child.id : `split-${idx}`} style={{ display: 'contents' }}>
            {idx > 0 && (
              <div
                className={`split-handle ${isHorizontal ? 'horizontal' : 'vertical'}`}
                onMouseDown={(e) => handleMouseDown(e, idx - 1)}
              />
            )}
            <div style={{ ...sizeStyle, overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
              <SplitNodeRenderer node={child} path={[...path, idx]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface EditorGroupProps {
  groupId: string;
  tabs: FileTab[];
  activeTabId: string | null;
}

function EditorGroup({ groupId, tabs, activeTabId }: EditorGroupProps) {
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const markSaved = useEditorStore((s) => s.markSaved);
  const splitGroup = useEditorStore((s) => s.splitGroup);
  const moveTab = useEditorStore((s) => s.moveTab);
  const removeGroup = useEditorStore((s) => s.removeGroup);
  const updateCursorPosition = useEditorStore((s) => s.updateCursorPosition);
  const updateScrollPosition = useEditorStore((s) => s.updateScrollPosition);
  const getTabViewState = useEditorStore((s) => s.getTabViewState);
  const totalGroups = useEditorStore((s) => s.getAllGroups().length);
  const setInsertSnippetFn = useEditorStore((s) => s.setInsertSnippetFn);
  const setCursorPosition = useEditorStore((s) => s.setCursorPosition);
  const getAllSnippets = useSnippetStore((s) => s.getAllSnippets);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const currentScheme = useEditorSchemeStore((s) => s.currentScheme);
  const settings = useSettingsStore((s) => s.settings);
  const focusedPanel = useUIStore((s) => s.focusedPanel);
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);
  const success = useNotificationStore((s) => s.success);
  const error = useNotificationStore((s) => s.error);
  const { triggerAutoSave } = useAutoSave();
  const [isDragOver, setIsDragOver] = useState(false);
  const isTabDragActive = useGlobalDragActive();
  const [editorSwitching, setEditorSwitching] = useState(false);
  const [typingStreak, setTypingStreak] = useState(0);
  const [typingStreakVisible, setTypingStreakVisible] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const lastLocalContentRef = useRef<string | null>(null);
  const previousActiveTabRef = useRef<string | null>(activeTabId);
  const isRestoringViewStateRef = useRef(false);
  const restoreGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakRef = useRef(0);
  const streakPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const restoreEditorViewState = useCallback(
    (tab: FileTab | null, revealInCenter = false) => {
      const ed = editorRef.current;
      if (!ed || !tab) return;

      const viewState = getTabViewState(tab) ?? {
        line: tab.cursorLine,
        column: tab.cursorColumn,
        scrollTop: tab.scrollTop,
      };

      setTimeout(() => {
        const model = ed.getModel();
        const lineCount = model?.getLineCount() ?? viewState.line;
        const safeLine = Math.max(1, Math.min(viewState.line, lineCount));
        const maxColumn = model?.getLineMaxColumn(safeLine) ?? viewState.column;
        const safeColumn = Math.max(1, Math.min(viewState.column, maxColumn));
        isRestoringViewStateRef.current = true;
        if (restoreGuardTimerRef.current) {
          clearTimeout(restoreGuardTimerRef.current);
        }

        ed.setPosition({ lineNumber: safeLine, column: safeColumn });

        if (viewState.scrollTop > 0) {
          ed.setScrollTop(viewState.scrollTop);
        } else if (revealInCenter) {
          ed.revealLineInCenter(safeLine);
        } else {
          ed.revealLine(safeLine);
        }

        setCursorPosition(safeLine, safeColumn);
        restoreGuardTimerRef.current = setTimeout(() => {
          isRestoringViewStateRef.current = false;
          restoreGuardTimerRef.current = null;
        }, 0);
      }, 0);
    },
    [getTabViewState, setCursorPosition]
  );

  const persistEditorViewState = useCallback(
    (tab: FileTab | null) => {
      const ed = editorRef.current;
      if (!ed || !tab) return;

      const pos = ed.getPosition();
      if (pos) {
        updateCursorPosition(groupId, tab.id, pos.lineNumber, pos.column);
      }
      updateScrollPosition(groupId, tab.id, ed.getScrollTop());
    },
    [groupId, updateCursorPosition, updateScrollPosition]
  );

  const stopStreakCooldown = useCallback(() => {
    if (streakCooldownRef.current) {
      clearInterval(streakCooldownRef.current);
      streakCooldownRef.current = null;
    }
  }, []);

  const scheduleStreakDecay = useCallback(() => {
    if (streakPauseTimerRef.current) {
      clearTimeout(streakPauseTimerRef.current);
    }
    streakPauseTimerRef.current = setTimeout(() => {
      stopStreakCooldown();
      const steps = 12;
      const start = streakRef.current;
      if (start <= 0) {
        setTypingStreakVisible(false);
        return;
      }
      let step = 0;
      streakCooldownRef.current = setInterval(() => {
        step += 1;
        const next = Math.max(0, Math.round(start * (1 - step / steps)));
        streakRef.current = next;
        setTypingStreak(next);
        if (step >= steps || next <= 0) {
          stopStreakCooldown();
          setTypingStreakVisible(false);
        }
      }, 42);
    }, 2000);
  }, [stopStreakCooldown]);

  const insertSnippetIntoEditor = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    const selection = ed.getSelection();
    if (!selection) return;

    const processedText = text.replace(/\$\{1:TIMESTAMP\}/g, formatTimestamp());
    const contribution = ed.getContribution('snippetController2') as any;
    if (contribution) {
      contribution.insert(processedText);
      return;
    }

    ed.executeEdits('snippet', [{
      range: selection,
      text: processedText.replace(/\$\{\d+(?::([^}]*))?\}/g, '$1').replace(/\$\d+/g, ''),
      forceMoveMarkers: true,
    }]);
  }, []);

  const handleFocus = useCallback(() => {
    setFocusedPanel('editor');
    if (groupId !== activeGroupId) {
      setActiveGroup(groupId);
    }
    if (editorRef.current && monacoRef.current) {
      setActiveEditor(editorRef.current, monacoRef.current);
      setInsertSnippetFn(insertSnippetIntoEditor);
    }
  }, [activeGroupId, groupId, insertSnippetIntoEditor, setActiveGroup, setFocusedPanel, setInsertSnippetFn]);

  // Drop zone on the entire editor group
  const handleGroupDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(TAB_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  }, []);

  const handleGroupDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container itself
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleGroupDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(TAB_DRAG_TYPE);
    if (!raw) return;
    try {
      const { sourceGroupId, tabId } = JSON.parse(raw);
      if (sourceGroupId !== groupId) {
        moveTab(sourceGroupId, tabId, groupId);
      }
    } catch {}
  }, [groupId, moveTab]);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register editor color scheme
      try {
        monaco.editor.defineTheme(currentScheme.id, currentScheme.monacoTheme as editor.IStandaloneThemeData);
        monaco.editor.setTheme(currentScheme.id);
      } catch {
        // theme already registered
      }

      // Register snippet completion provider for C++ ONCE globally
      if (!snippetsRegistered) {
        snippetsRegistered = true;
        monaco.languages.registerCompletionItemProvider('cpp', {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            const allSnippets = getAllSnippets();
            const suggestions = allSnippets.map((s) => ({
              label: s.prefix,
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: s.description,
              insertText: s.body.replace(/\$\{1:TIMESTAMP\}/g, formatTimestamp()),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            }));
            return { suggestions };
          },
        });
      }

      if (groupId === activeGroupId) {
        setActiveEditor(editor, monaco);
        setInsertSnippetFn(insertSnippetIntoEditor);
      }

      // Ctrl+S save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        if (activeTab?.path) {
          try {
            useUIStore.getState().startSavingIndicator();
            const content = editor.getValue();
            await writeFileContent(activeTab.path, content);
            markSaved(activeTab.path);
            useUIStore.getState().finishSavingIndicator();
            success('File saved');
          } catch (err) {
            useUIStore.getState().resetSavingIndicator();
            error('Failed to save file');
          }
        }
      });

      editor.onDidFocusEditorText(() => {
        handleFocus();
      });

      // Track cursor position for status bar and store
      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition(e.position.lineNumber, e.position.column);
        if (isRestoringViewStateRef.current) return;
        if (activeTab) {
          updateCursorPosition(groupId, activeTab.id, e.position.lineNumber, e.position.column);
        }
      });

      editor.onDidScrollChange((e) => {
        if (isRestoringViewStateRef.current) return;
        if (activeTab) {
          updateScrollPosition(groupId, activeTab.id, e.scrollTop);
        }
      });

      editor.onDidChangeModelContent((e) => {
        if (!e.changes || e.changes.length === 0) return;
        if (streakCooldownRef.current) {
          clearInterval(streakCooldownRef.current);
          streakCooldownRef.current = null;
        }
        streakRef.current += 1;
        setTypingStreak(streakRef.current);
        setTypingStreakVisible(true);
        scheduleStreakDecay();
      });

      restoreEditorViewState(activeTab);
      lastLocalContentRef.current = activeTab?.content ?? editor.getValue();

      // Set initial cursor position for status bar
      const pos = editor.getPosition();
      if (pos) {
        setCursorPosition(pos.lineNumber, pos.column);
      }
    },
    [
      activeGroupId,
      activeTab,
      currentScheme,
      error,
      groupId,
      handleFocus,
      insertSnippetIntoEditor,
      markSaved,
      restoreEditorViewState,
      scheduleStreakDecay,
      setCursorPosition,
      setInsertSnippetFn,
      success,
      updateCursorPosition,
      updateScrollPosition,
    ]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
        lastLocalContentRef.current = value;
        updateTabContent(activeTab.id, value);
        if (activeTab.path) {
          triggerAutoSave(activeTab.path, value);
        }
      }
    },
    [activeTab, updateTabContent, triggerAutoSave]
  );

  // Apply editor color scheme changes
  const handleEditorBeforeMount = useCallback(
    (monaco: typeof import('monaco-editor')) => {
      monacoRef.current = monaco;
      try {
        monaco.editor.defineTheme(currentScheme.id, currentScheme.monacoTheme as editor.IStandaloneThemeData);
      } catch {}
    },
    [currentScheme]
  );

  // Restore cursor and scroll state when switching tabs.
  useEffect(() => {
    if (activeTab) {
      const viewState = getTabViewState(activeTab) ?? {
        line: activeTab.cursorLine,
        column: activeTab.cursorColumn,
        scrollTop: activeTab.scrollTop,
      };
      lastLocalContentRef.current = activeTab.content;
      restoreEditorViewState(activeTab, true);
      setCursorPosition(viewState.line, viewState.column);
    }
  }, [activeTab?.id, activeTab?.path, getTabViewState, restoreEditorViewState, setCursorPosition]);

  // If the file content is refreshed from disk, restore the previous view state.
  useEffect(() => {
    if (!activeTab) return;
    if (lastLocalContentRef.current === activeTab.content) return;

    restoreEditorViewState(activeTab);
    lastLocalContentRef.current = activeTab.content;
  }, [activeTab?.content, activeTab?.id, activeTab?.path, restoreEditorViewState]);

  useEffect(() => {
    if (groupId !== activeGroupId) return;
    if (!editorRef.current || !monacoRef.current) return;
    setActiveEditor(editorRef.current, monacoRef.current);
    setInsertSnippetFn(insertSnippetIntoEditor);
  }, [activeGroupId, groupId, insertSnippetIntoEditor, setInsertSnippetFn]);

  useEffect(() => {
    return () => {
      persistEditorViewState(activeTab);
    };
  }, [activeTab?.id, activeTab?.path, persistEditorViewState]);

  useEffect(() => {
    if (!activeTabId) return;
    if (previousActiveTabRef.current && previousActiveTabRef.current !== activeTabId) {
      setEditorSwitching(true);
      const timer = setTimeout(() => setEditorSwitching(false), 150);
      previousActiveTabRef.current = activeTabId;
      return () => clearTimeout(timer);
    }
    previousActiveTabRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    return () => {
      if (streakPauseTimerRef.current) {
        clearTimeout(streakPauseTimerRef.current);
      }
      if (streakCooldownRef.current) {
        clearInterval(streakCooldownRef.current);
      }
      if (restoreGuardTimerRef.current) {
        clearTimeout(restoreGuardTimerRef.current);
      }
    };
  }, []);

  const handleSplitH = useCallback(() => {
    splitGroup(groupId, 'horizontal');
  }, [groupId, splitGroup]);

  const handleSplitV = useCallback(() => {
    splitGroup(groupId, 'vertical');
  }, [groupId, splitGroup]);

  const handleCloseGroup = useCallback(() => {
    removeGroup(groupId);
  }, [groupId, removeGroup]);

  if (tabs.length === 0) {
    return (
      <div
        className={`editor-container ${isDragOver ? 'drag-over' : ''} ${focusedPanel === 'editor' ? 'focused' : ''}`}
        onClick={handleFocus}
        onMouseDown={handleFocus}
        onDragOver={handleGroupDragOver}
        onDragLeave={handleGroupDragLeave}
        onDrop={handleGroupDrop}
      >
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div
      className={`editor-container ${isDragOver ? 'drag-over' : ''} ${focusedPanel === 'editor' ? 'focused' : ''}`}
      onClick={handleFocus}
      onMouseDown={handleFocus}
      onDragOver={handleGroupDragOver}
      onDragLeave={handleGroupDragLeave}
      onDrop={handleGroupDrop}
    >
      <div className="tab-bar-wrapper">
        <TabBar groupId={groupId} tabs={tabs} activeTabId={activeTabId} />
        <div className="tab-bar-actions">
          <button className="icon-btn" onClick={handleSplitH} title="Split Right">
            <VscSplitHorizontal />
          </button>
          <button className="icon-btn" onClick={handleSplitV} title="Split Down">
            <VscSplitVertical />
          </button>
          {totalGroups > 1 && (
            <button className="icon-btn" onClick={handleCloseGroup} title="Close Group">
              <VscClose />
            </button>
          )}
        </div>
      </div>
      {activeTab ? (
        <div className={`editor-pane ${editorSwitching ? 'switching' : ''}`} style={{ position: 'relative' }}>
          <div
            className="editor-drag-overlay"
            style={{ pointerEvents: isTabDragActive ? 'all' : 'none', opacity: (isDragOver || isTabDragActive) ? 1 : 0 }}
            onDragOver={handleGroupDragOver}
            onDragLeave={handleGroupDragLeave}
            onDrop={handleGroupDrop}
          />
          <div
            className={`typing-streak ${typingStreakVisible ? 'active' : ''} ${
              typingStreak >= 200
                ? 'tier-ultra'
                : typingStreak >= 100
                  ? 'tier-hot'
                  : typingStreak >= 50
                    ? 'tier-warm'
                    : typingStreak >= 10
                      ? 'tier-mild'
                      : ''
            }`}
          >
            {typingStreak}
          </div>
          <div className={`monaco-wrapper ${settings.editor.fontStyle === 'italic' ? 'font-italic' : ''}`}>
            <Editor
              key={activeTab.id}
              height="100%"
              language={activeTab.language}
              value={activeTab.content}
              theme={currentScheme.id}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              beforeMount={handleEditorBeforeMount}
              options={{
                fontSize: settings.editor.fontSize,
                fontFamily: settings.editor.fontFamily,
                fontLigatures: settings.editor.fontLigatures,
                fontWeight: settings.editor.fontWeight as any,
                lineHeight: Math.round(settings.editor.fontSize * settings.editor.lineHeight),
                tabSize: settings.editor.tabSize,
                insertSpaces: settings.editor.insertSpaces,
                wordWrap: settings.editor.wordWrap as 'on' | 'off' | 'wordWrapColumn' | 'bounded',
                wordWrapColumn: settings.editor.wordWrapColumn,
                minimap: { enabled: settings.editor.minimap },
                lineNumbers: settings.editor.lineNumbers as editor.IEditorOptions['lineNumbers'],
                renderWhitespace: settings.editor.renderWhitespace as 'all' | 'none' | 'boundary' | 'selection' | 'trailing',
                bracketPairColorization: { enabled: settings.editor.bracketPairColorization },
                autoClosingBrackets: settings.editor.autoClosingBrackets,
                autoClosingQuotes: settings.editor.autoClosingQuotes,
                formatOnPaste: settings.editor.formatOnPaste,
                formatOnType: settings.editor.formatOnType,
                smoothScrolling: settings.editor.smoothScrolling,
                cursorSmoothCaretAnimation: 'on' as any,
                cursorWidth: settings.editor.cursorWidth,
                cursorBlinking: settings.editor.cursorBlinking as editor.IEditorOptions['cursorBlinking'],
                cursorStyle: settings.editor.cursorStyle as editor.IEditorOptions['cursorStyle'],
                renderLineHighlight: 'all',
                mouseWheelZoom: false,
                stickyScroll: { enabled: settings.editor.stickyScroll },
                linkedEditing: settings.editor.linkedEditing,
                guides: {
                  indentation: settings.editor.guides.indentation,
                  bracketPairs: settings.editor.guides.bracketPairs,
                },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
                suggest: {
                  showSnippets: settings.editor.snippetSuggestions !== 'none',
                  snippetsPreventQuickSuggestions: false,
                },
                snippetSuggestions: settings.editor.snippetSuggestions,
                suggestOnTriggerCharacters: settings.editor.suggestOnTriggerCharacters,
                acceptSuggestionOnEnter: settings.editor.acceptSuggestionOnEnter,
                quickSuggestions: true,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WelcomeScreen() {
  const rows = [
    ['Ctrl+O', 'Open File'],
    ['Ctrl+Shift+P', 'Command Palette'],
    ['Ctrl+P', 'Quick Open'],
    ['Ctrl+B', 'Compile & Run'],
    ['Ctrl+Shift+B', 'Compile'],
    ['Ctrl+K', 'Kill Process'],
  ] as const;

  return (
    <div className="editor-welcome">
      <div className="editor-welcome-logo">Doom Code</div>
      <div className="editor-welcome-subtitle">Competitive Programming IDE</div>
      <div className="editor-welcome-shortcuts">
        {rows.map(([key, label], idx) => (
          <div key={key} className="editor-welcome-row" style={{ animationDelay: `${idx * 60}ms` }}>
            <span className="editor-welcome-key">{key}</span>
            <span className="editor-welcome-desc">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
