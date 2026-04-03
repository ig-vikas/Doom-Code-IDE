import { create } from 'zustand';
import type { EditorColorScheme } from '../types/editorScheme';
import { vscodeDarkPlus } from '../editorSchemes';

interface EditorSchemeState {
  currentScheme: EditorColorScheme;
  schemes: EditorColorScheme[];       // builtIn + custom combined
  customSchemes: EditorColorScheme[];
  setScheme: (id: string) => void;
  addCustomScheme: (scheme: EditorColorScheme) => void;
  updateCustomScheme: (scheme: EditorColorScheme) => void;
  removeCustomScheme: (id: string) => void;
  duplicateScheme: (id: string) => string | null;
  loadCustomSchemesFromDisk: () => Promise<void>;
}

const exclusiveScheme = vscodeDarkPlus;
const builtInSchemes: EditorColorScheme[] = [exclusiveScheme];

export const useEditorSchemeStore = create<EditorSchemeState>((set, get) => ({
  currentScheme: vscodeDarkPlus,
  schemes: builtInSchemes,
  customSchemes: [],

  setScheme: (id) => {
    if (id === exclusiveScheme.id) {
      set({ currentScheme: exclusiveScheme });
      return;
    }
    // Editor scheme is intentionally locked to Dark+ (VS Code).
    set({ currentScheme: exclusiveScheme });
  },

  addCustomScheme: (_scheme) => {
    set({
      currentScheme: exclusiveScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },

  updateCustomScheme: (_scheme) => {
    set({
      currentScheme: exclusiveScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },

  removeCustomScheme: (_id) => {
    set({
      currentScheme: exclusiveScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },

  duplicateScheme: (_id) => {
    // Custom editor schemes are disabled.
    return null;
  },

  loadCustomSchemesFromDisk: async () => {
    set({
      currentScheme: exclusiveScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },
}));
