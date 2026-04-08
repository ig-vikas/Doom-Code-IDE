export interface CommandDefinition {
  id: string;
  label: string;
  category: string;
  keybinding?: string;
}

export const defaultCommands: CommandDefinition[] = [
  // File
  { id: 'file.newFile', label: 'New File', category: 'File', keybinding: 'Ctrl+N' },
  { id: 'file.newCPFile', label: 'New CP File', category: 'File', keybinding: 'Ctrl+Alt+N' },
  { id: 'file.openFile', label: 'Open File', category: 'File', keybinding: 'Ctrl+O' },
  { id: 'file.openFolder', label: 'Open Folder', category: 'File', keybinding: 'Ctrl+K Ctrl+O' },
  { id: 'file.save', label: 'Save', category: 'File', keybinding: 'Ctrl+S' },
  { id: 'file.saveAs', label: 'Save As', category: 'File', keybinding: 'Ctrl+Shift+S' },
  { id: 'file.saveAll', label: 'Save All', category: 'File', keybinding: 'Ctrl+Alt+S' },
  { id: 'file.closeTab', label: 'Close Tab', category: 'File', keybinding: 'Ctrl+W' },
  { id: 'file.closeWindow', label: 'Close Window', category: 'File', keybinding: 'Ctrl+Shift+W' },
  { id: 'file.reopenClosedTab', label: 'Reopen Closed Tab', category: 'File', keybinding: 'Ctrl+Shift+T' },
  { id: 'file.nextTab', label: 'Next Tab', category: 'File', keybinding: 'Ctrl+Tab' },
  { id: 'file.previousTab', label: 'Previous Tab', category: 'File', keybinding: 'Ctrl+Shift+Tab' },

  // Edit
  { id: 'edit.undo', label: 'Undo', category: 'Edit', keybinding: 'Ctrl+Z' },
  { id: 'edit.redo', label: 'Redo', category: 'Edit', keybinding: 'Ctrl+Y' },
  { id: 'edit.deleteLine', label: 'Delete Line', category: 'Edit', keybinding: 'Ctrl+Shift+K' },
  { id: 'edit.duplicateLine', label: 'Duplicate Line', category: 'Edit', keybinding: 'Ctrl+Shift+D' },
  { id: 'edit.moveLineUp', label: 'Move Line Up', category: 'Edit', keybinding: 'Ctrl+Shift+Up' },
  { id: 'edit.moveLineDown', label: 'Move Line Down', category: 'Edit', keybinding: 'Ctrl+Shift+Down' },
  { id: 'edit.toggleComment', label: 'Toggle Comment', category: 'Edit', keybinding: 'Ctrl+/' },
  { id: 'edit.toggleBlockComment', label: 'Toggle Block Comment', category: 'Edit', keybinding: 'Ctrl+Shift+/' },

  // Navigation
  { id: 'navigation.quickOpen', label: 'Quick Open', category: 'Navigation', keybinding: 'Ctrl+P' },
  { id: 'navigation.goToLine', label: 'Go to Line', category: 'Navigation', keybinding: 'Ctrl+G' },
  { id: 'navigation.commandPalette', label: 'Command Palette', category: 'Navigation', keybinding: 'Ctrl+Shift+P' },

  // Search
  { id: 'search.find', label: 'Find', category: 'Search', keybinding: 'Ctrl+F' },
  { id: 'search.findReplace', label: 'Find and Replace', category: 'Search', keybinding: 'Ctrl+H' },
  { id: 'search.findInFiles', label: 'Find in Files', category: 'Search', keybinding: 'Ctrl+Shift+F' },

  // View
  { id: 'view.toggleSidebar', label: 'Toggle Sidebar', category: 'View', keybinding: 'Ctrl+K Ctrl+B' },
  { id: 'view.toggleTerminal', label: 'Toggle Terminal', category: 'View', keybinding: 'Ctrl+`' },
  { id: 'view.toggleFullscreen', label: 'Toggle Fullscreen', category: 'View', keybinding: 'F11' },
  { id: 'view.zoomIn', label: 'Zoom In', category: 'View', keybinding: 'Ctrl+=' },
  { id: 'view.zoomOut', label: 'Zoom Out', category: 'View', keybinding: 'Ctrl+-' },
  { id: 'view.zoomReset', label: 'Reset Zoom', category: 'View', keybinding: 'Ctrl+0' },

  // Build
  { id: 'build.compileAndRun', label: 'Compile & Run', category: 'Build', keybinding: 'Ctrl+B' },
  { id: 'build.compileOnly', label: 'Compile Only', category: 'Build', keybinding: 'Ctrl+Shift+B' },
  { id: 'build.runOnly', label: 'Run Only', category: 'Build', keybinding: 'Ctrl+F5' },
  { id: 'build.build', label: 'Build', category: 'Build' },
  { id: 'build.killProcess', label: 'Kill Process', category: 'Build', keybinding: 'Ctrl+K' },
  { id: 'build.runAllTestCases', label: 'Run All Test Cases', category: 'Build', keybinding: 'Ctrl+Alt+T' },

  // Settings
  { id: 'settings.openSettings', label: 'Open Settings', category: 'Settings', keybinding: 'Ctrl+,' },
  { id: 'about.show', label: 'About Doom Code', category: 'Settings' },
];
