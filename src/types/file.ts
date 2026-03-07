export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  extension: string | null;
  children: FileNode[] | null;
  size: number | null;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDir: boolean;
  extension: string | null;
}
