/**
 * NEXUS AI Code Studio — public module entrypoint.
 *
 * Consumers (existing UI in src/pages, src/components) should import from
 * `@/modules/code-studio` and never reach into internal files directly.
 */

// Hooks (recommended primary surface for React UI).
export { useWebContainer } from "./hooks/useWebContainer";
export { useFileSystem } from "./hooks/useFileSystem";
export { usePreview } from "./hooks/usePreview";
export { useTerminal } from "./hooks/useTerminal";
export { useCodeAI } from "./hooks/useCodeAI";
export { useProject } from "./hooks/useProject";
export { useHotReload } from "./hooks/useHotReload";

// Stores (for advanced selectors / subscriptions).
export { useFileSystemStore } from "./store/fileSystem.store";
export { useEditorStore } from "./store/editor.store";
export { usePreviewStore } from "./store/preview.store";
export { useTerminalStore } from "./store/terminal.store";
export { useAICodeStore } from "./store/aiCode.store";
export { useProjectStore } from "./store/project.store";

// Engine singletons (escape hatch).
export { webContainerEngine } from "./engine/WebContainerEngine";
export { fileSystemManager } from "./engine/FileSystemManager";
export { processManager } from "./engine/ProcessManager";
export { packageManager } from "./engine/PackageManager";
export { previewServerManager } from "./engine/PreviewServerManager";
export { buildPipeline } from "./engine/BuildPipeline";
export { hotReloadManager } from "./engine/HotReloadManager";
export { terminalManager } from "./engine/TerminalManager";
export { projectExporter } from "./engine/ProjectExporter";

// AI singletons.
export { codeGenerator } from "./ai/CodeGenerator";
export { codeAIOrchestrator } from "./ai/CodeAIOrchestrator";
export { errorAnalyzer } from "./ai/ErrorAnalyzer";
export { contextBuilder } from "./ai/ContextBuilder";
export { templateRegistry } from "./ai/templates/TemplateRegistry";

// Types.
export type * from "./types";
