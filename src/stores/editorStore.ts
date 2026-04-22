import { create } from 'zustand';
import type { SplitNode, FileTab } from '../types';
import { generateId, getFileName, getFileExtension, getLanguageFromExtension } from '../utils/fileUtils';

interface StoredFileViewState {
  line: number;
  column: number;
  scrollTop: number;
}

interface EditorState {
  layout: SplitNode;
  activeGroupId: string;
  closedTabs: FileTab[];
  cursorPosition: { line: number; column: number } | null;
  insertSnippet: ((text: string) => void) | null;
  fileViewState: Record<string, StoredFileViewState>;
  tabSavePulse: Record<string, number>;

  // Actions
  openFile: (path: string, content: string, groupId?: string, isPreview?: boolean) => void;
  openTab: (groupId: string, tab: FileTab) => void;
  closeTab: (groupId: string, tabId: string) => void;
  setActiveTab: (groupId: string, tabId: string) => void;
  setActiveGroup: (groupId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markSaved: (path: string) => void;
  markTabModified: (groupId: string, tabId: string, modified: boolean) => void;
  markTabSaved: (groupId: string, tabId: string, path?: string) => void;
  pinTab: (groupId: string, tabId: string) => void;
  moveTab: (fromGroupId: string, tabId: string, toGroupId: string, index?: number) => void;
  splitGroup: (groupId: string, direction: 'horizontal' | 'vertical', tabId?: string) => void;
  closeOtherTabs: (groupId: string, tabId: string) => void;
  closeTabsToRight: (groupId: string, tabId: string) => void;
  closeAllTabs: (groupId: string) => void;
  reopenClosedTab: () => void;
  nextTab: (groupId: string) => void;
  previousTab: (groupId: string) => void;
  goToTab: (groupId: string, index: number) => void;
  reorderTab: (groupId: string, fromIndex: number, toIndex: number) => void;
  removeGroup: (groupId: string) => void;
  updateCursorPosition: (groupId: string, tabId: string, line: number, column: number) => void;
  updateScrollPosition: (groupId: string, tabId: string, scrollTop: number) => void;
  setCursorPosition: (line: number, column: number) => void;
  setInsertSnippetFn: (fn: ((text: string) => void) | null) => void;
  hydrateFileViewState: (viewState: Record<string, StoredFileViewState>) => void;
  getTabViewState: (tab: Pick<FileTab, 'id' | 'path'> | null) => StoredFileViewState | null;
  getActiveTab: () => FileTab | null;
  getGroupTabs: (groupId: string) => FileTab[];
  getAllGroups: () => Extract<SplitNode, { type: 'leaf' }>[];
  findTabByPath: (path: string) => { groupId: string; tab: FileTab } | null;
  refreshTabContent: (tabId: string, content: string) => void;
  renameTabsForPath: (oldPath: string, newPath: string) => void;
  closeTabsForPaths: (paths: string[]) => void;
  updateSplitSizes: (parentPath: number[], sizes: number[]) => void;
  pulseTabSaveByPath: (path: string) => void;
}

const initialGroupId = generateId();

function findGroup(node: SplitNode, groupId: string): SplitNode | null {
  if (node.type === 'leaf' && node.id === groupId) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findGroup(child, groupId);
      if (found) return found;
    }
  }
  return null;
}

function updateGroup(node: SplitNode, groupId: string, updater: (leaf: Extract<SplitNode, { type: 'leaf' }>) => SplitNode): SplitNode {
  if (node.type === 'leaf' && node.id === groupId) {
    return updater(node);
  }
  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map((c) => updateGroup(c, groupId, updater)),
    };
  }
  return node;
}

function removeEmptyGroups(node: SplitNode): SplitNode | null {
  if (node.type === 'leaf') {
    return node.tabs.length > 0 ? node : null;
  }
  const children = node.children
    .map(removeEmptyGroups)
    .filter((c): c is SplitNode => c !== null);

  if (children.length === 0) return null;
  if (children.length === 1) return children[0];

  // Preserve existing sizes if no children were removed, otherwise redistribute
  if (children.length === node.children.length) {
    return { ...node, children, sizes: node.sizes };
  }
  // Recalculate sizes proportionally for remaining children
  const remainingIndices = node.children.map((c, i) => {
    const cleaned = removeEmptyGroups(c);
    return cleaned ? i : -1;
  }).filter((i) => i >= 0);
  const remainingSizes = remainingIndices.map((i) => node.sizes[i]);
  const totalSize = remainingSizes.reduce((a, b) => a + b, 0);
  const normalizedSizes = remainingSizes.map((s) => (s / totalSize) * 100);
  return { ...node, children, sizes: normalizedSizes };
}

