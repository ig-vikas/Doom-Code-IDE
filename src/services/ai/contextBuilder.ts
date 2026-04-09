import type { ContextSettings } from '../../types/ai';
import { useEditorStore } from '../../stores/editorStore';
import { getActiveEditor, getActiveMonaco } from '../commandService';

// In contextBuilder.ts or types file
export interface ContextResult {
  prefix: string;
  suffix: string;
  language: string;
  filePath: string;
  hasSuffix: boolean;
  estimatedTokens: number;
  linesBefore?: number;
  linesAfter?: number;
}


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

function normalizePath(path: string | undefined | null): string {
  return (path || '').replace(/\\/g, '/').toLowerCase();
}

function isLikelyPathMatch(modelPath: string, filePath: string): boolean {
  const normalizedModelPath = normalizePath(modelPath);
  const normalizedFilePath = normalizePath(filePath);

  if (!normalizedModelPath || !normalizedFilePath) {
    return false;
  }

  if (
    normalizedModelPath === normalizedFilePath
    || normalizedModelPath.endsWith(normalizedFilePath)
    || normalizedFilePath.endsWith(normalizedModelPath)
  ) {
    return true;
  }

  const fileName = normalizedFilePath.split('/').pop();
  return Boolean(fileName && normalizedModelPath.endsWith(`/${fileName}`));
}

function getAllMonacoModels(): any[] {
  const commandMonaco = getActiveMonaco();
  const commandMonacoModels = commandMonaco?.editor?.getModels?.();
  if (Array.isArray(commandMonacoModels) && commandMonacoModels.length > 0) {
    return commandMonacoModels;
  }

  const windowMonacoModels = (window as any).monaco?.editor?.getModels?.();
  if (Array.isArray(windowMonacoModels) && windowMonacoModels.length > 0) {
    return windowMonacoModels;
  }

  return [];
}

function findModelByPath(filePath: string, models: any[]): any | null {
  for (const model of models) {
    const modelPath = model?.uri?.path || model?.uri?.toString?.() || '';
    if (isLikelyPathMatch(modelPath, filePath)) {
      return model;
    }
  }

  return null;
}

function resolveModelForContext(filePath: string): any | null {
  const models = getAllMonacoModels();
  const byPath = findModelByPath(filePath, models);
  if (byPath) {
    return byPath;
  }

  const activeEditor = getActiveEditor();
  const activeModel = activeEditor?.getModel?.();
  if (activeModel) {
    return activeModel;
  }

  return models[0] || null;
}

export async function buildContext(
  filePath: string,
  position: { lineNumber: number; column: number },
  settings: ContextSettings
): Promise<ContextResult> {
  const editorStore = useEditorStore.getState();
  const allTabs = editorStore.getAllGroups().flatMap((group) => group.tabs);

  const model = resolveModelForContext(filePath);
  if (!model) {
    throw new Error('No editor model found for file');
  }

  const fullText = model.getValue();
  const lines = fullText.split('\n');
  const lineNumber = position.lineNumber;
  const column = position.column;

  const startLine = Math.max(0, lineNumber - settings.maxContextLines - 1);
  const prefixLines = lines.slice(startLine, lineNumber - 1);
  const currentLinePrefix = lines[lineNumber - 1]?.slice(0, column - 1) || '';

  let prefix = prefixLines.join('\n');
  if (prefix.length > 0) {
    prefix += '\n';
  }
  prefix += currentLinePrefix;

  const currentLineSuffix = lines[lineNumber - 1]?.slice(column - 1) || '';
  const endLine = Math.min(lines.length, lineNumber + settings.maxContextLines);
  const suffixLines = lines.slice(lineNumber, endLine);

  let suffix = currentLineSuffix;
  if (suffixLines.length > 0) {
    suffix += '\n' + suffixLines.join('\n');
  }

  const hasSuffix = suffix.trim().length > 0;
  const language = model.getLanguageId?.() || detectLanguage(filePath);

  if (settings.includeImports) {
    const imports = extractImports(fullText, language);
    if (imports.length > 0 && !prefix.includes(imports[0])) {
      const importContext = `// Imports: ${imports.slice(0, 5).join(', ')}${imports.length > 5 ? '...' : ''}\n\n`;
      prefix = importContext + prefix;
    }
  }

  if (settings.includeOpenFiles) {
    const openPaths = allTabs
      .map((tab) => tab.path || `untitled://${tab.id}/${tab.name || 'untitled'}`)
      .filter((path): path is string => Boolean(path));

    const relatedContext = await getRelatedFilesContext(
      filePath,
      openPaths,
      settings.maxOpenFilesContext,
      settings.prioritizeRelatedFiles
    );

    if (relatedContext) {
      prefix = relatedContext + '\n' + prefix;
    }
  }

  const estimatedTokens = estimateTokens(prefix + (hasSuffix ? suffix : ''));

  return {
    prefix,
    suffix: hasSuffix ? suffix : undefined,
    hasSuffix,
    language,
    filePath,
    estimatedTokens,
  };
}

