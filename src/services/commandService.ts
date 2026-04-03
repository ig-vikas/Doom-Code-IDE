import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { useBuildStore } from '../stores/buildStore';
import { useThemeStore } from '../stores/themeStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileExplorerStore } from '../stores/fileExplorerStore';
import { useNotificationStore } from '../stores/notificationStore';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFileContent, writeFileContent, readDirectory } from './fileService';
import { compileCpp, runExecutable, killRunningProcess } from './buildService';
import { runShellCommand } from './systemService';
import { saveConfig, loadConfig } from './configService';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { generateId, getFileName, getFileExtension, getLanguageFromExtension, getDirectory } from '../utils/fileUtils';

type CommandHandler = () => void | Promise<void>;

const registry = new Map<string, CommandHandler>();

// Reference to active Monaco editor
let activeEditor: any = null;
let activeMonaco: any = null;

export function setActiveEditor(editor: any, monaco: any) {
  activeEditor = editor;
  activeMonaco = monaco;
}

export function getActiveEditor() {
  return activeEditor;
}

export function getActiveMonaco() {
  return activeMonaco;
}

export function registerCommand(id: string, handler: CommandHandler) {
  registry.set(id, handler);
}

export function executeCommand(id: string) {
  const handler = registry.get(id);
  if (handler) {
    try {
      const result = handler();
      if (result instanceof Promise) {
        result.catch((err) => console.error(`Command '${id}' failed:`, err));
      }
    } catch (err) {
      console.error(`Command '${id}' failed:`, err);
    }
  } else {
    console.warn(`Unknown command: ${id}`);
  }
}

export function hasCommand(id: string): boolean {
  return registry.has(id);
}

// Helpers
function findLeaf(node: any, id: string): any {
  if (!node) return null;
  if (node.type === 'leaf' && node.id === id) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findLeaf(child, id);
      if (found) return found;
    }
  }
  return null;
}

function getAllLeaves(node: any): any[] {
  if (!node) return [];
  if (node.type === 'leaf') return [node];
  if (node.type === 'split') return node.children.flatMap(getAllLeaves);
  return [];
}

function getActiveGroupAndTab() {
  const state = useEditorStore.getState();
  const group = findLeaf(state.layout, state.activeGroupId);
  if (!group || group.type !== 'leaf') return { group: null, tab: null };
  const tab = group.tabs.find((t: any) => t.id === group.activeTabId) ?? null;
  return { group, tab };
}

function countDiagnostics(stderr: string | undefined | null): { warnings: number; errors: number } {
  const text = stderr ?? '';
  const warnings = (text.match(/\bwarning\b\s*:/gi) ?? []).length;
  const errors = (text.match(/\berror\b\s*:/gi) ?? []).length;
  return { warnings, errors };
}

const CP_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

#ifdef LOCAL
#define dbg(...) cerr << "[" << #__VA_ARGS__ << "]: " << (__VA_ARGS__) << endl
#else
#define dbg(...)
#endif

