import { create } from 'zustand';
import type { ThemeDefinition, ThemeColors } from '../types';
import { vscodeDarkTheme } from '../themes/vscodeDark';
import { vscodeDarkForgeTheme } from '../themes/vscodeDarkForge';
import type { CustomThemeJSON } from '../services/customThemeService';

const defaultTheme: ThemeDefinition = vscodeDarkTheme;
const builtInThemes: ThemeDefinition[] = [vscodeDarkTheme, vscodeDarkForgeTheme];

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
  currentTheme: defaultTheme,
  themes: builtInThemes,
  customThemes: [],
  colors: defaultTheme.colors,

  setTheme: (id) => {
    const selectedTheme = get().themes.find((theme) => theme.id === id) ?? defaultTheme;
    set({ currentTheme: selectedTheme, colors: selectedTheme.colors });
  },

  getTheme: (id) => get().themes.find((theme) => theme.id === id),

  loadCustomThemesFromDisk: async () => {
    set((state) => {
      const activeTheme = builtInThemes.find((theme) => theme.id === state.currentTheme.id) ?? defaultTheme;
      return {
        currentTheme: activeTheme,
        themes: builtInThemes,
        customThemes: [],
        colors: activeTheme.colors,
      };
    });
  },

  addCustomTheme: async (_json) => {
    // Custom app themes are disabled.
    return get().currentTheme.id;
  },

  updateCustomTheme: async (_id, _json) => {
    // Custom app themes are disabled.
    set((state) => {
      const activeTheme = builtInThemes.find((theme) => theme.id === state.currentTheme.id) ?? defaultTheme;
      return {
        currentTheme: activeTheme,
        themes: builtInThemes,
        customThemes: [],
        colors: activeTheme.colors,
      };
    });
  },

  removeCustomTheme: async (_id) => {
    // Custom app themes are disabled.
    set((state) => {
      const activeTheme = builtInThemes.find((theme) => theme.id === state.currentTheme.id) ?? defaultTheme;
      return {
        currentTheme: activeTheme,
        themes: builtInThemes,
        customThemes: [],
        colors: activeTheme.colors,
      };
    });
  },
}));
