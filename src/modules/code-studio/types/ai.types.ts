/**
 * AI generation types: messages, plans, generated files, streaming state.
 */

export type MessageRole = "user" | "assistant" | "system";

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type GenerationStepStatus = "pending" | "active" | "complete" | "error";

export interface GenerationStep {
  id: string;
  description: string;
  status: GenerationStepStatus;
}

export type GeneratedFileAction = "create" | "update" | "delete";

export interface GeneratedFile {
  path: string;
  action: GeneratedFileAction;
  description: string;
  content: string;
}

export interface AIPlanStep {
  step: number;
  description: string;
}

export interface AICodeResponse {
  thinking: string;
  plan: AIPlanStep[];
  files: GeneratedFile[];
  commands: string[];
  summary: string;
}

export type GenerationStatus =
  | "idle"
  | "thinking"
  | "planning"
  | "generating"
  | "applying"
  | "installing"
  | "complete"
  | "error";

export interface GenerationState {
  status: GenerationStatus;
  thinking: string;
  plan: GenerationStep[];
  filesTotal: number;
  filesComplete: number;
  currentFile: string | null;
  error: string | null;
}
