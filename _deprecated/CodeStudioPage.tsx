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
  Rocket,
  FolderTree,
  FilePlus,
  FileX,
  FileCog,
  Sparkles,
  ExternalLink,
  Wand2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Terminal,
  ChevronDown,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  WorkspaceShell,
  Surface,
  SectionTitle,
  SelectControl,
  EditableField,
  Modal,
  Spinner,
  StatusBadge,
  confirmDialog,
} from "@/components/ui";
import {
  useConfig,
  getIntegrationDecoded,
  getRuntimeProviderSpec,
} from "@/stores/config";
import { api } from "@/services/api";
import { createAdapter } from "@/services/adapters";
import {
  getModelOptions,
  getProviderOptions,
  providerIsUsable,
  resolveModelId,
  resolveProviderId,
  resolveRuntimeId,
} from "@/services/configSelectors";
import { toast } from "@/components/Toast";
import { runAgentPipeline, type PipelineEvent } from "@/services/agentPipeline";
import { webContainerService } from "@/services/webcontainer";
import {
  previewManager,
  flattenProjectToSrcDoc,
  prewarmWebContainer,
  type PreviewState,
} from "@/services/previewManager";
import type { FileSystemTree } from "@/services/webcontainer";
import {
  createDeterministicProjectFiles,
  createImmediatePreviewProject,
  extractProjectArtifactFromAssistantOutput,
  isProjectBuildRequest,
  mergeProjectFiles,
} from "@/services/projectArtifacts";
import { eventBus } from "@/services/eventBus";
import { ChatBubble } from "@/components/ChatBubble";
import { SplitPane } from "@/components/SplitPane";
import { CodeStudioTestSuite } from "@/pages/CodeStudioTestSuite";
import type {
  ChatMessageV2,
  StudioProject,
  ProjectFile,
  DeployRecord,
} from "@/types";
import { cn } from "@/utils/cn";

type Tab = "chat" | "editor" | "tests";
const DEPLOY_TARGETS = [
  "Vercel",
  "Netlify",
  "Cloudflare Pages",
  "Render",
  "Railway",
  "Fly.io",
  "AWS Amplify",
];

export function CodeStudioPage() {
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" &&
    window.location.pathname.includes("/code-studio/test-suite")
      ? "tests"
      : "chat",
  );
  return (
    <WorkspaceShell
      eyebrow="Code Studio"
      title="Construa apps com agentes em tempo real"
      description="Converse com o agente, gere projetos completos, edite no Monaco e faça deploy."
      action={
        <div className="flex gap-2 rounded-full bg-white/55 p-1 shadow-inner">
          <button
            onClick={() => setTab("chat")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
              tab === "chat" ? "bg-[#17172d] text-white" : "text-slate-600",
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Chat & Preview
          </button>
          <button
            onClick={() => setTab("editor")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
              tab === "editor" ? "bg-[#17172d] text-white" : "text-slate-600",
            )}
          >
            <Code2 className="h-4 w-4" />
            Editor & Deploy
          </button>
          <button
            onClick={() => setTab("tests")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
              tab === "tests" ? "bg-[#17172d] text-white" : "text-slate-600",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Test Suite
          </button>
        </div>
      }
    >
      {tab === "chat" ? (
        <ChatPreviewTab />
      ) : tab === "editor" ? (
        <EditorDeployTab />
      ) : (
        <CodeStudioTestSuite />
      )}
    </WorkspaceShell>
  );
}

/* ===================================================================== Chat tab */

