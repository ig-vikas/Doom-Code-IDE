import { create } from 'zustand';
import type { EditorColorScheme } from '../types/editorScheme';
import { vscodeDarkPlus, vscodeDarkPlusPlus, vscodeDarkPlusPlusForge } from '../editorSchemes';

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

const defaultScheme = vscodeDarkPlusPlus;
const builtInSchemes: EditorColorScheme[] = [vscodeDarkPlusPlus, vscodeDarkPlusPlusForge, vscodeDarkPlus];

export const useEditorSchemeStore = create<EditorSchemeState>((set, get) => ({
  currentScheme: defaultScheme,
  schemes: builtInSchemes,
  customSchemes: [],

  setScheme: (id) => {
    const selectedScheme = builtInSchemes.find((scheme) => scheme.id === id) ?? defaultScheme;
    set({ currentScheme: selectedScheme });
  },

  addCustomScheme: (_scheme) => {
    set({
      currentScheme: get().currentScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },

  updateCustomScheme: (_scheme) => {
    set({
      currentScheme: get().currentScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },

  removeCustomScheme: (_id) => {
    set({
      currentScheme: get().currentScheme,
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
      currentScheme: get().currentScheme,
      schemes: builtInSchemes,
      customSchemes: [],
    });
  },
}));
