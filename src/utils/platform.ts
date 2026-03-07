export const isWindows = navigator.platform.indexOf('Win') > -1;
export const isMac = navigator.platform.indexOf('Mac') > -1;
export const isLinux = navigator.platform.indexOf('Linux') > -1;

export function getModifierKey(): string {
  return isMac ? '⌘' : 'Ctrl';
}

export function formatKeybinding(key: string): string {
  if (isMac) {
    return key
      .replace(/ctrl\+/gi, '⌘')
      .replace(/alt\+/gi, '⌥')
      .replace(/shift\+/gi, '⇧')
      .replace(/meta\+/gi, '⌘');
  }
  return key
    .replace(/ctrl\+/gi, 'Ctrl+')
    .replace(/alt\+/gi, 'Alt+')
    .replace(/shift\+/gi, 'Shift+')
    .replace(/meta\+/gi, 'Win+');
}
