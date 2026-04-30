/**
 * HotReloadManager — debounces file edits coming from the editor and
 * forwards them to the WebContainer (where Vite picks them up via HMR).
 */
import { fileSystemManager } from "./FileSystemManager";
import { previewServerManager } from "./PreviewServerManager";

export interface HMRStatus {
  isActive: boolean;
  lastUpdate: number | null;
  pendingChanges: number;
  error: string | null;
}

type HMRListener = (status: HMRStatus) => void;

export class HotReloadManager {
  private readonly debounceTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly pendingChanges = new Set<string>();
  private readonly listeners: HMRListener[] = [];
  private status: HMRStatus = {
    isActive: false,
    lastUpdate: null,
    pendingChanges: 0,
    error: null,
  };
  private readonly DEBOUNCE_MS = 150;

  notifyChange(path: string, content: string): void {
    this.pendingChanges.add(path);
    this.updateStatus({
      pendingChanges: this.pendingChanges.size,
      isActive: true,
    });

    const previous = this.debounceTimers.get(path);
    if (previous) clearTimeout(previous);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      this.processChange(path, content).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.updateStatus({ error: message, isActive: false });
      });
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(path, timer);
  }

  forceReload(): void {
    const url = previewServerManager.getUrl();
    if (!url) return;
    // Touch listeners by re-emitting the URL; the iframe wrapper in the UI
    // will use this to bust its src.
    this.updateStatus({
      isActive: true,
      lastUpdate: Date.now(),
      pendingChanges: 0,
      error: null,
    });
  }

  onStatusChange(listener: HMRListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  getStatus(): HMRStatus {
    return { ...this.status };
  }

  // -----------------------------------------------------------------------

  private async processChange(path: string, content: string): Promise<void> {
    try {
      await fileSystemManager.updateFile(path, content);
      this.pendingChanges.delete(path);
      this.updateStatus({
        isActive: this.pendingChanges.size > 0,
        lastUpdate: Date.now(),
        pendingChanges: this.pendingChanges.size,
        error: null,
      });
    } catch (err) {
      this.pendingChanges.delete(path);
      const message = err instanceof Error ? err.message : String(err);
      this.updateStatus({
        isActive: false,
        pendingChanges: this.pendingChanges.size,
        error: message,
      });
      throw err;
    }
  }

  private updateStatus(partial: Partial<HMRStatus>): void {
    this.status = { ...this.status, ...partial };
    for (const l of this.listeners) {
      try {
        l(this.status);
      } catch {
        /* noop */
      }
    }
  }
}

export const hotReloadManager = new HotReloadManager();
