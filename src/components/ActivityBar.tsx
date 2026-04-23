import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores';
import type { SidebarView } from '../stores/uiStore';
import {
  VscFiles,
  VscSearch,
  VscSymbolSnippet,
  VscSettingsGear,
} from 'react-icons/vsc';
import RadialDoomMenu from './RadialDoomMenu';

const activityItems: { id: SidebarView; icon: JSX.Element; tooltip: string }[] = [
  { id: 'explorer', icon: <VscFiles />, tooltip: 'Explorer' },
  { id: 'search', icon: <VscSearch />, tooltip: 'Search' },
  { id: 'snippets', icon: <VscSymbolSnippet />, tooltip: 'Snippets' },
];

export default function ActivityBar() {
  const sidebarView = useUIStore((s) => s.sidebarView);
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const setSidebarView = useUIStore((s) => s.setSidebarView);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ y: 0, h: 12, visible: false });

  useEffect(() => {
    const idx = activityItems.findIndex((item) => item.id === sidebarView);
    const btn = buttonRefs.current[idx];
    if (!sidebarVisible || !btn) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    setIndicator({
      y: btn.offsetTop + btn.offsetHeight * 0.25,
      h: btn.offsetHeight * 0.5,
      visible: true,
    });
  }, [sidebarView, sidebarVisible]);

  return (
    <div className="activity-bar">
      {/* Doom Icon + Radial Menu at top */}
      <div className="activity-bar-logo">
        <RadialDoomMenu />
      </div>

      {/* Explorer, Search, Snippets — centered vertically */}
      <div className="activity-bar-center">
        <div
          className={`activity-indicator ${indicator.visible ? 'visible' : ''}`}
          style={{
            transform: `translateY(${indicator.y}px)`,
            height: `${indicator.h}px`,
          }}
        />
        {activityItems.map((item, idx) => (
          <button
            key={item.id}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            className={`activity-btn ${sidebarVisible && sidebarView === item.id ? 'active' : ''}`}
            onClick={() => {
              setSidebarView(item.id);
              setFocusedPanel('sidebar');
            }}
            data-tooltip={item.tooltip}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Settings at bottom */}
      <div className="activity-bar-bottom">
        <button
          className="activity-btn"
          onClick={() => {
            setFocusedPanel('sidebar');
            setSettingsOpen(true);
          }}
          data-tooltip="Settings"
        >
          <VscSettingsGear />
        </button>
      </div>
    </div>
  );
}
