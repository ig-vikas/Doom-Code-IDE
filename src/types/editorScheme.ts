import type { MonacoThemeData } from './theme';

export interface EditorColorScheme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  monacoTheme: MonacoThemeData;
}
