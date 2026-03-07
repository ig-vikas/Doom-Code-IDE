import { invoke } from '@tauri-apps/api/core';

export async function loadConfig<T>(filename: string): Promise<T | null> {
  const raw = await invoke<string>('load_config', { filename });
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveConfig<T>(filename: string, data: T): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  return invoke<void>('save_config', { filename, data: json });
}

export async function getAppDataDir(): Promise<string> {
  return invoke<string>('get_app_data_dir');
}

export async function getCurrentTimestamp(): Promise<string> {
  return invoke<string>('get_current_timestamp');
}
