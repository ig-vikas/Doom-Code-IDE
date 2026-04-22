// contextBuilder.ts
import type { CompletionContextFile, ContextSettings } from '../../types/ai';
import { useEditorStore } from '../../stores/editorStore';
import { getActiveEditor, getActiveMonaco } from '../commandService';

export interface ContextResult {
  prefix: string;
  suffix: string | undefined;
  hasSuffix: boolean;
  language: string;
  filePath: string;
  estimatedTokens: number;
  contextFiles: CompletionContextFile[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * How many characters to send before/after the cursor.
 * Keeping these tight is the single biggest speed lever:
 *   • Less tokens  → faster inference
 *   • Smaller payload → less network time
 * The model only needs nearby code to predict the next token.
 */
const MAX_PREFIX_CHARS = 2_000; // ~500 tokens
const MAX_SUFFIX_CHARS = 500;  // ~125 tokens — suffix matters less
const MAX_IMPORT_LINES = 4;    // just enough for the model to know the imports
const MAX_OPEN_FILE_LINES = 20; // first 20 lines per related file

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  dockerfile: 'dockerfile',
  vue: 'vue',
  svelte: 'svelte',
};

// ─── Main export ───────────────────────────────────────────────────────────────

export async function buildContext(
  filePath: string,
  position: { lineNumber: number; column: number },
  settings: ContextSettings
): Promise<ContextResult> {
  const model = resolveModelForContext(filePath);
  if (!model) throw new Error('No editor model found for file');

  const fullText: string = model.getValue();
  const language: string = model.getLanguageId?.() ?? detectLanguage(filePath);

  // Build raw prefix / suffix from the document
  const { prefix: rawPrefix, suffix: rawSuffix } =
    extractPrefixSuffix(fullText, position, settings.maxContextLines);

  // Trim to char budgets — do this early so enrichments don't blow the budget
  let prefix = rawPrefix.slice(-MAX_PREFIX_CHARS);
  let suffix = rawSuffix.slice(0, MAX_SUFFIX_CHARS);

  // Optional: prepend a compact import summary
  if (settings.includeImports) {
    const importHint = buildImportHint(fullText, language);
    if (importHint && !prefix.startsWith(importHint)) {
      prefix = importHint + prefix;
    }
  }

  // Optional: prepend snippets of related open files
  if (settings.includeOpenFiles) {
    const openPaths = getOpenFilePaths(filePath);
    const relatedSnippet = buildRelatedFilesSnippet(
      filePath,
      openPaths,
      settings.maxOpenFilesContext,
      settings.prioritizeRelatedFiles
    );
    if (relatedSnippet) {
      prefix = relatedSnippet + '\n' + prefix;
    }
  }

  const hasSuffix = suffix.trim().length > 0;

  return {
    prefix,
    suffix: hasSuffix ? suffix : undefined,
    hasSuffix,
    language,
    filePath,
    estimatedTokens: estimateTokens(prefix + (hasSuffix ? suffix : '')),
    contextFiles: [], // populated by caller if needed
  };
}

// ─── Prefix / suffix extraction ────────────────────────────────────────────────

function extractPrefixSuffix(
  fullText: string,
  position: { lineNumber: number; column: number },
  maxContextLines: number
): { prefix: string; suffix: string } {
  const lines = fullText.split('\n');
  const zeroLine = position.lineNumber - 1; // 0-based
  const zeroCol = position.column - 1;       // 0-based

  // Prefix: lines above + partial current line up to cursor
  const prefixStartLine = Math.max(0, zeroLine - maxContextLines);
  const prefixLines = lines.slice(prefixStartLine, zeroLine);
  const currentLineLeft = lines[zeroLine]?.slice(0, zeroCol) ?? '';
  const prefix =
    (prefixLines.length ? prefixLines.join('\n') + '\n' : '') + currentLineLeft;

  // Suffix: rest of current line + lines below
  const currentLineRight = lines[zeroLine]?.slice(zeroCol) ?? '';
  const suffixEndLine = Math.min(lines.length, zeroLine + 1 + maxContextLines);
  const suffixLines = lines.slice(zeroLine + 1, suffixEndLine);
  const suffix =
    currentLineRight + (suffixLines.length ? '\n' + suffixLines.join('\n') : '');

  return { prefix, suffix };
}

// ─── Import hint ───────────────────────────────────────────────────────────────

/**
 * Returns a single-line comment summarising the top imports.
 * Cheap to build, gives the model useful type/module context.
 */
function buildImportHint(content: string, language: string): string {
  const imports = extractImports(content, language);
  if (imports.length === 0) return '';

  const shown = imports.slice(0, MAX_IMPORT_LINES);
  const ellipsis = imports.length > MAX_IMPORT_LINES ? '…' : '';
  return `// imports: ${shown.join(', ')}${ellipsis}\n`;
}

function extractImports(content: string, language: string): string[] {
  const patterns: Record<string, RegExp[]> = {
    typescript: [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /import\s+['"]([^'"]+)['"]/g,
    ],
    javascript: [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ],
    python: [/^import\s+(\S+)/gm, /^from\s+(\S+)\s+import/gm],
    rust:   [/use\s+([^;]+);/g],
    go:     [/import\s+"([^"]+)"/g],
    java:   [/import\s+([\w.]+);/g],
    csharp: [/using\s+([\w.]+);/g],
  };

