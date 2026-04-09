import { create } from 'zustand';
import type { Keybinding } from '../types';
import { defaultKeybindings } from '../config/defaultKeybindings';

const STORAGE_KEY = 'doom-code-keybinding-overrides';
const DEFAULT_KEY_IDS = new Set(defaultKeybindings.map((kb) => kb.id));

function sanitizeOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const sanitized: Record<string, string> = {};

  for (const [id, key] of Object.entries(raw)) {
    if (!DEFAULT_KEY_IDS.has(id)) {
      continue;
    }
    if (typeof key !== 'string') {
      continue;
    }

    const normalized = key.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) {
      continue;
    }

    sanitized[id] = normalized;
  }

  return sanitized;
}

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return sanitizeOverrides(JSON.parse(raw));
    }
  } catch {}
  return {};
}

function saveOverrides(overrides: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeOverrides(overrides)));
}

interface KeybindingState {
  overrides: Record<string, string>; // keybinding id -> custom key combo
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
    if (!DEFAULT_KEY_IDS.has(id)) {
      return;
    }

    set((state) => {
      const normalized = key.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!normalized) {
        return state;
      }

      const updated = sanitizeOverrides({ ...state.overrides, [id]: normalized });
      saveOverrides(updated);
      return { overrides: updated };
    });
  },

  resetKeybinding: (id) => {
    if (!DEFAULT_KEY_IDS.has(id)) {
      return;
    }

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
