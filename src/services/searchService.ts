import { invoke } from '@tauri-apps/api/core';

interface SearchMatch {
  path: string;
  line: number;
  column: number;
  lineContent: string;
}

export async function searchInFiles(
  directory: string,
  query: string,
  options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    includePattern?: string;
    excludePattern?: string;
    maxResults?: number;
  }
): Promise<SearchMatch[]> {
  return invoke<SearchMatch[]>('search_in_files', {
    directory,
    query,
    caseSensitive: options?.caseSensitive ?? false,
    wholeWord: options?.wholeWord ?? false,
    useRegex: options?.useRegex ?? false,
    includePattern: options?.includePattern ?? null,
    excludePattern: options?.excludePattern ?? null,
    maxResults: options?.maxResults ?? 1000,
  });
}
