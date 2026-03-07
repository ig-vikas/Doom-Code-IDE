import { invoke } from '@tauri-apps/api/core';

export interface ShellOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  success: boolean;
}

export async function openInFileExplorer(path: string): Promise<void> {
  return invoke<void>('open_in_file_explorer', { path });
}

export async function runShellCommand(command: string, cwd?: string): Promise<ShellOutput> {
  return invoke<ShellOutput>('run_shell_command', { command, cwd: cwd ?? null });
}
