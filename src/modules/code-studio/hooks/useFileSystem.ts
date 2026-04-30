import { useCallback, useEffect } from "react";
import { fileSystemManager } from "../engine/FileSystemManager";
import { useFileSystemStore } from "../store/fileSystem.store";
import type { FileNode, FileTree } from "../types";

export interface UseFileSystemResult {
  fileTree: FileTree | null;
  selectedFile: string | null;
  selectFile: (path: string | null) => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  createFile: (path: string, content?: string) => Promise<FileNode>;
  updateFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (path: string, newName: string) => Promise<void>;
  moveFile: (from: string, to: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  refresh: () => void;
}

export function useFileSystem(): UseFileSystemResult {
  const store = useFileSystemStore();

  const refresh = useCallback(() => {
    store.setFileTree(fileSystemManager.getFileTree());
  }, [store]);

  useEffect(() => {
    refresh();
    const off = fileSystemManager.onChange(() => refresh());
    return off;
  }, [refresh]);

  return {
    fileTree: store.fileTree,
    selectedFile: store.selectedFile,
    selectFile: store.selectFile,
    toggleDir: store.toggleDir,
    expandDir: store.expandDir,
    collapseDir: store.collapseDir,
    createFile: async (path, content = "") => {
      const node = await fileSystemManager.createFile(path, content);
      refresh();
      return node;
    },
    updateFile: async (path, content) => {
      await fileSystemManager.updateFile(path, content);
      refresh();
    },
    deleteFile: async (path) => {
      await fileSystemManager.deleteFile(path);
      refresh();
    },
    renameFile: async (path, newName) => {
      await fileSystemManager.renameFile(path, newName);
      refresh();
    },
    moveFile: async (from, to) => {
      await fileSystemManager.moveFile(from, to);
      refresh();
    },
    readFile: (path) => fileSystemManager.readFile(path),
    refresh,
  };
}
