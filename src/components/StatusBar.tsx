import { useEffect, useMemo, useState } from 'react';
import { useEditorStore, useBuildStore, useThemeStore, useUIStore } from '../stores';
import type { SplitNode } from '../types';
import {
  VscWarning,
  VscError,
} from 'react-icons/vsc';

function useRollingCount(target: number): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (value === target) return;
    const direction = target > value ? 1 : -1;
    const timer = setInterval(() => {
      setValue((prev) => {
        if ((direction > 0 && prev >= target) || (direction < 0 && prev <= target)) {
          clearInterval(timer);
          return target;
        }
        return prev + direction;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [target, value]);

  return value;
}

export default function StatusBar() {
  const layout = useEditorStore((s) => s.layout);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const compiling = useBuildStore((s) => s.compiling);
  const running = useBuildStore((s) => s.running);
  const activeProfileId = useBuildStore((s) => s.activeProfileId);
  const warningCount = useBuildStore((s) => s.warningCount);
  const errorCount = useBuildStore((s) => s.errorCount);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const saveIndicatorState = useUIStore((s) => s.saveIndicatorState);
  const resetSavingIndicator = useUIStore((s) => s.resetSavingIndicator);

  const [warningFlash, setWarningFlash] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);

  const warningValue = useRollingCount(warningCount);
  const errorValue = useRollingCount(errorCount);

  useEffect(() => {
    if (warningCount <= warningValue) return;
    setWarningFlash(true);
    const timer = setTimeout(() => setWarningFlash(false), 300);
    return () => clearTimeout(timer);
  }, [warningCount, warningValue]);

  useEffect(() => {
    if (errorCount <= errorValue) return;
    setErrorFlash(true);
    const timer = setTimeout(() => setErrorFlash(false), 300);
    return () => clearTimeout(timer);
  }, [errorCount, errorValue]);

  useEffect(() => {
    if (saveIndicatorState !== 'saved') return;
    const timer = setTimeout(() => {
      if (useUIStore.getState().saveIndicatorState === 'saved') {
        resetSavingIndicator();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [resetSavingIndicator, saveIndicatorState]);

  const activeTab = useMemo(() => {
    const activeGroup = findLeafNode(layout, activeGroupId);
    if (!activeGroup || activeGroup.type !== 'leaf') return null;
    return activeGroup.tabs.find((tab: any) => tab.id === activeGroup.activeTabId) ?? null;
  }, [activeGroupId, layout]);

  return (
    <div className={`statusbar ${compiling || running ? 'busy' : ''}`}>
      <div className="statusbar-left">
        {(compiling || running) ? (
          <div className="statusbar-item accent status-enter">
            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderTopColor: 'white' }} />
            <span>{compiling ? 'Compiling...' : 'Running...'}</span>
          </div>
        ) : null}
        <div className={`statusbar-item status-counter ${warningFlash ? 'flash-warning' : ''}`}>
          <VscWarning />
          <span>{warningValue}</span>
        </div>
        <div className={`statusbar-item status-counter ${errorFlash ? 'flash-error' : ''}`}>
          <VscError />
          <span>{errorValue}</span>
        </div>
      </div>
      <div className="statusbar-right">
        <div className={`statusbar-item status-save ${saveIndicatorState !== 'idle' ? 'visible' : ''}`}>
          <span className={`status-save-spinner ${saveIndicatorState === 'saving' ? 'active' : ''}`} />
          <span className={`status-save-check ${saveIndicatorState === 'saved' ? 'active' : ''}`}>✓</span>
        </div>
        {cursorPosition ? (
          <div className="statusbar-item status-enter">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </div>
        ) : null}
        {activeTab ? (
          <div className="statusbar-item status-enter">
            <span>{activeTab.language?.toUpperCase() ?? 'PLAIN TEXT'}</span>
          </div>
        ) : null}
        <div className="statusbar-item status-enter">
          <span>{activeProfileId}</span>
        </div>
        <div className="statusbar-item status-enter">
          <span>{currentTheme.name}</span>
        </div>
        <div className="statusbar-item status-enter">
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
