import { useUIStore } from '../stores';
import type { SidebarView } from '../stores/uiStore';
import {
  VscFiles,
  VscSearch,
  VscSymbolSnippet,
  VscSettingsGear,
} from 'react-icons/vsc';

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

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {activityItems.map((item) => (
          <button
            key={item.id}
            className={`activity-btn ${sidebarVisible && sidebarView === item.id ? 'active' : ''}`}
            onClick={() => setSidebarView(item.id)}
            data-tooltip={item.tooltip}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="activity-bar-bottom">
        <button
          className="activity-btn"
          onClick={() => setSettingsOpen(true)}
          data-tooltip="Settings"
        >
          <VscSettingsGear />
        </button>
      </div>
    </div>
  );
}
