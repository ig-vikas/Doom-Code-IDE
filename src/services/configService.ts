import { invoke } from '@tauri-apps/api/core';

const lastSavedJsonByFile = new Map<string, string>();

export async function loadConfig<T>(filename: string): Promise<T | null> {
  const raw = await invoke<string>('load_config', { filename });
  if (raw) {
    lastSavedJsonByFile.set(filename, raw);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveConfig<T>(filename: string, data: T): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  lastSavedJsonByFile.set(filename, json);
  return invoke<void>('save_config', { filename, data: json });
}

export async function saveConfigIfChanged<T>(filename: string, data: T): Promise<boolean> {
  const json = JSON.stringify(data, null, 2);
  const previous = lastSavedJsonByFile.get(filename);
  if (previous === json) {
    return false;
  }
  await invoke<void>('save_config', { filename, data: json });
  lastSavedJsonByFile.set(filename, json);
  return true;
}

export async function getAppDataDir(): Promise<string> {
  return invoke<string>('get_app_data_dir');
}

export async function getCurrentTimestamp(): Promise<string> {
  return invoke<string>('get_current_timestamp');
}
