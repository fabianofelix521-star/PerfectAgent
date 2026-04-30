/**
 * Engine-level types for the WebContainer runtime.
 */

export type EngineStatus =
  | "idle"
  | "booting"
  | "ready"
  | "installing"
  | "building"
  | "running"
  | "error";

export interface EngineState {
  status: EngineStatus;
  previewUrl: string | null;
  error: string | null;
  bootProgress: number; // 0-100
}

export interface ProcessOutput {
  type: "stdout" | "stderr";
  data: string;
  timestamp: number;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface EngineEvents {
  onBoot: () => void;
  onServerReady: (url: string) => void;
  onFileChange: (path: string) => void;
  onProcessOutput: (output: ProcessOutput) => void;
  onInstallProgress: (progress: number) => void;
  onError: (error: Error) => void;
}

/**
 * Recursive shape accepted by `WebContainer#mount`.
 */
export interface WebContainerFileSystem {
  [name: string]: WebContainerFileEntry;
}

export type WebContainerFileEntry =
  | { file: { contents: string | Uint8Array } }
  | { directory: WebContainerFileSystem };
