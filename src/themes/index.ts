export { obsidianTheme } from './obsidian';
export { dawnTheme } from './dawn';
export { monokaiTheme } from './monokai';
export { draculaTheme } from './dracula';
export { nordTheme } from './nord';
export { gruvboxTheme } from './gruvbox';
export { tokyoNightTheme } from './tokyoNight';
export { vscodeDarkTheme } from './vscodeDark';

import { obsidianTheme } from './obsidian';
import { dawnTheme } from './dawn';
import { monokaiTheme } from './monokai';
import { draculaTheme } from './dracula';
import { nordTheme } from './nord';
import { gruvboxTheme } from './gruvbox';
import { tokyoNightTheme } from './tokyoNight';
import { vscodeDarkTheme } from './vscodeDark';
import type { ThemeDefinition } from '../types';

export const allThemes: ThemeDefinition[] = [
  vscodeDarkTheme,
  obsidianTheme,
  dawnTheme,
  monokaiTheme,
  draculaTheme,
  nordTheme,
  gruvboxTheme,
  tokyoNightTheme,
];
