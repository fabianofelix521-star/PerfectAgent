/**
 * TerminalManager — multi-session shell on top of the WebContainer.
 * Designed to be wired to xterm.js on the UI side.
 */
import { webContainerEngine } from "./WebContainerEngine";
import type { TerminalLine, TerminalSession } from "../types";

type AnyProcess = Awaited<
  ReturnType<import("@webcontainer/api").WebContainer["spawn"]>
>;
type OutputListener = (sessionId: string, line: TerminalLine) => void;

let lineCounter = 0;
const nextLineId = () =>
  `tl_${Date.now().toString(36)}_${(++lineCounter).toString(36)}`;

interface InternalSession extends TerminalSession {
  process: AnyProcess | null;
  writer: WritableStreamDefaultWriter<string> | null;
}

export class TerminalManager {
  private readonly sessions = new Map<string, InternalSession>();
  private activeSessionId: string | null = null;
  private readonly outputListeners: OutputListener[] = [];
  private counter = 0;

  async createSession(name?: string): Promise<TerminalSession> {
    const id = `term_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
    const session: InternalSession = {
      id,
      name: name ?? `Terminal ${this.counter}`,
      pid: null,
      isActive: false,
      history: [],
      process: null,
      writer: null,
    };

    const proc = await this.spawnShell();
    session.process = proc;
    session.pid = id;

    proc.output
      .pipeTo(
        new WritableStream<string>({
          write: (data) => {
            this.addLine(id, {
              id: nextLineId(),
              sessionId: id,
              type: "stdout",
              data,
              timestamp: Date.now(),
            });
          },
        }),
      )
      .catch(() => undefined);

    if (proc.input) {
      session.writer = proc.input.getWriter();
    }

    this.sessions.set(id, session);
    if (!this.activeSessionId) this.setActiveSession(id);
    return this.toPublic(session);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try {
      session.writer?.releaseLock();
    } catch {
      /* noop */
    }
    try {
      session.process?.kill();
    } catch {
      /* noop */
    }
    this.sessions.delete(sessionId);
    if (this.activeSessionId === sessionId) {
      const next = this.sessions.keys().next();
      this.activeSessionId = next.done ? null : next.value;
    }
  }

  setActiveSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) return;
    for (const s of this.sessions.values()) s.isActive = false;
    const session = this.sessions.get(sessionId)!;
    session.isActive = true;
    this.activeSessionId = sessionId;
  }

  async write(input: string, sessionId?: string): Promise<void> {
    const session = this.getSession(sessionId ?? this.activeSessionId ?? "");
    if (!session.writer) throw new Error("Session has no writable input.");
    this.addLine(session.id, {
      id: nextLineId(),
      sessionId: session.id,
      type: "input",
      data: input,
      timestamp: Date.now(),
    });
    await session.writer.write(input);
  }

  getHistory(sessionId: string): TerminalLine[] {
    return this.sessions.get(sessionId)?.history ?? [];
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.history = [];
  }

  async runCommand(
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    let stdout = "";
    const { exitCode, process } = await webContainerEngine.spawn({
      command,
      args,
    });
    process.output
      .pipeTo(
        new WritableStream<string>({
          write: (data) => {
            stdout += data;
          },
        }),
      )
      .catch(() => undefined);
    const code = await exitCode;
    return { stdout, stderr: "", exitCode: code };
  }

  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((s) => this.toPublic(s));
  }

  getActiveSession(): TerminalSession | null {
    if (!this.activeSessionId) return null;
    const session = this.sessions.get(this.activeSessionId);
    return session ? this.toPublic(session) : null;
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.push(listener);
    return () => {
      const idx = this.outputListeners.indexOf(listener);
      if (idx >= 0) this.outputListeners.splice(idx, 1);
    };
  }

  // -----------------------------------------------------------------------

  private async spawnShell(): Promise<AnyProcess> {
    const { process } = await webContainerEngine.spawn({
      command: "jsh",
      args: [],
      env: { TERM: "xterm-256color" },
    });
    return process;
  }

  private addLine(sessionId: string, line: TerminalLine): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.history.push(line);
    if (session.history.length > 5000)
      session.history.splice(0, session.history.length - 5000);
    for (const l of this.outputListeners) {
      try {
        l(sessionId, line);
      } catch {
        /* noop */
      }
    }
  }

  private getSession(sessionId: string): InternalSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Terminal session not found: ${sessionId}`);
    return session;
  }

  private toPublic(session: InternalSession): TerminalSession {
    const { process: _proc, writer: _writer, ...rest } = session;
    void _proc;
    void _writer;
    return rest;
  }
}

export const terminalManager = new TerminalManager();
