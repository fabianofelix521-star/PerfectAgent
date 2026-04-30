/**
 * Code Studio — AI-powered code generation workspace
 *
 * Tab 1: Chat & Preview (split pane — chat left, device-framed preview right)
 * Tab 2: Code & Deploy (file explorer + Monaco editor + terminal + deploy panel)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  MessageSquare,
  Send,
  Square,
  Paperclip,
  Trash2,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  ExternalLink,
  Loader2,
  ChevronDown,
  Copy,
  FolderOpen,
  FileCode2,
  Eye,
  Terminal as TerminalIcon,
  Rocket,
  Settings,
  Download,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { SplitPane } from "@/components/SplitPane";
import { ChatBubble } from "@/components/ChatBubble";
import {
  DeviceFrame,
  type DeviceType,
  DEVICES,
} from "@/components/DeviceFrame";
import { toast } from "@/components/Toast";
import {
  ensurePresetsRegistered,
  getRuntimeProviderSpec,
  useConfig,
} from "@/stores/config";
import {
  getModelOptions,
  getProviderOptions,
  resolveModelId,
  resolveProviderId,
  resolveRuntimeId,
} from "@/services/configSelectors";
import { createAdapter } from "@/services/adapters";
import { runAgentLoop, type AgentEvent } from "@/services/agentLoop";
import {
  previewManager,
  flattenProjectToSrcDoc,
  prewarmWebContainer,
} from "@/services/previewManager";
import { webContainerService } from "@/services/webcontainer";
import {
  dispatchToPantheon,
  extractTags,
  pantheonContextFor,
} from "@/services/morpheusBridge";
import { MorpheusPanel } from "@/components/MorpheusPanel";
import { SupremeCoordinatorPanel } from "@/components/SupremeCoordinatorPanel";
import type { ChatMessageV2, ProjectFile } from "@/types";
import { cn } from "@/utils/cn";

/* ============================================================ helpers */

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function guessLanguage(path: string): string {
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

/* ============================================================ main component */

type MainTab = "chat-preview" | "code-deploy";
type Device = DeviceType;

export function CodeStudioPage() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("chat-preview");
  const [projectName, setProjectName] = useState("Untitled Project");
  const projects = useConfig((s) => s.projects);
  const activeProjectId = useConfig((s) => s.activeProjectId);
  const activeProject = projects.find((project) => project.id === activeProjectId);

  async function exportActiveProject() {
    if (!activeProject) {
      toast.error("Gere ou abra um projeto antes de exportar.");
      return;
    }
    const zip = new JSZip();
    for (const file of activeProject.files) zip.file(file.path, file.content);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeProject.name || "project"}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Projeto exportado.");
  }

  return (
    <section className="chat-surface app-scrollbar fx-fade-in flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/70 lg:rounded-[28px]">
      {/* ---- Top Bar ---- */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/60 px-4 py-2">
        <div className="flex items-center gap-3">
          <Code2 className="h-4 w-4 text-slate-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Code Studio
          </span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="max-w-[200px] bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder-slate-400"
            placeholder="Project name"
          />
        </div>

        <div className="flex items-center gap-1 rounded-full bg-white/55 p-1 shadow-inner">
          <TabButton
            active={mainTab === "chat-preview"}
            onClick={() => setMainTab("chat-preview")}
            icon={MessageSquare}
            label="Chat & Preview"
          />
          <TabButton
            active={mainTab === "code-deploy"}
            onClick={() => setMainTab("code-deploy")}
            icon={Code2}
            label="Code & Deploy"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <TopBarButton
            icon={Plus}
            tooltip="New Project"
            onClick={() => {
              setProjectName("Untitled Project");
              useConfig.getState().setActiveProject(undefined);
              previewManager.reset();
            }}
          />
          <TopBarButton
            icon={Download}
            tooltip="Export ZIP"
            onClick={() => void exportActiveProject()}
          />
          <TopBarButton
            icon={Settings}
            tooltip="Settings"
            onClick={() => navigate("/settings/code-studio")}
          />
        </div>
      </div>

      {/* ---- Tab Content ---- */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {mainTab === "chat-preview" ? (
          <ChatPreviewTab projectName={projectName} />
        ) : (
          <CodeDeployTab />
        )}
      </div>
    </section>
  );
}

/* ============================================================ Tab Buttons */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
        active
          ? "bg-[#17172d] text-white shadow"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TopBarButton({
  icon: Icon,
  tooltip,
  onClick,
}: {
  icon: typeof Plus;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/60 hover:text-slate-800"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* ============================================================ Compact Select */

function CompactSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[120px] truncate rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-300"
    >
      {placeholder && !value && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ============================================================ Tab 1: Chat & Preview */

function ChatPreviewTab({ projectName }: { projectName: string }) {
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
  const runtimes = useConfig((s) => s.runtimes);
  const skills = useConfig((s) => s.skills);
  const settings = useConfig((s) => s.settings);
  const sel = useConfig((s) => s.studioSelection);
  const setSel = useConfig((s) => s.setStudioSelection);
  const threads = useConfig((s) => s.studioThreads);
  const activeThreadId = useConfig((s) => s.activeStudioThreadId);
  const addThread = useConfig((s) => s.addStudioThread);
  const setActiveThread = useConfig((s) => s.setActiveStudioThread);
  const appendMsg = useConfig((s) => s.appendStudioMessage);
  const patchMsg = useConfig((s) => s.patchStudioMessage);
  const clearThread = useConfig((s) => s.clearStudioThread);
  const projects = useConfig((s) => s.projects);
  const activeProjectId = useConfig((s) => s.activeProjectId);
  const upsertProject = useConfig((s) => s.upsertProject);
  const setActiveProject = useConfig((s) => s.setActiveProject);

  // Resolved pickers
  const providerOptions = useMemo(
    () => getProviderOptions(providers),
    [providers],
  );
  const resolvedProviderId = useMemo(
    () =>
      resolveProviderId(sel.providerId, settings.defaultProviderId, providers),
    [sel.providerId, settings.defaultProviderId, providers],
  );
  const modelOptions = useMemo(
    () => getModelOptions(resolvedProviderId, providers, models),
    [resolvedProviderId, providers, models],
  );
  const resolvedModelId = useMemo(
    () =>
      resolveModelId(
        sel.model,
        settings.defaultModelId,
        resolvedProviderId,
        providers,
        models,
      ),
    [sel.model, settings.defaultModelId, resolvedProviderId, providers, models],
  );
  const resolvedRuntimeId = useMemo(
    () => resolveRuntimeId(sel.runtimeId, settings.defaultRuntimeId, runtimes),
    [sel.runtimeId, settings.defaultRuntimeId, runtimes],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId],
  );
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );

  // Local state
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatMessageV2["attachments"]>(
    [],
  );
  const [streaming, setStreaming] = useState(false);
  const [device, setDevice] = useState<Device>("laptop");
  const [previewKey, setPreviewKey] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const stopRef = useRef<(() => void) | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Preview state from manager
  const [previewState, setPreviewState] = useState(() =>
    previewManager.getState(),
  );
  useEffect(() => previewManager.subscribe(setPreviewState), []);

  // Pre-warm WebContainer
  useEffect(() => {
    void prewarmWebContainer();
  }, []);

  // Ensure a thread exists
  useEffect(() => {
    ensurePresetsRegistered();
    if (threads.length === 0) {
      const t = {
        id: `st-${uid()}`,
        title: "Code Studio",
        skillIds: [],
        messages: [],
        createdAt: Date.now(),
      };
      addThread(t);
      setActiveThread(t.id);
    }
  }, [threads.length, addThread, setActiveThread]);

  // Auto-scroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [activeThread?.messages.length]);

  // Elapsed timer
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(
      () => setElapsed(Date.now() - (previewState.startedAt || Date.now())),
      250,
    );
    return () => clearInterval(id);
  }, [streaming, previewState.startedAt]);

  // Auto-grow textarea
  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  // File attachment
  async function handleAttach(fileList: FileList | null) {
    if (!fileList) return;
    const next: NonNullable<ChatMessageV2["attachments"]> = [];
    for (const f of Array.from(fileList)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, size: f.size, type: f.type, dataUrl });
    }
    setAttachments((cur) => [...(cur ?? []), ...next]);
  }

  // Send message
  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const thread = activeThread!;
    setInput("");
    setAttachments([]);

    // User message
    const userMsg: ChatMessageV2 = {
      id: `u-${uid()}`,
      role: "user",
      content: text,
      attachments: attachments?.length ? attachments : undefined,
      createdAt: Date.now(),
    };
    appendMsg(thread.id, userMsg);

    // Assistant placeholder
    const assistantId = `a-${uid()}`;
    appendMsg(thread.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      providerId: resolvedProviderId,
      modelId: resolvedModelId,
      runtimeId: resolvedRuntimeId,
    });

    setStreaming(true);
    setElapsed(0);

    // Start preview cycle
    const now = Date.now();
    const projectId = activeProject?.id ?? `prj-${uid()}`;
    previewManager.startCycle(projectId);

    // Resolve provider spec
    const spec = resolvedProviderId
      ? getRuntimeProviderSpec(resolvedProviderId)
      : undefined;
    if (!spec || !resolvedModelId) {
      patchMsg(thread.id, assistantId, {
        streaming: false,
        content:
          "Configure um provedor e modelo em Configuracoes para gerar projetos.",
      });
      setStreaming(false);
      previewManager.reset();
      return;
    }

    // Build system context from skills
    const activeSkills = skills.filter(
      (sk) => sk.enabled || (sel.skillIds ?? []).includes(sk.id),
    );
    const skillContext = activeSkills.length
      ? activeSkills
          .map((sk) => `# ${sk.name}\n${sk.systemPrompt}`)
          .join("\n\n---\n\n")
      : undefined;

    const ctrl = new AbortController();
    let userStopped = false;
    stopRef.current = () => {
      userStopped = true;
      ctrl.abort();
    };

    let streamedContent = "";

    // Route the prompt through the Pantheon (auction only — no LLM call).
    // The winning agent's soulPrompt becomes additional system context for
    // the SINGLE streamChat owned by runAgentLoop. Running a second stream
    // here caused the backend to abort one of the two SSE connections, which
    // surfaced as "This operation was aborted" in the chat.
    const tags = extractTags(text);
    let pantheonContext: string | undefined;
    try {
      const { winner, task: routerTask } = await dispatchToPantheon(text, {
        tags,
        timeoutMs: 1200,
        onEvent: (ev) => {
          if (ev.kind === "posted") {
            previewManager.appendLog(
              `[morpheus] task ${ev.task.id} posted [${tags.join(", ")}]`,
            );
          } else if (ev.kind === "assigned" && ev.agentName) {
            previewManager.appendLog(`[morpheus] auctioned to ${ev.agentName}`);
            streamedContent =
              `🎭 **Pantheon → ${ev.agentName}** assumiu (\`${ev.task.id}\`)\n\n` +
              streamedContent;
            patchMsg(thread.id, assistantId, {
              content: streamedContent,
              streaming: true,
            });
          } else if (ev.kind === "failed") {
            previewManager.appendLog(`[morpheus] task ${ev.task.id} failed`);
          }
        },
      });
      pantheonContext = pantheonContextFor(winner);
      if (!winner) {
        previewManager.appendLog(
          `[morpheus] no agent bid on ${routerTask.id} — proceeding without persona`,
        );
      }
    } catch (err) {
      previewManager.appendLog(
        `[morpheus] router failed: ${(err as Error).message}`,
      );
    }

    const systemContext =
      [pantheonContext, skillContext].filter(Boolean).join("\n\n---\n\n") ||
      undefined;

    try {
      // Use adapter if runtime available, otherwise direct agent loop
      const runtime =
        runtimes.find((r) => r.id === resolvedRuntimeId) ?? runtimes[0];
      const adapter = runtime ? createAdapter(runtime) : null;
      const generate = adapter
        ? adapter.generateProject.bind(adapter)
        : runAgentLoop;

      const result = await generate({
        request: text,
        spec,
        model: resolvedModelId,
        systemContext,
        maxIterations: 6,
        signal: ctrl.signal,
        onEvent: (ev: AgentEvent) => {
          previewManager.appendLog(`[${ev.phase}] ${ev.message}`);
          if (ev.phase === "streaming" || ev.phase === "parsing") {
            streamedContent += `\n> ${ev.message}\n`;
          } else if (ev.phase === "writing-files") {
            streamedContent += `\n${ev.message}\n`;
          } else if (ev.phase === "installing") {
            streamedContent += `\n${ev.message}\n`;
          } else if (ev.phase === "starting-server") {
            streamedContent += `\n${ev.message}\n`;
          } else if (ev.phase === "preview-ready") {
            streamedContent += `\n${ev.message}\n`;
          } else if (ev.phase === "debugging") {
            streamedContent += `\n${ev.message}\n`;
          }
          patchMsg(thread.id, assistantId, {
            content: streamedContent,
            streaming: true,
          });
        },
        onFiles: (generatedFiles) => {
          // Update project in store
          const project = {
            id: projectId,
            name: projectName,
            description: text,
            files: generatedFiles,
            activeFile: generatedFiles[0]?.path,
            createdAt: now,
            updatedAt: Date.now(),
          };
          upsertProject(project);
          setActiveProject(projectId);

          // Track 1: static preview
          const srcDoc = flattenProjectToSrcDoc(generatedFiles, projectName);
          if (srcDoc) {
            previewManager.setStatic(srcDoc);
          }
        },
        onToken: (delta) => {
          streamedContent += delta;
          patchMsg(thread.id, assistantId, {
            content: streamedContent,
            streaming: true,
          });
        },
      });

      // Finalize
      const errMsg = result.error ?? "";
      const summary = result.ok
        ? `Projeto gerado em ${result.iterations} iteracao(oes). ${result.previewUrl ? "Preview ao vivo ativo." : "Preview estatico ativo."}`
        : userStopped
          ? "Geração cancelada pelo usuário."
          : `❌ Falhou: ${errMsg || "erro desconhecido"}`;

      streamedContent += `\n\n---\n${summary}`;
      patchMsg(thread.id, assistantId, {
        streaming: false,
        content: streamedContent,
        error: result.ok || userStopped ? undefined : errMsg,
      });

      if (!result.ok && !userStopped && !previewState.staticSrcDoc) {
        previewManager.setError(result.error ?? "Generation failed");
      }
    } catch (err) {
      const msg = (err as Error).message;
      patchMsg(thread.id, assistantId, {
        streaming: false,
        error: userStopped ? undefined : msg,
        content: userStopped
          ? streamedContent || "Geração cancelada pelo usuário."
          : `${streamedContent}${streamedContent ? "\n\n---\n" : ""}❌ Erro: ${msg}`,
      });
      if (!userStopped) previewManager.setError(msg);
    } finally {
      setStreaming(false);
      stopRef.current = null;
    }
  }

  function handleStop() {
    stopRef.current?.();
    stopRef.current = null;
    setStreaming(false);
  }

  // Preview iframe source
  const iframeUrl = previewState.liveUrl ?? previewState.url;
  const iframeSrcDoc = iframeUrl ? undefined : previewState.staticSrcDoc;

  // Format elapsed
  const elapsedStr =
    elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;
  const previewBadge =
    previewState.mode === "webcontainer"
      ? { label: "Live", color: "bg-emerald-500" }
      : previewState.mode === "static-iframe"
        ? { label: "Static", color: "bg-blue-500" }
        : null;

  return (
    <SplitPane
      storageKey="cs-chat-preview"
      defaultRatio={0.35}
      minRatio={0.2}
      maxRatio={0.6}
      minLeftPx={280}
      minRightPx={400}
      left={
        <div className="flex h-full flex-col overflow-hidden">
          {/* ---- Picker Row ---- */}
          <div className="shrink-0 border-b border-white/50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <CompactSelect
                value={resolvedProviderId ?? ""}
                onChange={(v) =>
                  setSel({
                    providerId: v,
                    model: getModelOptions(v, providers, models)[0]?.id,
                  })
                }
                options={providerOptions.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder="Provider"
              />
              <CompactSelect
                value={resolvedModelId ?? ""}
                onChange={(v) => setSel({ model: v })}
                options={modelOptions.map((m) => ({
                  value: m.id,
                  label: m.label,
                }))}
                placeholder="Model"
              />
              <CompactSelect
                value={resolvedRuntimeId ?? ""}
                onChange={(v) => setSel({ runtimeId: v })}
                options={runtimes.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Runtime"
              />
              {streaming && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {elapsedStr}
                </span>
              )}
            </div>
          </div>

          {/* ---- Pantheon Strip ---- */}
          <details className="shrink-0 border-b border-white/50 bg-white/30 px-3 py-1.5">
            <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700">
              🎭 Morpheus · Pantheon (12 agentes ligados ao chat & builder)
            </summary>
            <div className="mt-2 max-h-[40vh] overflow-y-auto pr-1">
              <MorpheusPanel />
            </div>
          </details>

          {/* ---- Supreme Coordinator Strip ---- */}
          <details className="shrink-0 border-b border-white/50 bg-white/30 px-3 py-1.5">
            <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700">
              👑 Supreme Coordinator · Swarm (15 supervisores · agentes em TS)
            </summary>
            <div className="mt-2 max-h-[50vh] overflow-y-auto pr-1">
              <SupremeCoordinatorPanel />
            </div>
          </details>

          {/* ---- Messages ---- */}
          <div
            ref={scrollerRef}
            className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2"
          >
            {(activeThread?.messages ?? []).length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 shadow-sm">
                  <Code2 className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  Start a conversation to generate a project
                </p>
                <p className="text-xs text-slate-400">
                  Ex: "Create a Vite + React dashboard with charts"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeThread?.messages.map((msg, idx) => (
                  <ChatBubble key={msg.id} message={msg} index={idx} compact />
                ))}
              </div>
            )}
          </div>

          {/* ---- Attachments ---- */}
          {attachments && attachments.length > 0 && (
            <div className="shrink-0 flex flex-wrap gap-1.5 border-t border-white/50 px-3 py-1.5">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                >
                  <Paperclip className="h-2.5 w-2.5" /> {a.name}
                  <button
                    onClick={() =>
                      setAttachments(attachments.filter((_, j) => j !== i))
                    }
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ---- Input Bar ---- */}
          <div className="shrink-0 border-t border-white/60 p-3">
            <div className="flex gap-2">
              <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/60 hover:text-slate-700">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAttach(e.target.files)}
                />
              </label>
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe what you want to build..."
                rows={1}
                disabled={streaming}
                className="app-scrollbar min-h-[36px] flex-1 resize-none rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-300 focus:outline-none disabled:opacity-50"
              />
              {streaming ? (
                <button
                  onClick={handleStop}
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-rose-500 text-white shadow hover:bg-rose-600"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-[#17172d] text-white shadow hover:bg-slate-800 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
              {activeThread && activeThread.messages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Clear chat?")) clearThread(activeThread.id);
                  }}
                  title="Clear chat"
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      }
      right={
        <div className="flex h-full flex-col overflow-hidden">
          {/* ---- Device Frame Bar ---- */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/50 px-3 py-1.5">
            <div className="flex items-center gap-0.5">
              {(["iphone17", "ipad", "laptop"] as Device[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  title={DEVICES[d].label}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs transition",
                    device === d
                      ? "bg-white/80 text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {d === "laptop" ? (
                    <Monitor className="h-3.5 w-3.5" />
                  ) : d === "ipad" ? (
                    <Tablet className="h-3.5 w-3.5" />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5" />
                  )}
                </button>
              ))}
              {iframeUrl && (
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in browser"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/60 hover:text-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* URL bar */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-white/50 bg-white/40 px-2 py-1">
              <span className="truncate text-[11px] font-mono text-slate-500">
                {iframeUrl ?? "No preview URL"}
              </span>
              {iframeUrl && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(iframeUrl);
                    toast.success("Copied");
                  }}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              title="Refresh preview"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/60 hover:text-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Badge + Timer */}
            {previewBadge && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                  previewBadge.color,
                )}
              >
                {previewBadge.label}
              </span>
            )}
            {streaming && (
              <span className="text-[10px] font-mono font-bold text-slate-500">
                T+{elapsedStr}
              </span>
            )}
          </div>

          {/* ---- Preview Area ---- */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100/50">
            {iframeSrcDoc || iframeUrl ? (
              <DeviceFrame device={device} className="h-full w-full">
                <iframe
                  key={previewKey}
                  src={iframeUrl}
                  srcDoc={iframeSrcDoc}
                  title="Preview"
                  className="h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  style={{ background: "#fff" }}
                />
              </DeviceFrame>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Eye className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">
                  Start a conversation to generate a project
                </p>
                <p className="text-xs text-slate-300">or choose a template</p>
              </div>
            )}

            {/* Console panel */}
            {previewState.errors.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <button
                  onClick={() => setConsoleOpen(!consoleOpen)}
                  className="flex w-full items-center gap-2 bg-rose-950/90 px-3 py-1.5 text-[11px] font-bold text-rose-200 backdrop-blur"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {previewState.errors.length} error(s)
                  <ChevronDown
                    className={cn(
                      "ml-auto h-3 w-3 transition",
                      consoleOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {consoleOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 160 }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-slate-950/95 backdrop-blur"
                    >
                      <div className="h-40 overflow-y-auto p-2">
                        {previewState.errors.map((err, i) => (
                          <p
                            key={i}
                            className="font-mono text-[10px] leading-4 text-rose-300"
                          >
                            {err}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}

/* ============================================================ Tab 2: Code & Deploy */

function CodeDeployTab() {
  const projects = useConfig((s) => s.projects);
  const activeProjectId = useConfig((s) => s.activeProjectId);
  const updateProjectFile = useConfig((s) => s.updateProjectFile);
  const setStoreActiveFile = useConfig((s) => s.setActiveFile);
  const addDeploy = useConfig((s) => s.addDeploy);
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );

  const [activeFile, setActiveFile] = useState<string | undefined>();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [deployTarget, setDeployTarget] = useState("Vercel");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "Welcome to Code Studio terminal.",
  ]);
  const [terminalInput, setTerminalInput] = useState("");

  // Sync files from project
  useEffect(() => {
    if (activeProject) {
      setFiles(activeProject.files);
      setActiveFile(activeProject.activeFile ?? activeProject.files[0]?.path);
    }
  }, [activeProject]);

  const activeFileContent = useMemo(
    () => files.find((f) => f.path === activeFile)?.content ?? "",
    [files, activeFile],
  );

  function handleEditorChange(value: string | undefined) {
    if (value === undefined || !activeFile || !activeProject) return;
    setFiles((cur) =>
      cur.map((f) => (f.path === activeFile ? { ...f, content: value } : f)),
    );
    updateProjectFile(activeProject.id, activeFile, value);
    if (webContainerService.isSupported()) {
      webContainerService.writeFile(activeFile, value).catch((err: unknown) => {
        setTerminalLines((cur) =>
          [...cur, `Write failed: ${(err as Error).message}`].slice(-200),
        );
      });
    }
  }

  function selectFile(path: string) {
    setActiveFile(path);
    if (activeProject) setStoreActiveFile(activeProject.id, path);
  }

  function handleDeploy() {
    if (!activeProject) {
      toast.error("Gere ou abra um projeto antes do deploy.");
      return;
    }
    const record = {
      id: `dep-${Date.now().toString(36)}`,
      target: deployTarget,
      status: "failed" as const,
      at: Date.now(),
      log: `${deployTarget} não possui credenciais/endpoints configurados nesta instalação local. Exporte o ZIP ou conecte uma integração primeiro.`,
    };
    addDeploy(record);
    toast.error("Deploy externo não configurado. Registro salvo no histórico.");
  }

  async function handleTerminalSubmit() {
    const cmd = terminalInput.trim();
    if (!cmd) return;
    setTerminalLines((cur) => [...cur, `$ ${cmd}`]);
    setTerminalInput("");

    if (!webContainerService.isSupported()) {
      setTerminalLines((cur) => [...cur, "WebContainer not available"]);
      return;
    }

    try {
      const boot = await webContainerService.boot();
      if (!boot.ok) {
        setTerminalLines((cur) => [...cur, `Error: ${boot.error}`]);
        return;
      }
      const proc = await webContainerService.spawn("sh", ["-c", cmd]);
      const off = webContainerService.onLog((chunk) => {
        setTerminalLines((cur) => [...cur, chunk.trim()].slice(-200));
      });
      await proc.exit;
      off();
    } catch (err) {
      setTerminalLines((cur) => [...cur, `Error: ${(err as Error).message}`]);
    }
  }

  return (
    <SplitPane
      storageKey="cs-code-deploy"
      defaultRatio={0.6}
      minRatio={0.3}
      maxRatio={0.75}
      minLeftPx={320}
      minRightPx={280}
      left={
        <div className="flex h-full overflow-hidden">
          {/* File Tree */}
          <div className="app-scrollbar w-48 shrink-0 overflow-y-auto border-r border-white/50 bg-white/30 py-2">
            <p className="mb-1 flex items-center gap-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <FolderOpen className="h-3 w-3" /> Files
            </p>
            {files.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-slate-400">
                No files yet
              </p>
            ) : (
              files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => selectFile(f.path)}
                  className={cn(
                    "flex w-full items-center gap-1.5 truncate px-3 py-1 text-left text-[11px] transition",
                    activeFile === f.path
                      ? "bg-white/70 font-semibold text-slate-900"
                      : "text-slate-600 hover:bg-white/50",
                  )}
                >
                  <FileCode2 className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{f.path.split("/").pop()}</span>
                </button>
              ))
            )}
          </div>

          {/* Monaco Editor */}
          <div className="min-w-0 flex-1">
            {files.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Code2 className="h-12 w-12 text-slate-200" />
                <p className="text-sm text-slate-400">
                  Generate a project first
                </p>
              </div>
            ) : (
              <Editor
                height="100%"
                path={activeFile}
                language={guessLanguage(activeFile ?? "")}
                value={activeFileContent}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  renderWhitespace: "none",
                  padding: { top: 12, bottom: 12 },
                }}
                onChange={handleEditorChange}
              />
            )}
          </div>
        </div>
      }
      right={
        <div className="flex h-full flex-col overflow-hidden">
          {/* Deploy Section */}
          <div className="shrink-0 border-b border-white/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-700">Deploy</span>
            </div>
            <CompactSelect
              value={deployTarget}
              onChange={setDeployTarget}
              options={[
                "Vercel",
                "Netlify",
                "GitHub Pages",
                "Docker",
                "Custom",
              ].map((t) => ({ value: t, label: t }))}
              placeholder="Target"
            />
            <button
              type="button"
              onClick={handleDeploy}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#17172d] px-3 py-2 text-xs font-bold text-white shadow hover:bg-slate-800"
            >
              <Rocket className="h-3.5 w-3.5" /> Deploy
            </button>
          </div>

          {/* Terminal Section */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/50 px-3 py-1.5">
              <TerminalIcon className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600">
                Terminal
              </span>
              <div className="ml-auto flex gap-1">
                {["npm install", "npm run dev", "npm run build"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setTerminalInput(cmd);
                    }}
                    className="rounded-md bg-white/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-white/80"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
            <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-950 p-2">
              {terminalLines.map((line, i) => (
                <p
                  key={i}
                  className="font-mono text-[10px] leading-4 text-emerald-300"
                >
                  {line}
                </p>
              ))}
            </div>
            <div className="shrink-0 flex border-t border-white/10 bg-slate-900">
              <span className="flex items-center pl-2 text-emerald-400">$</span>
              <input
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTerminalSubmit();
                }}
                placeholder="Type a command..."
                className="flex-1 bg-transparent px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none placeholder-slate-600"
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
