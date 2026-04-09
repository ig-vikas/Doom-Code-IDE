import { invoke } from '@tauri-apps/api/core';
import type { AIConfiguration } from '../../types/ai';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

export class WorkspaceSettingsManager {
  private workspacePath: string | null = null;

  setWorkspacePath(path: string | null) {
    this.workspacePath = path ? normalizePath(path) : null;
  }

  getWorkspacePath(): string | null {
    return this.workspacePath;
  }

  private getSettingsPath(): string | null {
    if (!this.workspacePath) {
      return null;
    }
    return `${this.workspacePath}/.doomcode/ai-settings.json`;
  }

  async loadWorkspaceSettings(): Promise<Partial<AIConfiguration> | null> {
    const settingsPath = this.getSettingsPath();
    if (!settingsPath) {
      return null;
    }

    try {
      const content = await invoke<string>('read_file', { path: settingsPath });
      return JSON.parse(content) as Partial<AIConfiguration>;
    } catch {
      return null;
    }
  }

  async saveWorkspaceSettings(settings: Partial<AIConfiguration>): Promise<void> {
    const settingsPath = this.getSettingsPath();
    if (!settingsPath) {
      return;
    }

    const dirPath = settingsPath.slice(0, settingsPath.lastIndexOf('/'));
    await invoke('create_directory', { path: dirPath });
    await invoke('write_file', {
      path: settingsPath,
      content: JSON.stringify(settings, null, 2),
    });
  }

  async hasWorkspaceSettings(): Promise<boolean> {
    const settingsPath = this.getSettingsPath();
    if (!settingsPath) {
      return false;
    }

    try {
      await invoke<string>('read_file', { path: settingsPath });
      return true;
    } catch {
      return false;
    }
  }
}

export const workspaceSettings = new WorkspaceSettingsManager();
