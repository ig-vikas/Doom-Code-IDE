import { invoke } from '@tauri-apps/api/core';
import type { FileNode, FileInfo } from '../types';

export async function readFileContent(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export async function writeFileContent(path: string, content: string): Promise<void> {
  return invoke<void>('write_file', { path, content });
}

export async function renamePath(oldPath: string, newPath: string): Promise<void> {
  return invoke<void>('rename_path', { oldPath, newPath });
}

export async function deletePath(path: string): Promise<void> {
  return invoke<void>('delete_path', { path });
}

export async function createNewFile(path: string): Promise<void> {
  return invoke<void>('create_file', { path });
}

export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>('file_exists', { path });
}

export async function getFileInfo(path: string): Promise<FileInfo> {
  return invoke<FileInfo>('get_file_info', { path });
}

export async function readDirectory(path: string, maxDepth?: number): Promise<FileNode[]> {
  return invoke<FileNode[]>('read_directory', { path, maxDepth: maxDepth ?? 10 });
}

export async function createDirectory(path: string): Promise<void> {
  return invoke<void>('create_directory', { path });
}