function getAllGroups(node: SplitNode): Extract<SplitNode, { type: 'leaf' }>[] {
  if (node.type === 'leaf') return [node];
  return node.children.flatMap(getAllGroups);
}

function findTabLocation(node: SplitNode, tabId: string): { groupId: string; tab: FileTab } | null {
  if (node.type === 'leaf') {
    const tab = node.tabs.find((candidate) => candidate.id === tabId);
    return tab ? { groupId: node.id, tab } : null;
  }

  for (const child of node.children) {
    const found = findTabLocation(child, tabId);
    if (found) return found;
  }

  return null;
}

function normalizePathKey(path: string): string {
  return path.replace(/\//g, '\\').toLowerCase();
}

function isSameOrDescendantPath(path: string, prefix: string): boolean {
  const normalizedPath = normalizePathKey(path);
  const normalizedPrefix = normalizePathKey(prefix);
  return (
    normalizedPath === normalizedPrefix
    || normalizedPath.startsWith(`${normalizedPrefix}\\`)
  );
}

function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  const normalizedPath = path.replace(/\//g, '\\');
  const normalizedOldPrefix = oldPrefix.replace(/\//g, '\\');
  const normalizedNewPrefix = newPrefix.replace(/\//g, '\\');

  if (normalizePathKey(path) === normalizePathKey(oldPrefix)) {
    return normalizedNewPrefix;
  }

  const relativePath = normalizedPath
    .slice(normalizedOldPrefix.length)
    .replace(/^\\+/, '');

  return relativePath
    ? `${normalizedNewPrefix}\\${relativePath}`
    : normalizedNewPrefix;
}

function getTabViewStateKey(tab: Pick<FileTab, 'id' | 'path'> | null): string | null {
  if (!tab) return null;
  return tab.path ? normalizePathKey(tab.path) : `untitled:${tab.id}`;
}

function collectOpenViewStateKeys(node: SplitNode, output: Set<string>) {
  if (node.type === 'leaf') {
    for (const tab of node.tabs) {
      const key = getTabViewStateKey(tab);
      if (key) output.add(key);
    }
    return;
  }

  for (const child of node.children) {
    collectOpenViewStateKeys(child, output);
  }
}

function pruneFileViewStateForOpenTabs(
  layout: SplitNode,
  fileViewState: Record<string, StoredFileViewState>
): Record<string, StoredFileViewState> {
  const openKeys = new Set<string>();
  collectOpenViewStateKeys(layout, openKeys);
  const next: Record<string, StoredFileViewState> = {};
  for (const key of openKeys) {
    const existing = fileViewState[key];
    if (existing) {
      next[key] = existing;
    }
  }
  return next;
}

function hasMeaningfulViewState(tab: Partial<FileTab>): boolean {
  return (
    typeof tab.cursorLine === 'number' &&
    typeof tab.cursorColumn === 'number' &&
    typeof tab.scrollTop === 'number' &&
    !(tab.cursorLine === 1 && tab.cursorColumn === 1 && tab.scrollTop === 0)
  );
}

function resolveViewState(state: Pick<EditorState, 'layout' | 'fileViewState'>, tab: FileTab, fallbackTab?: FileTab): StoredFileViewState {
  const saved = state.fileViewState[getTabViewStateKey(tab) ?? ''];
  if (saved) return saved;

  if (hasMeaningfulViewState(tab)) {
    return {
      line: tab.cursorLine,
      column: tab.cursorColumn,
      scrollTop: tab.scrollTop,
    };
  }

  if (fallbackTab) {
    return {
      line: fallbackTab.cursorLine,
      column: fallbackTab.cursorColumn,
      scrollTop: fallbackTab.scrollTop,
    };
  }

  if (tab.path) {
    const groups = getAllGroups(state.layout);
    for (const group of groups) {
      const openTab = group.tabs.find((candidate) => candidate.path === tab.path);
      if (openTab) {
        return {
          line: openTab.cursorLine,
          column: openTab.cursorColumn,
          scrollTop: openTab.scrollTop,
        };
      }
    }
  }

  return {
    line: tab.cursorLine ?? 1,
    column: tab.cursorColumn ?? 1,
    scrollTop: tab.scrollTop ?? 0,
  };
}

function applyViewState(state: Pick<EditorState, 'layout' | 'fileViewState'>, tab: FileTab, fallbackTab?: FileTab): FileTab {
  const viewState = resolveViewState(state, tab, fallbackTab);
  return {
    ...tab,
    cursorLine: viewState.line,
    cursorColumn: viewState.column,
    scrollTop: viewState.scrollTop,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  layout: {
    type: 'leaf',
    id: initialGroupId,
    tabs: [],
    activeTabId: null,
  },
  activeGroupId: initialGroupId,
  closedTabs: [],
  cursorPosition: null,
  insertSnippet: null,
  fileViewState: {},
  tabSavePulse: {},

  openTab: (groupId, tab) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf') return;
    const existing = group.tabs.find((t) => t.id === tab.id || t.path === tab.path);
    if (existing) {
      const nextTab = applyViewState(state, { ...existing, ...tab, id: existing.id }, existing);
      const nextLayout = updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        activeTabId: existing.id,
        tabs: leaf.tabs.map((t) => t.id === existing.id ? nextTab : t),
      }));
      set({
        layout: nextLayout,
        activeGroupId: groupId,
        fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
      });
    } else {
      const nextTab = applyViewState(state, tab);
      // Replace preview tab if exists
      const previewIdx = group.tabs.findIndex((t) => t.isPreview);
      const newTabs = [...group.tabs];
      if (previewIdx >= 0) {
        newTabs[previewIdx] = nextTab;
      } else {
        newTabs.push(nextTab);
      }
      const nextLayout = updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: newTabs,
        activeTabId: nextTab.id,
      }));
      set({
        layout: nextLayout,
        activeGroupId: groupId,
        fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
      });
    }
  },

  openFile: (path, content, groupId, isPreview = false) => {
    const state = get();
    const targetGroupId = groupId || state.activeGroupId;

    // Check if already open in target group
    const group = findGroup(state.layout, targetGroupId);
    if (group && group.type === 'leaf') {
      const existing = group.tabs.find((t) => t.path === path);
      if (existing) {
        set({
          layout: updateGroup(state.layout, targetGroupId, (leaf) => ({
            ...leaf,
            activeTabId: existing.id,
          })),
        });
        return;
      }
    }

    const ext = getFileExtension(path);
    const baseTab: FileTab = {
      id: generateId(),
      path,
      name: getFileName(path),
      content,
      isModified: false,
      isPinned: false,
      isPreview,
      cursorLine: 1,
      cursorColumn: 1,
      scrollTop: 0,
      language: getLanguageFromExtension(ext),
    };
    const newTab = applyViewState(state, baseTab);

    const nextLayout = updateGroup(state.layout, targetGroupId, (leaf) => {
      // Replace preview tab if exists
      let newTabs = [...leaf.tabs];
      if (isPreview) {
        const previewIdx = newTabs.findIndex((t) => t.isPreview);
        if (previewIdx >= 0) {
          newTabs[previewIdx] = newTab;
        } else {
          newTabs.push(newTab);
        }
      } else {
        newTabs.push(newTab);
      }
      return { ...leaf, tabs: newTabs, activeTabId: newTab.id };
    });

    set({
      layout: nextLayout,
      activeGroupId: targetGroupId,
      fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
    });
  },

  closeTab: (groupId, tabId) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf') return;

    const tab = group.tabs.find((t) => t.id === tabId);
    if (tab) {
      const closedTabs = [applyViewState(state, tab), ...state.closedTabs].slice(0, 20);
      const newTabs = group.tabs.filter((t) => t.id !== tabId);
      const tabIdx = group.tabs.findIndex((t) => t.id === tabId);
      const newActiveId =
        group.activeTabId === tabId
          ? newTabs[Math.min(tabIdx, newTabs.length - 1)]?.id || null
          : group.activeTabId;

      let newLayout = updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: newTabs,
        activeTabId: newActiveId,
      }));

      // Remove empty groups
      const cleaned = removeEmptyGroups(newLayout);
      if (!cleaned) {
        // Keep at least one empty group
        const newId = generateId();
        newLayout = { type: 'leaf', id: newId, tabs: [], activeTabId: null };
        set({
          layout: newLayout,
          activeGroupId: newId,
          closedTabs,
          fileViewState: pruneFileViewStateForOpenTabs(newLayout, state.fileViewState),
        });
      } else {
        // Update activeGroupId if needed
        const groups = getAllGroups(cleaned);
        const activeGroupStillExists = groups.some((g) => g.id === state.activeGroupId);
        set({
          layout: cleaned,
          activeGroupId: activeGroupStillExists ? state.activeGroupId : groups[0]?.id || '',
          closedTabs,
          fileViewState: pruneFileViewStateForOpenTabs(cleaned, state.fileViewState),
        });
      }
    }
  },

  setActiveTab: (groupId, tabId) => {
    set((state) => ({
      layout: updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        activeTabId: tabId,
      })),
      activeGroupId: groupId,
    }));
  },

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  updateTabContent: (tabId, content) => {
    // Find the tab across all groups
    const state = get();
    const groups = getAllGroups(state.layout);
    let targetGroupId: string | null = null;
    for (const g of groups) {
      if (g.tabs.some((t) => t.id === tabId)) {
        targetGroupId = g.id;
        break;
      }
    }
    if (!targetGroupId) return;
    set((state) => ({
      layout: updateGroup(state.layout, targetGroupId!, (leaf) => ({
        ...leaf,
        tabs: leaf.tabs.map((t) =>
          t.id === tabId ? { ...t, content, isModified: true, isPreview: false } : t
        ),
      })),
    }));
  },

  markSaved: (path) => {
    const groups = getAllGroups(get().layout);
    get().pulseTabSaveByPath(path);
    for (const g of groups) {
      const tab = g.tabs.find((t) => t.path === path);
      if (tab) {
        set((state) => ({
          layout: updateGroup(state.layout, g.id, (leaf) => ({
            ...leaf,
            tabs: leaf.tabs.map((t) =>
              t.path === path ? { ...t, isModified: false } : t
            ),
          })),
        }));
        return;
      }
    }
  },

  markTabModified: (groupId, tabId, modified) => {
    set((state) => ({
      layout: updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: leaf.tabs.map((t) =>
          t.id === tabId ? { ...t, isModified: modified } : t
        ),
      })),
    }));
  },

  markTabSaved: (groupId, tabId, path) => {
    const location = findTabLocation(get().layout, tabId);
    if (path) {
      get().pulseTabSaveByPath(path);
    } else if (location?.tab.path) {
      get().pulseTabSaveByPath(location.tab.path);
    }
    set((state) => {
      const nextViewState = { ...state.fileViewState };
      if (path && location) {
        const resolvedViewState = resolveViewState(state, location.tab);
        const nextKey = normalizePathKey(path);
        nextViewState[nextKey] = {
          line: resolvedViewState.line,
          column: resolvedViewState.column,
          scrollTop: resolvedViewState.scrollTop,
        };

        const previousKey = getTabViewStateKey(location.tab);
        if (previousKey && previousKey !== nextKey) {
          delete nextViewState[previousKey];
        }
      }

      return {
        layout: updateGroup(state.layout, groupId, (leaf) => ({
          ...leaf,
          tabs: leaf.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isModified: false,
                  ...(path
                    ? { path, name: getFileName(path) }
                    : {}),
                }
              : t
          ),
        })),
        fileViewState: nextViewState,
      };
    });
  },

  pinTab: (groupId, tabId) => {
    set((state) => ({
      layout: updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: leaf.tabs.map((t) =>
          t.id === tabId ? { ...t, isPinned: true, isPreview: false } : t
        ),
      })),
    }));
  },

  moveTab: (fromGroupId, tabId, toGroupId, index) => {
    const state = get();
    const fromGroup = findGroup(state.layout, fromGroupId);
    if (!fromGroup || fromGroup.type !== 'leaf') return;
    const tab = fromGroup.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Remove from source
    let newLayout = updateGroup(state.layout, fromGroupId, (leaf) => {
      const newTabs = leaf.tabs.filter((t) => t.id !== tabId);
      return {
        ...leaf,
        tabs: newTabs,
        activeTabId: leaf.activeTabId === tabId
          ? newTabs[newTabs.length - 1]?.id || null
          : leaf.activeTabId,
      };
    });

    // Add to destination
    newLayout = updateGroup(newLayout, toGroupId, (leaf) => {
      const newTabs = [...leaf.tabs];
      if (index !== undefined) {
        newTabs.splice(index, 0, tab);
      } else {
        newTabs.push(tab);
      }
      return { ...leaf, tabs: newTabs, activeTabId: tab.id };
    });

    const cleaned = removeEmptyGroups(newLayout);
    if (cleaned) {
      set({ layout: cleaned, activeGroupId: toGroupId });
    }
  },

  splitGroup: (groupId, direction, tabId) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf') return;

    const newGroupId = generateId();
    let tabToMove: FileTab | undefined;

    if (tabId) {
      tabToMove = group.tabs.find((t) => t.id === tabId);
    }

    const newGroup: SplitNode = {
      type: 'leaf',
      id: newGroupId,
      tabs: tabToMove ? [tabToMove] : [],
      activeTabId: tabToMove?.id || null,
    };

    let updatedOriginal: SplitNode = group;
    if (tabToMove) {
      updatedOriginal = {
        ...group,
        tabs: group.tabs.filter((t) => t.id !== tabId),
        activeTabId: group.activeTabId === tabId
          ? group.tabs.find((t) => t.id !== tabId)?.id || null
          : group.activeTabId,
      };
    }

    const splitNode: SplitNode = {
      type: 'split',
      direction,
      children: [updatedOriginal, newGroup],
      sizes: [50, 50],
    };

    const replaceGroup = (node: SplitNode): SplitNode => {
      if (node.type === 'leaf' && node.id === groupId) return splitNode;
      if (node.type === 'split') {
        return { ...node, children: node.children.map(replaceGroup) };
      }
      return node;
    };

    set({
      layout: replaceGroup(state.layout),
      activeGroupId: tabToMove ? newGroupId : groupId,
    });
  },

  closeOtherTabs: (groupId, tabId) => {
    set((state) => {
      const nextLayout = updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: leaf.tabs.filter((t) => t.id === tabId),
        activeTabId: tabId,
      }));
      return {
        layout: nextLayout,
        fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
      };
    });
  },

  closeTabsToRight: (groupId, tabId) => {
    set((state) => {
      const nextLayout = updateGroup(state.layout, groupId, (leaf) => {
        const idx = leaf.tabs.findIndex((t) => t.id === tabId);
        const newTabs = leaf.tabs.slice(0, idx + 1);
        return {
          ...leaf,
          tabs: newTabs,
          activeTabId: newTabs.some((t) => t.id === leaf.activeTabId)
            ? leaf.activeTabId
            : tabId,
        };
      });
      return {
        layout: nextLayout,
        fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
      };
    });
  },

  closeAllTabs: (groupId) => {
    set((state) => {
      const nextLayout = updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        tabs: [],
        activeTabId: null,
      }));
      return {
        layout: nextLayout,
        fileViewState: pruneFileViewStateForOpenTabs(nextLayout, state.fileViewState),
      };
    });
  },

  reopenClosedTab: () => {
    const state = get();
    if (state.closedTabs.length === 0) return;
    const [tab, ...rest] = state.closedTabs;
    get().openTab(state.activeGroupId, { ...tab, isPreview: false });
    set({ closedTabs: rest });
  },

  nextTab: (groupId) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf' || group.tabs.length === 0) return;
    const idx = group.tabs.findIndex((t) => t.id === group.activeTabId);
    const nextIdx = (idx + 1) % group.tabs.length;
    set({
      layout: updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        activeTabId: leaf.tabs[nextIdx]?.id || null,
      })),
    });
  },

  previousTab: (groupId) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf' || group.tabs.length === 0) return;
    const idx = group.tabs.findIndex((t) => t.id === group.activeTabId);
    const prevIdx = (idx - 1 + group.tabs.length) % group.tabs.length;
    set({
      layout: updateGroup(state.layout, groupId, (leaf) => ({
        ...leaf,
        activeTabId: leaf.tabs[prevIdx]?.id || null,
      })),
    });
  },

  goToTab: (groupId, index) => {
    const state = get();
    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf') return;
    const tab = group.tabs[index];
    if (tab) {
      set({
        layout: updateGroup(state.layout, groupId, (leaf) => ({
          ...leaf,
          activeTabId: tab.id,
        })),
      });
    }
  },

  reorderTab: (groupId, fromIndex, toIndex) => {
    set((state) => ({
      layout: updateGroup(state.layout, groupId, (leaf) => {
        const newTabs = [...leaf.tabs];
        const [removed] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, removed);
        return { ...leaf, tabs: newTabs };
      }),
    }));
  },

  removeGroup: (groupId) => {
    const state = get();
    const groups = getAllGroups(state.layout);
    // Can't remove the last group
    if (groups.length <= 1) return;

    const group = findGroup(state.layout, groupId);
    if (!group || group.type !== 'leaf') return;

    const tabsToMove = group.tabs;

    // Find nearest group: prefer same-level sibling, else first available
    const otherGroups = groups.filter((g) => g.id !== groupId);
    const targetGroup = otherGroups[0];
    if (!targetGroup) return;

    // Remove the group from layout
    const removeFromLayout = (node: SplitNode): SplitNode | null => {
      if (node.type === 'leaf') {
        return node.id === groupId ? null : node;
      }
      const children = node.children
        .map(removeFromLayout)
        .filter((c): c is SplitNode => c !== null);
      if (children.length === 0) return null;
      if (children.length === 1) return children[0];
      return { ...node, children, sizes: children.map(() => 100 / children.length) };
    };

    // First add tabs to the target group
    let newLayout = state.layout;
    if (tabsToMove.length > 0) {
      newLayout = updateGroup(newLayout, targetGroup.id, (leaf) => ({
        ...leaf,
        tabs: [...leaf.tabs, ...tabsToMove],
        activeTabId: tabsToMove[0]?.id || leaf.activeTabId,
      }));
    }

    // Then remove the empty group
    newLayout = updateGroup(newLayout, groupId, (leaf) => ({
      ...leaf,
      tabs: [],
      activeTabId: null,
    }));

    const cleaned = removeFromLayout(newLayout);
    if (cleaned) {
      set({
        layout: cleaned,
        activeGroupId: targetGroup.id,
      });
    }
  },

  updateCursorPosition: (_groupId, tabId, line, column) => {
    const location = findTabLocation(get().layout, tabId);
    set((state) => {
      const nextViewState = { ...state.fileViewState };
      if (location) {
        const key = getTabViewStateKey(location.tab);
        const existing = key ? nextViewState[key] : null;
        if (!key) return { fileViewState: nextViewState };

        nextViewState[key] = {
          line,
          column,
          scrollTop: existing?.scrollTop ?? location.tab.scrollTop ?? 0,
        };
      }

      return { fileViewState: nextViewState };
    });
  },

  updateScrollPosition: (_groupId, tabId, scrollTop) => {
    const location = findTabLocation(get().layout, tabId);
    set((state) => {
      const nextViewState = { ...state.fileViewState };
      if (location) {
        const key = getTabViewStateKey(location.tab);
        const existing = key ? nextViewState[key] : null;
        if (!key) return { fileViewState: nextViewState };

        nextViewState[key] = {
          line: existing?.line ?? location.tab.cursorLine ?? 1,
          column: existing?.column ?? location.tab.cursorColumn ?? 1,
          scrollTop,
        };
      }

      return { fileViewState: nextViewState };
    });
  },

  setCursorPosition: (line, column) => set({ cursorPosition: { line, column } }),

  setInsertSnippetFn: (fn) => set({ insertSnippet: fn }),

  hydrateFileViewState: (viewState) =>
    set((state) => ({
      fileViewState: pruneFileViewStateForOpenTabs(state.layout, viewState),
    })),

  getTabViewState: (tab) => {
    const key = getTabViewStateKey(tab);
    if (!key) return null;
    return get().fileViewState[key] ?? null;
  },

  getActiveTab: () => {
    const state = get();
    const group = findGroup(state.layout, state.activeGroupId);
    if (!group || group.type !== 'leaf') return null;
    return group.tabs.find((t) => t.id === group.activeTabId) || null;
  },

  getGroupTabs: (groupId) => {
    const group = findGroup(get().layout, groupId);
    if (!group || group.type !== 'leaf') return [];
    return group.tabs;
  },

  getAllGroups: () => {
    return getAllGroups(get().layout);
  },

  findTabByPath: (path) => {
    const normPath = path.replace(/\//g, '\\').toLowerCase();
    const groups = getAllGroups(get().layout);
    for (const group of groups) {
      const tab = group.tabs.find((t) => t.path && t.path.replace(/\//g, '\\').toLowerCase() === normPath);
      if (tab) return { groupId: group.id, tab };
    }
    return null;
  },

  refreshTabContent: (tabId, content) => {
    // Update content WITHOUT marking as modified (for external file changes)
    const state = get();
    const groups = getAllGroups(state.layout);
    let targetGroupId: string | null = null;
    for (const g of groups) {
      if (g.tabs.some((t) => t.id === tabId)) {
        targetGroupId = g.id;
        break;
      }
    }
    if (!targetGroupId) return;
    set((state) => ({
      layout: updateGroup(state.layout, targetGroupId!, (leaf) => ({
        ...leaf,
        tabs: leaf.tabs.map((t) =>
          t.id === tabId ? { ...t, content, isModified: false } : t
        ),
      })),
    }));
  },

  renameTabsForPath: (oldPath, newPath) => {
    set((state) => {
      const nextViewState: Record<string, StoredFileViewState> = {};

      for (const [key, value] of Object.entries(state.fileViewState)) {
        if (isSameOrDescendantPath(key, oldPath)) {
          const nextKey = normalizePathKey(replacePathPrefix(key, oldPath, newPath));
          nextViewState[nextKey] = value;
        } else {
          nextViewState[key] = value;
        }
      }

      const updateTabPath = (tab: FileTab): FileTab => {
        if (!tab.path || !isSameOrDescendantPath(tab.path, oldPath)) {
          return tab;
        }

        const nextPath = replacePathPrefix(tab.path, oldPath, newPath);
        return {
          ...tab,
          path: nextPath,
          name: getFileName(nextPath),
        };
      };

      const updateNodePaths = (node: SplitNode): SplitNode => {
        if (node.type === 'leaf') {
          return {
            ...node,
            tabs: node.tabs.map(updateTabPath),
          };
        }

        return {
          ...node,
          children: node.children.map(updateNodePaths),
        };
      };

      return {
        layout: updateNodePaths(state.layout),
        closedTabs: state.closedTabs.map(updateTabPath),
        fileViewState: nextViewState,
      };
    });
  },

  closeTabsForPaths: (paths) => {
    if (paths.length === 0) return;

    set((state) => {
      const shouldCloseTab = (tab: FileTab): boolean => (
        !!tab.path && paths.some((path) => isSameOrDescendantPath(tab.path!, path))
      );

      const updateNodeTabs = (node: SplitNode): SplitNode => {
        if (node.type === 'leaf') {
          const remainingTabs = node.tabs.filter((tab) => !shouldCloseTab(tab));
          const nextActiveTabId = remainingTabs.some((tab) => tab.id === node.activeTabId)
            ? node.activeTabId
            : remainingTabs[remainingTabs.length - 1]?.id ?? null;

          return {
            ...node,
            tabs: remainingTabs,
            activeTabId: nextActiveTabId,
          };
        }

        return {
          ...node,
          children: node.children.map(updateNodeTabs),
        };
      };

      const updatedLayout = updateNodeTabs(state.layout);
      const cleanedLayout = removeEmptyGroups(updatedLayout)
        ?? { type: 'leaf', id: initialGroupId, tabs: [], activeTabId: null };
      const groups = getAllGroups(cleanedLayout);
      const activeGroupStillExists = groups.some((group) => group.id === state.activeGroupId);

      return {
        layout: cleanedLayout,
        activeGroupId: activeGroupStillExists ? state.activeGroupId : groups[0]?.id ?? initialGroupId,
        closedTabs: state.closedTabs.filter((tab) => !shouldCloseTab(tab)),
        fileViewState: pruneFileViewStateForOpenTabs(cleanedLayout, state.fileViewState),
      };
    });
  },

  updateSplitSizes: (parentPath, sizes) => {
    const updateAtPath = (node: SplitNode, path: number[]): SplitNode => {
      if (path.length === 0) {
        if (node.type === 'split') {
          return { ...node, sizes };
        }
        return node;
      }
      if (node.type === 'split') {
        const [head, ...rest] = path;
        return {
          ...node,
          children: node.children.map((c, i) => i === head ? updateAtPath(c, rest) : c),
        };
      }
      return node;
    };
    set((state) => ({ layout: updateAtPath(state.layout, parentPath) }));
  },

  pulseTabSaveByPath: (path) =>
    set((state) => ({
      tabSavePulse: {
        ...state.tabSavePulse,
        [normalizePathKey(path)]: Date.now(),
      },
    })),
}));
