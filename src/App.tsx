import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  BrainCircuit,
  Code2,
  MessageCircle,
  Plus,
  Plug,
  RotateCcw,
  Send,
  Settings,
  Square,
  Wrench,
} from "lucide-react";
import { CodeStudioPage } from "@/pages/CodeStudioPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { ToolsPage } from "@/pages/ToolsPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { ExtensionsPage } from "@/pages/ExtensionsPage";
import { ToastViewport, toast } from "@/components/Toast";
import { BackendStatusBanner } from "@/components/BackendStatus";
import {
  ensurePresetsRegistered,
  getRuntimeProviderSpec,
  useConfig,
} from "@/stores/config";
import { createAdapter } from "@/services/adapters";
import {
  getModelOptions,
  getProviderOptions,
  providerIsUsable,
  resolveModelId,
  resolveProviderId,
  resolveRuntimeId,
} from "@/services/configSelectors";
import type { ChatMessageV2 } from "@/types";
import { ChatBubble } from "@/components/ChatBubble";
import { TimingHUD } from "@/components/TimingHUD";
import { cn } from "@/utils/cn";

type Section =
  | "chat"
  | "code"
  | "agents"
  | "skills"
  | "tools"
  | "integrations"
  | "extensions"
  | "settings";

type NavItem = {
  id: Exclude<Section, "chat">;
  label: string;
  helper: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "code", label: "Code Studio", helper: "Criar apps", icon: Code2 },
  { id: "agents", label: "Agentes", helper: "Runtimes", icon: Bot },
  { id: "skills", label: "Skills", helper: "Capacidades", icon: BrainCircuit },
  { id: "tools", label: "Ferramentas", helper: "Acoes", icon: Wrench },
  { id: "integrations", label: "Integracoes", helper: "Conexoes", icon: Plug },
  { id: "extensions", label: "MCP", helper: "Extensoes", icon: Blocks },
  { id: "settings", label: "Configuracoes", helper: "Sistema", icon: Settings },
];

function newChatThread(title = "Novo chat") {
  return {
    id: `chat-${Date.now().toString(36)}`,
    title,
    skillIds: [],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function localNoProviderChatReply(text: string): string {
  if (isSimpleGreeting(text))
    return "Oi! Estou aqui. Para respostas completas com LLM, configure um provedor e modelo; enquanto isso, sigo mantendo a conversa limpa, sem JSON bruto ou erros visuais.";
  return "Ainda não há provedor + modelo habilitados para conversar com LLM. Configure em Configurações > Modelos para ativar respostas completas.";
}

function isSimpleGreeting(text: string): boolean {
  return /^(oi|ola|olá|hello|hi|hey)[!.\s]*$/i.test(text.trim());
}

export default function App() {
  const [section, setSection] = useState<Section>(() =>
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/code-studio")
      ? "code"
      : "chat",
  );
  const addChatThread = useConfig((s) => s.addChatThread);
  const chatThreads = useConfig((s) => s.chatThreads);

  useEffect(() => {
    ensurePresetsRegistered();
  }, []);
  useEffect(() => {
    if (chatThreads.length === 0)
      addChatThread(newChatThread("Primeira conversa"));
  }, [addChatThread, chatThreads.length]);

  function createNewChat() {
    addChatThread(newChatThread());
    setSection("chat");
  }

  return (
    <div className="app-ambient h-screen overflow-hidden text-slate-950">
      <div className="orbit-line orbit-line-one" />
      <div className="orbit-line orbit-line-two" />
      <main className="absolute inset-0 flex min-h-0 items-center justify-center p-2 sm:p-3">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="glass-shell flex h-[97vh] w-full max-w-[98vw] overflow-hidden rounded-[28px] border border-white/60 bg-white/45 shadow-[0_42px_130px_rgba(69,78,133,0.34)] backdrop-blur-3xl lg:h-[98vh] lg:rounded-[40px]"
        >
          <Sidebar
            activeSection={section}
            onNewChat={createNewChat}
            onNavigate={setSection}
          />
          <div className="flex min-w-0 flex-1 overflow-hidden p-2 sm:p-3 lg:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, x: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -18, filter: "blur(8px)" }}
                transition={{ duration: 0.34, ease: "easeOut" }}
                className="h-full min-h-0 w-full"
              >
                {section === "chat" && <NormalChatPage />}
                {section === "code" && <CodeStudioPage />}
                {section === "agents" && <AgentsPage />}
                {section === "skills" && <SkillsPage />}
                {section === "tools" && <ToolsPage />}
                {section === "integrations" && <IntegrationsPage />}
                {section === "extensions" && <ExtensionsPage />}
                {section === "settings" && <SettingsPage />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
      <ToastViewport />
      <BackendStatusBanner />
      <TimingHUD />
    </div>
  );
}

function Sidebar({
  activeSection,
  onNewChat,
  onNavigate,
}: {
  activeSection: Section;
  onNewChat: () => void;
  onNavigate: (section: Section) => void;
}) {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center justify-between py-4 sm:w-[76px] lg:w-[88px] lg:py-5">
      <div className="flex flex-col items-center gap-2.5">
        <IconButton
          label="Novo chat"
          active={activeSection === "chat"}
          onClick={onNewChat}
          icon={Plus}
          primary
        />
        <div className="mt-0.5 flex flex-col items-center gap-2.5">
          {navItems.map((item) => (
            <IconButton
              key={item.id}
              label={item.label}
              helper={item.helper}
              active={activeSection === item.id}
              onClick={() => onNavigate(item.id)}
              icon={item.icon}
            />
          ))}
        </div>
      </div>
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.2)]"
        aria-label="PerfectAgent"
        type="button"
      >
        <span className="absolute h-4 w-4 -rotate-45 rounded-[3px] border-l-[5px] border-t-[5px] border-white" />
        <span className="absolute h-4 w-4 translate-x-1 translate-y-1 rounded-[3px] border-r-[5px] border-b-[5px] border-white" />
      </button>
    </aside>
  );
}

