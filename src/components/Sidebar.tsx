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
    <div className="sidebar" style={style}>
      <div className="sidebar-header">
        <span>{getTitle()}</span>
      </div>
      <div className="sidebar-content">
        {sidebarView === 'explorer' && <FileExplorer />}
        {sidebarView === 'search' && <SearchPanel />}
        {sidebarView === 'snippets' && <SnippetsPanel />}
      </div>
    </div>
  );
}
