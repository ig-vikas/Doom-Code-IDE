import { useCallback, useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore, useThemeStore, useSettingsStore, useEditorSchemeStore } from '../stores';
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
  const totalGroups = useEditorStore((s) => s.getAllGroups().length);
  const setInsertSnippetFn = useEditorStore((s) => s.setInsertSnippetFn);
  const setCursorPosition = useEditorStore((s) => s.setCursorPosition);
  const getAllSnippets = useSnippetStore((s) => s.getAllSnippets);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const currentScheme = useEditorSchemeStore((s) => s.currentScheme);
  const settings = useSettingsStore((s) => s.settings);
  const success = useNotificationStore((s) => s.success);
  const error = useNotificationStore((s) => s.error);
  const { triggerAutoSave } = useAutoSave();
  const [isDragOver, setIsDragOver] = useState(false);
  const isTabDragActive = useGlobalDragActive();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const handleFocus = useCallback(() => {
    if (groupId !== activeGroupId) {
      setActiveGroup(groupId);
    }
  }, [groupId, activeGroupId, setActiveGroup]);

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

      // Set as active editor for command service
      setActiveEditor(editor, monaco);

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

      // Wire up snippet insertion from sidebar panel
      setInsertSnippetFn((text: string) => {
        const ed = editorRef.current;
        const mon = monacoRef.current;
        if (ed && mon) {
          ed.focus();
          const selection = ed.getSelection();
          if (selection) {
            // Replace TIMESTAMP placeholder and insert as snippet
            const processedText = text.replace(/\$\{1:TIMESTAMP\}/g, formatTimestamp());
            const contribution = ed.getContribution('snippetController2') as any;
            if (contribution) {
              contribution.insert(processedText);
            } else {
              ed.executeEdits('snippet', [{
                range: selection,
                text: processedText.replace(/\$\{\d+(?::([^}]*))?\}/g, '$1').replace(/\$\d+/g, ''),
                forceMoveMarkers: true,
              }]);
            }
          }
        }
      });

      // Ctrl+S save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        if (activeTab?.path) {
          try {
            const content = editor.getValue();
            await writeFileContent(activeTab.path, content);
            markSaved(activeTab.path);
            success('File saved');
          } catch (err) {
            error('Failed to save file');
          }
        }
      });

      editor.onDidFocusEditorText(() => {
        handleFocus();
        setActiveEditor(editor, monaco);
      });

      // Track cursor position for status bar and store
      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition(e.position.lineNumber, e.position.column);
        if (activeTab) {
          updateCursorPosition(groupId, activeTab.id, e.position.lineNumber, e.position.column);
        }
      });

      // Restore cursor position from tab data
      if (activeTab && activeTab.cursorLine && activeTab.cursorColumn) {
        editor.setPosition({ lineNumber: activeTab.cursorLine, column: activeTab.cursorColumn });
        editor.revealLine(activeTab.cursorLine);
      }

      // Set initial cursor position for status bar
      const pos = editor.getPosition();
      if (pos) {
        setCursorPosition(pos.lineNumber, pos.column);
      }
    },
    [currentScheme, activeTab, markSaved, success, error, handleFocus, setCursorPosition]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
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
        className={`editor-container ${isDragOver ? 'drag-over' : ''}`}
        onClick={handleFocus}
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
      className={`editor-container ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleFocus}
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
        <div className="editor-pane" style={{ position: 'relative' }}>
          <div
            className="editor-drag-overlay"
            style={{ pointerEvents: isTabDragActive ? 'all' : 'none', opacity: (isDragOver || isTabDragActive) ? 1 : 0 }}
            onDragOver={handleGroupDragOver}
            onDragLeave={handleGroupDragLeave}
            onDrop={handleGroupDrop}
          />
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
              fontWeight: settings.editor.fontWeight as any,
              tabSize: settings.editor.tabSize,
              wordWrap: settings.editor.wordWrap as 'on' | 'off' | 'wordWrapColumn' | 'bounded',
              minimap: { enabled: settings.editor.minimap },
              lineNumbers: settings.editor.lineNumbers as editor.IEditorOptions['lineNumbers'],
              renderWhitespace: settings.editor.renderWhitespace as 'all' | 'none' | 'boundary' | 'selection' | 'trailing',
              bracketPairColorization: { enabled: settings.editor.bracketPairColorization },
              smoothScrolling: settings.editor.smoothScrolling,
              cursorBlinking: settings.editor.cursorBlinking as editor.IEditorOptions['cursorBlinking'],
              cursorStyle: settings.editor.cursorStyle as editor.IEditorOptions['cursorStyle'],
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
              suggest: { showSnippets: true },
              quickSuggestions: true,
            }}
            {...(settings.editor.fontStyle === 'italic' ? { style: { fontStyle: 'italic' } } : {})}
          />
        </div>
      ) : null}
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="editor-welcome">
      <div className="editor-welcome-logo">Doom Code</div>
      <div className="editor-welcome-subtitle">Competitive Programming IDE</div>
      <div className="editor-welcome-shortcuts">
        <span className="editor-welcome-key">Ctrl+O</span>
        <span className="editor-welcome-desc">Open File</span>
        <span className="editor-welcome-key">Ctrl+Shift+P</span>
        <span className="editor-welcome-desc">Command Palette</span>
        <span className="editor-welcome-key">Ctrl+P</span>
        <span className="editor-welcome-desc">Quick Open</span>
        <span className="editor-welcome-key">Ctrl+B</span>
        <span className="editor-welcome-desc">Toggle Sidebar</span>
        <span className="editor-welcome-key">F5</span>
        <span className="editor-welcome-desc">Build & Run</span>
        <span className="editor-welcome-key">Ctrl+Shift+B</span>
        <span className="editor-welcome-desc">Compile</span>
      </div>
    </div>
  );
}
