import { useCallback, useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useFileExplorerStore, useEditorStore, useNotificationStore } from '../stores';
import { readDirectory, readFileContent, createNewFile, createDirectory, renamePath, deletePath } from '../services/fileService';
import { open } from '@tauri-apps/plugin-dialog';
import type { FileNode } from '../types';
import {
  VscNewFile,
  VscNewFolder,
  VscCollapseAll,
  VscRefresh,
  VscChevronRight,
  VscFile,
  VscFolder,
  VscFolderOpened,
} from 'react-icons/vsc';
import { getLanguageFromExtension } from '../utils/fileUtils';

export default function FileExplorer() {
  const rootPath = useFileExplorerStore((s) => s.rootPath);
  const rootName = useFileExplorerStore((s) => s.rootName);
  const tree = useFileExplorerStore((s) => s.tree);
  const setRootPath = useFileExplorerStore((s) => s.setRootPath);
  const setTree = useFileExplorerStore((s) => s.setTree);
  const collapseAll = useFileExplorerStore((s) => s.collapseAll);
  const loading = useFileExplorerStore((s) => s.loading);
  const setLoading = useFileExplorerStore((s) => s.setLoading);
  const creatingIn = useFileExplorerStore((s) => s.creatingIn);
  const creatingType = useFileExplorerStore((s) => s.creatingType);
  const startCreate = useFileExplorerStore((s) => s.startCreate);
  const cancelCreate = useFileExplorerStore((s) => s.cancelCreate);
  const expandDir = useFileExplorerStore((s) => s.expandDir);

  const openFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') {
        setLoading(true);
        const parts = selected.replace(/\\/g, '/').split('/');
        const name = parts[parts.length - 1] || selected;
        setRootPath(selected, name);
        const entries = await readDirectory(selected);
        setTree(entries);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
      setLoading(false);
    }
  }, [setRootPath, setTree, setLoading]);

  const refreshTree = useCallback(async () => {
    if (!rootPath) return;
    setLoading(true);
    try {
      const entries = await readDirectory(rootPath);
      setTree(entries);
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
    setLoading(false);
  }, [rootPath, setTree, setLoading]);

  const handleNewFile = useCallback(() => {
    if (rootPath) {
      startCreate(rootPath, 'file');
      expandDir(rootPath);
    }
  }, [rootPath, startCreate, expandDir]);

  const handleNewFolder = useCallback(() => {
    if (rootPath) {
      startCreate(rootPath, 'folder');
      expandDir(rootPath);
    }
  }, [rootPath, startCreate, expandDir]);

  if (!rootPath) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '1rem' }}>
          No folder opened
        </p>
        <button
          onClick={openFolder}
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
    <div className="file-tree">
      <div className="sidebar-header" style={{ paddingLeft: 8 }}>
        <span style={{ textTransform: 'uppercase', fontSize: '0.846rem' }}>{rootName}</span>
        <div className="sidebar-header-actions">
          <button className="sidebar-icon-btn" onClick={handleNewFile} data-tooltip="New File">
            <VscNewFile />
          </button>
          <button className="sidebar-icon-btn" onClick={handleNewFolder} data-tooltip="New Folder">
            <VscNewFolder />
          </button>
          <button className="sidebar-icon-btn" onClick={collapseAll} data-tooltip="Collapse All">
            <VscCollapseAll />
          </button>
          <button className="sidebar-icon-btn" onClick={refreshTree} data-tooltip="Refresh">
            <VscRefresh />
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div>
          {creatingIn === rootPath && (
            <CreateInlineInput
              type={creatingType!}
              parentPath={rootPath}
              depth={0}
              onCancel={cancelCreate}
              onCreated={refreshTree}
            />
          )}
          {tree.map((node) => (
            <FileTreeNode key={node.path} node={node} depth={0} onRefresh={refreshTree} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeNode({ node, depth, onRefresh }: { node: FileNode; depth: number; onRefresh: () => void }) {
  const expandedDirs = useFileExplorerStore((s) => s.expandedDirs);
  const toggleDir = useFileExplorerStore((s) => s.toggleDir);
  const selectedPath = useFileExplorerStore((s) => s.selectedPath);
  const setSelectedPath = useFileExplorerStore((s) => s.setSelectedPath);
  const renamingPath = useFileExplorerStore((s) => s.renamingPath);
  const startRename = useFileExplorerStore((s) => s.startRename);
  const cancelRename = useFileExplorerStore((s) => s.cancelRename);
  const creatingIn = useFileExplorerStore((s) => s.creatingIn);
  const creatingType = useFileExplorerStore((s) => s.creatingType);
  const startCreate = useFileExplorerStore((s) => s.startCreate);
  const cancelCreate = useFileExplorerStore((s) => s.cancelCreate);
  const expandDir = useFileExplorerStore((s) => s.expandDir);
  const openTab = useEditorStore((s) => s.openTab);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const isModifiedFile = useEditorStore((s) =>
    node.isDir ? false : isPathModifiedInLayout(s.layout, node.path)
  );

  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;
  const isRenaming = renamingPath === node.path;
  const [renderChildren, setRenderChildren] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setRenderChildren(true);
      return;
    }
    const timer = setTimeout(() => setRenderChildren(false), 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleClick = useCallback(async () => {
    setSelectedPath(node.path);
    if (node.isDir) {
      toggleDir(node.path);
    } else {
      try {
        const content = await readFileContent(node.path);
        const lang = getLanguageFromExtension(node.name.split('.').pop() ?? '');
        openTab(activeGroupId, {
          id: node.path,
          path: node.path,
          name: node.name,
          language: lang,
          content,
          isModified: false,
          isPinned: false,
          isPreview: false,
          cursorLine: 1,
          cursorColumn: 1,
          scrollTop: 0,
        });
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }
  }, [node, setSelectedPath, toggleDir, openTab, activeGroupId]);

  const handleDoubleClick = useCallback(() => {
    if (!node.isDir) {
      // Convert preview tab to permanent
      const state = useEditorStore.getState();
      const group = findLeafNode(state.layout, activeGroupId);
      if (group && group.type === 'leaf') {
        const tab = group.tabs.find((t: { path?: string }) => t.path === node.path);
        if (tab?.isPreview) {
          useEditorStore.getState().openTab(activeGroupId, { ...tab, isPreview: false });
        }
      }
    }
  }, [node, activeGroupId]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setSelectedPath(node.path);
      // Simple context menu via keyboard shortcut alt
    },
    [node.path, setSelectedPath]
  );

  return (
    <>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
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
            isExpanded ? <VscFolderOpened style={{ color: 'var(--accent-yellow)' }} /> : <VscFolder style={{ color: 'var(--accent-yellow)' }} />
          ) : (
            <VscFile style={{ color: getFileColor(node.name) }} />
          )}
        </span>
        {isRenaming ? (
          <RenameInput
            currentName={node.name}
            path={node.path}
            onCancel={cancelRename}
            onRenamed={onRefresh}
          />
        ) : (
          <>
            <span className="file-tree-name">{node.name}</span>
            {isModifiedFile ? <span className="file-modified-dot active" /> : null}
          </>
        )}
      </div>
      {node.isDir && renderChildren && node.children && (
        <div className={`file-tree-children ${isExpanded ? 'expanded' : 'collapsing'}`}>
          {creatingIn === node.path && (
            <CreateInlineInput
              type={creatingType!}
              parentPath={node.path}
              depth={depth + 1}
              onCancel={cancelCreate}
              onCreated={onRefresh}
            />
          )}
          {node.children.map((child, idx) => (
            <div
              key={child.path}
              className="file-tree-child"
              style={{ animationDelay: `${Math.min(idx, 14) * 30}ms` }}
            >
              <FileTreeNode node={child} depth={depth + 1} onRefresh={onRefresh} />
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
}: {
  currentName: string;
  path: string;
  onCancel: () => void;
  onRenamed: () => void;
}) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName) {
      onCancel();
      return;
    }
    const parts = path.replace(/\\/g, '/').split('/');
    parts.pop();
    const newPath = parts.join('/') + '/' + trimmed;
    try {
      await renamePath(path, newPath);
      onCancel();
      onRenamed();
    } catch (err) {
      console.error('Rename failed:', err);
      onCancel();
    }
  }, [value, currentName, path, onCancel, onRenamed]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <input
      ref={inputRef}
      className="file-tree-rename-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSubmit}
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
}: {
  type: 'file' | 'folder';
  parentPath: string;
  depth: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    const newPath = parentPath.replace(/\\/g, '/') + '/' + trimmed;
    try {
      if (type === 'file') {
        await createNewFile(newPath);
      } else {
        await createDirectory(newPath);
      }
      onCancel();
      onCreated();
    } catch (err) {
      console.error('Create failed:', err);
      onCancel();
    }
  }, [value, parentPath, type, onCancel, onCreated]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
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
        className="file-tree-rename-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder={type === 'file' ? 'filename' : 'folder name'}
        autoFocus
      />
    </div>
  );
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

function findLeafNode(node: any, id: string): any {
  if (!node) return null;
  if (node.type === 'leaf' && node.id === id) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findLeafNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function isPathModifiedInLayout(node: any, path: string): boolean {
  if (!node) return false;
  if (node.type === 'leaf') {
    return node.tabs.some((tab: any) => tab.path === path && tab.isModified);
  }
  if (node.type === 'split') {
    return node.children.some((child: any) => isPathModifiedInLayout(child, path));
  }
  return false;
}
