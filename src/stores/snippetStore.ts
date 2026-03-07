import { create } from 'zustand';
import type { Snippet } from '../types';
import { defaultSnippets } from '../config/defaultSnippets';

const STORAGE_KEY = 'doom-code-user-snippets';

function loadUserSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveUserSnippets(snippets: Snippet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

interface SnippetState {
  userSnippets: Snippet[];
  /** All snippets = defaults + user (user overrides defaults with same prefix) */
  getAllSnippets: () => Snippet[];
  addSnippet: (snippet: Snippet) => void;
  updateSnippet: (prefix: string, snippet: Snippet) => void;
  deleteSnippet: (prefix: string) => void;
  isUserSnippet: (prefix: string) => boolean;
}

export const useSnippetStore = create<SnippetState>((set, get) => ({
  userSnippets: loadUserSnippets(),

  getAllSnippets: () => {
    const { userSnippets } = get();
    const userPrefixes = new Set(userSnippets.map((s) => s.prefix));
    // Default snippets that haven't been overridden + all user snippets
    const filtered = defaultSnippets.filter((s) => !userPrefixes.has(s.prefix));
    return [...filtered, ...userSnippets];
  },

  addSnippet: (snippet) =>
    set((state) => {
      const updated = [...state.userSnippets, snippet];
      saveUserSnippets(updated);
      return { userSnippets: updated };
    }),

  updateSnippet: (oldPrefix, snippet) =>
    set((state) => {
      const updated = state.userSnippets.map((s) =>
        s.prefix === oldPrefix ? snippet : s
      );
      // If editing a default snippet, add it as user snippet
      if (!state.userSnippets.find((s) => s.prefix === oldPrefix)) {
        updated.push(snippet);
      }
      saveUserSnippets(updated);
      return { userSnippets: updated };
    }),

  deleteSnippet: (prefix) =>
    set((state) => {
      const updated = state.userSnippets.filter((s) => s.prefix !== prefix);
      saveUserSnippets(updated);
      return { userSnippets: updated };
    }),

  isUserSnippet: (prefix) => {
    return get().userSnippets.some((s) => s.prefix === prefix);
  },
}));
