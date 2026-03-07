export type SplitDirection = 'horizontal' | 'vertical';

export type SplitNode =
  | { type: 'leaf'; id: string; tabs: FileTab[]; activeTabId: string | null }
  | { type: 'split'; direction: SplitDirection; children: SplitNode[]; sizes: number[] };

export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  isPinned: boolean;
  isPreview: boolean;
  cursorLine: number;
  cursorColumn: number;
  scrollTop: number;
  language: string;
}

export interface LayoutState {
  root: SplitNode;
  activeGroupId: string;
}
