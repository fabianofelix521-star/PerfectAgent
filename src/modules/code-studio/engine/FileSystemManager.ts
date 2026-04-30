/**
 * FileSystemManager — in-memory mirror of the WebContainer file system.
 *
 * Two responsibilities:
 *   1. Maintain a `FileTree` (tree + flatMap by path) consumable by the UI.
 *   2. Keep that mirror in sync with the underlying WebContainer FS.
 */
import { webContainerEngine } from "./WebContainerEngine";
import type { FileChange, FileNode, FileOperation, FileTree } from "../types";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  svg: "xml",
  yml: "yaml",
  yaml: "yaml",
  py: "python",
  go: "go",
  rs: "rust",
  sh: "shell",
  txt: "plaintext",
  toml: "toml",
};

let nodeIdCounter = 0;
const nextId = () =>
  `fn_${Date.now().toString(36)}_${(++nodeIdCounter).toString(36)}`;

function normalizePath(path: string): string {
  let p = path.replace(/\\/g, "/");
  if (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/")) p = p.slice(1);
  return p;
}

function basename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx <= 0 ? "" : path.slice(0, idx);
}

export class FileSystemManager {
  private fileTree: FileTree;
  private readonly changeListeners: Array<(change: FileChange) => void> = [];

  constructor() {
    this.fileTree = this.createEmptyTree();
  }

  async init(files: Array<{ path: string; content: string }>): Promise<void> {
    this.fileTree = this.createEmptyTree();
    for (const { path, content } of files) {
      this.upsertNode(path, content, "file", { skipNotify: true });
    }
    this.rebuildTree();
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async createFile(path: string, content: string): Promise<FileNode> {
    const normalized = normalizePath(path);
    await webContainerEngine.writeFile(normalized, content);
    const node = this.upsertNode(normalized, content, "file");
    return node;
  }

  async readFile(path: string): Promise<string> {
    const normalized = normalizePath(path);
    const node = this.fileTree.flatMap.get(normalized);
    if (node && node.type === "file" && node.content !== undefined) {
      return node.content;
    }
    const content = await webContainerEngine.readFile(normalized);
    this.upsertNode(normalized, content, "file", { skipNotify: true });
    return content;
  }

  async updateFile(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    const prev = this.fileTree.flatMap.get(normalized);
    const oldContent = prev?.content;
    await webContainerEngine.writeFile(normalized, content);
    this.upsertNode(normalized, content, "file", { oldContent });
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = normalizePath(path);
    await webContainerEngine.deleteFile(normalized);
    this.removeNode(normalized);
  }

  async renameFile(path: string, newName: string): Promise<void> {
    const normalized = normalizePath(path);
    const dir = dirname(normalized);
    const newPath = dir ? `${dir}/${newName}` : newName;
    await this.moveFile(normalized, newPath);
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);
    const node = this.fileTree.flatMap.get(from);
    if (!node) throw new Error(`Source file not found: ${from}`);
    const content = node.content ?? (await webContainerEngine.readFile(from));
    await webContainerEngine.writeFile(to, content);
    await webContainerEngine.deleteFile(from);
    this.removeNode(from);
    this.upsertNode(to, content, "file");
  }

  async createDirectory(path: string): Promise<FileNode> {
    const normalized = normalizePath(path);
    await webContainerEngine.mkdir(normalized);
    return this.upsertNode(normalized, undefined, "directory");
  }

  async deleteDirectory(path: string): Promise<void> {
    const normalized = normalizePath(path);
    await webContainerEngine.deleteFile(normalized);
    // Remove all nodes that start with this prefix
    const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
    const toRemove: string[] = [normalized];
    for (const key of this.fileTree.flatMap.keys()) {
      if (key.startsWith(prefix)) toRemove.push(key);
    }
    for (const key of toRemove) this.removeNode(key, { skipRebuild: true });
    this.rebuildTree();
  }

  async listDirectory(path: string): Promise<FileNode[]> {
    const normalized = normalizePath(path);
    const node = this.fileTree.flatMap.get(normalized);
    if (!node || node.type !== "directory") return [];
    return node.children ?? [];
  }

