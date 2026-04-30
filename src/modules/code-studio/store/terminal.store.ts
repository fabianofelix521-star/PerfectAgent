import { create } from "zustand";
import type { TerminalLine, TerminalSession } from "../types";

interface TerminalStoreState {
  sessions: TerminalSession[];
  activeSessionId: string | null;

  upsertSession: (session: TerminalSession) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  appendLine: (sessionId: string, line: TerminalLine) => void;
  clearSession: (sessionId: string) => void;
  reset: () => void;
}

export const useTerminalStore = create<TerminalStoreState>((set) => ({
  sessions: [],
  activeSessionId: null,

  upsertSession: (session) =>
    set((state) => {
      const idx = state.sessions.findIndex((s) => s.id === session.id);
      const sessions =
        idx >= 0
          ? state.sessions.map((s, i) => (i === idx ? session : s))
          : [...state.sessions, session];
      return {
        sessions,
        activeSessionId: state.activeSessionId ?? session.id,
      };
    }),
  removeSession: (sessionId) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      let active = state.activeSessionId;
      if (active === sessionId) {
        active = sessions.length > 0 ? sessions[0].id : null;
      }
      return { sessions, activeSessionId: active };
    }),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  appendLine: (sessionId, line) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, history: [...s.history, line] } : s,
      ),
    })),
  clearSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, history: [] } : s,
      ),
    })),
  reset: () => set({ sessions: [], activeSessionId: null }),
}));
