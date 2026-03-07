import { useState, useRef, useEffect, useCallback } from 'react';
import { defaultMenus } from '../config/defaultMenus';
import { executeCommand } from '../services/commandService';
import type { MenuDefinition } from '../types';

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = useCallback((menuId: string) => {
    setOpenMenu((prev) => (prev === menuId ? null : menuId));
  }, []);

  const handleItemClick = useCallback((action?: string) => {
    setOpenMenu(null);
    if (action) {
      executeCommand(action);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="titlebar-menus" ref={menuBarRef}>
      {defaultMenus.map((menu) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <button
            className="titlebar-menu-item"
            onClick={() => handleMenuClick(menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <MenuDropdown menu={menu} onItemClick={handleItemClick} />
          )}
        </div>
      ))}
    </div>
  );
}

function MenuDropdown({
  menu,
  onItemClick,
}: {
  menu: MenuDefinition;
  onItemClick: (action?: string) => void;
}) {
  return (
    <div className="menu-dropdown">
      {menu.submenu.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={idx} className="menu-separator" />;
        }
        return (
          <div
            key={item.id ?? idx}
            className="menu-item"
            onClick={() => onItemClick(item.command)}
          >
            <span className="menu-item-label">{item.label}</span>
            {item.keybinding && (
              <span className="menu-item-shortcut">{item.keybinding}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
