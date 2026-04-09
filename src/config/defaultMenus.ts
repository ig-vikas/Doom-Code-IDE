import type { MenuDefinition } from '../types';

export const defaultMenus: MenuDefinition[] = [
  {
    label: 'File',
    submenu: [
      { id: 'file-new', label: 'New File', command: 'file.newFile', keybinding: 'Ctrl+N' },
      { id: 'file-newcp', label: 'New CP File', command: 'file.newCPFile', keybinding: 'Ctrl+Alt+N' },
      { type: 'separator' },
      { id: 'file-open', label: 'Open File...', command: 'file.openFile', keybinding: 'Ctrl+O' },
      { id: 'file-openfolder', label: 'Open Folder...', command: 'file.openFolder', keybinding: 'Ctrl+K Ctrl+O' },
      { type: 'separator' },
      { id: 'file-save', label: 'Save', command: 'file.save', keybinding: 'Ctrl+S' },
      { id: 'file-saveas', label: 'Save As...', command: 'file.saveAs', keybinding: 'Ctrl+Shift+S' },
      { id: 'file-saveall', label: 'Save All', command: 'file.saveAll', keybinding: 'Ctrl+Alt+S' },
      { type: 'separator' },
      { id: 'file-close', label: 'Close Tab', command: 'file.closeTab', keybinding: 'Ctrl+W' },
      { type: 'separator' },
      { id: 'file-exit', label: 'Exit', command: 'file.closeWindow', keybinding: 'Ctrl+Shift+W' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { id: 'edit-undo', label: 'Undo', command: 'edit.undo', keybinding: 'Ctrl+Z' },
      { id: 'edit-redo', label: 'Redo', command: 'edit.redo', keybinding: 'Ctrl+Y' },
      { type: 'separator' },
      { id: 'edit-cut', label: 'Cut', command: 'edit.cut', keybinding: 'Ctrl+X' },
      { id: 'edit-copy', label: 'Copy', command: 'edit.copy', keybinding: 'Ctrl+C' },
      { id: 'edit-paste', label: 'Paste', command: 'edit.paste', keybinding: 'Ctrl+V' },
      { type: 'separator' },
      { id: 'edit-find', label: 'Find', command: 'search.find', keybinding: 'Ctrl+F' },
      { id: 'edit-replace', label: 'Replace', command: 'search.findReplace', keybinding: 'Ctrl+H' },
      { id: 'edit-findinfiles', label: 'Find in Files', command: 'search.findInFiles', keybinding: 'Ctrl+Shift+F' },
      { type: 'separator' },
      { id: 'edit-comment', label: 'Toggle Comment', command: 'edit.toggleComment', keybinding: 'Ctrl+/' },
      { id: 'edit-blockcomment', label: 'Toggle Block Comment', command: 'edit.toggleBlockComment', keybinding: 'Ctrl+Shift+/' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { id: 'view-cmdpalette', label: 'Command Palette', command: 'navigation.commandPalette', keybinding: 'Ctrl+Shift+P' },
      { id: 'view-quickopen', label: 'Quick Open', command: 'navigation.quickOpen', keybinding: 'Ctrl+P' },
      { type: 'separator' },
      { id: 'view-sidebar', label: 'Toggle Sidebar', command: 'view.toggleSidebar', keybinding: 'Ctrl+K Ctrl+B' },
      { id: 'view-terminal', label: 'Toggle Terminal', command: 'view.toggleTerminal', keybinding: 'Ctrl+`' },
      { type: 'separator' },
      { id: 'view-fullscreen', label: 'Toggle Fullscreen', command: 'view.toggleFullscreen', keybinding: 'F11' },
    ],
  },
  {
    label: 'Build',
    submenu: [
      { id: 'build-compilerun', label: 'Compile & Run', command: 'build.compileAndRun', keybinding: 'Ctrl+B' },
      { id: 'build-compile', label: 'Compile Only', command: 'build.compileOnly', keybinding: 'Ctrl+Shift+B' },
      { id: 'build-run', label: 'Run Only', command: 'build.runOnly', keybinding: 'Ctrl+F5' },
      { type: 'separator' },
      { id: 'build-kill', label: 'Kill Process', command: 'build.killProcess', keybinding: 'Ctrl+K' },
      { type: 'separator' },
      { id: 'build-testall', label: 'Run All Test Cases', command: 'build.runAllTestCases', keybinding: 'Ctrl+Alt+T' },
    ],
  },
  {
    label: 'Settings',
    submenu: [
      { id: 'settings-open', label: 'Settings', command: 'settings.openSettings', keybinding: 'Ctrl+,' },
      { type: 'separator' },
      { id: 'settings-about', label: 'About Doom Code', command: 'about.show' },
    ],
  },
];
