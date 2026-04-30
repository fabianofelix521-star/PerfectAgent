import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { FileNode, FileTree } from "../types";

interface FileSystemState {
  fileTree: FileTree | null;
  selectedFile: string | null;
  expandedDirs: Set<string>;
  isLoading: boolean;
  error: string | null;

  setFileTree: (tree: FileTree) => void;
  selectFile: (path: string | null) => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  addFileNode: (node: FileNode) => void;
  removeFileNode: (path: string) => void;
  renameFileNode: (path: string, newName: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initial = {
  fileTree: null as FileTree | null,
  selectedFile: null as string | null,
  expandedDirs: new Set<string>(),
  isLoading: false,
  error: null as string | null,
};

export const useFileSystemStore = create<FileSystemState>()(
  subscribeWithSelector((set) => ({
    ...initial,
    setFileTree: (tree) => set({ fileTree: tree }),
    selectFile: (path) => set({ selectedFile: path }),
    toggleDir: (path) =>
      set((state) => {
        const next = new Set(state.expandedDirs);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return { expandedDirs: next };
      }),
    expandDir: (path) =>
      set((state) => {
        const next = new Set(state.expandedDirs);
        next.add(path);
        return { expandedDirs: next };
      }),
    collapseDir: (path) =>
      set((state) => {
        const next = new Set(state.expandedDirs);
        next.delete(path);
        return { expandedDirs: next };
      }),
    updateFileContent: (path, content) =>
      set((state) => {
        if (!state.fileTree) return {};
        const node = state.fileTree.flatMap.get(path);
        if (!node) return {};
        node.content = content;
        node.lastModified = Date.now();
        node.size = content.length;
        return { fileTree: { ...state.fileTree } };
      }),
    addFileNode: (node) =>
      set((state) => {
        if (!state.fileTree) return {};
        state.fileTree.flatMap.set(node.path, node);
        return { fileTree: { ...state.fileTree } };
      }),
    removeFileNode: (path) =>
      set((state) => {
        if (!state.fileTree) return {};
        state.fileTree.flatMap.delete(path);
        return {
          fileTree: { ...state.fileTree },
          selectedFile: state.selectedFile === path ? null : state.selectedFile,
        };
      }),
    renameFileNode: (path, newName) =>
      set((state) => {
        if (!state.fileTree) return {};
        const node = state.fileTree.flatMap.get(path);
        if (!node) return {};
        node.name = newName;
        return { fileTree: { ...state.fileTree } };
      }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    reset: () => set({ ...initial, expandedDirs: new Set<string>() }),
  })),
);
