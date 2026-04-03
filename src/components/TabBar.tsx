import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../stores';
import type { FileTab } from '../types';
import { VscClose, VscCircleFilled, VscPinned } from 'react-icons/vsc';

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
  const tabSavePulse = useEditorStore((s) => s.tabSavePulse);

  const [dropIndicator, setDropIndicator] = useState<{ index: number; side: 'left' | 'right' } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());
  const [shimmeringIds, setShimmeringIds] = useState<Set<string>>(new Set());
  const [activeIndicator, setActiveIndicator] = useState({ x: 0, width: 0, visible: false });

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousTabIdsRef = useRef<string[]>(tabs.map((tab) => tab.id));
  const previousPulseRef = useRef<Record<string, number>>({});

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

  useEffect(() => {
    if (!activeTabId) return;
    const activeEl = tabRefs.current[activeTabId];
    if (!activeEl) {
      setActiveIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    setActiveIndicator({
      x: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      visible: true,
    });
  }, [activeTabId, tabs]);

  useEffect(() => {
    const previous = previousTabIdsRef.current;
    const current = tabs.map((tab) => tab.id);
    const added = current.filter((id) => !previous.includes(id));
    if (added.length > 0) {
      setEnteringIds((prev) => {
        const next = new Set(prev);
        for (const id of added) next.add(id);
        return next;
      });
      const timer = window.setTimeout(() => {
        setEnteringIds((prev) => {
          const next = new Set(prev);
          for (const id of added) next.delete(id);
          return next;
        });
      }, 220);
      previousTabIdsRef.current = current;
      return () => window.clearTimeout(timer);
    }
    previousTabIdsRef.current = current;
  }, [tabs]);

  useEffect(() => {
    const visibleIds = new Set(tabs.map((tab) => tab.id));
    setClosingIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    const pulseMap = previousPulseRef.current;
    const newlyShimmering: string[] = [];
    for (const tab of tabs) {
      if (!tab.path) continue;
      const key = tab.path.replace(/\//g, '\\').toLowerCase();
      const pulse = tabSavePulse[key];
      if (pulse && pulseMap[key] !== pulse) {
        newlyShimmering.push(tab.id);
      }
      if (pulse) {
        pulseMap[key] = pulse;
      }
    }

    if (newlyShimmering.length === 0) return;

    setShimmeringIds((prev) => {
      const next = new Set(prev);
      for (const id of newlyShimmering) next.add(id);
      return next;
    });
    const timer = window.setTimeout(() => {
      setShimmeringIds((prev) => {
        const next = new Set(prev);
        for (const id of newlyShimmering) next.delete(id);
        return next;
      });
    }, 420);
    return () => window.clearTimeout(timer);
  }, [tabSavePulse, tabs]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTab(groupId, tabId);
    },
    [groupId, setActiveTab]
  );

  const requestCloseTab = useCallback(
    (tabId: string) => {
      setClosingIds((prev) => {
        if (prev.has(tabId)) return prev;
        const next = new Set(prev);
        next.add(tabId);
        return next;
      });
      window.setTimeout(() => closeTab(groupId, tabId), 200);
    },
    [closeTab, groupId]
  );

  const handleTabClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      requestCloseTab(tabId);
    },
    [requestCloseTab]
  );

  const handleTabMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        requestCloseTab(tabId);
      }
    },
    [requestCloseTab]
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    setDropIndicator({ index, side });
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
          const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
          reorderTab(groupId, fromIndex, adjustedTo);
        }
      } else {
        moveTab(sourceGroupId, tabId, groupId, toIndex);
      }
    } catch {
      // ignore malformed drag payloads
    }
  }, [dropIndicator, getDropIndex, groupId, moveTab, reorderTab, tabs]);

  const handleBarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
    } catch {
      // ignore malformed drag payloads
    }
  }, [groupId, moveTab, reorderTab, tabs]);

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
      <div
        className={`tab-active-indicator ${activeIndicator.visible ? 'visible' : ''}`}
        style={{ transform: `translateX(${activeIndicator.x}px)`, width: `${activeIndicator.width}px` }}
      />
      {tabs.map((tab, index) => {
        const isDropLeft = dropIndicator?.index === index && dropIndicator.side === 'left';
        const isDropRight = dropIndicator?.index === index && dropIndicator.side === 'right';
        const isClosing = closingIds.has(tab.id);
        const isEntering = enteringIds.has(tab.id);
        const isShimmering = shimmeringIds.has(tab.id);

        return (
          <div
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isModified ? 'modified' : ''} ${tab.isPinned ? 'pinned' : ''} ${isDropLeft ? 'drop-left' : ''} ${isDropRight ? 'drop-right' : ''} ${draggingId === tab.id ? 'dragging' : ''} ${isClosing ? 'closing' : ''} ${isEntering ? 'entering' : ''} ${isShimmering ? 'saved-shimmer' : ''}`}
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
                {tab.isModified ? (
                  <span className="tab-dot">
                    <VscCircleFilled style={{ width: 8, height: 8 }} />
                  </span>
                ) : null}
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
