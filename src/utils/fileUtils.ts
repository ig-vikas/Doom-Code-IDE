export function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

export function getFileExtension(filePath: string): string {
  const name = getFileName(filePath);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.substring(dotIndex + 1).toLowerCase() : '';
}

export function getDirectory(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.substring(0, lastSlash) : '';
}

export function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'cpp',
    hpp: 'cpp',
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    txt: 'plaintext',
    xml: 'xml',
    html: 'html',
    css: 'css',
    java: 'java',
    rs: 'rust',
    go: 'go',
    sh: 'shell',
    bat: 'bat',
    ps1: 'powershell',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    sql: 'sql',
    makefile: 'makefile',
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

export function isImageFile(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp'].includes(ext.toLowerCase());
}

export function isBinaryFile(ext: string): boolean {
  return ['exe', 'o', 'obj', 'dll', 'so', 'dylib', 'zip', 'tar', 'gz',
    'rar', '7z', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    ...['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp']].includes(ext.toLowerCase());
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