  const results = new Set<string>();
  for (const pattern of patterns[language] ?? []) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) results.add(match[1]);
      if (results.size >= 10) break; // don't scan the whole file
    }
  }
  return [...results];
}

// ─── Related files ─────────────────────────────────────────────────────────────

function getOpenFilePaths(currentPath: string): string[] {
  const editorStore = useEditorStore.getState();
  return editorStore
    .getAllGroups()
    .flatMap((g) => g.tabs)
    .map((tab) => tab.path ?? `untitled://${tab.id}/${tab.name ?? 'untitled'}`)
    .filter((p) => p !== currentPath);
}

/**
 * Grabs the first `MAX_OPEN_FILE_LINES` lines of each related file.
 * Files are ranked by directory + extension + name similarity.
 */
function buildRelatedFilesSnippet(
  currentPath: string,
  openPaths: string[],
  maxFiles: number,
  prioritize: boolean
): string | null {
  if (openPaths.length === 0) return null;

  let candidates = [...openPaths];
  if (prioritize) {
    candidates.sort(
      (a, b) => calculateRelevance(currentPath, b) - calculateRelevance(currentPath, a)
    );
  }
  candidates = candidates.slice(0, maxFiles);

  const models = getAllMonacoModels();
  const snippets: string[] = [];

  for (const filePath of candidates) {
    const model = findModelByPath(filePath, models);
    if (!model) continue;

    const snippet = model
      .getValue()
      .split('\n')
      .slice(0, MAX_OPEN_FILE_LINES)
      .join('\n');

    const label = filePath.split('/').pop() ?? filePath;
    snippets.push(`// --- ${label} ---\n${snippet}`);
  }

  return snippets.length > 0 ? snippets.join('\n\n') : null;
}

function calculateRelevance(currentPath: string, otherPath: string): number {
  const cur = currentPath.replace(/\\/g, '/');
  const oth = otherPath.replace(/\\/g, '/');

  let score = 0;
  if (cur.substring(0, cur.lastIndexOf('/')) === oth.substring(0, oth.lastIndexOf('/'))) score += 3;
  if (cur.split('.').pop() === oth.split('.').pop()) score += 2;

  const curBase = cur.split('/').pop()?.split('.')[0] ?? '';
  const othBase = oth.split('/').pop()?.split('.')[0] ?? '';
  if (curBase && othBase && (curBase.includes(othBase) || othBase.includes(curBase))) score += 2;

  return score;
}

// ─── Monaco model resolution ───────────────────────────────────────────────────

function getAllMonacoModels(): unknown[] {
  const fromCommand = getActiveMonaco()?.editor?.getModels?.();
  if (Array.isArray(fromCommand) && fromCommand.length > 0) return fromCommand;

  const fromWindow = (window as any).monaco?.editor?.getModels?.();
  if (Array.isArray(fromWindow) && fromWindow.length > 0) return fromWindow;

  return [];
}

function findModelByPath(filePath: string, models: unknown[]): any | null {
  const needle = normalizePath(filePath);
  for (const m of models) {
    const haystack = normalizePath(
      (m as any)?.uri?.path ?? (m as any)?.uri?.toString?.() ?? ''
    );
    if (haystack && isLikelyPathMatch(haystack, needle)) return m;
  }
  return null;
}

function resolveModelForContext(filePath: string): any | null {
  const models = getAllMonacoModels();
  const byPath = findModelByPath(filePath, models);
  if (byPath) return byPath;

  const active = getActiveEditor()?.getModel?.();
  if (active) return active;

  return (models[0] as any) ?? null;
}

// ─── Small utilities ───────────────────────────────────────────────────────────

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

function isLikelyPathMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.endsWith(b) || b.endsWith(a)) return true;
  const fileName = b.split('/').pop();
  return Boolean(fileName && a.endsWith(`/${fileName}`));
}

function detectLanguage(filePath: string): string {
  const name = (filePath.split('/').pop() ?? filePath.split('\\').pop() ?? '').toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  return LANGUAGE_MAP[name.split('.').pop() ?? ''] ?? 'plaintext';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}