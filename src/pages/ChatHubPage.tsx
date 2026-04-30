import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatBubble } from "@/components/ChatBubble";
import { toast } from "@/components/Toast";
import {
  ensurePresetsRegistered,
  getRuntimeProviderSpec,
  useConfig,
} from "@/stores/config";
import {
  getModelOptions,
  getProviderOptions,
  providerIsUsable,
  resolveModelId,
  resolveProviderId,
} from "@/services/configSelectors";
import { api } from "@/services/api";
import { cn } from "@/utils/cn";

type ChatThreadDraft = Parameters<
  ReturnType<typeof useConfig.getState>["addChatThread"]
>[0];

const DIRECT_RUNTIME = "direct-chat";

function newChatThread(title = "Novo chat"): ChatThreadDraft {
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
  if (isSimpleGreeting(text)) {
    return "Oi! Estou aqui. Para respostas completas com LLM, configure um provedor e modelo; enquanto isso, sigo mantendo a conversa limpa, sem JSON bruto ou erros visuais.";
  }
  return "Ainda não há provedor + modelo habilitados para conversar com LLM. Configure em Configurações > Modelos para ativar respostas completas.";
}

function isSimpleGreeting(text: string): boolean {
  return /^(oi|ola|olá|hello|hi|hey)[!.\s]*$/i.test(text.trim());
}

function groupLabel(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);
  if (date >= startToday) return "Hoje";
  if (date >= startYesterday) return "Ontem";
  if (date >= startWeek) return "Semana passada";
  return "Antigas";
}

