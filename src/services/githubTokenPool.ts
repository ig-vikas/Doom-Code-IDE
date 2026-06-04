import type { GitHubSettings } from '../types';

export function parseGitHubTokenPool(value: string | string[]): string[] {
  const rawTokens = Array.isArray(value) ? value : value.split(/\r?\n|,/);
  const seen = new Set<string>();

  return rawTokens
    .map((token) => token.trim())
    .filter((token) => {
      if (!token || seen.has(token)) return false;
      seen.add(token);
      return true;
    });
}

export function normalizeGitHubTokenIndex(index: number, poolSize: number): number {
  if (poolSize <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return ((Math.trunc(index) % poolSize) + poolSize) % poolSize;
}

export function getActiveGitHubToken(settings: GitHubSettings): string | null {
  const tokenPool = parseGitHubTokenPool(settings.tokenPool);
  if (tokenPool.length === 0) return null;
  return tokenPool[normalizeGitHubTokenIndex(settings.activeTokenIndex, tokenPool.length)] ?? null;
}

export function selectNextGitHubToken(settings: GitHubSettings): { token: string | null; activeTokenIndex: number } {
  const tokenPool = parseGitHubTokenPool(settings.tokenPool);
  if (tokenPool.length === 0) {
    return { token: null, activeTokenIndex: 0 };
  }

  const activeTokenIndex = normalizeGitHubTokenIndex(settings.activeTokenIndex + 1, tokenPool.length);
  return {
    token: tokenPool[activeTokenIndex] ?? null,
    activeTokenIndex,
  };
}