void solve() {
    
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    int t = 1;
    // cin >> t;
    while (t--) solve();
    
    return 0;
}
`;

export function initializeCommands() {
  // ======================== FILE ========================
  registerCommand('file.newFile', () => {
    const store = useEditorStore.getState();
    const id = generateId();
    store.openTab(store.activeGroupId, {
      id,
      path: '',
      name: 'Untitled',
      content: '',
      isModified: false,
      isPinned: false,
      isPreview: false,
      cursorLine: 1,
      cursorColumn: 1,
      scrollTop: 0,
      language: 'plaintext',
    });
  });

  registerCommand('file.newCPFile', () => {
    const store = useEditorStore.getState();
    const id = generateId();
    store.openTab(store.activeGroupId, {
      id,
      path: '',
      name: 'solution.cpp',
      content: CP_TEMPLATE,
      isModified: true,
      isPinned: false,
      isPreview: false,
      cursorLine: 12,
      cursorColumn: 5,
      scrollTop: 0,
      language: 'cpp',
    });
  });

  registerCommand('file.openFile', async () => {
    try {
      const selected = await open({
        filters: [
          { name: 'C++ Files', extensions: ['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        multiple: true,
      });
      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        for (const filePath of files) {
          if (typeof filePath === 'string') {
            const content = await readFileContent(filePath);
            const store = useEditorStore.getState();
            const name = getFileName(filePath);
            const ext = getFileExtension(filePath);
            store.openTab(store.activeGroupId, {
              id: filePath,
              path: filePath,
              name,
              content,
              isModified: false,
              isPinned: false,
              isPreview: false,
              cursorLine: 1,
              cursorColumn: 1,
              scrollTop: 0,
              language: getLanguageFromExtension(ext),
            });
          }
        }
      }
    } catch (err) {
      useNotificationStore.getState().error('Failed to open file: ' + String(err));
    }
  });

  registerCommand('file.openFolder', async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') {
        const store = useFileExplorerStore.getState();
        store.setLoading(true);
        const parts = selected.replace(/\\/g, '/').split('/');
        const name = parts[parts.length - 1] || selected;
        store.setRootPath(selected, name);
        const entries = await readDirectory(selected);
        store.setTree(entries);
        store.setLoading(false);
        useUIStore.getState().setSidebarView('explorer');
      }
    } catch (err) {
      useNotificationStore.getState().error('Failed to open folder');
      useFileExplorerStore.getState().setLoading(false);
    }
  });

  registerCommand('file.save', async () => {
    const { tab } = getActiveGroupAndTab();
    if (!tab) return;

    if (tab.path) {
      try {
        useUIStore.getState().startSavingIndicator();
        await writeFileContent(tab.path, tab.content);
        useEditorStore.getState().markSaved(tab.path);
        useUIStore.getState().finishSavingIndicator();
        useNotificationStore.getState().success('File saved');
      } catch (err) {
        useUIStore.getState().resetSavingIndicator();
        useNotificationStore.getState().error('Failed to save file');
      }
    } else {
      executeCommand('file.saveAs');
    }
  });

  registerCommand('file.saveAs', async () => {
    const { group, tab } = getActiveGroupAndTab();
    if (!tab || !group) return;
    try {
      const filePath = await save({
        filters: [
          { name: 'C++ Files', extensions: ['cpp', 'cc', 'c', 'h', 'hpp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        defaultPath: tab.name,
      });
      if (filePath) {
        useUIStore.getState().startSavingIndicator();
        await writeFileContent(filePath, tab.content);
        useEditorStore.getState().markTabSaved(group.id, tab.id, filePath);
        useUIStore.getState().finishSavingIndicator();
        useNotificationStore.getState().success('File saved as ' + getFileName(filePath));
      }
    } catch (err) {
      useUIStore.getState().resetSavingIndicator();
      useNotificationStore.getState().error('Failed to save file');
    }
  });

  registerCommand('file.saveAll', async () => {
    const state = useEditorStore.getState();
    const groups = getAllLeaves(state.layout);
    let saved = 0;
    let started = false;
    for (const g of groups) {
      for (const tab of g.tabs) {
        if (tab.isModified && tab.path) {
          try {
            if (!started) {
              started = true;
              useUIStore.getState().startSavingIndicator();
            }
            await writeFileContent(tab.path, tab.content);
            useEditorStore.getState().markSaved(tab.path);
            saved++;
          } catch {}
        }
      }
    }
    if (saved > 0) {
      useUIStore.getState().finishSavingIndicator();
      useNotificationStore.getState().success(`Saved ${saved} file${saved > 1 ? 's' : ''}`);
    } else {
      useUIStore.getState().resetSavingIndicator();
    }
  });

  registerCommand('file.closeTab', () => {
    const state = useEditorStore.getState();
    const group = findLeaf(state.layout, state.activeGroupId);
    if (group && group.type === 'leaf' && group.activeTabId) {
      state.closeTab(state.activeGroupId, group.activeTabId);
    }
  });

  registerCommand('file.closeWindow', async () => {
    await getCurrentWindow().close();
  });

  registerCommand('file.newWindow', () => {
    useNotificationStore.getState().info('New Window is not supported in this version');
  });

  registerCommand('file.reopenClosedTab', () => {
    useEditorStore.getState().reopenClosedTab();
  });

  registerCommand('file.nextTab', () => {
    const state = useEditorStore.getState();
    state.nextTab(state.activeGroupId);
  });

  registerCommand('file.previousTab', () => {
    const state = useEditorStore.getState();
    state.previousTab(state.activeGroupId);
  });

  for (let i = 1; i <= 9; i++) {
    registerCommand(`file.goToTab${i}`, () => {
      const state = useEditorStore.getState();
      state.goToTab(state.activeGroupId, i - 1);
    });
  }

  // ======================== EDIT ========================
  const monacoAction = (actionId: string) => () => {
    if (activeEditor) {
      const action = activeEditor.getAction(actionId);
      if (action) {
        action.run();
      }
    }
  };

  registerCommand('edit.undo', () => activeEditor?.trigger('keyboard', 'undo', null));
  registerCommand('edit.redo', () => activeEditor?.trigger('keyboard', 'redo', null));
  registerCommand('edit.cut', () => { document.execCommand('cut'); });
  registerCommand('edit.copy', () => { document.execCommand('copy'); });
  registerCommand('edit.paste', () => { document.execCommand('paste'); });
  registerCommand('edit.deleteLine', monacoAction('editor.action.deleteLines'));
  registerCommand('edit.duplicateLine', monacoAction('editor.action.copyLinesDownAction'));
  registerCommand('edit.moveLineUp', monacoAction('editor.action.moveLinesUpAction'));
  registerCommand('edit.moveLineDown', monacoAction('editor.action.moveLinesDownAction'));
  registerCommand('edit.toggleComment', monacoAction('editor.action.commentLine'));
  registerCommand('edit.toggleBlockComment', monacoAction('editor.action.blockComment'));
  registerCommand('edit.insertLineAfter', monacoAction('editor.action.insertLineAfter'));
  registerCommand('edit.insertLineBefore', monacoAction('editor.action.insertLineBefore'));
  registerCommand('edit.indentLine', monacoAction('editor.action.indentLines'));
  registerCommand('edit.outdentLine', monacoAction('editor.action.outdentLines'));
  registerCommand('edit.upperCase', monacoAction('editor.action.transformToUppercase'));
  registerCommand('edit.lowerCase', monacoAction('editor.action.transformToLowercase'));
  registerCommand('edit.joinLines', monacoAction('editor.action.joinLines'));

  // ======================== SELECTION ========================
  registerCommand('selection.addNextOccurrence', monacoAction('editor.action.addSelectionToNextFindMatch'));
  registerCommand('selection.selectAllOccurrences', monacoAction('editor.action.selectHighlights'));
  registerCommand('selection.skipOccurrence', monacoAction('editor.action.moveSelectionToNextFindMatch'));
  registerCommand('selection.selectLine', monacoAction('expandLineSelection'));
  registerCommand('selection.splitIntoLines', monacoAction('editor.action.insertCursorAtEndOfEachLineSelected'));
  registerCommand('selection.expandToBrackets', monacoAction('editor.action.selectToBracket'));
  registerCommand('selection.addCursorAbove', monacoAction('editor.action.insertCursorAbove'));
  registerCommand('selection.addCursorBelow', monacoAction('editor.action.insertCursorBelow'));
  registerCommand('selection.singleCursor', () => {
    // Escape - remove multi-cursors
  });

  // ======================== NAVIGATION ========================
  registerCommand('navigation.commandPalette', () => {
    useUIStore.getState().toggleCommandPalette();
  });

  registerCommand('navigation.quickOpen', () => {
    useUIStore.getState().toggleQuickOpen();
  });

  registerCommand('navigation.goToLine', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.gotoLine', null);
    }
  });

  registerCommand('navigation.goToSymbol', monacoAction('editor.action.quickOutline'));
  registerCommand('navigation.goToMatchingBracket', monacoAction('editor.action.jumpToBracket'));
  registerCommand('navigation.goBack', () => {});
  registerCommand('navigation.goForward', () => {});
  registerCommand('navigation.toggleBookmark', () => {});
  registerCommand('navigation.nextBookmark', () => {});
  registerCommand('navigation.previousBookmark', () => {});

  // ======================== SEARCH ========================
  registerCommand('search.find', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'actions.find', null);
    }
  });

  registerCommand('search.findReplace', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  });

  registerCommand('search.findInFiles', () => {
    useUIStore.getState().setSidebarView('search');
  });

  registerCommand('search.findNext', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.nextMatchFindAction', null);
    }
  });

  registerCommand('search.findPrevious', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.previousMatchFindAction', null);
    }
  });

  registerCommand('search.findWordUnderCursor', monacoAction('editor.action.addSelectionToNextFindMatch'));
  registerCommand('search.replaceAll', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  });

  // ======================== VIEW ========================
  registerCommand('view.toggleSidebar', () => {
    useUIStore.getState().toggleSidebar();
  });

  registerCommand('view.toggleTerminal', () => {
    const ui = useUIStore.getState();
    ui.setBottomPanelVisible(!ui.bottomPanelVisible);
  });

  registerCommand('view.newTerminal', () => {
    const ui = useUIStore.getState();
    ui.setBottomPanelVisible(true);
  });

  registerCommand('view.toggleFullscreen', async () => {
    const win = getCurrentWindow();
    const isFS = await win.isFullscreen();
    await win.setFullscreen(!isFS);
  });

  registerCommand('view.zoomIn', () => useUIStore.getState().zoomIn());
  registerCommand('view.zoomOut', () => useUIStore.getState().zoomOut());
  registerCommand('view.zoomReset', () => useUIStore.getState().resetZoom());

  registerCommand('view.toggleZenMode', () => {
    const ui = useUIStore.getState();
    ui.setSidebarVisible(!ui.sidebarVisible);
    ui.setBottomPanelVisible(!ui.bottomPanelVisible);
  });

  registerCommand('view.layoutSingle', () => {
    // TODO: collapse to single group
  });

  registerCommand('view.layoutTwoColumns', () => {
    const state = useEditorStore.getState();
    state.splitGroup(state.activeGroupId, 'horizontal');
  });

  registerCommand('view.layoutThreeColumns', () => {
    const state = useEditorStore.getState();
    state.splitGroup(state.activeGroupId, 'horizontal');
  });

  registerCommand('view.layoutGrid', () => {
    const state = useEditorStore.getState();
    state.splitGroup(state.activeGroupId, 'horizontal');
  });

  registerCommand('view.layoutTwoRows', () => {
    const state = useEditorStore.getState();
    state.splitGroup(state.activeGroupId, 'vertical');
  });

  registerCommand('view.focusGroup1', () => {
    const groups = getAllLeaves(useEditorStore.getState().layout);
    if (groups[0]) useEditorStore.getState().setActiveGroup(groups[0].id);
  });
  registerCommand('view.focusGroup2', () => {
    const groups = getAllLeaves(useEditorStore.getState().layout);
    if (groups[1]) useEditorStore.getState().setActiveGroup(groups[1].id);
  });
  registerCommand('view.focusGroup3', () => {
    const groups = getAllLeaves(useEditorStore.getState().layout);
    if (groups[2]) useEditorStore.getState().setActiveGroup(groups[2].id);
  });
  registerCommand('view.focusGroup4', () => {
    const groups = getAllLeaves(useEditorStore.getState().layout);
    if (groups[3]) useEditorStore.getState().setActiveGroup(groups[3].id);
  });

  // ======================== BUILD ========================
  registerCommand('build.compileAndRun', async () => {
    await doBuildAndRun(true);
  });

  registerCommand('build.compileOnly', async () => {
    await doBuildAndRun(false);
  });

  registerCommand('build.runOnly', async () => {
    await doBuildAndRun(true);
  });

  registerCommand('build.build', async () => {
    await doBuildAndRun(false);
  });

  registerCommand('build.buildWith', async () => {
    await doBuildAndRun(false);
  });

  registerCommand('build.killProcess', async () => {
    try {
      useBuildStore.getState().setKilled(true);
      await killRunningProcess();
      useBuildStore.getState().setRunning(false);
      useBuildStore.getState().setCompiling(false);
      useBuildStore.getState().setBuildVisualState('idle');
      useNotificationStore.getState().info('Process killed');
    } catch {}
  });

  registerCommand('build.runAllTestCases', async () => {
    await doBuildAndRun(true);
  });

  registerCommand('build.nextError', () => {});
  registerCommand('build.previousError', () => {});

  registerCommand('build.runTestCase1', async () => {
    await doBuildAndRunSingleTest(0);
  });
  registerCommand('build.runTestCase2', async () => {
    await doBuildAndRunSingleTest(1);
  });
  registerCommand('build.runTestCase3', async () => {
    await doBuildAndRunSingleTest(2);
  });

  // ======================== SETTINGS ========================
  registerCommand('settings.openSettings', () => {
    useUIStore.getState().setSettingsOpen(true);
  });

  registerCommand('settings.selectTheme', () => {
    useUIStore.getState().setSettingsOpen(true);
  });

  registerCommand('settings.openKeybindings', () => {
    useUIStore.getState().setSettingsOpen(true);
  });

  registerCommand('about.show', () => {
    useNotificationStore.getState().info(
      'Doom Code v1.0.0 — CP IDE by vikas. \n Built with Tauri, React & Monaco Editor'
    );
  });

  // ======================== FOLD ========================
  registerCommand('fold.foldRegion', monacoAction('editor.fold'));
  registerCommand('fold.unfoldRegion', monacoAction('editor.unfold'));
  registerCommand('fold.foldAll', monacoAction('editor.foldAll'));
  registerCommand('fold.unfoldAll', monacoAction('editor.unfoldAll'));
  registerCommand('fold.foldLevel1', monacoAction('editor.foldLevel1'));
  registerCommand('fold.foldLevel2', monacoAction('editor.foldLevel2'));
  registerCommand('fold.foldLevel3', monacoAction('editor.foldLevel3'));
  registerCommand('fold.foldLevel4', monacoAction('editor.foldLevel4'));
  registerCommand('fold.foldLevel5', monacoAction('editor.foldLevel5'));
}

// ======================== BUILD LOGIC ========================
// Build using active profile flags and compiler settings
async function doBuildAndRun(autoRun: boolean) {
  useBuildStore.getState().setKilled(false);
  useBuildStore.getState().setBuildVisualState('running');
  useBuildStore.getState().setDiagnostics(0, 0);
  const editorState = useEditorStore.getState();
  const buildState = useBuildStore.getState();
  const notify = useNotificationStore.getState();
  const ui = useUIStore.getState();

  const profile = buildState.getActiveProfile();
  const compiler = buildState.compilerPath || 'g++';

  const group = findLeaf(editorState.layout, editorState.activeGroupId);
  if (!group || group.type !== 'leaf' || !group.activeTabId) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error('No active file to compile');
    return;
  }
  const tab = group.tabs.find((t: any) => t.id === group.activeTabId);
  if (!tab) return;

  // Auto-save before build
  if (tab.path && tab.isModified) {
    try {
      useUIStore.getState().startSavingIndicator();
      await writeFileContent(tab.path, tab.content);
      useEditorStore.getState().markSaved(tab.path);
      useUIStore.getState().finishSavingIndicator();
    } catch {
      useUIStore.getState().resetSavingIndicator();
    }
  }

  if (!tab.path) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error('Save the file first before building');
    executeCommand('file.saveAs');
    return;
  }

  const sourcePath = tab.path.replace(/\//g, '\\');
  const fileDir = getDirectory(sourcePath).replace(/\//g, '\\');
  const fileName = getFileName(sourcePath);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const ext = getFileExtension(fileName).toLowerCase();
  if (!['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext)) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error(`Cannot compile .${ext} file — only C/C++ files are supported`);
    return;
  }
  const flags = profile.flags.join(' ');
  const exePath = `${fileDir}\\${baseName}.exe`;

  useBuildStore.getState().setCompiling(true);
  ui.setBottomPanelVisible(true);

  emitTerminalOutput(`\x1b[36m> Building: ${fileName} [${profile.name}]\x1b[0m\r\n`);

  // --- Step 1: Compile ---
  emitTerminalOutput(`\x1b[2m$ ${compiler} ${flags} "${sourcePath}" -o "${exePath}"\x1b[0m\r\n`);

  try {
    const compileResult = await compileCpp(sourcePath, exePath, profile.flags);
    const diagnostics = countDiagnostics(compileResult.stderr);
    useBuildStore.getState().setDiagnostics(
      diagnostics.warnings,
      compileResult.success ? diagnostics.errors : Math.max(1, diagnostics.errors)
    );
    if (!compileResult.success) {
      useBuildStore.getState().setCompiling(false);
      useBuildStore.getState().pulseBuildVisualState('failure');
      notify.error('Compilation failed');
      emitTerminalOutput(`\x1b[31m✗ Compilation failed\x1b[0m\r\n`);
      if (compileResult.stderr) emitTerminalOutput(compileResult.stderr.replace(/\n/g, '\r\n'));
      emitTerminalOutput('\r\n');
      return;
    }
    emitTerminalOutput(`\x1b[32m✓ Compiled successfully (${compileResult.durationMs}ms)\x1b[0m\r\n`);
  } catch (err) {
    useBuildStore.getState().setCompiling(false);
    useBuildStore.getState().setDiagnostics(0, 1);
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error('Compile failed: ' + String(err));
    emitTerminalOutput(`\x1b[31mError: ${String(err)}\x1b[0m\r\n\r\n`);
    return;
  }

  if (!autoRun) {
    useBuildStore.getState().setCompiling(false);
    useBuildStore.getState().pulseBuildVisualState('success');
    notify.success('Compilation successful');
    emitTerminalOutput('\r\n');
    return;
  }

  // --- Step 2: Run based on mode ---
  useBuildStore.getState().setCompiling(false);
  useBuildStore.getState().setRunning(true);

  const mode = profile.mode || 'file';

  if (mode === 'tc') {
    // TC mode: run each test case from the bottom panel
    const testCases = useBuildStore.getState().testCases;
    if (testCases.length === 0) {
      notify.info('No test cases — add them in the Test Cases panel');
      useBuildStore.getState().setRunning(false);
      useBuildStore.getState().setBuildVisualState('idle');
      return;
    }

    useBuildStore.getState().clearAllVerdicts();
    emitTerminalOutput(`\x1b[36m> Running ${testCases.length} test case(s)...\x1b[0m\r\n`);

    for (const tc of testCases) {
      if (useBuildStore.getState().killed) break;
      const startTime = Date.now();
      try {
        const result = await runExecutable(exePath, tc.input, profile.timeLimit);
        if (useBuildStore.getState().killed) break;
        const elapsed = result.durationMs ?? (Date.now() - startTime);
        const actual = result.stdout.replace(/\r\n/g, '\n').trimEnd();
        const expected = tc.expectedOutput.replace(/\r\n/g, '\n').trimEnd();

        let verdict: 'accepted' | 'wrong-answer' | 'time-limit-exceeded' | 'runtime-error';
        if (result.timedOut) {
          verdict = 'time-limit-exceeded';
        } else if (result.exitCode !== 0) {
          verdict = 'runtime-error';
        } else if (expected && actual !== expected) {
          verdict = 'wrong-answer';
        } else {
          verdict = 'accepted';
        }

        useBuildStore.getState().setTestVerdict(tc.id, verdict, result.stdout, elapsed);

        const color = verdict === 'accepted' ? '32' : verdict === 'wrong-answer' ? '31' : verdict === 'time-limit-exceeded' ? '33' : '35';
        emitTerminalOutput(`\x1b[${color}m  ${tc.name}: ${verdict.toUpperCase()} (${elapsed}ms)\x1b[0m\r\n`);
      } catch (err) {
        if (useBuildStore.getState().killed) break;
        useBuildStore.getState().setTestVerdict(tc.id, 'runtime-error', String(err));
        emitTerminalOutput(`\x1b[31m  ${tc.name}: ERROR \u2014 ${String(err)}\x1b[0m\r\n`);
      }
    }

    useBuildStore.getState().setRunning(false);
    if (!useBuildStore.getState().killed) {
      useBuildStore.getState().pulseBuildVisualState('success');
      notify.success('Test run completed');
    } else {
      useBuildStore.getState().setBuildVisualState('idle');
    }
    emitTerminalOutput('\r\n');
    // Refresh open files after test runs
    await refreshAllOpenFiles();
  } else if (mode === 'custom') {
    // Custom mode: run user-defined command with placeholders
    const customCmd = (profile.customCommand || '')
      .replace(/\{file\}/g, sourcePath)
      .replace(/\{exe\}/g, exePath)
      .replace(/\{dir\}/g, fileDir)
      .replace(/\{flags\}/g, flags);

    if (!customCmd) {
      notify.error('No custom command configured for this profile');
      useBuildStore.getState().setRunning(false);
      useBuildStore.getState().pulseBuildVisualState('failure');
      return;
    }

    emitTerminalOutput(`\x1b[2m$ ${customCmd}\x1b[0m\r\n`);

    try {
      const result = await runShellCommand(customCmd, fileDir);
      useBuildStore.getState().setRunning(false);

      if (useBuildStore.getState().killed) {
        useBuildStore.getState().setBuildVisualState('idle');
        emitTerminalOutput('\r\n');
      } else if (result.success) {
        useBuildStore.getState().pulseBuildVisualState('success');
        notify.success('Custom command completed');
        emitTerminalOutput(`\x1b[32m✓ Command completed\x1b[0m\r\n`);
        if (result.stdout) emitTerminalOutput(result.stdout.replace(/\n/g, '\r\n'));
      } else {
        useBuildStore.getState().pulseBuildVisualState('failure');
        notify.error('Custom command failed');
        emitTerminalOutput(`\x1b[31m✗ Command failed\x1b[0m\r\n`);
        if (result.stderr) emitTerminalOutput(result.stderr.replace(/\n/g, '\r\n'));
        if (result.stdout) emitTerminalOutput(result.stdout.replace(/\n/g, '\r\n'));
      }
      emitTerminalOutput('\r\n');
      await refreshAllOpenFiles();
    } catch (err) {
      useBuildStore.getState().setRunning(false);
      if (!useBuildStore.getState().killed) {
        useBuildStore.getState().pulseBuildVisualState('failure');
        notify.error('Custom command failed: ' + String(err));
        emitTerminalOutput(`\x1b[31mError: ${String(err)}\x1b[0m\r\n\r\n`);
      } else {
        useBuildStore.getState().setBuildVisualState('idle');
      }
    }
  } else {
    // File mode (Vikas): run with input.txt > output.txt
    const runCmd = `${baseName}.exe < input.txt > output.txt`;
    emitTerminalOutput(`\x1b[2m$ ${runCmd}\x1b[0m\r\n`);

    try {
      const result = await runShellCommand(runCmd, fileDir);
      useBuildStore.getState().setRunning(false);

      if (useBuildStore.getState().killed) {
        useBuildStore.getState().setBuildVisualState('idle');
        emitTerminalOutput('\r\n');
      } else if (result.success) {
        useBuildStore.getState().pulseBuildVisualState('success');
        notify.success('Run completed — output written to output.txt');
        emitTerminalOutput(`\x1b[32m✓ Run completed — see output.txt\x1b[0m\r\n`);

        // Refresh all open files — picks up output.txt and any other externally changed files
        await refreshAllOpenFiles();
      } else {
        useBuildStore.getState().pulseBuildVisualState('failure');
        notify.error('Run failed');
        emitTerminalOutput(`\x1b[31m✗ Run failed\x1b[0m\r\n`);
        if (result.stderr) emitTerminalOutput(result.stderr.replace(/\n/g, '\r\n'));
        if (result.stdout) emitTerminalOutput(result.stdout.replace(/\n/g, '\r\n'));
      }
      emitTerminalOutput('\r\n');
    } catch (err) {
      useBuildStore.getState().setRunning(false);
      if (!useBuildStore.getState().killed) {
        useBuildStore.getState().pulseBuildVisualState('failure');
        notify.error('Run failed: ' + String(err));
        emitTerminalOutput(`\x1b[31mError: ${String(err)}\x1b[0m\r\n\r\n`);
      } else {
        useBuildStore.getState().setBuildVisualState('idle');
      }
    }
  }
}

async function doBuildAndRunSingleTest(index: number) {
  // For single test case, compile then run just that one
  useBuildStore.getState().setKilled(false);
  useBuildStore.getState().setBuildVisualState('running');
  useBuildStore.getState().setDiagnostics(0, 0);
  const editorState = useEditorStore.getState();
  const buildState = useBuildStore.getState();
  const notify = useNotificationStore.getState();
  const ui = useUIStore.getState();
  const profile = buildState.getActiveProfile();

  const group = findLeaf(editorState.layout, editorState.activeGroupId);
  if (!group || group.type !== 'leaf' || !group.activeTabId) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error('No active file to compile');
    return;
  }
  const tab = group.tabs.find((t: any) => t.id === group.activeTabId);
  if (!tab?.path) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    return;
  }

  if (tab.isModified) {
    try {
      useUIStore.getState().startSavingIndicator();
      await writeFileContent(tab.path, tab.content);
      useEditorStore.getState().markSaved(tab.path);
      useUIStore.getState().finishSavingIndicator();
    } catch {
      useUIStore.getState().resetSavingIndicator();
    }
  }

  const sourcePath = tab.path.replace(/\//g, '\\');
  const fileDir = getDirectory(sourcePath).replace(/\//g, '\\');
  const fileName = getFileName(sourcePath);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const ext = getFileExtension(fileName).toLowerCase();
  if (!['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext)) {
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error(`Cannot compile .${ext} file — only C/C++ files are supported`);
    return;
  }
  const exePath = `${fileDir}\\${baseName}.exe`;

  const testCases = buildState.testCases;
  const tc = testCases[index];
  if (!tc) {
    useBuildStore.getState().setBuildVisualState('idle');
    return;
  }

  useBuildStore.getState().setCompiling(true);
  ui.setBottomPanelVisible(true);

  emitTerminalOutput(`\x1b[36m> Building: ${fileName} [${profile.name}] — ${tc.name}\x1b[0m\r\n`);

  try {
    const compileResult = await compileCpp(sourcePath, exePath, profile.flags);
    const diagnostics = countDiagnostics(compileResult.stderr);
    useBuildStore.getState().setDiagnostics(
      diagnostics.warnings,
      compileResult.success ? diagnostics.errors : Math.max(1, diagnostics.errors)
    );
    useBuildStore.getState().setCompiling(false);
    if (!compileResult.success) {
      useBuildStore.getState().pulseBuildVisualState('failure');
      notify.error('Compilation failed');
      emitTerminalOutput(`\x1b[31m✗ Compilation failed\x1b[0m\r\n`);
      if (compileResult.stderr) emitTerminalOutput(compileResult.stderr.replace(/\n/g, '\r\n'));
      return;
    }
  } catch (err) {
    useBuildStore.getState().setCompiling(false);
    useBuildStore.getState().setDiagnostics(0, 1);
    useBuildStore.getState().pulseBuildVisualState('failure');
    notify.error('Compile failed: ' + String(err));
    return;
  }

  useBuildStore.getState().setRunning(true);
  try {
    const result = await runExecutable(exePath, tc.input, profile.timeLimit);
    if (!useBuildStore.getState().killed) {
      const actual = result.stdout.replace(/\r\n/g, '\n').trimEnd();
      const expected = tc.expectedOutput.replace(/\r\n/g, '\n').trimEnd();

      let verdict: 'accepted' | 'wrong-answer' | 'time-limit-exceeded' | 'runtime-error';
      if (result.timedOut) verdict = 'time-limit-exceeded';
      else if (result.exitCode !== 0) verdict = 'runtime-error';
      else if (expected && actual !== expected) verdict = 'wrong-answer';
      else verdict = 'accepted';

      useBuildStore.getState().setTestVerdict(tc.id, verdict, result.stdout, result.durationMs);
      if (verdict === 'accepted') {
        useBuildStore.getState().pulseBuildVisualState('success');
      } else {
        useBuildStore.getState().pulseBuildVisualState('failure');
      }
      const color = verdict === 'accepted' ? '32' : verdict === 'wrong-answer' ? '31' : verdict === 'time-limit-exceeded' ? '33' : '35';
      emitTerminalOutput(`\x1b[${color}m  ${tc.name}: ${verdict.toUpperCase()} (${result.durationMs}ms)\x1b[0m\r\n\r\n`);
    }
  } catch (err) {
    if (!useBuildStore.getState().killed) {
      useBuildStore.getState().setTestVerdict(tc.id, 'runtime-error', String(err));
      useBuildStore.getState().pulseBuildVisualState('failure');
      emitTerminalOutput(`\x1b[31m  ${tc.name}: ERROR — ${String(err)}\x1b[0m\r\n\r\n`);
    } else {
      useBuildStore.getState().setBuildVisualState('idle');
    }
  }
  useBuildStore.getState().setRunning(false);
}

// ======================== TERMINAL OUTPUT EVENT SYSTEM ========================
type TerminalListener = (data: string) => void;
const terminalListeners: TerminalListener[] = [];

export function onTerminalOutput(listener: TerminalListener): () => void {
  terminalListeners.push(listener);
  return () => {
    const idx = terminalListeners.indexOf(listener);
    if (idx >= 0) terminalListeners.splice(idx, 1);
  };
}

export function emitTerminalOutput(data: string) {
  for (const listener of terminalListeners) {
    listener(data);
  }
}

// ======================== REFRESH OPEN FILES ========================
// Re-reads all open files from disk and updates tabs without marking modified.
// This handles files written by external programs (build output, etc).
export async function refreshAllOpenFiles() {
  const edState = useEditorStore.getState();
  const allGroups = getAllLeaves(edState.layout);
  for (const g of allGroups) {
    for (const tab of g.tabs) {
      if (tab.path && !tab.isModified) {
        try {
          const content = await readFileContent(tab.path);
          if (content !== tab.content) {
            useEditorStore.getState().refreshTabContent(tab.id, content);
          }
        } catch {
          // File may have been deleted or is inaccessible — skip
        }
      }
    }
  }
}

// ======================== SESSION PERSISTENCE ========================
interface SessionData {
  layout: any;
  activeGroupId: string;
  folderPath: string | null;
  folderName: string | null;
  sidebarVisible: boolean;
  sidebarWidth: number;
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
  zoomLevel: number;
  fileViewState: Record<string, { line: number; column: number; scrollTop: number }>;
}

export async function saveSession() {
  const editor = useEditorStore.getState();
  const ui = useUIStore.getState();
  const fe = useFileExplorerStore.getState();

  const session: SessionData = {
    layout: editor.layout,
    activeGroupId: editor.activeGroupId,
    folderPath: fe.rootPath,
    folderName: fe.rootName,
    sidebarVisible: ui.sidebarVisible,
    sidebarWidth: ui.sidebarWidth,
    bottomPanelVisible: ui.bottomPanelVisible,
    bottomPanelHeight: ui.bottomPanelHeight,
    zoomLevel: ui.zoomLevel,
    fileViewState: editor.fileViewState,
  };

  try {
    await saveConfig('session.json', session);
  } catch {}
}

export async function restoreSession() {
  try {
    const session = await loadConfig<SessionData>('session.json');
    if (!session) return;

    const ui = useUIStore.getState();
    if (session.sidebarVisible !== undefined) ui.setSidebarVisible(session.sidebarVisible);
    if (session.sidebarWidth) ui.setSidebarWidth(session.sidebarWidth);
    if (session.bottomPanelVisible !== undefined) ui.setBottomPanelVisible(session.bottomPanelVisible);
    if (session.bottomPanelHeight) ui.setBottomPanelHeight(session.bottomPanelHeight);
    if (session.zoomLevel) {
      // Apply zoom directly via store
      const store = useUIStore.getState() as any;
      if (store) {
        useUIStore.setState({ zoomLevel: session.zoomLevel });
      }
    }

    // Restore folder
    if (session.folderPath && session.folderName) {
      const fe = useFileExplorerStore.getState();
      fe.setRootPath(session.folderPath, session.folderName);
      try {
        const entries = await readDirectory(session.folderPath);
        fe.setTree(entries);
      } catch {}
    }

    // Restore editor tabs — reload content from disk for saved files
    if (session.layout) {
      const restoredLayout = await restoreLayoutContent(session.layout);
      const restoredFileViewState = session.fileViewState ?? extractFileViewStateFromLayout(restoredLayout);
      useEditorStore.setState({
        layout: restoredLayout,
        activeGroupId: session.activeGroupId || (restoredLayout as any).id,
        fileViewState: restoredFileViewState,
      });
    }
  } catch {}
}

async function restoreLayoutContent(node: any): Promise<any> {
  if (node.type === 'leaf') {
    const restoredTabs = [];
    for (const tab of node.tabs) {
      if (tab.path) {
        try {
          const content = await readFileContent(tab.path);
          restoredTabs.push({ ...tab, content, isModified: false });
        } catch {
          // File may not exist — keep the tab with its serialized content
          if (tab.content !== undefined && tab.content !== null) {
            restoredTabs.push({ ...tab, isModified: true });
          }
          // If no content either, skip the tab
        }
      } else {
        // Unsaved tab — keep as-is
        restoredTabs.push(tab);
      }
    }
    // Only return the leaf if it has tabs or is the root group
    return { ...node, tabs: restoredTabs, activeTabId: restoredTabs.length > 0 ? (restoredTabs.find((t: any) => t.id === node.activeTabId)?.id ?? restoredTabs[0]?.id ?? null) : null };
  }
  if (node.type === 'split') {
    const children = await Promise.all(node.children.map(restoreLayoutContent));
    return { ...node, children };
  }
  return node;
}

function extractFileViewStateFromLayout(node: any): Record<string, { line: number; column: number; scrollTop: number }> {
  if (!node) return {};

  if (node.type === 'leaf') {
    return node.tabs.reduce((acc: Record<string, { line: number; column: number; scrollTop: number }>, tab: any) => {
      const key = tab.path
        ? tab.path.replace(/\//g, '\\').toLowerCase()
        : `untitled:${tab.id}`;
      acc[key] = {
        line: tab.cursorLine ?? 1,
        column: tab.cursorColumn ?? 1,
        scrollTop: tab.scrollTop ?? 0,
      };
      return acc;
    }, {});
  }

  if (node.type === 'split') {
    return node.children.reduce(
      (acc: Record<string, { line: number; column: number; scrollTop: number }>, child: any) => ({
        ...acc,
        ...extractFileViewStateFromLayout(child),
      }),
      {}
    );
  }

  return {};
}
