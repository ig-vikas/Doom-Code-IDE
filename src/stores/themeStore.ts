import { create } from 'zustand';
import type { ThemeDefinition, ThemeColors } from '../types';
import { obsidianTheme } from '../themes/obsidian';
import { dawnTheme } from '../themes/dawn';
import { monokaiTheme } from '../themes/monokai';
import { draculaTheme } from '../themes/dracula';
import { nordTheme } from '../themes/nord';
import { gruvboxTheme } from '../themes/gruvbox';
import { tokyoNightTheme } from '../themes/tokyoNight';
import { jetbrainsTheme } from '../themes/jetbrains';
import { vscodeDarkTheme } from '../themes/vscodeDark';
import {
  loadCustomThemes,
  saveCustomTheme,
  removeCustomTheme as removeCustomThemeFromDisk,
  convertCustomTheme,
  type CustomThemeJSON,
} from '../services/customThemeService';
import { generateId } from '../utils/fileUtils';

const builtInThemes: ThemeDefinition[] = [
  vscodeDarkTheme,
  obsidianTheme,
  dawnTheme,
  monokaiTheme,
  draculaTheme,
  nordTheme,
  gruvboxTheme,
  tokyoNightTheme,
  jetbrainsTheme,
];

interface ThemeState {
  currentTheme: ThemeDefinition;
  themes: ThemeDefinition[];
  customThemes: ThemeDefinition[];
  colors: ThemeColors;
  setTheme: (id: string) => void;
  getTheme: (id: string) => ThemeDefinition | undefined;
  loadCustomThemesFromDisk: () => Promise<void>;
  addCustomTheme: (json: CustomThemeJSON) => Promise<string>;
  updateCustomTheme: (id: string, json: CustomThemeJSON) => Promise<void>;
  removeCustomTheme: (id: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: vscodeDarkTheme,
  themes: builtInThemes,
  customThemes: [],
  colors: vscodeDarkTheme.colors,

  setTheme: (id) => {
    const state = get();
    const theme = [...builtInThemes, ...state.customThemes].find((t) => t.id === id);
    if (theme) {
      set({ currentTheme: theme, colors: theme.colors });
      applyThemeToDom(theme);
    }
  },

  getTheme: (id) => {
    const state = get();
    return [...builtInThemes, ...state.customThemes].find((t) => t.id === id);
  },

  loadCustomThemesFromDisk: async () => {
    try {
      const custom = await loadCustomThemes();
      set({
        customThemes: custom,
        themes: [...builtInThemes, ...custom],
      });
    } catch {
      // Keep built-in only
    }
  },

  addCustomTheme: async (json) => {
    const id = `custom-${generateId()}`;
    const theme = convertCustomTheme(json, id);
    await saveCustomTheme(id, json);
    const state = get();
    const newCustom = [...state.customThemes, theme];
    set({
      customThemes: newCustom,
      themes: [...builtInThemes, ...newCustom],
    });
    return id;
  },

  updateCustomTheme: async (id, json) => {
    const theme = convertCustomTheme(json, id);
    await saveCustomTheme(id, json);
    const state = get();
    const newCustom = state.customThemes.map((t) => (t.id === id ? theme : t));
    set({
      customThemes: newCustom,
      themes: [...builtInThemes, ...newCustom],
      // If the current theme is the one being updated, refresh it
      ...(state.currentTheme.id === id
        ? { currentTheme: theme, colors: theme.colors }
        : {}),
    });
    if (state.currentTheme.id === id) {
      applyThemeToDom(theme);
    }
  },

  removeCustomTheme: async (id) => {
    await removeCustomThemeFromDisk(id);
    const state = get();
    const newCustom = state.customThemes.filter((t) => t.id !== id);
    set({
      customThemes: newCustom,
      themes: [...builtInThemes, ...newCustom],
      // If deleting the active theme, switch to default
      ...(state.currentTheme.id === id
        ? { currentTheme: vscodeDarkTheme, colors: vscodeDarkTheme.colors }
        : {}),
    });
    if (state.currentTheme.id === id) {
      applyThemeToDom(vscodeDarkTheme);
    }
  },
}));

function applyThemeToDom(theme: ThemeDefinition) {
  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty('--bg-deepest', c.bgDeepest);
  root.style.setProperty('--bg-base', c.bgBase);
  root.style.setProperty('--bg-surface', c.bgSurface);
  root.style.setProperty('--bg-elevated', c.bgElevated);
  root.style.setProperty('--bg-overlay', c.bgOverlay);
  root.style.setProperty('--bg-highlight', c.bgHighlight);
  root.style.setProperty('--bg-active', c.bgActive);
  root.style.setProperty('--bg-intense', c.bgIntense);
  root.style.setProperty('--accent-primary', c.accentPrimary);
  root.style.setProperty('--accent-secondary', c.accentSecondary);
  root.style.setProperty('--accent-tertiary', c.accentTertiary);
  root.style.setProperty('--accent-glow', c.accentGlow);
  root.style.setProperty('--accent-blue', c.accentBlue);
  root.style.setProperty('--accent-green', c.accentGreen);
  root.style.setProperty('--accent-red', c.accentRed);
  root.style.setProperty('--accent-yellow', c.accentYellow);
  root.style.setProperty('--accent-orange', c.accentOrange);
  root.style.setProperty('--accent-purple', c.accentPurple);
  root.style.setProperty('--accent-cyan', c.accentCyan);
  root.style.setProperty('--accent-teal', c.accentTeal);
  root.style.setProperty('--accent-pink', c.accentPink);
  root.style.setProperty('--text-primary', c.textPrimary);
  root.style.setProperty('--text-secondary', c.textSecondary);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--text-faint', c.textFaint);
  root.style.setProperty('--text-inverse', c.textInverse);
  root.style.setProperty('--border-subtle', c.borderSubtle);
  root.style.setProperty('--border-default', c.borderDefault);
  root.style.setProperty('--border-strong', c.borderStrong);
  root.style.setProperty('--border-accent', c.borderAccent);
  root.style.setProperty('--scrollbar-thumb', c.scrollbarThumb);
  root.style.setProperty('--scrollbar-thumb-hover', c.scrollbarThumbHover);
  root.style.setProperty('--scrollbar-track', c.scrollbarTrack);
}
