/**
 * Custom Editor Color Scheme Service
 * Handles persistence of user-created editor color schemes.
 * Schemes are stored as EditorColorScheme objects in custom-editor-schemes.json.
 */

import { saveConfig, loadConfig } from './configService';
import type { EditorColorScheme } from '../types/editorScheme';

const CUSTOM_SCHEMES_FILE = 'custom-editor-schemes.json';

interface StoredCustomSchemes {
  schemes: EditorColorScheme[];
}

/**
 * Load all custom editor schemes from disk
 */
export async function loadCustomSchemes(): Promise<EditorColorScheme[]> {
  try {
    const stored = await loadConfig<StoredCustomSchemes>(CUSTOM_SCHEMES_FILE);
    if (!stored || !stored.schemes) return [];
    return stored.schemes;
  } catch {
    return [];
  }
}

/**
 * Save a custom scheme to disk (upsert)
 */
export async function saveCustomScheme(scheme: EditorColorScheme): Promise<void> {
  const stored = await loadConfig<StoredCustomSchemes>(CUSTOM_SCHEMES_FILE) || { schemes: [] };
  const idx = stored.schemes.findIndex((s) => s.id === scheme.id);
  if (idx >= 0) {
    stored.schemes[idx] = scheme;
  } else {
    stored.schemes.push(scheme);
  }
  await saveConfig(CUSTOM_SCHEMES_FILE, stored);
}

/**
 * Remove a custom scheme from disk
 */
export async function removeCustomSchemeFromDisk(id: string): Promise<void> {
  const stored = await loadConfig<StoredCustomSchemes>(CUSTOM_SCHEMES_FILE) || { schemes: [] };
  stored.schemes = stored.schemes.filter((s) => s.id !== id);
  await saveConfig(CUSTOM_SCHEMES_FILE, stored);
}