function detectLanguage(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';

  if (fileName.toLowerCase() === 'dockerfile') {
    return 'dockerfile';
  }
  if (fileName.toLowerCase() === 'makefile') {
    return 'makefile';
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
}

function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];

  const patterns: Record<string, RegExp[]> = {
    typescript: [/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g],
    javascript: [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ],
    python: [/^import\s+(\S+)/gm, /^from\s+(\S+)\s+import/gm],
    rust: [/use\s+([^;]+);/g],
    go: [/import\s+"([^"]+)"/g, /import\s+\(\s*"([^"]+)"/g],
    java: [/import\s+([\w.]+);/g],
    csharp: [/using\s+([\w.]+);/g],
  };

  const languagePatterns = patterns[language] || [];
  for (const pattern of languagePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        imports.push(match[1]);
      }
    }
  }

  return [...new Set(imports)].slice(0, 10);
}

async function getRelatedFilesContext(
  currentPath: string,
  openPaths: string[],
  maxFiles: number,
  prioritize: boolean
): Promise<string | null> {
  const otherFiles = openPaths.filter((path) => path !== currentPath);
  if (otherFiles.length === 0) {
    return null;
  }

  let filesToInclude = [...otherFiles];
  if (prioritize) {
    filesToInclude.sort((left, right) => {
      const scoreLeft = calculateRelevance(currentPath, left);
      const scoreRight = calculateRelevance(currentPath, right);
      return scoreRight - scoreLeft;
    });
  }

  filesToInclude = filesToInclude.slice(0, maxFiles);

  const contexts: string[] = [];
  const models = getAllMonacoModels();
  for (const filePath of filesToInclude) {
    const model = findModelByPath(filePath, models);
    if (!model) {
      continue;
    }

    const content = model.getValue();
    const truncated = content.split('\n').slice(0, 30).join('\n');
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
    contexts.push(`// --- ${fileName} ---\n${truncated}`);
  }

  return contexts.length > 0 ? contexts.join('\n\n') : null;
}

function calculateRelevance(currentPath: string, otherPath: string): number {
  let score = 0;

  const normalizedCurrent = currentPath.replace(/\\/g, '/');
  const normalizedOther = otherPath.replace(/\\/g, '/');

  const currentDir = normalizedCurrent.substring(0, normalizedCurrent.lastIndexOf('/'));
  const otherDir = normalizedOther.substring(0, normalizedOther.lastIndexOf('/'));
  if (currentDir === otherDir) {
    score += 3;
  }

  const currentExt = normalizedCurrent.split('.').pop();
  const otherExt = normalizedOther.split('.').pop();
  if (currentExt === otherExt) {
    score += 2;
  }

  const currentName = normalizedCurrent.split('/').pop()?.split('.')[0] || '';
  const otherName = normalizedOther.split('/').pop()?.split('.')[0] || '';
  if (
    currentName
    && otherName
    && (currentName.includes(otherName) || otherName.includes(currentName))
  ) {
    score += 2;
  }

  return score;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
