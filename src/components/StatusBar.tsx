import { useEditorStore, useBuildStore, useThemeStore, useSettingsStore } from '../stores';
import type { SplitNode } from '../types';
import {
  VscSourceControl,
  VscWarning,
  VscBell,
} from 'react-icons/vsc';

export default function StatusBar() {
  const layout = useEditorStore((s) => s.layout);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const compiling = useBuildStore((s) => s.compiling);
  const running = useBuildStore((s) => s.running);
  const activeProfileId = useBuildStore((s) => s.activeProfileId);
  const currentTheme = useThemeStore((s) => s.currentTheme);

  // Get active tab info
  const activeGroup = findLeafNode(layout, activeGroupId);
  const activeTab = activeGroup?.type === 'leaf'
    ? activeGroup.tabs.find((t: any) => t.id === activeGroup.activeTabId)
    : null;

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        {(compiling || running) && (
          <div className="statusbar-item accent">
            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderTopColor: 'white' }} />
            <span>{compiling ? 'Compiling...' : 'Running...'}</span>
          </div>
        )}
        <div className="statusbar-item">
          <VscWarning />
          <span>0</span>
        </div>
      </div>
      <div className="statusbar-right">
        {cursorPosition && (
          <div className="statusbar-item">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </div>
        )}
        {activeTab && (
          <div className="statusbar-item">
            <span>{activeTab.language?.toUpperCase() ?? 'Plain Text'}</span>
          </div>
        )}
        <div className="statusbar-item">
          <span>{activeProfileId}</span>
        </div>
        <div className="statusbar-item">
          <span>{currentTheme.name}</span>
        </div>
        <div className="statusbar-item">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}

function findLeafNode(node: SplitNode, id: string): any {
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
