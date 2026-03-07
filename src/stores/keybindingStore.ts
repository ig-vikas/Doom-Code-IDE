import { create } from 'zustand';
import type { Keybinding } from '../types';
import { defaultKeybindings } from '../config/defaultKeybindings';

const STORAGE_KEY = 'doom-code-keybinding-overrides';

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOverrides(overrides: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

interface KeybindingState {
  overrides: Record<string, string>; // keybinding id → new key combo
  getEffectiveBindings: () => Keybinding[];
  setKeybinding: (id: string, key: string) => void;
  resetKeybinding: (id: string) => void;
  resetAll: () => void;
}

export const useKeybindingStore = create<KeybindingState>((set, get) => ({
  overrides: loadOverrides(),

  getEffectiveBindings: () => {
    const { overrides } = get();
    return defaultKeybindings.map((kb) => ({
      ...kb,
      key: overrides[kb.id] ?? kb.key,
    }));
  },

  setKeybinding: (id, key) => {
    set((state) => {
      const updated = { ...state.overrides, [id]: key };
      saveOverrides(updated);
      return { overrides: updated };
    });
  },

  resetKeybinding: (id) => {
    set((state) => {
      const updated = { ...state.overrides };
      delete updated[id];
      saveOverrides(updated);
      return { overrides: updated };
    });
  },

  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ overrides: {} });
  },
}));