  async applyOperations(operations: FileOperation[]): Promise<void> {
    for (const op of operations) {
      switch (op.action) {
        case "create":
        case "update":
          if (op.content === undefined) break;
          await this.updateFileSafely(op.path, op.content);
          break;
        case "delete":
          await this.deleteFile(op.path).catch(() => undefined);
          break;
        case "rename":
        case "move":
          if (op.newPath) await this.moveFile(op.path, op.newPath);
          break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  getFileTree(): FileTree {
    return this.fileTree;
  }

  getFileNode(path: string): FileNode | null {
    return this.fileTree.flatMap.get(normalizePath(path)) ?? null;
  }

  getAllFiles(): Array<{ path: string; content: string }> {
    const out: Array<{ path: string; content: string }> = [];
    for (const node of this.fileTree.flatMap.values()) {
      if (node.type === "file" && node.content !== undefined) {
        out.push({ path: node.path, content: node.content });
      }
    }
    return out;
  }

  detectLanguage(path: string): string {
    const name = basename(path);
    const dot = name.lastIndexOf(".");
    if (dot < 0) return "plaintext";
    const ext = name.slice(dot + 1).toLowerCase();
    return LANGUAGE_BY_EXT[ext] ?? "plaintext";
  }

  onChange(listener: (change: FileChange) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const idx = this.changeListeners.indexOf(listener);
      if (idx >= 0) this.changeListeners.splice(idx, 1);
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private createEmptyTree(): FileTree {
    const root: FileNode = {
      id: nextId(),
      name: "/",
      path: "",
      type: "directory",
      children: [],
      isOpen: true,
    };
    const flatMap = new Map<string, FileNode>();
    flatMap.set("", root);
    return { root, flatMap };
  }

  private async updateFileSafely(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    const exists = this.fileTree.flatMap.has(normalized);
    if (exists) {
      await this.updateFile(normalized, content);
    } else {
      await this.createFile(normalized, content);
    }
  }

  private upsertNode(
    path: string,
    content: string | undefined,
    type: "file" | "directory",
    opts: { skipNotify?: boolean; oldContent?: string } = {},
  ): FileNode {
    const normalized = normalizePath(path);
    const existing = this.fileTree.flatMap.get(normalized);
    const now = Date.now();

    if (existing) {
      existing.content = type === "file" ? content : undefined;
      existing.size = content?.length;
      existing.lastModified = now;
      existing.language =
        type === "file" ? this.detectLanguage(normalized) : undefined;
      if (!opts.skipNotify && type === "file" && content !== undefined) {
        this.notifyChange({
          path: normalized,
          oldContent: opts.oldContent,
          newContent: content,
          timestamp: now,
        });
      }
      return existing;
    }

    const node: FileNode = {
      id: nextId(),
      name: basename(normalized) || "/",
      path: normalized,
      type,
      content: type === "file" ? content : undefined,
      size: content?.length,
      lastModified: now,
      language: type === "file" ? this.detectLanguage(normalized) : undefined,
      children: type === "directory" ? [] : undefined,
      isOpen: type === "directory" ? false : undefined,
    };

    this.fileTree.flatMap.set(normalized, node);
    this.ensureAncestors(normalized);
    this.rebuildTree();

    if (!opts.skipNotify && type === "file" && content !== undefined) {
      this.notifyChange({
        path: normalized,
        oldContent: opts.oldContent,
        newContent: content,
        timestamp: now,
      });
    }
    return node;
  }

  private ensureAncestors(path: string): void {
    let current = dirname(path);
    while (current && !this.fileTree.flatMap.has(current)) {
      const dir: FileNode = {
        id: nextId(),
        name: basename(current),
        path: current,
        type: "directory",
        children: [],
        isOpen: false,
      };
      this.fileTree.flatMap.set(current, dir);
      current = dirname(current);
    }
  }

  private removeNode(path: string, opts: { skipRebuild?: boolean } = {}): void {
    const normalized = normalizePath(path);
    if (!this.fileTree.flatMap.has(normalized)) return;
    this.fileTree.flatMap.delete(normalized);
    if (!opts.skipRebuild) this.rebuildTree();
  }

  private rebuildTree(): void {
    // Reset all directory children
    for (const node of this.fileTree.flatMap.values()) {
      if (node.type === "directory") node.children = [];
    }
    const sorted = Array.from(this.fileTree.flatMap.entries())
      .filter(([key]) => key !== "")
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [path, node] of sorted) {
      const parentPath = dirname(path);
      const parent =
        this.fileTree.flatMap.get(parentPath) ?? this.fileTree.root;
      if (parent.type === "directory") {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    }

    // Sort children: directories first, then alphabetical.
    for (const node of this.fileTree.flatMap.values()) {
      if (node.type === "directory" && node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      }
    }
  }

  private notifyChange(change: FileChange): void {
    for (const listener of this.changeListeners) {
      try {
        listener(change);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const fileSystemManager = new FileSystemManager();
