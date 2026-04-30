/**
 * BuildPipeline — orchestrates the full boot-to-preview lifecycle.
 *
 *   run(project)        boot → mount → install → dev → ready (URL)
 *   rebuild()           re-trigger dev server
 *   reinstall(project)  delete node_modules-equivalent state and reinstall
 *   stop()              kill the dev server
 */
import { webContainerEngine } from "./WebContainerEngine";
import { fileSystemManager } from "./FileSystemManager";
import { packageManager } from "./PackageManager";
import { previewServerManager } from "./PreviewServerManager";
import type { Project } from "../types";

export type BuildStatus =
  | "idle"
  | "booting"
  | "mounting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface BuildProgress {
  status: BuildStatus;
  message: string;
  progress: number;
  previewUrl?: string;
  error?: string;
}

type ProgressListener = (progress: BuildProgress) => void;

export class BuildPipeline {
  private readonly progressListeners: ProgressListener[] = [];
  private currentStatus: BuildStatus = "idle";

  async run(project: Project): Promise<string> {
    try {
      this.setStatus("booting");
      this.emitProgress({
        status: "booting",
        message: "Booting WebContainer…",
        progress: 5,
      });
      await webContainerEngine.init();

      this.setStatus("mounting");
      this.emitProgress({
        status: "mounting",
        message: "Mounting project files…",
        progress: 20,
      });
      const files = Object.entries(project.files).map(([path, content]) => ({
        path,
        content,
      }));
      await webContainerEngine.mountFiles(files);
      await fileSystemManager.init(files);

      this.setStatus("installing");
      this.emitProgress({
        status: "installing",
        message: "Installing dependencies…",
        progress: 40,
      });
      const offProgress = packageManager.onProgress((p) => {
        const overall = 40 + Math.round(p.progress * 0.4);
        this.emitProgress({
          status: "installing",
          message: p.message,
          progress: Math.min(80, overall),
        });
      });
      try {
        await packageManager.install();
      } finally {
        offProgress();
      }

      this.setStatus("starting");
      this.emitProgress({
        status: "starting",
        message: "Starting dev server…",
        progress: 85,
      });
      const url = await previewServerManager.start();

      this.setStatus("ready");
      this.emitProgress({
        status: "ready",
        message: "Preview ready.",
        progress: 100,
        previewUrl: url,
      });
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus("error");
      this.emitProgress({
        status: "error",
        message,
        progress: 0,
        error: message,
      });
      throw err;
    }
  }

  async rebuild(): Promise<void> {
    await webContainerEngine.stopDevServer();
    previewServerManager.reset();
    await previewServerManager.start();
  }

  async reinstall(_project: Project): Promise<string> {
    await webContainerEngine.stopDevServer();
    previewServerManager.reset();
    await packageManager.install();
    return previewServerManager.start();
  }

  async stop(): Promise<void> {
    await webContainerEngine.stopDevServer();
    previewServerManager.reset();
    this.setStatus("idle");
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.push(listener);
    return () => {
      const idx = this.progressListeners.indexOf(listener);
      if (idx >= 0) this.progressListeners.splice(idx, 1);
    };
  }

  getStatus(): BuildStatus {
    return this.currentStatus;
  }

  private emitProgress(progress: BuildProgress): void {
    for (const l of this.progressListeners) {
      try {
        l(progress);
      } catch {
        /* noop */
      }
    }
  }

  private setStatus(status: BuildStatus): void {
    this.currentStatus = status;
  }
}

export const buildPipeline = new BuildPipeline();