function ChatPreviewTab() {
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
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

  const allProviders = useMemo(
    () => getProviderOptions(providers, true),
    [providers],
  );
  const providerId = resolveProviderId(
    sel.providerId,
    settings.defaultProviderId,
    providers,
  );
  const providerCfg = providerId ? providers[providerId] : undefined;
  const modelOptions = getModelOptions(providerId, providers, models);
  const model = resolveModelId(
    sel.model,
    settings.defaultModelId,
    providerId,
    providers,
    models,
  );

  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatMessageV2["attachments"]>(
    [],
  );
  const [streaming, setStreaming] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [previewKey, setPreviewKey] = useState(0);
  const [logsOpen, setLogsOpen] = useState(false);
  const [previewNow, setPreviewNow] = useState(() => Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingProjectBrief] = useState("");
  const agentMode = Boolean(sel.agentMode);
  const [agentEvents, setAgentEvents] = useState<PipelineEvent[]>([]);
  const [agentRunning, setAgentRunning] = useState(false);
  // Live preview URL is owned by previewManager; no local state needed.
  const agentAbortRef = useRef<AbortController | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(() =>
    previewManager.getState(),
  );

  useEffect(() => {
    const id = window.setInterval(() => setPreviewNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Pre-warm the WebContainer the first time Code Studio is mounted so the
  // dev server is ready to mount + install as soon as the user generates.
  useEffect(() => {
    void prewarmWebContainer();
  }, []);

  // Single source of truth for the preview iframe.
  useEffect(() => previewManager.subscribe(setPreviewState), []);

  // Whenever active project files change, refresh the static srcdoc track.
  useEffect(() => {
    if (!activeProject) return;
    const srcDoc = flattenProjectToSrcDoc(
      activeProject.files,
      activeProject.name,
    );
    if (srcDoc) previewManager.setStatic(srcDoc);
  }, [activeProject?.id, activeProject?.files, activeProject?.name]);

  function beginGenerationPreview(text: string): StudioProject {
    const now = Date.now();
    eventBus.startRun(`run-${now.toString(36)}`);
    const cfg = useConfig.getState();
    const current = cfg.projects.find(
      (project) => project.id === cfg.activeProjectId,
    );
    const shell = createImmediatePreviewProject(text, {
      id: current?.id ?? `prj-${now.toString(36)}`,
      now,
    });
    const deterministicFiles = createDeterministicProjectFiles(text);
    const files = deterministicFiles.length ? deterministicFiles : shell.files;
    const next: StudioProject = current
      ? {
          ...current,
          name: shell.name,
          description: text,
          files: mergeProjectFiles([], files),
          activeFile: files[0]?.path ?? "index.html",
          updatedAt: now,
        }
      : { ...shell, files, activeFile: files[0]?.path ?? "index.html" };

    cfg.upsertProject(next);
    previewManager.startCycle(next.id, now);
    previewManager.prepareProject(
      next,
      "Creating minimal runnable project shell...",
    );
    eventBus.emit("filesWritten", { count: next.files.length });
    return next;
  }

  function mountGeneratedFiles(
    files: ProjectFile[],
    prompt: string,
    projectId?: string,
  ) {
    if (files.length === 0) return;
    const cfg = useConfig.getState();
    const targetId = projectId ?? cfg.activeProjectId;
    const current = targetId
      ? cfg.projects.find((project) => project.id === targetId)
      : undefined;
    const now = Date.now();
    const next: StudioProject = current
      ? {
          ...current,
          files: mergeProjectFiles(current.files, files),
          activeFile: current.activeFile ?? files[0]?.path,
          updatedAt: now,
        }
      : {
          id: `prj-${now.toString(36)}`,
          name: prompt.slice(0, 48) || "Generated project",
          description: prompt,
          files: mergeProjectFiles([], files),
          activeFile: files[0]?.path,
          createdAt: now,
          updatedAt: now,
        };

    cfg.upsertProject(next);
    eventBus.emit("filesWritten", { count: next.files.length });
    const srcDoc = flattenProjectToSrcDoc(next.files, next.name);
    if (srcDoc)
      previewManager.setStatic(srcDoc, {
        mode: "static-iframe",
        message: "Generated HTML mounted into preview",
      });
    else if (previewManager.getState().mode !== "webcontainer")
      previewManager.prepareProject(
        next,
        "Generated files mounted. Showing static fallback while runtime boots.",
      );
    else
      previewManager.appendLog(
        `${next.files.length} generated files mounted. Live runtime continues booting.`,
      );
  }

  function applyAssistantArtifacts(
    raw: unknown,
    prompt: string,
    projectId?: string,
  ) {
    const artifact = extractProjectArtifactFromAssistantOutput(raw, prompt);
    if (!artifact) return;
    if (previewManager.getState().status === "idle") {
      const now = Date.now();
      eventBus.startRun(`run-${now.toString(36)}`);
      previewManager.startCycle(projectId, now);
    }
    mountGeneratedFiles(artifact.files, prompt, projectId);
  }

  function buildLocalBuilderTranscript(
    project: StudioProject,
    reason?: string,
  ): string {
    const fileList = project.files.map((file) => file.path).join(", ");
    const visibleFiles = project.files
      .slice(0, 6)
      .map((file) => file.path)
      .join(", ");
    const summary = reason ?? "Preview aberto e runtime iniciado em paralelo.";
    const final = [
      `## ${project.name}`,
      "Codigo gerado e montado no preview. O iframe ja mostra o primeiro frame jogavel/visual enquanto o runtime ao vivo sobe em paralelo.",
      `**Arquivos:** ${visibleFiles}${project.files.length > 6 ? "..." : ""}`,
      summary,
    ].join("\n\n");
    return [
      `plan ${JSON.stringify({ output: { plan: { summary: "Pedido de build detectado. Pipeline preview-first selecionado." } }, status: "ok" })}`,
      `act ${JSON.stringify({ output: { act: { summary: `${project.files.length} arquivos escritos no projeto.`, content: `Arquivos: ${fileList}` } }, status: "ok" })}`,
      `verify ${JSON.stringify({ output: { verify: { summary: "Primeiro frame aberto no iframe; runtime continua em paralelo." } }, status: "ok" })}`,
      "",
      final,
    ].join("\n");
  }

  async function startDeterministicRuntimePreview(project: StudioProject) {
    const packageFile = project.files.find(
      (file) => file.path === "package.json",
    );
    if (!packageFile) {
      eventBus.endRun("ok", { mode: "static-only" });
      return;
    }
    if (!webContainerService.isSupported()) {
      previewManager.appendLog(
        "WebContainer unavailable in this browser. Static preview remains active.",
      );
      eventBus.endRun("ok", {
        mode: "static-fallback",
        runtime: "unsupported",
      });
      return;
    }

    const started = Date.now();
    previewManager.setBooting("Starting deterministic runtime preview...");
    eventBus.emit("runtimeBootStarted", { source: "deterministic-project" });
    const offLog = webContainerService.onLog((chunk) => {
      const text = chunk.trim();
      if (text) previewManager.appendLog(text.slice(-500));
    });
    const offError = webContainerService.onPreviewError((error) => {
      previewManager.appendError(error.message);
    });

    try {
      const boot = await webContainerService.boot();
      if (!boot.ok) throw new Error(boot.error ?? "WebContainer boot failed");
      await webContainerService.mount(filesToWebContainerTree(project.files));
      const installStarted = Date.now();
      const installed = await webContainerService.installDeps(
        packageFile.content,
      );
      eventBus.emit("installFinished", {
        ms: Date.now() - installStarted,
        cached: installed.cached,
      });
      if (!installed.success)
        throw new Error(`npm install exited with ${installed.exitCode}`);
      const server = await webContainerService.startDevServer("dev");
      previewManager.setLive(server.url, server.port);
      eventBus.emit("serverReady", {
        url: server.url,
        port: server.port,
        ms: Date.now() - started,
      });
      eventBus.endRun("ok", { mode: "webcontainer" });
    } catch (err) {
      const message = (err as Error).message;
      previewManager.appendError(message);
      const state = previewManager.getState();
      if (!state.firstPreviewAt) previewManager.setError(message);
      else if (state.staticSrcDoc)
        previewManager.setStatic(state.staticSrcDoc, {
          mode: "fallback",
          message: "Static preview remains active; runtime did not finish.",
        });
      eventBus.endRun(state.firstPreviewAt ? "ok" : "error", {
        error: message,
      });
    } finally {
      offLog();
      offError();
    }
  }

  useEffect(() => {
    if (!activeThread) {
      addThread({
        id: `th-${Date.now().toString(36)}`,
        title: "Nova sessão",
        skillIds: [],
        messages: [],
        createdAt: Date.now(),
      });
    }
  }, [activeThread, addThread]);

  useEffect(() => {
    if (typeof scrollerRef.current?.scrollTo === "function") {
      scrollerRef.current.scrollTo({ top: 1e9, behavior: "smooth" });
    }
  }, [activeThread?.messages.length]);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  async function handleAttach(files: FileList | null) {
    if (!files) return;
    const next: NonNullable<ChatMessageV2["attachments"]> = [];
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, size: f.size, type: f.type, dataUrl });
    }
    setAttachments((cur) => [...(cur ?? []), ...next]);
  }

  function detectProjectIntent(text: string): boolean {
    return isProjectBuildRequest(text);
  }

  async function runAgent(
    text: string,
    thread: NonNullable<typeof activeThread>,
    assistantId: string,
    projectId?: string,
  ) {
    if (!providerIsUsable(providerCfg) || !model) return;
    let targetProjectId = projectId;
    if (!targetProjectId) targetProjectId = beginGenerationPreview(text).id;
    const spec = getRuntimeProviderSpec(providerCfg.id)!;
    const skills = useConfig.getState().skills;
    const selectedIds = useConfig.getState().studioSelection.skillIds;
    const activeSkills = skills.filter(
      (sk) => sk.enabled || selectedIds.includes(sk.id),
    );
    const systemContext = activeSkills.length
      ? activeSkills
          .map((sk) => `# ${sk.name}\n${sk.systemPrompt}`)
          .join("\n\n---\n\n")
      : undefined;

    const ctrl = new AbortController();
    agentAbortRef.current = ctrl;
    setAgentRunning(true);
    setAgentEvents([]);
    previewManager.setBooting("Planning and generating files...");

    // Resolve adapter for the active runtime so capability-aware code-gen routing kicks in.
    const cfg = useConfig.getState();
    const runtimeId = cfg.studioSelection.runtimeId;
    const runtime =
      cfg.runtimes.find((r) => r.id === runtimeId) ??
      cfg.runtimes.find((r) => r.isDefault) ??
      cfg.runtimes[0];
    const adapter = runtime ? createAdapter(runtime) : null;
    const generate = adapter
      ? adapter.generateProject.bind(adapter)
      : runAgentPipeline;
    let agentTranscript = "";
    const result = await generate({
      request: text,
      spec,
      model,
      systemContext,
      maxIterations: 6,
      signal: ctrl.signal,
      onEvent: (ev) => {
        const event = sanitizePipelineEvent(ev);
        setAgentEvents((cur) => [...cur, event]);
        previewManager.appendLog(`[${event.phase}] ${event.message}`);
        agentTranscript += pipelineEventToStageBlock(event);
        patchMsg(thread.id, assistantId, { content: agentTranscript });
        // Map pipeline phases to structured bus events.
        if (event.phase === "planning")
          eventBus.emit("planReady", { message: event.message });
        if (event.phase === "coding")
          eventBus.emit("actReady", { message: event.message });
        if (event.phase === "executing" || event.phase === "installing") {
          previewManager.setBooting(
            event.phase === "installing"
              ? "Installing dependencies..."
              : "Mounting files into runtime...",
          );
          eventBus.emit("runtimeBootStarted", { phase: event.phase });
        }
        if (event.phase === "installing" && event.level === "success")
          eventBus.emit("installFinished", {});
        if (event.phase === "complete")
          eventBus.emit("verifyReady", { message: event.message });
      },
      onFiles: (files) => {
        mountGeneratedFiles(files, text, targetProjectId);
      },
    });

    setAgentRunning(false);
    agentAbortRef.current = null;
    if (result.previewUrl) {
      previewManager.setLive(result.previewUrl);
    } else if (!result.ok) {
      const reason = result.error ?? "runtime unavailable";
      previewManager.appendError(reason);
      const current = previewManager.getState();
      if (!current.firstPreviewAt) previewManager.setError(reason);
      else if (current.staticSrcDoc)
        previewManager.setStatic(current.staticSrcDoc, {
          mode: "fallback",
          message: "Static preview mode - live runtime not ready yet.",
        });
    }
    const previewReady = Boolean(previewManager.getState().firstPreviewAt);
    eventBus.endRun(result.ok || previewReady ? "ok" : "error", {
      error: result.error,
    });
    const summary = result.ok
      ? `Projeto pronto em ${result.iterations} iteracao(oes). O preview ao vivo esta aberto.`
      : previewReady
        ? "Preview estatico aberto imediatamente. O runtime ao vivo nao substituiu a previa; detalhes ficam no console de preview."
        : `O preview ainda nao ficou pronto: ${result.error ?? "erro desconhecido"}`;
    const final = [
      result.ok ? "## Projeto gerado" : "## Preview preservado",
      summary,
      "Os detalhes de plan/act/verify ficam separados no Thinking; esta area e a resposta final do builder.",
    ].join("\n\n");
    agentTranscript += `verify ${JSON.stringify({ output: { verify: { summary } }, status: result.ok ? "ok" : "warn" })}\n`;
    patchMsg(thread.id, assistantId, {
      streaming: false,
      content: `${agentTranscript}\n${final}`,
    });
    setStreaming(false);
  }

  function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const thread = activeThread!;
    const userMsg: ChatMessageV2 = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      attachments: attachments?.length ? attachments : undefined,
      createdAt: Date.now(),
    };
    appendMsg(thread.id, userMsg);
    setInput("");
    setAttachments([]);

    const projectRequest = detectProjectIntent(text) || agentMode;
    const previewProject = projectRequest
      ? beginGenerationPreview(text)
      : undefined;

    if (projectRequest) {
      setAgentEvents([]);
      setAgentRunning(false);
      const assistantId = `a-${Date.now()}`;
      const hasUsableLlm = providerIsUsable(providerCfg) && Boolean(model);
      const shouldRunLlmAgent = agentMode && hasUsableLlm;
      appendMsg(thread.id, {
        id: assistantId,
        role: "assistant",
        content: shouldRunLlmAgent
          ? "Iniciando builder de projeto..."
          : buildLocalBuilderTranscript(
              previewProject!,
              hasUsableLlm
                ? "Builder deterministico concluido."
                : "Builder deterministico concluido. O preview e o runtime seguem independentes de LLM.",
            ),
        createdAt: Date.now(),
        streaming: shouldRunLlmAgent,
      });
      setStreaming(shouldRunLlmAgent);
      if (!shouldRunLlmAgent) {
        stopRef.current = null;
        void startDeterministicRuntimePreview(previewProject!);
        return;
      }
      stopRef.current = () => {
        agentAbortRef.current?.abort();
      };
      runAgent(text, thread, assistantId, previewProject?.id).catch((err) => {
        const message = String(err);
        const aborted = /aborted|aborterror/i.test(message);
        const state = previewManager.getState();
        const previewReady = Boolean(state.firstPreviewAt);
        patchMsg(thread.id, assistantId, {
          streaming: false,
          error: previewReady ? undefined : message,
          content: buildLocalBuilderTranscript(
            previewProject!,
            aborted
              ? "Code-gen cancelado; o preview estatico foi preservado."
              : `Pipeline LLM nao concluiu; o preview estatico foi preservado. ${message}`,
          ),
        });
        setStreaming(false);
        setAgentRunning(false);
        if (previewReady) previewManager.appendError(message);
        else previewManager.setError(message);
        eventBus.endRun(previewReady ? "ok" : "error", { error: message });
      });
      return;
    }

    if (!providerIsUsable(providerCfg) || !model) {
      appendMsg(thread.id, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: localNoProviderReply(text),
        createdAt: Date.now(),
        streaming: false,
      });
      return;
    }

    const assistantId = `a-${Date.now()}`;
    appendMsg(thread.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
    });

    const spec = getRuntimeProviderSpec(providerCfg.id)!;
    // Inject enabled skills + selected skills as system prompt
    const skills = useConfig.getState().skills;
    const selectedIds = useConfig.getState().studioSelection.skillIds;
    const activeSkills = skills.filter(
      (sk) => sk.enabled || selectedIds.includes(sk.id),
    );
    const systemMsgs = activeSkills.length
      ? [
          {
            role: "system" as const,
            content: activeSkills
              .map((sk) => `# ${sk.name}\n${sk.systemPrompt}`)
              .join("\n\n---\n\n"),
          },
        ]
      : [];
    const history = [
      ...systemMsgs,
      ...[...thread.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];
    setStreaming(true);
    let acc = "";
    const systemPrompt = activeSkills.length
      ? activeSkills
          .map((sk) => `# ${sk.name}\n${sk.systemPrompt}`)
          .join("\n\n---\n\n")
      : undefined;

    // Resolve selected runtime (one source of truth: useConfig.runtimes).
    const runtimeId = useConfig.getState().studioSelection.runtimeId;
    const runtime =
      useConfig.getState().runtimes.find((r) => r.id === runtimeId) ??
      useConfig.getState().runtimes.find((r) => r.isDefault) ??
      useConfig.getState().runtimes[0];

    const stop = { aborted: false };
    stopRef.current = () => {
      stop.aborted = true;
    };

    if (!runtime) {
      // No runtimes configured: pure LLM stream as last-resort fallback.
      stopRef.current = api.streamChat({
        spec,
        model,
        messages: history,
        onToken: (delta) => {
          acc += delta;
          patchMsg(thread.id, assistantId, { content: acc });
        },
        onDone: () => {
          applyAssistantArtifacts(acc, text, previewProject?.id);
          patchMsg(thread.id, assistantId, { streaming: false });
          setStreaming(false);
          stopRef.current = null;
          if (previewProject) eventBus.endRun("ok");
        },
        onError: (err) => {
          patchMsg(thread.id, assistantId, {
            streaming: false,
            error: err,
            content: acc || `_(erro: ${err})_`,
          });
          setStreaming(false);
          stopRef.current = null;
          if (previewProject) {
            previewManager.appendError(err);
            eventBus.endRun(
              previewManager.getState().firstPreviewAt ? "ok" : "error",
              { error: err },
            );
          }
          toast.error(`Stream falhou: ${err}`);
        },
      });
      return;
    }

    // Use adapter (capability-aware). All adapters fall back to direct LLM if needed.
    const adapter = createAdapter(runtime);
    const allMessages = [...thread.messages, userMsg];
    adapter
      .chat(allMessages, { spec, model, systemPrompt }, (chunk) => {
        if (stop.aborted) return;
        if (chunk.event === "token") {
          const d = (chunk.data as { delta?: string })?.delta ?? "";
          acc += d;
          patchMsg(thread.id, assistantId, { content: acc });
        } else if (chunk.event === "done") {
          applyAssistantArtifacts(acc, text, previewProject?.id);
          patchMsg(thread.id, assistantId, { streaming: false });
          setStreaming(false);
          stopRef.current = null;
          if (previewProject) eventBus.endRun("ok");
        } else if (chunk.event === "error") {
          const msg =
            (chunk.data as { message?: string })?.message ??
            "erro desconhecido";
          patchMsg(thread.id, assistantId, {
            streaming: false,
            error: msg,
            content: acc || `_(erro: ${msg})_`,
          });
          setStreaming(false);
          stopRef.current = null;
          if (previewProject) {
            previewManager.appendError(msg);
            eventBus.endRun(
              previewManager.getState().firstPreviewAt ? "ok" : "error",
              { error: msg },
            );
          }
          toast.error(`Runtime falhou: ${msg}`);
        }
      })
      .catch((err) => {
        patchMsg(thread.id, assistantId, {
          streaming: false,
          error: String(err),
        });
        setStreaming(false);
        stopRef.current = null;
        if (previewProject) {
          previewManager.appendError(String(err));
          eventBus.endRun(
            previewManager.getState().firstPreviewAt ? "ok" : "error",
            { error: String(err) },
          );
        }
      });
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setStreaming(false);
  }

  const previewSrc = useMemo(
    () => buildPreviewSrcDoc(activeProject),
    [activeProject],
  );
  const iframeUrl = previewState.url ?? previewState.liveUrl ?? null;
  const iframeSrcDoc = iframeUrl
    ? undefined
    : (previewState.staticSrcDoc ?? (activeProject ? previewSrc : undefined));
  const elapsedMs = previewState.startedAt
    ? Math.max(0, previewNow - previewState.startedAt)
    : 0;
  const readyMs = previewState.timeToFirstPreviewMs;

  const leftPanel = (
    <Surface className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <SelectControl<string>
          label="Provedor"
          value={providerId ?? ""}
          onChange={(v) =>
            setSel({
              providerId: v,
              model: getModelOptions(v, providers, models)[0]?.id,
            })
          }
          options={
            allProviders.length
              ? allProviders.map((p) => ({
                  value: p.id,
                  label: `${p.name}${providerIsUsable(p) ? "" : " (disabled)"}`,
                }))
              : [{ value: "", label: "(nenhum)" }]
          }
        />
        <SelectControl<string>
          label="Modelo"
          value={model ?? ""}
          onChange={(v) => setSel({ model: v })}
          options={
            modelOptions.length
              ? modelOptions.map((m) => ({ value: m.id, label: m.label }))
              : [{ value: model ?? "", label: "(configure)" }]
          }
        />
        <RuntimePicker />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <SelectControl<string>
          label="Sessão"
          value={activeThread?.id ?? ""}
          onChange={(v) => setActiveThread(v)}
          options={threads.map((t) => ({ value: t.id, label: t.title }))}
        />
        <div className="ml-2 flex gap-2">
          <button
            onClick={() =>
              addThread({
                id: `th-${Date.now().toString(36)}`,
                title: "Nova sessão",
                skillIds: [],
                messages: [],
                createdAt: Date.now(),
              })
            }
            className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Nova
          </button>
          <button
            onClick={() => {
              if (
                activeThread &&
                confirmDialog("Limpar mensagens desta sessão?")
              )
                clearThread(activeThread.id);
            }}
            className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="app-scrollbar -mx-2 mb-3 flex-1 overflow-y-auto px-2"
      >
        {(activeThread?.messages ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            <div>
              <Sparkles className="mx-auto h-6 w-6" />
              <p className="mt-2 font-semibold">
                Descreva o que você quer construir.
              </p>
              <p className="mt-1 text-xs">
                Ex: "crie um projeto SaaS de tarefas com landing page e
                dashboard"
              </p>
            </div>
          </div>
        ) : (
          (activeThread?.messages ?? []).map((m) => (
            <ChatBubbleStudio
              key={m.id}
              msg={m}
              projectId={activeProject?.id}
            />
          ))
        )}
      </div>

      {attachments && attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold"
            >
              <Paperclip className="h-3 w-3" /> {a.name}
              <button
                onClick={() =>
                  setAttachments(attachments.filter((_, j) => j !== i))
                }
                className="text-rose-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Skills:
        </span>
        <SkillChips />
        <button
          type="button"
          onClick={() => setSel({ agentMode: !agentMode })}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition",
            agentMode
              ? "bg-emerald-500 text-white shadow"
              : "bg-white/70 text-slate-600 hover:bg-white",
          )}
          title="Quando ligado, o envio dispara o pipeline multi-agente (Plan → Architect → Code → Execute)"
        >
          <Wand2 className="h-3.5 w-3.5" /> Agent Mode{" "}
          {agentMode ? "ON" : "OFF"}
        </button>
      </div>

      {(agentRunning || agentEvents.length > 0) && (
        <AgentProgressPanel
          events={agentEvents}
          running={agentRunning}
          onClear={() => setAgentEvents([])}
        />
      )}

      <div className="rounded-3xl border border-white/70 bg-white/85 p-2 shadow-inner">
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
              send();
            }
          }}
          placeholder="Mensagem ao agente... (Enter envia, Shift+Enter quebra linha)"
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm font-medium outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <label className="cursor-pointer rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
            <Paperclip className="mr-1 inline h-3.5 w-3.5" />
            Anexar
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleAttach(e.target.files)}
            />
          </label>
          {streaming ? (
            <button
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700"
            >
              <Square className="h-4 w-4" />
              Parar
            </button>
          ) : (
            <button
              onClick={send}
              className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white"
            >
              <Send className="h-4 w-4" />
              Enviar
            </button>
          )}
        </div>
      </div>
    </Surface>
  );

  const rightPanel = (
    <Surface className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionTitle
            icon={Monitor}
            title="Preview"
            desc={
              previewState.message ?? activeProject?.name ?? "Sem projeto ativo"
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <PreviewModeBadge
            mode={previewState.mode}
            status={previewState.status}
          />
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([k, I]) => (
            <button
              key={k}
              onClick={() => setDevice(k)}
              className={cn(
                "rounded-full p-2 transition",
                device === k
                  ? "bg-[#17172d] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <I className="h-4 w-4" />
            </button>
          ))}
          <button
            onClick={() => setPreviewKey((key) => key + 1)}
            className="rounded-full bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const target = iframeUrl;
              if (target) {
                window.open(target, "_blank");
                return;
              }
              if (!activeProject && !iframeSrcDoc) return;
              const w = window.open("", "_blank");
              if (w) {
                w.document.open();
                w.document.write(iframeSrcDoc ?? previewSrc);
                w.document.close();
              }
            }}
            className="rounded-full bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            title="Open preview in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 shadow-sm">
          <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
          {readyMs != null
            ? `Preview ready in ${formatMs(readyMs)}`
            : `Preview booting ${formatMs(elapsedMs)}`}
        </span>
        {previewState.status === "fallback" && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
            Static preview mode - live runtime not ready yet.
          </span>
        )}
      </div>
      {previewState.status === "error" && (
        <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {previewState.message}
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden rounded-3xl bg-slate-100 p-3">
        {iframeUrl ? (
          <iframe
            key={`url-${previewKey}-${iframeUrl}`}
            src={iframeUrl}
            title="code-studio-preview"
            allow="cross-origin-isolated"
            onLoad={() =>
              eventBus.emit("iframeLoaded", {
                url: iframeUrl,
                ms:
                  Date.now() -
                  (eventBus.getCurrentRun()?.startedAt ?? Date.now()),
              })
            }
            style={{
              width:
                device === "desktop" ? "100%" : device === "tablet" ? 768 : 375,
              maxWidth: "100%",
              minHeight: 0,
              height: "100%",
            }}
            className="h-full rounded-2xl border border-emerald-300 bg-white shadow-lg"
          />
        ) : iframeSrcDoc ? (
          <iframe
            key={`srcdoc-${previewKey}`}
            srcDoc={iframeSrcDoc}
            title="preview"
            sandbox="allow-scripts"
            onLoad={() =>
              eventBus.emit("iframeLoaded", {
                kind: "static",
                ms:
                  Date.now() -
                  (eventBus.getCurrentRun()?.startedAt ?? Date.now()),
              })
            }
            style={{
              width:
                device === "desktop" ? "100%" : device === "tablet" ? 768 : 375,
              maxWidth: "100%",
              minHeight: 0,
              height: "100%",
            }}
            className="h-full rounded-2xl border border-slate-200 bg-white shadow-lg"
          />
        ) : previewState.status === "preparing" ||
          previewState.status === "booting" ? (
          <div className="text-center text-sm text-slate-500">
            <Spinner size={24} />
            <p className="mt-3 font-semibold text-slate-700">
              {previewState.message ?? "Preview booting..."}
            </p>
            <p className="mt-1 text-xs">
              A minimal runnable shell will appear before the 60s deadline.
            </p>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-500">
            <FolderTree className="mx-auto h-6 w-6" />
            <p className="mt-2 font-semibold">Nenhum projeto ativo</p>
            <p className="mt-1 text-xs">
              Ative o <strong>Agent Mode</strong> e descreva um projeto para ver
              o preview ao vivo via WebContainer.
            </p>
            {!webContainerService.isSupported() && (
              <p className="mt-2 text-[11px] text-rose-600">
                WebContainer requer navegador com cross-origin isolation
                (Chrome/Edge). Reinicie o Vite após o build.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl border border-white/70 bg-white/70">
        <button
          type="button"
          onClick={() => setLogsOpen((value) => !value)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-slate-600"
        >
          <span className="inline-flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" />
            Console & preview logs
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition", logsOpen && "rotate-180")}
          />
        </button>
        {logsOpen && (
          <pre className="app-scrollbar max-h-36 overflow-auto border-t border-white/70 bg-slate-950 p-3 font-mono text-[10px] leading-4 text-slate-200">
            {[
              ...previewState.logs,
              ...previewState.errors.map((error) => `error: ${error}`),
            ].join("\n") || "No preview logs yet."}
          </pre>
        )}
      </div>
    </Surface>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5 lg:block">
      <div className="hidden h-full min-h-0 lg:block">
        <SplitPane
          storageKey="perfectagent.codestudio.split"
          defaultRatio={0.4}
          minRatio={0.28}
          maxRatio={0.6}
          left={leftPanel}
          right={rightPanel}
          className="h-full"
        />
      </div>
      <div className="flex min-h-0 flex-col gap-5 lg:hidden">
        {leftPanel}
        {rightPanel}
      </div>
      <CreateProjectModal
        open={createOpen}
        brief={pendingProjectBrief}
        onClose={() => setCreateOpen(false)}
        onCreate={(p) => {
          upsertProject(p);
          toast.success(`Projeto "${p.name}" criado.`);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function PreviewModeBadge({
  mode,
  status,
}: {
  mode: PreviewState["mode"];
  status: PreviewState["status"];
}) {
  const label =
    mode === "webcontainer"
      ? "Live runtime"
      : mode === "static-iframe"
        ? "Static iframe"
        : mode === "external-runtime"
          ? "External runtime"
          : "Fallback";
  const tone =
    status === "error"
      ? "bg-rose-100 text-rose-700"
      : mode === "webcontainer" || mode === "external-runtime"
        ? "bg-emerald-100 text-emerald-700"
        : mode === "static-iframe"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-800";
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", tone)}
    >
      {label}
    </span>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function localNoProviderReply(text: string): string {
  if (/^(oi|ola|olá|hello|hi|hey)\b/i.test(text.trim()))
    return "Oi! Estou aqui. Para respostas LLM completas, configure um provedor e modelo; no Code Studio, pedidos de projeto ainda abrem um preview deterministico imediatamente.";
  return "Ainda não há provedor + modelo habilitados para conversar com LLM. Configure em Configurações > Modelos, ou descreva um projeto no Code Studio para abrir um preview deterministico agora.";
}

function filesToWebContainerTree(files: ProjectFile[]): FileSystemTree {
  const root: FileSystemTree = {};
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let cursor = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const dir = parts[index];
      if (!cursor[dir]) cursor[dir] = { directory: {} };
      cursor = (cursor[dir] as { directory: FileSystemTree }).directory;
    }
    const fileName = parts[parts.length - 1];
    cursor[fileName] = { file: { contents: file.content } };
  }
  return root;
}

function sanitizePipelineEvent(event: PipelineEvent): PipelineEvent {
  if (!/aborted|aborterror/i.test(`${event.message} ${event.detail ?? ""}`))
    return event;
  return {
    ...event,
    level: event.level === "error" ? "warn" : event.level,
    message: "Runtime interrompido; preview estatico preservado.",
    detail: undefined,
  };
}

function pipelineEventToStageBlock(event: PipelineEvent): string {
  const stage =
    event.phase === "planning" || event.phase === "architecting"
      ? "plan"
      : event.phase === "coding"
        ? "act"
        : event.phase === "complete" || event.phase === "critiquing"
          ? "verify"
          : event.phase === "debugging" || event.phase === "failed"
            ? "debug"
            : "tool";
  const status =
    event.level === "error"
      ? "error"
      : event.level === "warn"
        ? "warn"
        : event.level === "success"
          ? "ok"
          : "running";
  const payload = {
    output: {
      [stage]: {
        summary: event.message,
        content: event.detail,
        logs: event.detail ? [event.detail.slice(0, 1200)] : undefined,
      },
    },
    status,
  };
  return `${stage} ${JSON.stringify(payload)}\n`;
}

function RuntimePicker() {
  const runtimes = useConfig((s) => s.runtimes);
  const settings = useConfig((s) => s.settings);
  const sel = useConfig((s) => s.studioSelection);
  const setSel = useConfig((s) => s.setStudioSelection);

  if (runtimes.length === 0) {
    return (
      <div className="flex flex-col justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
          Runtime
        </span>
        <span className="text-xs font-semibold text-amber-800">
          Nenhum configurado.
        </span>
        <span className="text-xs font-bold text-amber-900">
          Configure em Agentes →
        </span>
      </div>
    );
  }

  const selectedId =
    resolveRuntimeId(sel.runtimeId, settings.defaultRuntimeId, runtimes) ??
    runtimes[0].id;
  const selected = runtimes.find((r) => r.id === selectedId);
  const caps = selected?.capabilities;
  const liveOk = caps?.supportsLivePreview;
  const planOk = caps?.canPlan;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Runtime
        </span>
        {selected && (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              selected.status === "connected" || selected.status === "ready"
                ? "bg-emerald-500"
                : selected.status === "disconnected" ||
                    selected.status === "error"
                  ? "bg-rose-500"
                  : "bg-amber-400",
            )}
          />
        )}
      </div>
      <select
        value={selectedId}
        onChange={(e) => setSel({ runtimeId: e.target.value })}
        className="mt-1 w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
      >
        {runtimes.map((r) => (
          <option
            key={r.id}
            value={r.id}
            disabled={r.status === "disconnected"}
          >
            {r.isDefault ? "★ " : ""}
            {r.name}
            {r.kind ? ` · ${r.kind}` : ""}
          </option>
        ))}
      </select>
      {selected && (
        <div className="mt-1 flex flex-wrap gap-1">
          {liveOk && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              ⚡ live preview
            </span>
          )}
          {planOk && caps?.canDebug && caps?.canCritiqueVisual && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              🧠 full agent
            </span>
          )}
          {!planOk && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              LLM direto
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AgentProgressPanel({
  events,
  running,
  onClear,
}: {
  events: PipelineEvent[];
  running: boolean;
  onClear: () => void;
}) {
  const last = events[events.length - 1];
  return (
    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : last?.level === "error" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          )}
          Agent Pipeline {running ? "rodando..." : "encerrado"}
        </div>
        <button
          onClick={onClear}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
        >
          Limpar
        </button>
      </div>
      <div className="app-scrollbar max-h-32 overflow-y-auto text-[11px] font-mono leading-relaxed text-slate-700">
        {events.map((ev, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              ev.level === "error" && "text-rose-700",
              ev.level === "warn" && "text-amber-700",
              ev.level === "success" && "text-emerald-700",
            )}
          >
            <span className="shrink-0 opacity-60">[{ev.phase}]</span>
            <span className="truncate">
              {ev.message}
              {ev.iteration ? ` (iter ${ev.iteration})` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillChips() {
  const skills = useConfig((s) => s.skills);
  const sel = useConfig((s) => s.studioSelection);
  const setSel = useConfig((s) => s.setStudioSelection);
  const selected = sel.skillIds ?? [];
  if (skills.length === 0) {
    return (
      <span className="text-xs italic text-slate-400">
        nenhuma skill cadastrada
      </span>
    );
  }
  return (
    <>
      {skills.map((sk) => {
        const isOn = sk.enabled || selected.includes(sk.id);
        const lockedOn = sk.enabled; // globally enabled — chip is locked on
        return (
          <button
            key={sk.id}
            type="button"
            onClick={() => {
              if (lockedOn) {
                toast.info(
                  `"${sk.name}" est\u00e1 sempre ativa. Desligue em Skills para alternar aqui.`,
                );
                return;
              }
              const next = selected.includes(sk.id)
                ? selected.filter((id) => id !== sk.id)
                : [...selected, sk.id];
              setSel({ skillIds: next });
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              isOn
                ? "bg-[#17172d] text-white shadow"
                : "bg-white/70 text-slate-600 hover:bg-white",
              lockedOn && "opacity-90",
            )}
            title={sk.description || sk.name}
          >
            {sk.name}
          </button>
        );
      })}
    </>
  );
}

function ChatBubbleStudio({
  msg,
  projectId,
}: {
  msg: ChatMessageV2;
  projectId?: string;
}) {
  const addProjectFile = useConfig((s) => s.addProjectFile);
  const updateProjectFile = useConfig((s) => s.updateProjectFile);

  function handleApply({ language, code }: { language: string; code: string }) {
    if (!projectId) {
      toast.error("Crie um projeto primeiro.");
      return;
    }
    const ext =
      language === "javascript"
        ? "js"
        : language === "typescript"
          ? "ts"
          : language === "tsx"
            ? "tsx"
            : language === "jsx"
              ? "jsx"
              : language === "html"
                ? "html"
                : language === "css"
                  ? "css"
                  : language === "json"
                    ? "json"
                    : "txt";
    const path = window.prompt(
      "Save as path:",
      `src/snippet-${Date.now().toString(36)}.${ext}`,
    );
    if (!path) return;
    const exists = useConfig
      .getState()
      .projects.find((p) => p.id === projectId)
      ?.files.some((f) => f.path === path);
    if (exists) updateProjectFile(projectId, path, code);
    else addProjectFile(projectId, path, code);
    toast.success(`Saved ${path}`);
  }

  return (
    <ChatBubble
      message={msg}
      compact
      enableApplyToEditor
      onApplyToEditor={handleApply}
    />
  );
}

/* (legacy local CodeBlock removed — handled by shared MarkdownRenderer) */

/* --------- project scaffolding & preview --------- */

function buildPreviewSrcDoc(project?: StudioProject): string {
  if (!project) return "<html><body></body></html>";
  // If project has index.html, use it but inject <style> and <script> from siblings.
  const html = project.files.find((f) =>
    f.path.toLowerCase().endsWith("index.html"),
  )?.content;
  if (html) {
    const styles = project.files
      .filter((f) => f.path.endsWith(".css"))
      .map((f) => `<style data-src="${f.path}">${f.content}</style>`)
      .join("\n");
    const scripts = project.files
      .filter((f) => f.path.endsWith(".js") && !f.path.endsWith(".min.js"))
      .map(
        (f) =>
          `<script type="module" data-src="${f.path}">${f.content}<\/script>`,
      )
      .join("\n");
    if (html.includes("</head>"))
      return html
        .replace("</head>", `${styles}</head>`)
        .replace("</body>", `${scripts}</body>`);
    return `<html><head>${styles}</head><body>${html}${scripts}</body></html>`;
  }
  // Fallback: dump all readable text
  return `<html><body style="font-family:system-ui;padding:20px"><h2>${project.name}</h2><pre>${project.files.map((f) => f.path).join("\n")}</pre></body></html>`;
}

function scaffoldFor(stack: string, name: string): ProjectFile[] {
  if (stack === "vanilla") {
    return [
      {
        path: "index.html",
        content: `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head><body><h1>${name}</h1><div id="app"></div></body></html>`,
      },
      {
        path: "styles.css",
        content: `body{font-family:system-ui;margin:0;padding:24px;background:#0b1020;color:#e6edff}h1{font-weight:800}`,
      },
      {
        path: "main.js",
        content: `document.getElementById('app').textContent = 'Hello from ${name}!';`,
      },
    ];
  }
  if (stack === "react") {
    return [
      {
        path: "index.html",
        content: `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head><body><div id="root"></div></body></html>`,
      },
      {
        path: "styles.css",
        content: `body{margin:0;font-family:Inter,system-ui;background:#eef2ff;color:#111827}.app{min-height:100vh;display:grid;place-items:center;padding:32px}.panel{max-width:720px;border-radius:24px;background:white;padding:32px;box-shadow:0 24px 80px rgba(15,23,42,.16)}button{border:0;border-radius:999px;background:#17172d;color:white;padding:12px 18px;font-weight:800}`,
      },
      {
        path: "main.js",
        content: `import React,{useState}from'https://esm.sh/react@18';import{createRoot}from'https://esm.sh/react-dom@18/client';function App(){const[count,setCount]=useState(0);return React.createElement('main',{className:'app'},React.createElement('section',{className:'panel'},React.createElement('h1',null,'${name}'),React.createElement('p',null,'Runnable React scaffold generated by PerfectAgent.'),React.createElement('button',{onClick:()=>setCount(count+1)},'Clicks: '+count)))}createRoot(document.getElementById('root')).render(React.createElement(App));`,
      },
    ];
  }
  // landing
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head><body><section class="hero"><h1>${name}</h1><p>Built with PerfectAgent.</p><a href="#">Get started</a></section></body></html>`,
    },
    {
      path: "styles.css",
      content: `body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#0b1020,#1f1f3a);color:#fff;min-height:100vh}.hero{padding:80px 32px;text-align:center}.hero h1{font-size:64px;margin:0}`,
    },
  ];
}

function CreateProjectModal({
  open,
  onClose,
  brief,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  brief: string;
  onCreate: (p: StudioProject) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [stack, setStack] = useState<"vanilla" | "react" | "landing">(
    "vanilla",
  );

  useEffect(() => {
    if (open) {
      setName("Projeto " + new Date().toLocaleTimeString().replace(/:/g, ""));
      setDesc(brief);
    }
  }, [open, brief]);

  function create() {
    if (!name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const id = `pj-${Date.now().toString(36)}`;
    const files = scaffoldFor(stack, name.trim());
    onCreate({
      id,
      name: name.trim(),
      description: desc || undefined,
      files,
      activeFile: files[0]?.path,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo projeto"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={create}
            className="rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white"
          >
            Criar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <EditableField label="Nome" value={name} onChange={setName} />
        <EditableField label="Descrição" value={desc} onChange={setDesc} />
        <SelectControl<"vanilla" | "react" | "landing">
          label="Stack inicial"
          value={stack}
          onChange={setStack}
          options={[
            { value: "vanilla", label: "Vanilla HTML/CSS/JS" },
            { value: "react", label: "React via ESM" },
            { value: "landing", label: "Landing page" },
          ]}
        />
      </div>
    </Modal>
  );
}

/* ===================================================================== Editor tab */

function EditorDeployTab() {
  const projects = useConfig((s) => s.projects);
  const activeProjectId = useConfig((s) => s.activeProjectId);
  const setActiveProject = useConfig((s) => s.setActiveProject);
  const updateProjectFile = useConfig((s) => s.updateProjectFile);
  const addProjectFile = useConfig((s) => s.addProjectFile);
  const deleteProjectFile = useConfig((s) => s.deleteProjectFile);
  const renameProjectFile = useConfig((s) => s.renameProjectFile);
  const setActiveFile = useConfig((s) => s.setActiveFile);
  const removeProject = useConfig((s) => s.removeProject);
  const settings = useConfig((s) => s.settings);
  const deploys = useConfig((s) => s.deploys);
  const addDeploy = useConfig((s) => s.addDeploy);
  const integrations = useConfig((s) => s.integrations);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const file =
    project?.files.find((f) => f.path === project.activeFile) ??
    project?.files[0];
  const [target, setTarget] = useState(DEPLOY_TARGETS[0]);
  const deployIntegrations = integrations.filter(
    (i) =>
      i.connected && i.url && (i.kind === "webhook" || i.kind === "custom"),
  );
  const [deployIntegrationId, setDeployIntegrationId] = useState("");
  const [envVars, setEnvVars] = useState<Array<{ k: string; v: string }>>([
    { k: "NODE_ENV", v: "production" },
  ]);
  const [deploying, setDeploying] = useState(false);
  const [deployLog, setDeployLog] = useState<string[]>([]);

  if (!project) {
    return (
      <Surface className="text-center text-slate-500">
        <p className="font-semibold">
          Nenhum projeto. Crie um na aba Chat & Preview.
        </p>
      </Surface>
    );
  }

  function handleNewFile() {
    const path = prompt("Caminho do arquivo (ex: src/utils.ts)");
    if (!path) return;
    addProjectFile(project!.id, path, "");
  }
  function handleRename(p: string) {
    const np = prompt("Novo caminho:", p);
    if (!np || np === p) return;
    renameProjectFile(project!.id, p, np);
  }
  function handleDeleteFile(p: string) {
    if (confirmDialog(`Excluir ${p}?`)) deleteProjectFile(project!.id, p);
  }

  async function deploy() {
    const integrationId = deployIntegrationId || deployIntegrations[0]?.id;
    const integration = integrationId
      ? getIntegrationDecoded(integrationId)
      : undefined;
    if (!integration?.url) {
      toast.error(
        "Configure e teste uma integração webhook/custom para habilitar deploy.",
      );
      return;
    }
    setDeploying(true);
    setDeployLog([
      `[${new Date().toLocaleTimeString()}] Enviando pacote para ${integration.name}`,
    ]);
    const id = `dp-${Date.now().toString(36)}`;
    const env = Object.fromEntries(
      envVars
        .filter((item) => item.k.trim())
        .map((item) => [item.k.trim(), item.v]),
    );
    try {
      const headers: Record<string, string> = {
        ...(integration.headers ?? {}),
      };
      if (integration.secrets?.token)
        headers.authorization = `Bearer ${integration.secrets.token}`;
      const response = await api.testIntegration({
        url: integration.url,
        method: integration.method ?? "POST",
        headers,
        body: {
          action: "deploy",
          target,
          project: {
            id: project!.id,
            name: project!.name,
            files: project!.files,
          },
          env,
        },
      });
      const ok = response.ok;
      const log = [
        `target=${target}`,
        `integration=${integration.name}`,
        `files=${project!.files.length}`,
        `status=${response.status ?? "n/a"}`,
        response.sample ? `sample=${response.sample}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const rec: DeployRecord = {
        id,
        target: `${target} via ${integration.name}`,
        status: ok ? "success" : "failed",
        url: ok ? integration.url : undefined,
        log,
        at: Date.now(),
      };
      addDeploy(rec);
      setDeployLog((lines) => [
        ...lines,
        `[${new Date().toLocaleTimeString()}] ${ok ? "Deploy webhook acknowledged" : `Deploy failed: ${response.error ?? response.status}`}`,
      ]);
      ok
        ? toast.success("Deploy webhook confirmado.")
        : toast.error(response.error ?? `HTTP ${response.status}`);
    } catch (err) {
      addDeploy({
        id,
        target,
        status: "failed",
        log: (err as Error).message,
        at: Date.now(),
      });
      setDeployLog((lines) => [
        ...lines,
        `[${new Date().toLocaleTimeString()}] Erro: ${(err as Error).message}`,
      ]);
      toast.error((err as Error).message);
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="grid h-full min-h-[600px] gap-5 lg:grid-cols-[260px_1fr_320px]">
      {/* file tree */}
      <Surface className="min-h-0 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <SelectControl<string>
            label="Projeto"
            value={project.id}
            onChange={(v) => setActiveProject(v)}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        <div className="mb-3 flex gap-2">
          <button
            onClick={handleNewFile}
            className="flex-1 rounded-full bg-[#17172d] px-3 py-2 text-xs font-bold text-white"
          >
            <FilePlus className="mr-1 inline h-3.5 w-3.5" />
            Novo arquivo
          </button>
          <button
            onClick={() => {
              if (confirmDialog(`Excluir projeto ${project.name}?`))
                removeProject(project.id);
            }}
            className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1 text-sm">
          {project.files.map((f) => (
            <div
              key={f.path}
              className={cn(
                "group flex items-center justify-between rounded-lg px-2 py-1.5",
                f.path === project.activeFile
                  ? "bg-[#17172d] text-white"
                  : "hover:bg-white",
              )}
            >
              <button
                onClick={() => setActiveFile(project.id, f.path)}
                className="flex-1 truncate text-left font-mono text-xs font-bold"
              >
                {f.path}
              </button>
              <span className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => handleRename(f.path)}>
                  <FileCog className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDeleteFile(f.path)}>
                  <FileX className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </Surface>

      {/* editor */}
      <Surface className="flex min-h-0 flex-col p-2">
        <div className="mb-2 flex items-center justify-between px-3 py-1">
          <span className="font-mono text-xs font-bold text-slate-600">
            {file?.path ?? "(sem arquivo)"}
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {settings.editorTheme}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
          {file ? (
            <Editor
              height="100%"
              theme={
                settings.editorTheme === "vs-dark"
                  ? "vs-dark"
                  : settings.editorTheme
              }
              language={langFromPath(file.path)}
              value={file.content}
              onChange={(v) =>
                updateProjectFile(project.id, file.path, v ?? "")
              }
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Selecione um arquivo
            </div>
          )}
        </div>
      </Surface>

      {/* deploy */}
      <Surface className="flex min-h-0 flex-col">
        <SectionTitle
          icon={Rocket}
          title="Deploy"
          desc="Envie seu projeto para um destino."
        />
        <div className="mt-3 space-y-3">
          <SelectControl<string>
            label="Destino"
            value={target}
            onChange={setTarget}
            options={DEPLOY_TARGETS}
          />
          {deployIntegrations.length ? (
            <SelectControl<string>
              label="Integração de deploy"
              value={deployIntegrationId || deployIntegrations[0].id}
              onChange={setDeployIntegrationId}
              options={deployIntegrations.map((i) => ({
                value: i.id,
                label: i.name,
              }))}
            />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              Deploy real está desabilitado até existir uma integração
              webhook/custom testada e conectada em Integrações.
            </div>
          )}
          <div className="rounded-[20px] border border-white/70 bg-white/60 p-3">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Env vars
            </span>
            {envVars.map((e, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={e.k}
                  onChange={(ev) =>
                    setEnvVars((cur) =>
                      cur.map((x, j) =>
                        j === i ? { ...x, k: ev.target.value } : x,
                      ),
                    )
                  }
                  placeholder="KEY"
                  className="flex-1 rounded-lg bg-white px-2 py-1 font-mono text-xs font-bold outline-none"
                />
                <input
                  value={e.v}
                  onChange={(ev) =>
                    setEnvVars((cur) =>
                      cur.map((x, j) =>
                        j === i ? { ...x, v: ev.target.value } : x,
                      ),
                    )
                  }
                  placeholder="value"
                  className="flex-1 rounded-lg bg-white px-2 py-1 font-mono text-xs outline-none"
                />
                <button
                  onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}
                  className="text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setEnvVars([...envVars, { k: "", v: "" }])}
              className="text-xs font-bold text-slate-700"
            >
              + adicionar
            </button>
          </div>
          <button
            onClick={deploy}
            disabled={deploying || deployIntegrations.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#17172d] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {deploying ? <Spinner size={14} /> : <Rocket className="h-4 w-4" />}
            {deploying
              ? "Implantando..."
              : deployIntegrations.length
                ? "Deploy"
                : "Deploy indisponível"}
          </button>
          <pre className="app-scrollbar max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-cyan-100">
            {deployLog.length
              ? deployLog.join("\n")
              : "(log do deploy aparece aqui)"}
          </pre>
          <div>
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Histórico
            </span>
            <div className="space-y-2">
              {deploys.length === 0 && (
                <p className="text-xs text-slate-400">Nenhum deploy ainda.</p>
              )}
              {deploys.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl bg-white/60 p-2 text-xs font-bold"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span>{d.target}</span>
                    </div>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener"
                        className="truncate text-slate-500 hover:text-slate-900"
                      >
                        {d.url}
                      </a>
                    )}
                  </div>
                  <button
                    disabled
                    title="Rollback requer uma API de deploy com suporte explícito"
                    className="cursor-not-allowed text-slate-300"
                  >
                    ↺
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function langFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
  };
  return map[ext] ?? "plaintext";
}
