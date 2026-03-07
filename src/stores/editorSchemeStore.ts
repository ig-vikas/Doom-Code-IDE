import { create } from 'zustand';
import type { EditorColorScheme } from '../types/editorScheme';
import { allEditorSchemes, vscodeDarkPlus } from '../editorSchemes';
import {
  loadCustomSchemes,
  saveCustomScheme,
  removeCustomSchemeFromDisk,
} from '../services/customSchemeService';

let idCounter = 0;
function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

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

export const useEditorSchemeStore = create<EditorSchemeState>((set, get) => ({
  currentScheme: vscodeDarkPlus,
  schemes: allEditorSchemes,
  customSchemes: [],

  setScheme: (id) => {
    const scheme = get().schemes.find((s) => s.id === id);
    if (scheme) {
      set({ currentScheme: scheme });
    }
  },

  addCustomScheme: (scheme) => {
    const customSchemes = [...get().customSchemes, scheme];
    set({
      customSchemes,
      schemes: [...allEditorSchemes, ...customSchemes],
    });
    saveCustomScheme(scheme).catch(() => {});
  },

  updateCustomScheme: (scheme) => {
    const customSchemes = get().customSchemes.map((s) =>
      s.id === scheme.id ? scheme : s
    );
    const current = get().currentScheme;
    set({
      customSchemes,
      schemes: [...allEditorSchemes, ...customSchemes],
      ...(current.id === scheme.id ? { currentScheme: scheme } : {}),
    });
    saveCustomScheme(scheme).catch(() => {});
  },

  removeCustomScheme: (id) => {
    const customSchemes = get().customSchemes.filter((s) => s.id !== id);
    const current = get().currentScheme;
    set({
      customSchemes,
      schemes: [...allEditorSchemes, ...customSchemes],
      ...(current.id === id ? { currentScheme: vscodeDarkPlus } : {}),
    });
    removeCustomSchemeFromDisk(id).catch(() => {});
  },

  duplicateScheme: (id) => {
    const source = get().schemes.find((s) => s.id === id);
    if (!source) return null;
    const newId = `custom-scheme-${generateId()}`;
    const clone: EditorColorScheme = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      monacoTheme: {
        ...source.monacoTheme,
        rules: [...source.monacoTheme.rules],
        colors: { ...source.monacoTheme.colors },
      },
    };
    get().addCustomScheme(clone);
    return newId;
  },

  loadCustomSchemesFromDisk: async () => {
    const customSchemes = await loadCustomSchemes();
    set({
      customSchemes,
      schemes: [...allEditorSchemes, ...customSchemes],
    });
  },
}));
