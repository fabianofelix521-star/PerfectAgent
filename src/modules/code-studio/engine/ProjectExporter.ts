/**
 * ProjectExporter — bundles the current FileSystemManager contents into a ZIP.
 */
import JSZip from "jszip";
import { fileSystemManager } from "./FileSystemManager";

export interface ExportOptions {
  includeNodeModules?: boolean;
  excludePatterns?: string[];
  zipName?: string;
}

export class ProjectExporter {
  private readonly DEFAULT_EXCLUDE = [
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    ".cache",
  ];

  async exportAsZip(
    projectName: string,
    options: ExportOptions = {},
  ): Promise<void> {
    const blob = await this.generateZip(projectName, options);
    const filename = options.zipName ?? `${this.slugify(projectName)}.zip`;
    this.downloadBlob(blob, filename);
  }

  async generateZip(
    projectName: string,
    options: ExportOptions = {},
  ): Promise<Blob> {
    const zip = new JSZip();
    const folder = zip.folder(this.slugify(projectName)) ?? zip;

    const exclude = [
      ...(options.includeNodeModules ? [] : this.DEFAULT_EXCLUDE),
      ...(options.excludePatterns ?? []),
    ];

    for (const file of fileSystemManager.getAllFiles()) {
      if (this.shouldExclude(file.path, exclude)) continue;
      folder.file(file.path, file.content);
    }

    return folder.generateAsync({ type: "blob", compression: "DEFLATE" });
  }

  async copyFileToClipboard(path: string): Promise<void> {
    const node = fileSystemManager.getFileNode(path);
    if (!node || node.type !== "file" || node.content === undefined) {
      throw new Error(`File not found or has no content: ${path}`);
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      throw new Error("Clipboard API is not available in this environment.");
    }
    await navigator.clipboard.writeText(node.content);
  }

  private shouldExclude(path: string, patterns: string[]): boolean {
    return patterns.some(
      (pattern) => path === pattern || path.startsWith(`${pattern}/`),
    );
  }

  private downloadBlob(blob: Blob, filename: string): void {
    if (typeof document === "undefined") return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private slugify(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "project"
    );
  }
}

export const projectExporter = new ProjectExporter();
