import { create } from 'zustand';
import type { FileNode } from '../types';

interface FileExplorerState {
  rootPath: string | null;
  rootName: string;
  tree: FileNode[];
  treeSignature: string | null;
  expandedDirs: Set<string>;
  selectedPath: string | null;
  renamingPath: string | null;
  creatingIn: string | null;
  creatingType: 'file' | 'folder' | null;
  loading: boolean;

  setRootPath: (path: string, name: string) => void;
  setTree: (tree: FileNode[], signature?: string | null) => void;
  setTreeSignature: (signature: string | null) => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  collapseAll: () => void;
  setSelectedPath: (path: string | null) => void;
  startRename: (path: string) => void;
  cancelRename: () => void;
  startCreate: (dirPath: string, type: 'file' | 'folder') => void;
  cancelCreate: () => void;
  setLoading: (loading: boolean) => void;
  updateNode: (path: string, updates: Partial<FileNode>) => void;
  removeNode: (path: string) => void;
  addNode: (parentPath: string, node: FileNode) => void;
}

export const useFileExplorerStore = create<FileExplorerState>((set, get) => ({
  rootPath: null,
  rootName: '',
  tree: [],
  treeSignature: null,
  expandedDirs: new Set<string>(),
  selectedPath: null,
  renamingPath: null,
  creatingIn: null,
  creatingType: null,
  loading: false,

  setRootPath: (path, name) => set({ rootPath: path, rootName: name, treeSignature: null }),

  setTree: (tree, signature) =>
    set((state) => ({
      tree,
      treeSignature: signature !== undefined ? signature : state.treeSignature,
    })),

  setTreeSignature: (signature) => set({ treeSignature: signature }),

  toggleDir: (path) => {
    const expanded = new Set(get().expandedDirs);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expandedDirs: expanded });
  },

  expandDir: (path) => {
    const expanded = new Set(get().expandedDirs);
    expanded.add(path);
    set({ expandedDirs: expanded });
  },

  collapseDir: (path) => {
    const expanded = new Set(get().expandedDirs);
    expanded.delete(path);
    set({ expandedDirs: expanded });
  },

  collapseAll: () => set({ expandedDirs: new Set() }),

  setSelectedPath: (path) => set({ selectedPath: path }),

  startRename: (path) => set({ renamingPath: path }),
  cancelRename: () => set({ renamingPath: null }),

  startCreate: (dirPath, type) => set({ creatingIn: dirPath, creatingType: type }),
  cancelCreate: () => set({ creatingIn: null, creatingType: null }),

  setLoading: (loading) => set({ loading }),

  updateNode: (path, updates) => {
    const updateTree = (nodes: FileNode[]): FileNode[] =>
      nodes.map((n) => {
        if (n.path === path) return { ...n, ...updates };
        if (n.children) return { ...n, children: updateTree(n.children) };
        return n;
      });
    set({ tree: updateTree(get().tree) });
  },

  removeNode: (path) => {
    const filterTree = (nodes: FileNode[]): FileNode[] =>
      nodes
        .filter((n) => n.path !== path)
        .map((n) => (n.children ? { ...n, children: filterTree(n.children) } : n));
    set({ tree: filterTree(get().tree) });
  },

  addNode: (parentPath, node) => {
    const insertInto = (nodes: FileNode[]): FileNode[] =>
      nodes.map((n) => {
        if (n.path === parentPath && n.children) {
          const newChildren = [...n.children, node].sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          return { ...n, children: newChildren };
        }
        if (n.children) return { ...n, children: insertInto(n.children) };
        return n;
      });
    set({ tree: insertInto(get().tree) });
  },
}));
