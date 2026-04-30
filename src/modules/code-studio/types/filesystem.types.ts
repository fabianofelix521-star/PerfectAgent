/**
 * File-system mirror types used by the engine and the UI tree.
 */

export type FileNodeType = "file" | "directory";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  content?: string;
  language?: string;
  size?: number;
  lastModified?: number;
  children?: FileNode[];
  isOpen?: boolean;
  isDirty?: boolean;
}

export interface FileTree {
  root: FileNode;
  flatMap: Map<string, FileNode>;
}

export type FileAction = "create" | "update" | "delete" | "rename" | "move";

export interface FileOperation {
  action: FileAction;
  path: string;
  content?: string;
  newPath?: string;
}

export interface FileChange {
  path: string;
  oldContent?: string;
  newContent: string;
  timestamp: number;
}
