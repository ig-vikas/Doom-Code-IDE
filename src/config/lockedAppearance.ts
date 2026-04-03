export const LOCKED_APP_THEME_ID = 'vscode-dark';
export const FORGE_APP_THEME_ID = 'vscode-dark-forge';
export const LOCKED_EDITOR_SCHEME_ID = 'vscode-dark-plus';
export const ALLOWED_APP_THEME_IDS = [LOCKED_APP_THEME_ID, FORGE_APP_THEME_ID] as const;

export const EDITOR_FONT_OPTIONS = [
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'Cascadia Code', value: '"Cascadia Code", monospace' },
  { label: 'Iosevka', value: '"Iosevka", monospace' },
  { label: 'Victor Mono', value: '"Victor Mono", monospace' },
] as const;

export const DEFAULT_EDITOR_FONT_FAMILY = EDITOR_FONT_OPTIONS[0].value;

export function isAllowedEditorFontFamily(fontFamily: string): boolean {
  return EDITOR_FONT_OPTIONS.some((option) => option.value === fontFamily);
}

export function isAllowedAppThemeId(themeId: string): boolean {
  return ALLOWED_APP_THEME_IDS.some((allowedThemeId) => allowedThemeId === themeId);
}
