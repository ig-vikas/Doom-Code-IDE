import { useCallback, useEffect, useMemo, useRef, useState, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  VscChevronRight,
  VscCollapseAll,
  VscCopy,
  VscEdit,
  VscFile,
  VscFolder,
  VscFolderActive,
  VscFolderOpened,
  VscNewFile,
  VscNewFolder,
  VscRefresh,
  VscTrash,
} from 'react-icons/vsc';
import { useEditorStore, useFileExplorerStore, useNotificationStore } from '../stores';
import {
  createDirectory,
  createNewFile,
  deletePath,
  fileExists,
  readDirectoryIfChanged,
  readFileContent,
  renamePath,
} from '../services/fileService';
import { openInFileExplorer } from '../services/systemService';
import type { FileNode, SplitNode } from '../types';

interface VisibleTreeNode {
  node: FileNode;
  depth: number;
  parentPath: string | null;
}

interface ExplorerContextMenuState {
  x: number;
  y: number;
  targetPath: string | null;
  targetIsRoot: boolean;
}

interface ExplorerMenuAction {
  id: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  icon?: JSX.Element;
  separator?: boolean;
  onSelect?: () => void;
}

const INVALID_NAME_REGEX = /[<>:"/\\|?*\x00-\x1f]/;
const RESERVED_WINDOWS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

export default function FileExplorer() {
  const rootPath = useFileExplorerStore((s) => s.rootPath);
  const rootName = useFileExplorerStore((s) => s.rootName);
  const tree = useFileExplorerStore((s) => s.tree);
  const treeSignature = useFileExplorerStore((s) => s.treeSignature);
  const expandedDirs = useFileExplorerStore((s) => s.expandedDirs);
  const selectedPath = useFileExplorerStore((s) => s.selectedPath);
  const selectedPaths = useFileExplorerStore((s) => s.selectedPaths);
  const selectionAnchorPath = useFileExplorerStore((s) => s.selectionAnchorPath);
  const renamingPath = useFileExplorerStore((s) => s.renamingPath);
  const creatingIn = useFileExplorerStore((s) => s.creatingIn);
  const creatingType = useFileExplorerStore((s) => s.creatingType);
  const loading = useFileExplorerStore((s) => s.loading);
  const setRootPath = useFileExplorerStore((s) => s.setRootPath);
  const setTree = useFileExplorerStore((s) => s.setTree);
  const setTreeSignature = useFileExplorerStore((s) => s.setTreeSignature);
  const collapseAll = useFileExplorerStore((s) => s.collapseAll);
  const setLoading = useFileExplorerStore((s) => s.setLoading);
  const toggleDir = useFileExplorerStore((s) => s.toggleDir);
  const expandDir = useFileExplorerStore((s) => s.expandDir);
  const collapseDir = useFileExplorerStore((s) => s.collapseDir);
  const setSelection = useFileExplorerStore((s) => s.setSelection);
  const clearSelection = useFileExplorerStore((s) => s.clearSelection);
  const startRename = useFileExplorerStore((s) => s.startRename);
  const cancelRename = useFileExplorerStore((s) => s.cancelRename);
  const startCreate = useFileExplorerStore((s) => s.startCreate);
  const cancelCreate = useFileExplorerStore((s) => s.cancelCreate);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const layout = useEditorStore((s) => s.layout);
  const openFile = useEditorStore((s) => s.openFile);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup);
  const pinTab = useEditorStore((s) => s.pinTab);
  const findTabByPath = useEditorStore((s) => s.findTabByPath);
  const renameTabsForPath = useEditorStore((s) => s.renameTabsForPath);
  const closeTabsForPaths = useEditorStore((s) => s.closeTabsForPaths);
  const notifySuccess = useNotificationStore((s) => s.success);
  const notifyError = useNotificationStore((s) => s.error);
  const notifyInfo = useNotificationStore((s) => s.info);

  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);

  const visibleNodes = useMemo(
    () => flattenVisibleNodes(tree, expandedDirs),
    [tree, expandedDirs]
  );
  const visiblePathOrder = useMemo(
    () => visibleNodes.map((entry) => entry.node.path),
    [visibleNodes]
  );
  const visibleNodeLookup = useMemo(
    () => new Map(visibleNodes.map((entry) => [entry.node.path, entry])),
    [visibleNodes]
  );
  const allKnownPaths = useMemo(() => flattenAllPaths(tree), [tree]);
  const allKnownPathSet = useMemo(() => new Set(allKnownPaths), [allKnownPaths]);
  const topLevelSelectedPaths = useMemo(
    () => filterTopLevelPaths(selectedPaths),
    [selectedPaths]
  );

  useEffect(() => {
    const validSelection = selectedPaths.filter((path) => allKnownPathSet.has(path));
    const nextPrimaryPath = selectedPath && validSelection.includes(selectedPath)
      ? selectedPath
      : validSelection[validSelection.length - 1] ?? null;
    const nextAnchorPath = selectionAnchorPath && validSelection.includes(selectionAnchorPath)
      ? selectionAnchorPath
      : nextPrimaryPath;

    if (
      validSelection.length !== selectedPaths.length
      || nextPrimaryPath !== selectedPath
      || nextAnchorPath !== selectionAnchorPath
    ) {
      setSelection(validSelection, nextPrimaryPath, nextAnchorPath);
    }
  }, [
    allKnownPathSet,
    selectedPaths,
    selectedPath,
    selectionAnchorPath,
    setSelection,
  ]);

  useEffect(() => {
    if (!contextMenu) return;

    const dismiss = () => setContextMenu(null);
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
    };
  }, [contextMenu]);

  const focusExplorer = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const refreshTree = useCallback(async () => {
    if (!rootPath) return;

    setLoading(true);
    try {
      const dir = await readDirectoryIfChanged(rootPath, treeSignature, 10, 50000);
      if (dir.changed && dir.entries) {
        setTree(dir.entries, dir.signature);
      } else {
        setTreeSignature(dir.signature);
      }
    } catch (error) {
      notifyError('Failed to refresh explorer', String(error));
    } finally {
      setLoading(false);
    }
  }, [notifyError, rootPath, setLoading, setTree, setTreeSignature, treeSignature]);

  const openFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected || typeof selected !== 'string') return;

      setLoading(true);
      const parts = selected.replace(/\\/g, '/').split('/');
      const name = parts[parts.length - 1] || selected;
      setRootPath(selected, name);
      const dir = await readDirectoryIfChanged(selected, null, 10, 50000);
      setTree(dir.entries ?? [], dir.signature);
      notifySuccess(`Opened folder "${name}"`);
    } catch (error) {
      notifyError('Failed to open folder', String(error));
    } finally {
      setLoading(false);
    }
  }, [notifyError, notifySuccess, setLoading, setRootPath, setTree]);

  const selectSinglePath = useCallback((path: string) => {
    setSelection([path], path, path);
  }, [setSelection]);

  const selectRangeToPath = useCallback((path: string) => {
    const anchorPath = selectionAnchorPath ?? selectedPath ?? path;
    const range = getPathRange(visiblePathOrder, anchorPath, path);
    setSelection(range, path, anchorPath);
  }, [selectionAnchorPath, selectedPath, setSelection, visiblePathOrder]);

  const togglePathSelection = useCallback((path: string) => {
    if (!selectedPaths.includes(path)) {
      const anchorPath = selectionAnchorPath ?? selectedPath ?? path;
      setSelection([...selectedPaths, path], path, anchorPath);
      return;
    }

    if (selectedPaths.length <= 1) {
      setSelection([path], path, path);
      return;
    }

    const remaining = selectedPaths.filter((selected) => selected !== path);
    const nextPrimaryPath = selectedPath === path
      ? remaining[remaining.length - 1] ?? null
      : selectedPath;
    const nextAnchorPath = selectionAnchorPath === path
      ? nextPrimaryPath
      : selectionAnchorPath;
    setSelection(remaining, nextPrimaryPath, nextAnchorPath);
  }, [selectedPath, selectedPaths, selectionAnchorPath, setSelection]);

  const activateNode = useCallback(async (node: FileNode, permanent = false) => {
    if (node.isDir) {
      toggleDir(node.path);
      return;
    }

    try {
      const existing = findTabByPath(node.path);
      if (permanent && existing) {
        setActiveGroup(existing.groupId);
        setActiveTab(existing.groupId, existing.tab.id);
        if (existing.tab.isPreview) {
          pinTab(existing.groupId, existing.tab.id);
        }
        return;
      }

      const content = await readFileContent(node.path);
      openFile(node.path, content, activeGroupId, !permanent);
    } catch (error) {
      notifyError(`Failed to open "${node.name}"`, String(error));
    }
  }, [
    activeGroupId,
    findTabByPath,
    notifyError,
    openFile,
    pinTab,
    setActiveGroup,
    setActiveTab,
    toggleDir,
  ]);

  const startCreateAtPath = useCallback((targetPath: string | null, type: 'file' | 'folder') => {
    if (!rootPath) return;

    const targetNode = targetPath
      ? visibleNodeLookup.get(targetPath)?.node ?? findNodeByPath(tree, targetPath)
      : null;
    const parentPath = targetNode
      ? (targetNode.isDir ? targetNode.path : getParentPath(targetNode.path))
      : rootPath;

    if (!parentPath) return;

    focusExplorer();
    closeContextMenu();
    cancelRename();
    startCreate(parentPath, type);
    expandDir(parentPath);
  }, [cancelRename, closeContextMenu, expandDir, focusExplorer, rootPath, startCreate, tree, visibleNodeLookup]);

  const startRenameSelection = useCallback(() => {
    if (topLevelSelectedPaths.length !== 1) return;

    const path = topLevelSelectedPaths[0];
    focusExplorer();
    closeContextMenu();
    cancelCreate();
    setSelection([path], path, path);
    startRename(path);
  }, [
    cancelCreate,
    closeContextMenu,
    focusExplorer,
    setSelection,
    startRename,
    topLevelSelectedPaths,
  ]);

  const deleteSelection = useCallback(async () => {
    if (topLevelSelectedPaths.length === 0) return;

    const modifiedCount = countModifiedTabsForPaths(layout, topLevelSelectedPaths);
    const selectionLabel = topLevelSelectedPaths.length === 1
      ? `"${getDisplayNameForPath(topLevelSelectedPaths[0])}"`
      : `${topLevelSelectedPaths.length} selected items`;
    const warning = modifiedCount > 0
      ? `\n\n${modifiedCount} open modified tab${modifiedCount === 1 ? ' has' : 's have'} unsaved changes that will be lost.`
      : '';

    if (!window.confirm(`Delete ${selectionLabel}?${warning}`)) {
      return;
    }

    try {
      for (const path of topLevelSelectedPaths) {
        await deletePath(path);
      }

      closeTabsForPaths(topLevelSelectedPaths);
      cancelRename();
      cancelCreate();
      clearSelection();
      closeContextMenu();
      await refreshTree();

      notifySuccess(
        topLevelSelectedPaths.length === 1
          ? `Deleted "${getDisplayNameForPath(topLevelSelectedPaths[0])}"`
          : `Deleted ${topLevelSelectedPaths.length} items`
      );
    } catch (error) {
      notifyError('Failed to delete selection', String(error));
    }
  }, [
    cancelCreate,
    cancelRename,
    clearSelection,
    closeContextMenu,
    closeTabsForPaths,
    layout,
    notifyError,
    notifySuccess,
    refreshTree,
    topLevelSelectedPaths,
  ]);

  const revealSelectionInExplorer = useCallback(async () => {
    const revealPath = selectedPath ?? topLevelSelectedPaths[0] ?? rootPath;
    if (!revealPath) return;

    try {
      await openInFileExplorer(revealPath);
      notifyInfo(`Revealed "${getDisplayNameForPath(revealPath)}"`);
    } catch (error) {
      notifyError('Failed to reveal in file explorer', String(error));
    } finally {
      closeContextMenu();
    }
  }, [closeContextMenu, notifyError, notifyInfo, rootPath, selectedPath, topLevelSelectedPaths]);

  const copySelectionPaths = useCallback(async (relative: boolean) => {
    if (!rootPath) return;

    const pathsToCopy = topLevelSelectedPaths.length > 0
      ? topLevelSelectedPaths
      : (selectedPath ? [selectedPath] : []);
    if (pathsToCopy.length === 0) return;

    const text = pathsToCopy
      .map((path) => relative ? getRelativePath(rootPath, path) : path)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      notifySuccess(relative ? 'Copied relative path' : 'Copied path');
    } catch (error) {
      notifyError('Failed to copy path', String(error));
    } finally {
      closeContextMenu();
    }
  }, [closeContextMenu, notifyError, notifySuccess, rootPath, selectedPath, topLevelSelectedPaths]);

  const handleRenameCompleted = useCallback(async (oldPath: string, newPath: string) => {
    cancelRename();
    renameTabsForPath(oldPath, newPath);
    setSelection([newPath], newPath, newPath);
    await refreshTree();
    notifySuccess(`Renamed to "${getDisplayNameForPath(newPath)}"`);
  }, [cancelRename, notifySuccess, refreshTree, renameTabsForPath, setSelection]);

  const handleCreated = useCallback(async (newPath: string) => {
    cancelCreate();
    setSelection([newPath], newPath, newPath);
    await refreshTree();
    notifySuccess(`Created "${getDisplayNameForPath(newPath)}"`);
  }, [cancelCreate, notifySuccess, refreshTree, setSelection]);

  const handleNodeClick = useCallback((node: FileNode, event: ReactMouseEvent<HTMLDivElement>) => {
    focusExplorer();
    closeContextMenu();

    if (event.shiftKey) {
      selectRangeToPath(node.path);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      togglePathSelection(node.path);
      return;
    }

    selectSinglePath(node.path);
    void activateNode(node, false);
  }, [
    activateNode,
    closeContextMenu,
    focusExplorer,
    selectRangeToPath,
    selectSinglePath,
    togglePathSelection,
  ]);

  const handleNodeDoubleClick = useCallback((node: FileNode) => {
    if (node.isDir) {
      return;
    }

    focusExplorer();
    closeContextMenu();
    selectSinglePath(node.path);
    void activateNode(node, true);
  }, [activateNode, closeContextMenu, focusExplorer, selectSinglePath]);

  const handleNodeContextMenu = useCallback((node: FileNode, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    focusExplorer();
    if (!selectedPaths.includes(node.path)) {
      setSelection([node.path], node.path, node.path);
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetPath: node.path,
      targetIsRoot: false,
    });
  }, [focusExplorer, selectedPaths, setSelection]);

  const handleBackgroundClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    focusExplorer();
    closeContextMenu();
    clearSelection();
  }, [clearSelection, closeContextMenu, focusExplorer]);

  const handleBackgroundContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !rootPath) return;

    event.preventDefault();
    focusExplorer();
    clearSelection();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetPath: rootPath,
      targetIsRoot: true,
    });
  }, [clearSelection, focusExplorer, rootPath]);

  const handleTreeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (contextMenu && event.key === 'Escape') {
      event.preventDefault();
      closeContextMenu();
      return;
    }

    if (renamingPath || creatingIn) {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelRename();
        cancelCreate();
        closeContextMenu();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      if (visiblePathOrder.length > 0) {
        setSelection(
          visiblePathOrder,
          selectedPath ?? visiblePathOrder[visiblePathOrder.length - 1],
          selectionAnchorPath ?? visiblePathOrder[0]
        );
      }
      return;
    }

    const currentPath = selectedPath ?? visiblePathOrder[0] ?? null;
    if (!currentPath) return;

    const currentIndex = visiblePathOrder.indexOf(currentPath);
    const currentVisibleNode = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
    const currentNode = currentVisibleNode?.node ?? visibleNodeLookup.get(currentPath)?.node ?? null;
    if (!currentNode) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextPath = visiblePathOrder[Math.min(currentIndex + 1, visiblePathOrder.length - 1)] ?? currentPath;
        if (event.shiftKey) {
          selectRangeToPath(nextPath);
        } else {
          selectSinglePath(nextPath);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const nextPath = visiblePathOrder[Math.max(currentIndex - 1, 0)] ?? currentPath;
        if (event.shiftKey) {
          selectRangeToPath(nextPath);
        } else {
          selectSinglePath(nextPath);
        }
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        if (!currentNode.isDir) return;

        if (!expandedDirs.has(currentNode.path)) {
          expandDir(currentNode.path);
          return;
        }

        const childNode = visibleNodes[currentIndex + 1];
        if (childNode?.parentPath === currentNode.path) {
          selectSinglePath(childNode.node.path);
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        if (currentNode.isDir && expandedDirs.has(currentNode.path)) {
          collapseDir(currentNode.path);
          return;
        }

        if (currentVisibleNode?.parentPath) {
          selectSinglePath(currentVisibleNode.parentPath);
        }
        break;
      }
      case 'Enter': {
        event.preventDefault();
        void activateNode(currentNode, true);
        break;
      }
      case ' ': {
        event.preventDefault();
        void activateNode(currentNode, false);
        break;
      }
      case 'F2': {
        if (topLevelSelectedPaths.length === 1) {
          event.preventDefault();
          startRenameSelection();
        }
        break;
      }
      case 'Delete': {
        if (topLevelSelectedPaths.length > 0) {
          event.preventDefault();
          void deleteSelection();
        }
        break;
      }
      default:
        break;
    }
  }, [
    activateNode,
    cancelCreate,
    cancelRename,
    closeContextMenu,
    collapseDir,
    contextMenu,
    creatingIn,
    deleteSelection,
    expandedDirs,
    expandDir,
    renamingPath,
    selectedPath,
    selectRangeToPath,
    selectSinglePath,
    selectionAnchorPath,
    setSelection,
    startRenameSelection,
    topLevelSelectedPaths.length,
    visibleNodeLookup,
    visibleNodes,
    visiblePathOrder,
  ]);

  const contextMenuActions = useMemo<ExplorerMenuAction[]>(() => {
    if (!rootPath) return [];

    if (contextMenu?.targetIsRoot) {
      return [
        {
          id: 'new-file-root',
          label: 'New File',
          icon: <VscNewFile />,
          onSelect: () => startCreateAtPath(rootPath, 'file'),
        },
        {
          id: 'new-folder-root',
          label: 'New Folder',
          icon: <VscNewFolder />,
          onSelect: () => startCreateAtPath(rootPath, 'folder'),
        },
        { id: 'root-separator-1', separator: true },
        {
          id: 'reveal-root',
          label: 'Show in Folder',
          icon: <VscFolderActive />,
          onSelect: () => {
            void revealSelectionInExplorer();
          },
        },
        {
          id: 'refresh-root',
          label: 'Refresh',
          icon: <VscRefresh />,
          onSelect: () => {
            void refreshTree();
            closeContextMenu();
          },
        },
        {
          id: 'collapse-root',
          label: 'Collapse All',
          icon: <VscCollapseAll />,
          onSelect: () => {
            collapseAll();
            closeContextMenu();
          },
        },
      ];
    }

    const singleSelectedNode = topLevelSelectedPaths.length === 1
      ? (visibleNodeLookup.get(topLevelSelectedPaths[0])?.node ?? findNodeByPath(tree, topLevelSelectedPaths[0]))
      : null;
    const createTargetPath = singleSelectedNode?.isDir
      ? singleSelectedNode.path
      : (singleSelectedNode ? getParentPath(singleSelectedNode.path) : rootPath);

    return [
      {
        id: 'open-selected',
        label: singleSelectedNode?.isDir ? 'Open Folder' : 'Open',
        shortcut: 'Enter',
        disabled: !singleSelectedNode,
        icon: singleSelectedNode?.isDir ? <VscFolderOpened /> : <VscFile />,
        onSelect: () => {
          if (!singleSelectedNode) return;
          void activateNode(singleSelectedNode, true);
          closeContextMenu();
        },
      },
      {
        id: 'show-in-folder',
        label: 'Show in Folder',
        icon: <VscFolderActive />,
        disabled: topLevelSelectedPaths.length === 0,
        onSelect: () => {
          void revealSelectionInExplorer();
        },
      },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <VscCopy />,
        disabled: topLevelSelectedPaths.length === 0,
        onSelect: () => {
          void copySelectionPaths(false);
        },
      },
      {
        id: 'copy-relative-path',
        label: 'Copy Relative Path',
        icon: <VscCopy />,
        disabled: topLevelSelectedPaths.length === 0,
        onSelect: () => {
          void copySelectionPaths(true);
        },
      },
      { id: 'selected-separator-1', separator: true },
      {
        id: 'new-file',
        label: 'New File',
        icon: <VscNewFile />,
        disabled: !createTargetPath,
        onSelect: () => startCreateAtPath(createTargetPath, 'file'),
      },
      {
        id: 'new-folder',
        label: 'New Folder',
        icon: <VscNewFolder />,
        disabled: !createTargetPath,
        onSelect: () => startCreateAtPath(createTargetPath, 'folder'),
      },
      {
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        disabled: topLevelSelectedPaths.length !== 1,
        icon: <VscEdit />,
        onSelect: () => startRenameSelection(),
      },
      {
        id: 'delete',
        label: 'Delete',
        shortcut: 'Del',
        disabled: topLevelSelectedPaths.length === 0,
        danger: true,
        icon: <VscTrash />,
        onSelect: () => {
          void deleteSelection();
        },
      },
      { id: 'selected-separator-2', separator: true },
      {
        id: 'refresh-selected',
        label: 'Refresh',
        icon: <VscRefresh />,
        onSelect: () => {
          void refreshTree();
          closeContextMenu();
        },
      },
      {
        id: 'collapse-selected',
        label: 'Collapse All',
        icon: <VscCollapseAll />,
        onSelect: () => {
          collapseAll();
          closeContextMenu();
        },
      },
    ];
  }, [
    activateNode,
    closeContextMenu,
    collapseAll,
    copySelectionPaths,
    deleteSelection,
    refreshTree,
    revealSelectionInExplorer,
    rootPath,
    startCreateAtPath,
    startRenameSelection,
    topLevelSelectedPaths,
    tree,
    visibleNodeLookup,
    contextMenu?.targetIsRoot,
  ]);

  if (!rootPath) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '1rem' }}>
          No folder opened
        </p>
        <button
          onClick={() => {
            void openFolder();
          }}
          style={{
            padding: '6px 16px',
            background: 'var(--accent-primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="file-tree"
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      onContextMenu={handleBackgroundContextMenu}
    >
      <div className="sidebar-header explorer-header" style={{ paddingLeft: 8 }}>
        <span style={{ textTransform: 'uppercase', fontSize: '0.846rem' }}>{rootName}</span>
        <div className="sidebar-header-actions">
          <button className="sidebar-icon-btn" onClick={() => startCreateAtPath(rootPath, 'file')} data-tooltip="New File">
            <VscNewFile />
          </button>
          <button className="sidebar-icon-btn" onClick={() => startCreateAtPath(rootPath, 'folder')} data-tooltip="New Folder">
            <VscNewFolder />
          </button>
          <button className="sidebar-icon-btn" onClick={collapseAll} data-tooltip="Collapse All">
            <VscCollapseAll />
          </button>
          <button className="sidebar-icon-btn" onClick={() => { void refreshTree(); }} data-tooltip="Refresh">
            <VscRefresh />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="file-tree-items" onClick={handleBackgroundClick} onContextMenu={handleBackgroundContextMenu}>
          {creatingIn === rootPath && (
            <CreateInlineInput
              type={creatingType ?? 'file'}
              parentPath={rootPath}
              depth={0}
              onCancel={cancelCreate}
              onCreated={handleCreated}
              notifyError={notifyError}
            />
          )}
          {tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedDirs={expandedDirs}
              selectedPaths={selectedPaths}
              activePath={selectedPath}
              renamingPath={renamingPath}
              creatingIn={creatingIn}
              creatingType={creatingType}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeContextMenu={handleNodeContextMenu}
              onCancelRename={cancelRename}
              onRenameComplete={handleRenameCompleted}
              onCancelCreate={cancelCreate}
              onCreateComplete={handleCreated}
              notifyError={notifyError}
            />
          ))}
        </div>
      )}

      {contextMenu && contextMenuActions.length > 0 && (
        <div
          className="explorer-context-menu menu-dropdown"
          style={{
            position: 'fixed',
            top: clampMenuPosition(contextMenu.y, 240, window.innerHeight - 12),
            left: clampMenuPosition(contextMenu.x, 260, window.innerWidth - 12),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextMenuActions.map((action) => (
            action.separator ? (
              <div key={action.id} className="menu-separator" />
            ) : (
              <button
                key={action.id}
                type="button"
                className={`menu-item explorer-menu-item ${action.danger ? 'danger' : ''}`}
                disabled={action.disabled}
                onClick={() => {
                  action.onSelect?.();
                }}
              >
                <span className="explorer-menu-icon">{action.icon}</span>
                <span className="menu-item-label">{action.label}</span>
                {action.shortcut ? (
                  <span className="menu-item-shortcut">{action.shortcut}</span>
                ) : null}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  node,
  depth,
  expandedDirs,
  selectedPaths,
  activePath,
  renamingPath,
  creatingIn,
  creatingType,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onCancelRename,
  onRenameComplete,
  onCancelCreate,
  onCreateComplete,
  notifyError,
}: {
  node: FileNode;
  depth: number;
  expandedDirs: Set<string>;
  selectedPaths: string[];
  activePath: string | null;
  renamingPath: string | null;
  creatingIn: string | null;
  creatingType: 'file' | 'folder' | null;
  onNodeClick: (node: FileNode, event: ReactMouseEvent<HTMLDivElement>) => void;
  onNodeDoubleClick: (node: FileNode) => void;
  onNodeContextMenu: (node: FileNode, event: ReactMouseEvent<HTMLDivElement>) => void;
  onCancelRename: () => void;
  onRenameComplete: (oldPath: string, newPath: string) => Promise<void>;
  onCancelCreate: () => void;
  onCreateComplete: (newPath: string) => Promise<void>;
  notifyError: (message: string, details?: string) => string;
}) {
  const layout = useEditorStore((s) => s.layout);
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPaths.includes(node.path);
  const isActive = activePath === node.path;
  const isRenaming = renamingPath === node.path;
  const isModifiedFile = useMemo(
    () => node.isDir ? false : isPathModifiedInLayout(layout, node.path),
    [layout, node.isDir, node.path]
  );
  const [renderChildren, setRenderChildren] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setRenderChildren(true);
      return;
    }

    const timer = setTimeout(() => setRenderChildren(false), 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  return (
    <>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={(event) => onNodeClick(node, event)}
        onDoubleClick={() => {
          if (!node.isDir) {
            onNodeDoubleClick(node);
          }
        }}
        onContextMenu={(event) => onNodeContextMenu(node, event)}
      >
        {node.isDir ? (
          <span className={`file-tree-arrow ${isExpanded ? 'expanded' : ''}`}>
            <VscChevronRight />
          </span>
        ) : (
          <span className="file-tree-arrow" />
        )}
        <span className="file-tree-icon">
          {node.isDir ? (
            isExpanded ? (
              <VscFolderOpened style={{ color: 'var(--accent-yellow)' }} />
            ) : (
              <VscFolder style={{ color: 'var(--accent-yellow)' }} />
            )
          ) : (
            <VscFile style={{ color: getFileColor(node.name) }} />
          )}
        </span>
        {isRenaming ? (
          <RenameInput
            currentName={node.name}
            path={node.path}
            onCancel={onCancelRename}
            onRenamed={onRenameComplete}
            notifyError={notifyError}
          />
        ) : (
          <>
            <span className="file-tree-name">{node.name}</span>
            {isActive && selectedPaths.length > 1 ? (
              <span className="file-tree-selection-badge">{selectedPaths.length}</span>
            ) : null}
            {isModifiedFile ? <span className="file-modified-dot active" /> : null}
          </>
        )}
      </div>
      {node.isDir && renderChildren && node.children && (
        <div className={`file-tree-children ${isExpanded ? 'expanded' : 'collapsing'}`}>
          {creatingIn === node.path && (
            <CreateInlineInput
              type={creatingType ?? 'file'}
              parentPath={node.path}
              depth={depth + 1}
              onCancel={onCancelCreate}
              onCreated={onCreateComplete}
              notifyError={notifyError}
            />
          )}
          {node.children.map((child, index) => (
            <div
              key={child.path}
              className="file-tree-child"
              style={{ animationDelay: `${Math.min(index, 14) * 30}ms` }}
            >
              <FileTreeNode
                node={child}
                depth={depth + 1}
                expandedDirs={expandedDirs}
                selectedPaths={selectedPaths}
                activePath={activePath}
                renamingPath={renamingPath}
                creatingIn={creatingIn}
                creatingType={creatingType}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeContextMenu}
                onCancelRename={onCancelRename}
                onRenameComplete={onRenameComplete}
                onCancelCreate={onCancelCreate}
                onCreateComplete={onCreateComplete}
                notifyError={notifyError}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RenameInput({
  currentName,
  path,
  onCancel,
  onRenamed,
  notifyError,
}: {
  currentName: string;
  path: string;
  onCancel: () => void;
  onRenamed: (oldPath: string, newPath: string) => Promise<void>;
  notifyError: (message: string, details?: string) => string;
}) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const dotIndex = currentName.lastIndexOf('.');
    if (dotIndex > 0) {
      input.setSelectionRange(0, dotIndex);
    } else {
      input.select();
    }
  }, [currentName]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName) {
      onCancel();
      return;
    }

    const validationError = validateExplorerEntryName(trimmed);
    if (validationError) {
      notifyError('Invalid name', validationError);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    const newPath = joinChildPath(getParentPath(path) ?? '', trimmed);
    if (!newPath) {
      onCancel();
      return;
    }

    if (await fileExists(newPath)) {
      notifyError('Rename failed', `"${trimmed}" already exists.`);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    try {
      await renamePath(path, newPath);
      await onRenamed(path, newPath);
    } catch (error) {
      notifyError('Rename failed', String(error));
    }
  }, [currentName, notifyError, onCancel, onRenamed, path, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className="file-tree-rename-input"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => { void handleSubmit(); }}
      onKeyDown={handleKeyDown}
      autoFocus
    />
  );
}

function CreateInlineInput({
  type,
  parentPath,
  depth,
  onCancel,
  onCreated,
  notifyError,
}: {
  type: 'file' | 'folder';
  parentPath: string;
  depth: number;
  onCancel: () => void;
  onCreated: (newPath: string) => Promise<void>;
  notifyError: (message: string, details?: string) => string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }

    const validationError = validateExplorerEntryName(trimmed);
    if (validationError) {
      notifyError('Invalid name', validationError);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    const newPath = joinChildPath(parentPath, trimmed);
    if (!newPath) {
      onCancel();
      return;
    }

    if (await fileExists(newPath)) {
      notifyError('Create failed', `"${trimmed}" already exists.`);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    try {
      if (type === 'file') {
        await createNewFile(newPath);
      } else {
        await createDirectory(newPath);
      }
      await onCreated(newPath);
    } catch (error) {
      notifyError('Create failed', String(error));
    }
  }, [notifyError, onCancel, onCreated, parentPath, type, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="file-tree-item" style={{ paddingLeft: depth * 16 + 4 }}>
      <span className="file-tree-arrow" />
      <span className="file-tree-icon">
        {type === 'folder' ? (
          <VscFolder style={{ color: 'var(--accent-yellow)' }} />
        ) : (
          <VscFile style={{ color: 'var(--accent-blue)' }} />
        )}
      </span>
      <input
        ref={inputRef}
        className="file-tree-rename-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => { void handleSubmit(); }}
        onKeyDown={handleKeyDown}
        placeholder={type === 'file' ? 'filename' : 'folder name'}
        autoFocus
      />
    </div>
  );
}

function flattenVisibleNodes(
  nodes: FileNode[],
  expandedDirs: Set<string>,
  depth = 0,
  parentPath: string | null = null,
  output: VisibleTreeNode[] = []
): VisibleTreeNode[] {
  for (const node of nodes) {
    output.push({ node, depth, parentPath });
    if (node.isDir && node.children && expandedDirs.has(node.path)) {
      flattenVisibleNodes(node.children, expandedDirs, depth + 1, node.path, output);
    }
  }
  return output;
}

function flattenAllPaths(nodes: FileNode[], output: string[] = []): string[] {
  for (const node of nodes) {
    output.push(node.path);
    if (node.children) {
      flattenAllPaths(node.children, output);
    }
  }
  return output;
}

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function getPathRange(paths: string[], startPath: string, endPath: string): string[] {
  const startIndex = paths.indexOf(startPath);
  const endIndex = paths.indexOf(endPath);
  if (startIndex < 0 || endIndex < 0) {
    return [endPath];
  }

  const [from, to] = startIndex <= endIndex
    ? [startIndex, endIndex]
    : [endIndex, startIndex];
  return paths.slice(from, to + 1);
}

function getParentPath(path: string): string | null {
  const normalized = path.replace(/\//g, '\\');
  const segments = normalized.split('\\');
  segments.pop();
  return segments.length > 0 ? segments.join('\\') : null;
}

function joinChildPath(parentPath: string, childName: string): string {
  if (!parentPath) return '';
  return `${parentPath.replace(/[\\/]+$/, '')}\\${childName}`;
}

function filterTopLevelPaths(paths: string[]): string[] {
  const deduped = Array.from(new Set(paths));
  return deduped
    .sort((left, right) => left.length - right.length)
    .filter((path, index, sorted) => !sorted
      .slice(0, index)
      .some((candidate) => isSameOrDescendantPath(path, candidate)));
}

function isSameOrDescendantPath(path: string, candidate: string): boolean {
  const normalizedPath = path.replace(/\//g, '\\').toLowerCase();
  const normalizedCandidate = candidate.replace(/\//g, '\\').toLowerCase();
  return (
    normalizedPath === normalizedCandidate
    || normalizedPath.startsWith(`${normalizedCandidate}\\`)
  );
}

function getRelativePath(rootPath: string, absolutePath: string): string {
  const normalizedRoot = rootPath.replace(/\//g, '\\');
  const normalizedAbsolute = absolutePath.replace(/\//g, '\\');
  if (normalizedAbsolute === normalizedRoot) {
    return '.';
  }
  return normalizedAbsolute.replace(`${normalizedRoot}\\`, '');
}

function getDisplayNameForPath(path: string): string {
  return path.replace(/\//g, '\\').split('\\').pop() || path;
}

function validateExplorerEntryName(name: string): string | null {
  if (!name.trim()) {
    return 'Name cannot be empty.';
  }
  if (INVALID_NAME_REGEX.test(name)) {
    return 'Names cannot contain < > : " / \\ | ? * or control characters.';
  }
  if (name.endsWith('.') || name.endsWith(' ')) {
    return 'Names cannot end with a space or period.';
  }
  if (RESERVED_WINDOWS_NAMES.has(name.toUpperCase())) {
    return `"${name}" is reserved by Windows.`;
  }
  return null;
}

function clampMenuPosition(value: number, menuSize: number, maxBoundary: number): number {
  return Math.max(8, Math.min(value, maxBoundary - menuSize));
}

function countModifiedTabsForPaths(node: SplitNode, paths: string[]): number {
  if (node.type === 'leaf') {
    return node.tabs.filter((tab) =>
      tab.isModified
      && tab.path
      && paths.some((path) => isSameOrDescendantPath(tab.path!, path))
    ).length;
  }

  return node.children.reduce((count, child) => count + countModifiedTabsForPaths(child, paths), 0);
}

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'h':
    case 'hpp':
      return 'var(--accent-blue)';
    case 'py':
      return 'var(--accent-green)';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return 'var(--accent-yellow)';
    case 'json':
      return 'var(--accent-orange)';
    case 'md':
    case 'txt':
      return 'var(--text-muted)';
    default:
      return 'var(--text-secondary)';
  }
}

function isPathModifiedInLayout(node: SplitNode, path: string): boolean {
  if (node.type === 'leaf') {
    return node.tabs.some((tab) => tab.path === path && tab.isModified);
  }

  return node.children.some((child) => isPathModifiedInLayout(child, path));
}