export function ChatHubPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
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
  const renameThread = useConfig((s) => s.renameChatThread);
  const deleteThread = useConfig((s) => s.deleteChatThread);
  const appendMessage = useConfig((s) => s.appendChatMessage);
  const patchMessage = useConfig((s) => s.patchChatMessage);
  const clearThread = useConfig((s) => s.clearChatThread);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensurePresetsRegistered();
  }, []);

  useEffect(() => {
    if (threads.length === 0) {
      const thread = newChatThread("Primeira conversa");
      addThread(thread);
      navigate(`/chat/${thread.id}`, { replace: true });
      return;
    }
    if (sessionId && threads.some((thread) => thread.id === sessionId)) {
      setActiveThread(sessionId);
      return;
    }
    const current = threads.find((thread) => thread.id === activeThreadId);
    if (current && !sessionId) navigate(`/chat/${current.id}`, { replace: true });
  }, [
    activeThreadId,
    addThread,
    navigate,
    sessionId,
    setActiveThread,
    threads,
  ]);

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
  const runtimeValue = selection.runtimeId ?? DIRECT_RUNTIME;
  const providerOptions = useMemo(
    () => getProviderOptions(providers, true),
    [providers],
  );
  const modelOptions = useMemo(
    () => getModelOptions(providerId, providers, models),
    [modelId, models, providerId, providers],
  );
  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? threads.filter((thread) => {
          const titleHit = thread.title.toLowerCase().includes(needle);
          const messageHit = thread.messages.some((message) =>
            message.content.toLowerCase().includes(needle),
          );
          return titleHit || messageHit;
        })
      : threads;
    return filtered.reduce<Record<string, typeof threads>>((acc, thread) => {
      const label = groupLabel(thread.updatedAt ?? thread.createdAt);
      acc[label] = [...(acc[label] ?? []), thread];
      return acc;
    }, {});
  }, [query, threads]);

  useEffect(() => {
    if (typeof scrollerRef.current?.scrollTo === "function") {
      scrollerRef.current.scrollTo({ top: 1e9, behavior: "smooth" });
    }
  }, [activeThread?.messages.length]);

  function createThread() {
    const thread = newChatThread();
    addThread(thread);
    setInput("");
    navigate(`/chat/${thread.id}`);
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setStreaming(false);
  }

  function openThread(threadId: string) {
    setActiveThread(threadId);
    navigate(`/chat/${threadId}`);
  }

  function confirmDeleteThread(threadId: string) {
    if (!window.confirm("Excluir esta conversa?")) return;
    deleteThread(threadId);
    const next = useConfig
      .getState()
      .chatThreads.find((thread) => thread.id !== threadId);
    navigate(next ? `/chat/${next.id}` : "/chat", { replace: true });
  }

  function commitRename(threadId: string) {
    renameThread(threadId, editingTitle);
    setEditingId(null);
    setEditingTitle("");
  }

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || streaming) return;
    const thread = activeThread ?? newChatThread(clean.slice(0, 48));
    if (!activeThread) {
      addThread(thread);
      navigate(`/chat/${thread.id}`);
    }

    const createdAt = Date.now();
    appendMessage(thread.id, {
      id: `u-${createdAt.toString(36)}`,
      role: "user",
      content: clean,
      createdAt,
      providerId,
      modelId,
      runtimeId: runtimeValue === DIRECT_RUNTIME ? undefined : runtimeValue,
    });
    setInput("");

    const provider = providerId ? providers[providerId] : undefined;
    if (isSimpleGreeting(clean) || !providerIsUsable(provider) || !modelId) {
      appendMessage(thread.id, {
        id: `a-${createdAt.toString(36)}`,
        role: "assistant",
        content: localNoProviderChatReply(clean),
        createdAt: createdAt + 1,
        providerId,
        modelId,
      });
      return;
    }

    const spec = getRuntimeProviderSpec(provider.id);
    if (!spec) {
      toast.error("Provedor inválido.");
      return;
    }

    const assistantId = `a-${Date.now().toString(36)}`;
    appendMessage(thread.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      providerId: provider.id,
      modelId,
      streaming: true,
    });
    setStreaming(true);

    const history = [
      ...thread.messages,
      {
        id: `u-h-${createdAt.toString(36)}`,
        role: "user" as const,
        content: clean,
        createdAt,
      },
    ].filter((msg) => msg.role !== "system");
    let acc = "";
    let settled = false;

    try {
      await new Promise<void>((resolve, reject) => {
        const stopStream = api.streamChat({
          spec,
          model: modelId,
          messages: history.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: 0.7,
          onToken: (delta) => {
            acc += delta;
            patchMessage(thread.id, assistantId, { content: acc });
          },
          onDone: () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          },
          onError: (err) => {
            if (!settled) {
              settled = true;
              reject(new Error(err));
            }
          },
        });
        stopRef.current = () => {
          stopStream();
          if (!settled) {
            settled = true;
            resolve();
          }
        };
      });
      patchMessage(thread.id, assistantId, { streaming: false });
    } catch (err) {
      const message = (err as Error).message;
      patchMessage(thread.id, assistantId, {
        streaming: false,
        error: message,
        content: acc || `Erro: ${message}`,
      });
      toast.error(message);
    } finally {
      setStreaming(false);
      stopRef.current = null;
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
                options={providerOptions.map((provider) => ({
                  value: provider.id,
                  label: `${provider.name}${providerIsUsable(provider) ? "" : " (disabled)"}`,
                }))}
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
                value={runtimeValue}
                onChange={(value) =>
                  setSelection({
                    runtimeId: value === DIRECT_RUNTIME ? undefined : value,
                  })
                }
                options={[
                  { value: DIRECT_RUNTIME, label: "Direct Provider" },
                  ...runtimes.map((runtime) => ({
                    value: runtime.id,
                    label: `${runtime.isDefault ? "* " : ""}${runtime.name}`,
                  })),
                ]}
                emptyLabel="Direct Provider"
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
                  Escolha provider e modelo para iniciar.
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
        <label className="mb-3 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-xs font-semibold text-slate-500">
          <Search className="h-3.5 w-3.5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar conversas"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="app-scrollbar flex-1 space-y-4 overflow-y-auto">
          {Object.entries(filteredGroups).map(([label, group]) => (
            <div key={label}>
              <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <div className="space-y-2">
                {group.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "group rounded-2xl border p-3 transition",
                      thread.id === activeThread?.id
                        ? "border-slate-900/20 bg-white text-slate-950 shadow"
                        : "border-white/70 bg-white/45 text-slate-600 hover:bg-white/70",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openThread(thread.id)}
                      onDoubleClick={() => {
                        setEditingId(thread.id);
                        setEditingTitle(thread.title);
                      }}
                      className="w-full text-left"
                    >
                      {editingId === thread.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          onBlur={() => commitRename(thread.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitRename(thread.id);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          className="w-full bg-transparent text-sm font-bold outline-none"
                        />
                      ) : (
                        <span className="block truncate text-sm font-bold">
                          {thread.title}
                        </span>
                      )}
                      <span className="mt-1 block text-xs">
                        {thread.messages.length} messages
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeleteThread(thread.id)}
                      className="mt-2 hidden items-center gap-1 text-[11px] font-bold text-rose-500 group-hover:inline-flex"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {threads.length > 0 && Object.keys(filteredGroups).length === 0 ? (
            <p className="rounded-2xl bg-white/45 p-4 text-center text-xs font-semibold text-slate-500">
              Nenhuma conversa encontrada.
            </p>
          ) : null}
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
