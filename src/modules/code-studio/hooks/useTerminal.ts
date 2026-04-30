import { useCallback, useEffect } from "react";
import { terminalManager } from "../engine/TerminalManager";
import { useTerminalStore } from "../store/terminal.store";
import type { TerminalSession } from "../types";

export interface UseTerminalResult {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  createSession: (name?: string) => Promise<TerminalSession>;
  closeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  write: (input: string, sessionId?: string) => Promise<void>;
  clearSession: (id: string) => void;
  runCommand: (
    cmd: string,
    args: string[],
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export function useTerminal(): UseTerminalResult {
  const store = useTerminalStore();

  useEffect(() => {
    return terminalManager.onOutput((sessionId, line) => {
      store.appendLine(sessionId, line);
    });
  }, [store]);

  const createSession = useCallback(
    async (name?: string) => {
      const session = await terminalManager.createSession(name);
      store.upsertSession(session);
      store.setActiveSession(session.id);
      return session;
    },
    [store],
  );

  const closeSession = useCallback(
    async (id: string) => {
      await terminalManager.closeSession(id);
      store.removeSession(id);
    },
    [store],
  );

  const setActiveSession = useCallback(
    (id: string) => {
      terminalManager.setActiveSession(id);
      store.setActiveSession(id);
    },
    [store],
  );

  return {
    sessions: store.sessions,
    activeSessionId: store.activeSessionId,
    createSession,
    closeSession,
    setActiveSession,
    write: (input, sessionId) => terminalManager.write(input, sessionId),
    clearSession: (id) => {
      terminalManager.clearSession(id);
      store.clearSession(id);
    },
    runCommand: (cmd, args) => terminalManager.runCommand(cmd, args),
  };
}