function IconButton({
  icon: Icon,
  label,
  helper,
  active,
  primary,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  helper?: string;
  active?: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06, x: 2 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="group relative"
      aria-label={label}
      type="button"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
          primary || active
            ? "border-slate-900 bg-[#17172d] text-white shadow-[0_12px_26px_rgba(23,23,45,0.28)]"
            : "border-white/80 bg-white/80 text-slate-700 shadow-[0_8px_22px_rgba(96,107,157,0.12)] hover:bg-white",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="pointer-events-none absolute left-[50px] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/70 bg-white/95 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-800 opacity-0 shadow-xl shadow-slate-300/30 transition-all group-hover:translate-x-1 group-hover:opacity-100 lg:block">
        {label}
        {helper ? (
          <small className="block font-medium text-slate-500">{helper}</small>
        ) : null}
      </span>
    </motion.button>
  );
}

function NormalChatPage() {
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
  const runtimes = useConfig((s) => s.runtimes);
  const settings = useConfig((s) => s.settings);
  const selection = useConfig((s) => s.chatSelection);
  const setSelection = useConfig((s) => s.setChatSelection);
  const threads = useConfig((s) => s.chatThreads);
  const activeThreadId = useConfig((s) => s.activeChatThreadId);
  const addThread = useConfig((s) => s.addChatThread);
  const setActiveThread = useConfig((s) => s.setActiveChatThread);
  const appendMessage = useConfig((s) => s.appendChatMessage);
  const patchMessage = useConfig((s) => s.patchChatMessage);
  const clearThread = useConfig((s) => s.clearChatThread);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const providerId = resolveProviderId(
    selection.providerId,
    settings.defaultProviderId,
    providers,
  );
  const modelId = resolveModelId(
    selection.model,
    settings.defaultModelId,
    providerId,
    providers,
    models,
  );
  const runtimeId = resolveRuntimeId(
    selection.runtimeId,
    settings.defaultRuntimeId,
    runtimes,
  );
  const providerOptions = useMemo(
    () => getProviderOptions(providers, true),
    [providers],
  );
  const modelOptions = useMemo(
    () => getModelOptions(providerId, providers, models),
    [modelId, models, providerId, providers],
  );

  useEffect(() => {
    if (typeof scrollerRef.current?.scrollTo === "function") {
      scrollerRef.current.scrollTo({ top: 1e9, behavior: "smooth" });
    }
  }, [activeThread?.messages.length]);

  function createThread() {
    const thread = newChatThread();
    addThread(thread);
    setInput("");
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setStreaming(false);
  }

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || streaming) return;
    const thread = activeThread ?? newChatThread(clean.slice(0, 48));
    if (!activeThread) {
      addThread(thread);
    }
    if (isSimpleGreeting(clean)) {
      const createdAt = Date.now();
      appendMessage(thread.id, {
        id: `u-${createdAt.toString(36)}`,
        role: "user",
        content: clean,
        createdAt,
      });
      appendMessage(thread.id, {
        id: `a-${createdAt.toString(36)}`,
        role: "assistant",
        content: localNoProviderChatReply(clean),
        createdAt: createdAt + 1,
      });
      setInput("");
      return;
    }
    const provider = providerId ? providers[providerId] : undefined;
    if (!providerIsUsable(provider) || !modelId) {
      const createdAt = Date.now();
      appendMessage(thread.id, {
        id: `u-${createdAt.toString(36)}`,
        role: "user",
        content: clean,
        createdAt,
      });
      appendMessage(thread.id, {
        id: `a-${createdAt.toString(36)}`,
        role: "assistant",
        content: localNoProviderChatReply(clean),
        createdAt: createdAt + 1,
      });
      setInput("");
      return;
    }
    const spec = getRuntimeProviderSpec(provider.id);
    if (!spec) {
      toast.error("Provedor invalido.");
      return;
    }

    const runtime = runtimeId
      ? runtimes.find((item) => item.id === runtimeId)
      : undefined;
    const userMessage: ChatMessageV2 = {
      id: `u-${Date.now().toString(36)}`,
      role: "user",
      content: clean,
      createdAt: Date.now(),
      providerId: provider.id,
      modelId,
      runtimeId,
    };
    const assistantId = `a-${Date.now().toString(36)}`;
    appendMessage(thread.id, userMessage);
    appendMessage(thread.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      providerId: provider.id,
      modelId,
      runtimeId,
      streaming: true,
    });
    setInput("");
    setStreaming(true);

    const history = [...thread.messages, userMessage].filter(
      (msg) => msg.role !== "system",
    );
    let acc = "";
    const abort = new AbortController();
    stopRef.current = () => abort.abort();

    try {
      if (runtime) {
        const adapter = createAdapter(runtime);
        await adapter.chat(
          history,
          { spec, model: modelId, signal: abort.signal },
          (chunk) => {
            if (chunk.event === "token") {
              const delta = (chunk.data as { delta?: string })?.delta ?? "";
              acc += delta;
              patchMessage(thread.id, assistantId, { content: acc });
            }
            if (chunk.event === "done") {
              patchMessage(thread.id, assistantId, { streaming: false });
              setStreaming(false);
              stopRef.current = null;
            }
            if (chunk.event === "error") {
              const message =
                (chunk.data as { message?: string })?.message ??
                "erro desconhecido";
              patchMessage(thread.id, assistantId, {
                streaming: false,
                error: message,
                content: acc || `Erro: ${message}`,
              });
              setStreaming(false);
              stopRef.current = null;
            }
          },
        );
      }
    } catch (err) {
      const message =
        (err as Error).name === "AbortError"
          ? "Cancelado pelo usuario."
          : (err as Error).message;
      patchMessage(thread.id, assistantId, {
        streaming: false,
        error: message,
        content: acc || `Erro: ${message}`,
      });
      setStreaming(false);
      stopRef.current = null;
      if ((err as Error).name !== "AbortError") toast.error(message);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendText(input);
  }

  function retryLast() {
    const lastUser = [...(activeThread?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUser) void sendText(lastUser.content);
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[22px] bg-white/20 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="chat-surface relative flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:rounded-[36px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_55%,rgba(139,163,255,0.32),transparent_28%),radial-gradient(circle_at_36%_12%,rgba(255,255,255,0.82),transparent_34%)]" />
        <div className="relative px-4 pt-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Chat
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                Conversa agêntica
              </h1>
            </div>
            <div className="grid w-full gap-2 md:w-auto md:min-w-[560px] md:grid-cols-3">
              <LabeledSelect
                label="Provider"
                value={providerId ?? ""}
                onChange={(value) => {
                  const nextModel = getModelOptions(value, providers, models)[0]
                    ?.id;
                  setSelection({ providerId: value, model: nextModel });
                }}
                options={providerOptions.map((provider) => {
                  const suffix = providerIsUsable(provider)
                    ? ""
                    : " (disabled)";
                  return {
                    value: provider.id,
                    label: `${provider.name}${suffix}`,
                  };
                })}
                emptyLabel="Configure providers"
              />
              <LabeledSelect
                label="Model"
                value={modelId ?? ""}
                onChange={(value) => setSelection({ model: value })}
                options={modelOptions.map((model) => ({
                  value: model.id,
                  label: model.label,
                }))}
                emptyLabel="No enabled models"
              />
              <LabeledSelect
                label="Runtime"
                value={runtimeId ?? ""}
                onChange={(value) => setSelection({ runtimeId: value })}
                options={runtimes.map((runtime) => ({
                  value: runtime.id,
                  label: `${runtime.isDefault ? "* " : ""}${runtime.name}`,
                }))}
                emptyLabel="No runtimes"
              />
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="app-scrollbar relative mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-8 lg:px-10"
        >
          {!activeThread || activeThread.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
              <div>
                <MessageCircle className="mx-auto h-7 w-7" />
                <p className="mt-3 font-semibold text-slate-700">
                  Escolha provider, modelo e runtime para iniciar.
                </p>
                <p className="mt-1 text-xs">
                  A conversa persiste no store e sobrevive ao refresh.
                </p>
              </div>
            </div>
          ) : (
            activeThread.messages.map((message, index) => (
              <ChatBubble key={message.id} message={message} index={index} />
            ))
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[980px] px-4 pb-5 sm:px-8 lg:px-10 lg:pb-8">
          <div className="mb-3 flex items-center justify-between text-sm font-medium text-slate-500">
            <button
              type="button"
              onClick={retryLast}
              disabled={
                !activeThread?.messages.some(
                  (message) => message.role === "user",
                ) || streaming
              }
              className="inline-flex items-center gap-2 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Retry last
            </button>
            <button
              type="button"
              onClick={() => activeThread && clearThread(activeThread.id)}
              disabled={!activeThread || streaming}
              className="text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <form
            onSubmit={submit}
            className="flex items-center gap-3 rounded-[28px] border border-white/80 bg-white/75 p-2 shadow-[0_16px_50px_rgba(90,105,150,0.16)] backdrop-blur-xl"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendText(input);
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-500 sm:text-base"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"
                aria-label="Stop generation"
              >
                <Square className="h-5 w-5" />
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04, rotate: -3 }}
                whileTap={{ scale: 0.94 }}
                type="submit"
                disabled={!input.trim() || streaming}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#17172d] text-white shadow-[0_10px_28px_rgba(23,23,45,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            )}
          </form>
        </div>
      </div>

      <aside className="hidden min-h-0 flex-col border-l border-white/40 bg-[#f2f4ff]/60 px-4 py-5 backdrop-blur-2xl lg:flex">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Sessions
            </p>
            <h2 className="text-lg font-semibold text-slate-950">Chats</h2>
          </div>
          <button
            type="button"
            onClick={createThread}
            className="rounded-full bg-[#17172d] p-2 text-white"
            aria-label="New session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="app-scrollbar flex-1 space-y-2 overflow-y-auto">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveThread(thread.id)}
              className={cn(
                "w-full rounded-2xl border p-3 text-left transition",
                thread.id === activeThread?.id
                  ? "border-slate-900/20 bg-white text-slate-950 shadow"
                  : "border-white/70 bg-white/45 text-slate-600 hover:bg-white/70",
              )}
            >
              <span className="block truncate text-sm font-bold">
                {thread.title}
              </span>
              <span className="mt-1 block text-xs">
                {thread.messages.length} messages
              </span>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <label className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-inner">
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
        className="mt-1 w-full bg-transparent text-xs font-bold text-slate-900 outline-none disabled:text-slate-400 sm:text-sm"
      >
        {options.length === 0 ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ChatMessageBubble was replaced by the shared <ChatBubble /> component
// (src/components/ChatBubble.tsx) which routes assistant content through
// `normalizeAssistantOutput` and renders thinking via <ThinkingPanel />.
