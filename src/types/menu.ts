export interface MenuDefinition {
  label: string;
  submenu: MenuItemDefinition[];
}

export interface MenuItemDefinition {
  id?: string;
  label?: string;
  command?: string;
  keybinding?: string;
  type?: 'separator' | 'item' | 'submenu';
  submenu?: MenuItemDefinition[];
  checked?: boolean;
  disabled?: boolean;
}
