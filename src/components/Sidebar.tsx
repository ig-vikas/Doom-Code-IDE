import { CSSProperties, useCallback } from 'react';
import { useUIStore } from '../stores';
import FileExplorer from './FileExplorer';
import SearchPanel from './SearchPanel';
import SnippetsPanel from './SnippetsPanel';

interface SidebarProps {
  style?: CSSProperties;
}

export default function Sidebar({ style }: SidebarProps) {
  const sidebarView = useUIStore((s) => s.sidebarView);
  const focusedPanel = useUIStore((s) => s.focusedPanel);
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);

  const getTitle = useCallback(() => {
    switch (sidebarView) {
      case 'explorer':
        return 'Explorer';
      case 'search':
        return 'Search';
      case 'snippets':
        return 'Snippets';
      case 'settings':
        return 'Settings';
      default:
        return '';
    }
  }, [sidebarView]);

  return (
    <div
      className={`sidebar ${focusedPanel === 'sidebar' ? 'focused' : ''}`}
      style={style}
      onMouseDown={() => setFocusedPanel('sidebar')}
    >
      <div className="sidebar-header">
        <span>{getTitle()}</span>
      </div>
      <div className="sidebar-content">
        <div className={`sidebar-view-panel ${sidebarView === 'explorer' ? 'active' : ''}`}>
          <FileExplorer />
        </div>
        <div className={`sidebar-view-panel ${sidebarView === 'search' ? 'active' : ''}`}>
          <SearchPanel />
        </div>
        <div className={`sidebar-view-panel ${sidebarView === 'snippets' ? 'active' : ''}`}>
          <SnippetsPanel />
        </div>
      </div>
    </div>
  );
}
