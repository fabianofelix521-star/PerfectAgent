/**
 * Terminal session types.
 */

export type TerminalLineType = "stdout" | "stderr" | "input" | "system";

export interface TerminalLine {
  id: string;
  sessionId: string;
  type: TerminalLineType;
  data: string;
  timestamp: number;
}

export interface TerminalSession {
  id: string;
  name: string;
  pid: string | null;
  isActive: boolean;
  history: TerminalLine[];
}
