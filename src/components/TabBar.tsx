import { useCallback, useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../stores';
import type { FileTab } from '../types';
import { VscClose, VscCircleFilled, VscPinned } from 'react-icons/vsc';

// Shared drag data so cross-group drops work
export const TAB_DRAG_TYPE = 'application/x-doom-code-tab';

interface TabBarProps {
  groupId: string;
  tabs: FileTab[];
  activeTabId: string | null;
}

export default function TabBar({ groupId, tabs, activeTabId }: TabBarProps) {
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const reorderTab = useEditorStore((s) => s.reorderTab);
  const moveTab = useEditorStore((s) => s.moveTab);
  // dropIndicator: { index, side } — shows a line before or after the tab at `index`
  const [dropIndicator, setDropIndicator] = useState<{ index: number; side: 'left' | 'right' } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Mouse wheel → horizontal scroll
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !tabBarRef.current) return;
    const activeEl = tabBarRef.current.querySelector('.tab.active') as HTMLElement | null;
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTab(groupId, tabId);
    },
    [groupId, setActiveTab]
  );

  const handleTabClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(groupId, tabId);
    },
    [groupId, closeTab]
  );

  const handleTabMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(groupId, tabId);
      }
    },
    [groupId, closeTab]
  );

  const handleDragStart = useCallback((e: React.DragEvent, tab: FileTab) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TAB_DRAG_TYPE, JSON.stringify({ sourceGroupId: groupId, tabId: tab.id }));
    e.dataTransfer.setData('text/plain', tab.name);
    setDraggingId(tab.id);
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  }, [groupId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropIndicator(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    // Determine left/right half of the tab
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const side: 'left' | 'right' = e.clientX < midX ? 'left' : 'right';
    setDropIndicator({ index, side });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we leave the tab bar entirely
    if (tabBarRef.current && !tabBarRef.current.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
    }
  }, []);

  const getDropIndex = useCallback((indicator: { index: number; side: 'left' | 'right' }): number => {
    return indicator.side === 'left' ? indicator.index : indicator.index + 1;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const raw = e.dataTransfer.getData(TAB_DRAG_TYPE);
    const currentIndicator = dropIndicator;
    setDropIndicator(null);
    setDraggingId(null);
    if (!raw || !currentIndicator) return;

    const toIndex = getDropIndex(currentIndicator);

    try {
      const { sourceGroupId, tabId } = JSON.parse(raw);
      if (sourceGroupId === groupId) {
        const fromIndex = tabs.findIndex((t) => t.id === tabId);
        if (fromIndex !== -1 && fromIndex !== toIndex && fromIndex !== toIndex - 1) {
          // Adjust toIndex: when moving forward, account for the removal
          const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
          reorderTab(groupId, fromIndex, adjustedTo);
        }
      } else {
        moveTab(sourceGroupId, tabId, groupId, toIndex);
      }
    } catch {}
  }, [groupId, tabs, reorderTab, moveTab, dropIndicator, getDropIndex]);

  const handleBarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // If hovering past all tabs, show indicator after last tab
    if (tabs.length > 0) {
      setDropIndicator({ index: tabs.length - 1, side: 'right' });
    }
  }, [tabs.length]);

  const handleBarDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropIndicator(null);
    setDraggingId(null);

    const raw = e.dataTransfer.getData(TAB_DRAG_TYPE);
    if (!raw) return;

    try {
      const { sourceGroupId, tabId } = JSON.parse(raw);
      if (sourceGroupId === groupId) {
        const fromIndex = tabs.findIndex((t) => t.id === tabId);
        if (fromIndex !== -1 && fromIndex !== tabs.length - 1) {
          reorderTab(groupId, fromIndex, tabs.length - 1);
        }
      } else {
        moveTab(sourceGroupId, tabId, groupId);
      }
    } catch {}
  }, [groupId, tabs, reorderTab, moveTab]);

  const handleBarDragLeave = useCallback((e: React.DragEvent) => {
    if (tabBarRef.current && !tabBarRef.current.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
    }
  }, []);

  return (
    <div
      ref={tabBarRef}
      className="tab-bar"
      onDragOver={handleBarDragOver}
      onDrop={handleBarDrop}
      onDragLeave={handleBarDragLeave}
    >
      {tabs.map((tab, index) => {
        const isDropLeft = dropIndicator?.index === index && dropIndicator.side === 'left';
        const isDropRight = dropIndicator?.index === index && dropIndicator.side === 'right';
        return (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isModified ? 'modified' : ''} ${tab.isPinned ? 'pinned' : ''} ${isDropLeft ? 'drop-left' : ''} ${isDropRight ? 'drop-right' : ''} ${draggingId === tab.id ? 'dragging' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onMouseDown={(e) => handleTabMiddleClick(e, tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
          >
            {tab.isPinned ? (
              <span className="tab-icon">
                <VscPinned />
              </span>
            ) : (
              <>
                <span className="tab-label">{tab.name}</span>
                {tab.isModified && <span className="tab-dot"><VscCircleFilled style={{ width: 8, height: 8 }} /></span>}
                <button className="tab-close" onClick={(e) => handleTabClose(e, tab.id)}>
                  <VscClose />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
