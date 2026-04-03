import { create } from 'zustand';
import type { ThemeDefinition, ThemeColors } from '../types';
import { vscodeDarkTheme } from '../themes/vscodeDark';
import type { CustomThemeJSON } from '../services/customThemeService';

const exclusiveTheme: ThemeDefinition = vscodeDarkTheme;

const builtInThemes: ThemeDefinition[] = [exclusiveTheme];

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
  currentTheme: exclusiveTheme,
  themes: builtInThemes,
  customThemes: [],
  colors: exclusiveTheme.colors,

  setTheme: (id) => {
    if (id === exclusiveTheme.id) {
      set({ currentTheme: exclusiveTheme, colors: exclusiveTheme.colors });
      return;
    }
    // The app theme is intentionally locked to a single black mode theme.
    set({ currentTheme: exclusiveTheme, colors: exclusiveTheme.colors });
  },

  getTheme: (id) => (id === exclusiveTheme.id ? exclusiveTheme : undefined),

  loadCustomThemesFromDisk: async () => {
    set({
      currentTheme: exclusiveTheme,
      themes: builtInThemes,
      customThemes: [],
      colors: exclusiveTheme.colors,
    });
  },

  addCustomTheme: async (_json) => {
    // Custom app themes are disabled.
    return exclusiveTheme.id;
  },

  updateCustomTheme: async (_id, _json) => {
    // Custom app themes are disabled.
    set({
      currentTheme: exclusiveTheme,
      themes: builtInThemes,
      customThemes: [],
      colors: exclusiveTheme.colors,
    });
  },

  removeCustomTheme: async (_id) => {
    // Custom app themes are disabled.
    set({
      currentTheme: exclusiveTheme,
      themes: builtInThemes,
      customThemes: [],
      colors: exclusiveTheme.colors,
    });
  },
}));
