import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Mic,
  MicOff,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Send,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatBubble } from "@/components/ChatBubble";
import { toast } from "@/components/Toast";
import {
  ensurePresetsRegistered,
  getRuntimeProviderSpec,
  useConfig,
} from "@/stores/config";
import type { ChatMessageV2 } from "@/types";
import {
  getModelOptions,
  getProviderOptions,
  providerIsUsable,
  resolveModelId,
  resolveProviderId,
  resolveRuntimeId,
} from "@/services/configSelectors";
import { api } from "@/services/api";
import { createAdapter } from "@/services/adapters";
import { executeInlineToolCalls } from "@/services/inlineToolCalls";
import { buildRuntimeToolingContext } from "@/services/runtimeToolingContext";
import { cn } from "@/utils/cn";
import { memoryEngine } from "@/core/ai/memory/MemoryEngine";
import { useSmartScroll } from "@/shared/hooks/useSmartScroll";
import { throttle } from "@/utils/throttle";
import { presetById } from "@/services/providers";
import type { ProviderAudioMode } from "@/types";

type ChatThreadDraft = Parameters<
  ReturnType<typeof useConfig.getState>["addChatThread"]
>[0];

const DIRECT_RUNTIME = "direct-chat";
const DEFAULT_CHAT_AUDIO_MODES: ProviderAudioMode[] = ["tts", "stt", "realtime"];

type SpeechRecognitionAlternativeLike = { transcript?: string };
type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results?: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const voiceWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
}

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
  const [queryDraft, setQueryDraft] = useState("");
  const query = useDebouncedValue(queryDraft, 80);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [virtualViewportHeight, setVirtualViewportHeight] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const { containerRef: scrollerRef, scrollToBottom, forceScrollToBottom } =
    useSmartScroll<HTMLDivElement>({ threshold: 120, behavior: "smooth" });
  const previousMessageCountRef = useRef(0);
  const previousStreamingRef = useRef(false);

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
    undefined,
    providers,
    { fallbackToFirst: false },
  );
  const modelId = resolveModelId(
    selection.model,
    undefined,
    providerId,
    providers,
    models,
    { fallbackToFirst: false },
  );
  const explicitDirect = selection.runtimeId === DIRECT_RUNTIME;
  const resolvedRuntimeId = explicitDirect
    ? undefined
    : resolveRuntimeId(
        selection.runtimeId,
        undefined,
        runtimes,
        { fallbackToFirst: false },
      );
  const runtimeValue = explicitDirect
    ? DIRECT_RUNTIME
    : (resolvedRuntimeId ?? DIRECT_RUNTIME);
  const providerOptions = useMemo(
    () => getProviderOptions(providers, true),
    [providers],
  );
  const modelOptions = useMemo(
    () => getModelOptions(providerId, providers, models),
    [modelId, models, providerId, providers],
  );
  const selectedProvider = providerId ? providers[providerId] : undefined;
  const selectedProviderPreset = selectedProvider
    ? presetById(selectedProvider.presetId)
    : undefined;
  const voiceEnabled = Boolean(selection.voiceEnabled);
  const voiceMode =
    selection.voiceMode ??
    selectedProviderPreset?.audioModes?.[0] ??
    DEFAULT_CHAT_AUDIO_MODES[0];
  const [voiceListening, setVoiceListening] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceLoopRef = useRef(false);
  const voiceOptions = useMemo(() => {
    const presetVoices = selectedProviderPreset?.presetVoices ?? [];
    const browserVoiceNames = browserVoices.map((voice) => voice.name);
    return Array.from(new Set([...presetVoices, ...browserVoiceNames])).filter(Boolean);
  }, [browserVoices, selectedProviderPreset]);
  const voiceModeOptions = useMemo(
    () =>
      (selectedProviderPreset?.audioModes?.length
        ? selectedProviderPreset.audioModes
        : DEFAULT_CHAT_AUDIO_MODES
      ).map((mode) => ({
        value: mode,
        label: mode.toUpperCase(),
      })),
    [selectedProviderPreset],
  );
  const voiceNameOptions = useMemo(
    () =>
      (voiceOptions.length ? voiceOptions : ["default"]).map((voice) => ({
        value: voice,
        label: voice,
      })),
    [voiceOptions],
  );
  const canUseSpeechRecognition = useMemo(
    () => Boolean(getSpeechRecognitionCtor()),
    [],
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const syncVoices = () => setBrowserVoices(synth.getVoices());
    syncVoices();
    synth.onvoiceschanged = syncVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  const activeMessages = activeThread?.messages ?? [];
  const shouldVirtualizeMessages = activeMessages.length > 40;
  const virtualizedMessages = useMemo(
    () =>
      getVirtualMessageWindow({
        messages: activeMessages,
        scrollTop: virtualScrollTop,
        viewportHeight: virtualViewportHeight,
        enabled: shouldVirtualizeMessages,
      }),
    [
      activeMessages,
      shouldVirtualizeMessages,
      virtualScrollTop,
      virtualViewportHeight,
    ],
  );

  useEffect(() => {
    const count = activeMessages.length;
    if (count > previousMessageCountRef.current) {
      scrollToBottom();
    }
    previousMessageCountRef.current = count;
  }, [activeMessages.length, scrollToBottom]);

  useEffect(() => {
    if (streaming && !previousStreamingRef.current) {
      forceScrollToBottom();
    }
    previousStreamingRef.current = streaming;
  }, [streaming, forceScrollToBottom]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const updateMetrics = () => {
      setVirtualScrollTop(node.scrollTop);
      setVirtualViewportHeight(node.clientHeight);
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [activeThread?.id, scrollerRef]);

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

  function stopVoiceCapture() {
    voiceLoopRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoiceListening(false);
  }

  function speakAssistantText(text: string, restartRealtimeLoop: boolean) {
    if (!voiceEnabled || voiceMode === "stt") return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const clean = text.trim();
    if (!clean) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const selectedVoice = browserVoices.find(
      (voice) => voice.name === selection.voiceName,
    );
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = settings.language === "en-US" ? "en-US" : "pt-BR";
    utterance.rate = 1;
    utterance.onend = () => {
      if (restartRealtimeLoop && voiceEnabled && voiceMode === "realtime") {
        window.setTimeout(() => {
          void startVoiceCapture(true);
        }, 180);
      }
    };
    synth.speak(utterance);
  }

  async function startVoiceCapture(autoSend: boolean) {
    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      toast.error("Reconhecimento de voz do navegador não está disponível aqui.");
      return;
    }
    if (voiceListening) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const recognition = new RecognitionCtor();
    recognition.lang = settings.language === "en-US" ? "en-US" : "pt-BR";
    recognition.continuous = autoSend;
    recognition.interimResults = autoSend;
    voiceLoopRef.current = autoSend;
    recognition.onresult = (event) => {
      const results = event.results;
      if (!results) return;
      const fragments: string[] = [];
      for (let index = event.resultIndex ?? 0; index < results.length; index += 1) {
        const result = results[index];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) continue;
        if (result.isFinal) {
          fragments.push(transcript);
        }
      }
      const transcript = fragments.join(" ").trim();
      if (!transcript) return;
      if (autoSend) {
        voiceLoopRef.current = false;
        recognition.stop();
        recognitionRef.current = null;
        setVoiceListening(false);
        void sendText(transcript);
        return;
      }
      setInput((current) => (current ? `${current.trim()} ${transcript}` : transcript));
      recognition.stop();
    };
    recognition.onerror = (event) => {
      if (event.error && event.error !== "aborted" && event.error !== "no-speech") {
        toast.error(`Voz: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
      if (autoSend && voiceLoopRef.current && !streaming) {
        window.setTimeout(() => {
          void startVoiceCapture(true);
        }, 220);
      }
    };
    recognitionRef.current = recognition;
    setVoiceListening(true);
    recognition.start();
  }

  function openThread(threadId: string) {
    setActiveThread(threadId);
    navigate(`/chat/${threadId}`);
  }

  function startRenameThread(threadId: string, title: string) {
    setEditingId(threadId);
    setEditingTitle(title);
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
    const shouldResumeRealtimeVoice = voiceEnabled && voiceMode === "realtime";
    if (shouldResumeRealtimeVoice) {
      stopVoiceCapture();
    }
    const thread = activeThread ?? newChatThread(clean.slice(0, 48));
    if (!activeThread) {
      addThread(thread);
      navigate(`/chat/${thread.id}`);
    }

    const effectiveRuntimeId =
      runtimeValue === DIRECT_RUNTIME ? undefined : runtimeValue;

    const createdAt = Date.now();
    appendMessage(thread.id, {
      id: `u-${createdAt.toString(36)}`,
      role: "user",
      content: clean,
      createdAt,
      providerId,
      modelId,
      runtimeId: effectiveRuntimeId,
    });
    setInput("");
    forceScrollToBottom();

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
      runtimeId: effectiveRuntimeId,
      streaming: true,
    });
    setStreaming(true);

    await memoryEngine.initialize(thread.id);

    const history = [
      ...thread.messages,
      {
        id: `u-h-${createdAt.toString(36)}`,
        role: "user" as const,
        content: clean,
        createdAt,
      },
    ].filter((msg) => msg.role !== "system");
    const memoryAugmentedHistory = await memoryEngine.buildContextWithMemory(
      clean,
      history.map((msg) => ({ role: msg.role, content: msg.content })),
    );
    let acc = "";
    const flushAssistant = throttle((content: string) => {
      patchMessage(thread.id, assistantId, { content });
      scrollToBottom();
    }, 80);
    let settled = false;
    const runtime = effectiveRuntimeId
      ? runtimes.find((item) => item.id === effectiveRuntimeId)
      : undefined;
    const adapter = runtime ? createAdapter(runtime) : undefined;
    const abortController = new AbortController();
    const runtimeHistory = memoryAugmentedHistory.map((msg, idx) => ({
      id: `mem-${idx}`,
      role: msg.role,
      content: msg.content,
      createdAt,
    }));
    const runtimeToolingContext = await buildRuntimeToolingContext({
      prompt: clean,
      selectedSkillIds: selection.skillIds,
      selectedRuntimeId: effectiveRuntimeId,
      includeLiveWebSearch: true,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        const fail = (message: string) => {
          if (!settled) {
            settled = true;
            reject(new Error(message));
          }
        };

        const stopStream = adapter
          ? (() => {
              void adapter
                .chat(
                  runtimeHistory,
                  {
                    spec,
                    model: modelId,
                    systemPrompt: runtimeToolingContext,
                    signal: abortController.signal,
                  },
                  (chunk) => {
                    if (chunk.event === "token") {
                      const delta =
                        chunk.data && typeof chunk.data === "object"
                          ? (chunk.data as { delta?: string }).delta
                          : undefined;
                      if (delta) {
                        acc += delta;
                        flushAssistant(acc);
                      }
                      return;
                    }
                    if (chunk.event === "error") {
                      const message =
                        chunk.data && typeof chunk.data === "object"
                          ? ((chunk.data as { message?: string }).message ??
                            "runtime error")
                          : "runtime error";
                      fail(message);
                      return;
                    }
                    if (chunk.event === "done") finish();
                  },
                )
                .catch((err: Error) => fail(err.message));
              return () => abortController.abort();
            })()
          : api.streamChat({
              spec,
              model: modelId,
              messages: [
                ...(runtimeToolingContext
                  ? [{ role: "system" as const, content: runtimeToolingContext }]
                  : []),
                ...memoryAugmentedHistory.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
              ],
              temperature: 0.7,
              onToken: (delta) => {
                acc += delta;
                flushAssistant(acc);
              },
              onDone: finish,
              onError: fail,
            });

        stopRef.current = () => {
          abortController.abort();
          stopStream();
          finish();
        };
      });
      const toolExecution = await executeInlineToolCalls(acc);
      let finalContent = toolExecution.content;
      if (toolExecution.executed > 0 && toolExecution.toolResultsMarkdown) {
        const baseAfterTools = [
          finalContent,
          "_Continuando a resposta com os resultados reais das ferramentas..._",
        ].join("\n\n");
        patchMessage(thread.id, assistantId, { content: baseAfterTools });
        scrollToBottom();

        let continuation = "";
        await new Promise<void>((resolve, reject) => {
          const stopContinuation = api.streamChat({
            spec,
            model: modelId,
            messages: [
              ...(runtimeToolingContext
                ? [{ role: "system" as const, content: runtimeToolingContext }]
                : []),
              {
                role: "system" as const,
                content:
                  "Você está na etapa pós-tool do Nexus Ultra AGI. Use os resultados reais abaixo para responder ao usuário. Não emita novo <tool_call>, não mostre JavaScript, não diga apenas que executou a ferramenta. Produza a síntese final acionável com fontes/URLs quando existirem.",
              },
              ...memoryAugmentedHistory.map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
              {
                role: "assistant" as const,
                content: acc,
              },
              {
                role: "user" as const,
                content: [
                  "Resultados reais das ferramentas:",
                  toolExecution.toolResultsMarkdown,
                  "",
                  "Agora continue e entregue a resposta final completa ao pedido original.",
                ].join("\n"),
              },
            ],
            temperature: 0.45,
            onToken: (delta) => {
              continuation += delta;
              patchMessage(thread.id, assistantId, {
                content: [toolExecution.content, continuation.trimStart()]
                  .filter(Boolean)
                  .join("\n\n"),
              });
              scrollToBottom();
            },
            onDone: resolve,
            onError: reject,
          });
          stopRef.current = () => {
            stopContinuation();
            resolve();
          };
        });
        finalContent = [toolExecution.content, continuation.trim()]
          .filter(Boolean)
          .join("\n\n");
      }
      patchMessage(thread.id, assistantId, {
        content: finalContent,
        streaming: false,
      });
      scrollToBottom();
      await memoryEngine.remember({
        agentId: thread.id,
        content: clean,
        type: "user_message",
        importance: 0.55,
        tags: ["chat", "user"],
      });
      await memoryEngine.remember({
        agentId: thread.id,
        content: finalContent,
        type: "assistant_message",
        importance: 0.6,
        tags: ["chat", "assistant"],
      });
      speakAssistantText(finalContent, shouldResumeRealtimeVoice);
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
    <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[18px] bg-white/20 sm:rounded-[22px] lg:gap-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="chat-surface relative flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:rounded-[36px]">
        <div className="relative px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Chat
              </p>
              <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-1 sm:text-lg">
                Conversa agêntica
              </h1>
            </div>
            <div className="nexus-mobile-chat-pickers grid w-full min-w-0 grid-cols-4 gap-1 md:hidden">
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
                compactMobile
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
                compactMobile
              />
              <LabeledSelect
                label="Runtime"
                value={runtimeValue}
                onChange={(value) =>
                  setSelection({
                    runtimeId: value,
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
                compactMobile
              />
              <MobileVoiceControl
                voiceEnabled={voiceEnabled}
                voiceMode={voiceMode}
                voiceModeOptions={voiceModeOptions}
                voiceName={selection.voiceName ?? voiceNameOptions[0]?.value ?? "default"}
                voiceNameOptions={voiceNameOptions}
                voiceListening={voiceListening}
                canUseSpeechRecognition={canUseSpeechRecognition}
                onToggle={() => {
                  const next = !voiceEnabled;
                  setSelection({
                    voiceEnabled: next,
                    voiceMode: next ? voiceMode : undefined,
                  });
                  if (!next) stopVoiceCapture();
                }}
                onModeChange={(value) =>
                  setSelection({ voiceMode: value as ProviderAudioMode })
                }
                onVoiceChange={(value) => setSelection({ voiceName: value })}
                onMicClick={() => {
                  if (voiceListening) {
                    stopVoiceCapture();
                    return;
                  }
                  void startVoiceCapture(voiceMode === "realtime");
                }}
              />
            </div>
            <div className="hidden w-full gap-2 md:grid md:min-w-[560px] md:grid-cols-3">
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
                    runtimeId: value,
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
            <div className="hidden w-full flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-[11px] font-semibold text-slate-600 md:flex md:min-w-[560px]">
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setSelection({
                    voiceEnabled: next,
                    voiceMode: next ? voiceMode : undefined,
                  });
                  if (!next) stopVoiceCapture();
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                  voiceEnabled
                    ? "bg-[#17172d] text-white"
                    : "bg-white text-slate-700",
                )}
              >
                <Volume2 className="h-3.5 w-3.5" />Voice
              </button>
              {voiceEnabled ? (
                <>
                  <InlineSelect
                    label="Mode"
                    value={voiceMode}
                    onChange={(value) =>
                      setSelection({ voiceMode: value as ProviderAudioMode })
                    }
                    options={voiceModeOptions}
                  />
                  <InlineSelect
                    label="Voice"
                    value={selection.voiceName ?? voiceNameOptions[0]?.value ?? "default"}
                    onChange={(value) => setSelection({ voiceName: value })}
                    options={voiceNameOptions}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceListening) {
                        stopVoiceCapture();
                        return;
                      }
                      void startVoiceCapture(voiceMode === "realtime");
                    }}
                    disabled={!canUseSpeechRecognition}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                      voiceListening
                        ? "bg-rose-100 text-rose-700"
                        : "bg-white text-slate-700",
                    )}
                  >
                    {voiceListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {voiceMode === "realtime" ? "Realtime" : "Mic"}
                  </button>
                  {voiceMode === "realtime" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                      <Radio className="h-3.5 w-3.5" />Loop de voz
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="app-scrollbar relative mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:gap-4 sm:px-8 sm:py-4 lg:px-10"
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
            <>
              {virtualizedMessages.topSpacer > 0 ? (
                <div
                  aria-hidden="true"
                  style={{ height: virtualizedMessages.topSpacer }}
                />
              ) : null}
              {virtualizedMessages.messages.map((message, index) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  index={virtualizedMessages.startIndex + index}
                />
              ))}
              {virtualizedMessages.bottomSpacer > 0 ? (
                <div
                  aria-hidden="true"
                  style={{ height: virtualizedMessages.bottomSpacer }}
                />
              ) : null}
            </>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[980px] px-3 pb-4 sm:px-8 sm:pb-5 lg:px-10 lg:pb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 sm:mb-3 sm:text-sm">
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
            className="flex items-center gap-2 rounded-[24px] border border-white/80 bg-white/75 p-1.5 shadow-[0_16px_50px_rgba(90,105,150,0.16)] backdrop-blur-xl sm:gap-3 sm:rounded-[28px] sm:p-2"
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
              className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-500 sm:min-h-10 sm:px-3 sm:py-2 sm:text-base"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 sm:h-12 sm:w-12"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#17172d] text-white shadow-[0_10px_28px_rgba(23,23,45,0.25)] disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:w-12"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            )}
          </form>
        </div>
      </div>

      <aside className="chat-surface hidden min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/18 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl dark:border-white/10 lg:flex lg:rounded-[36px]">
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
        <label className="mb-3 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-900/78 dark:text-slate-400">
          <Search className="h-3.5 w-3.5" />
          <input
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Buscar conversas"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
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
                        ? "border-slate-900/20 bg-white text-slate-950 shadow dark:border-white/12 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none"
                        : "border-white/70 bg-white/45 text-slate-600 hover:bg-white/70 dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-300 dark:hover:bg-slate-900",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openThread(thread.id)}
                      onDoubleClick={() => startRenameThread(thread.id, thread.title)}
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
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => startRenameThread(thread.id, thread.title)}
                        className="text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteThread(thread.id)}
                        className="inline-flex items-center gap-1 text-rose-500 transition hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {threads.length > 0 && Object.keys(filteredGroups).length === 0 ? (
            <p className="rounded-2xl bg-white/45 p-4 text-center text-xs font-semibold text-slate-500 dark:bg-slate-900/72 dark:text-slate-400">
              Nenhuma conversa encontrada.
            </p>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

function InlineSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
      <span className="uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-[11px] font-bold text-slate-700 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileVoiceControl({
  voiceEnabled,
  voiceMode,
  voiceListening,
  canUseSpeechRecognition,
  onToggle,
  onMicClick,
}: {
  voiceEnabled: boolean;
  voiceMode: ProviderAudioMode;
  voiceModeOptions: Array<{ value: string; label: string }>;
  voiceName: string;
  voiceNameOptions: Array<{ value: string; label: string }>;
  voiceListening: boolean;
  canUseSpeechRecognition: boolean;
  onToggle: () => void;
  onModeChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  onMicClick: () => void;
}) {
  return (
    <div className="nexus-compact-control min-w-0 rounded-md border border-white/70 bg-white/75 px-1 py-0.5 shadow-inner">
      <span className="block min-w-0 truncate text-[7px] font-bold uppercase tracking-[0.08em] text-slate-500">
        Voice
      </span>
      <div className="mt-0.5 flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={voiceEnabled ? onMicClick : onToggle}
          disabled={voiceEnabled && !canUseSpeechRecognition}
          className={cn(
            "inline-flex h-5 min-w-0 flex-1 items-center justify-center gap-0.5 rounded px-0.5 text-[9px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
            voiceEnabled
              ? voiceListening
                ? "bg-rose-100 text-rose-700"
                : "bg-[#17172d] text-white"
              : "bg-white text-slate-700",
          )}
          title={voiceEnabled ? "Capturar voz" : "Ativar voz"}
        >
          {voiceListening ? <MicOff className="h-2.5 w-2.5" /> : <Volume2 className="h-2.5 w-2.5" />}
          <span className="truncate">{voiceEnabled ? (voiceMode === "realtime" ? "RT" : "Mic") : "Off"}</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-slate-700"
          title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
        >
          {voiceEnabled ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
        </button>
      </div>
      <p className="mt-0.5 truncate text-[7px] font-semibold text-slate-400">
        {voiceEnabled ? voiceMode.toUpperCase() : "Voice off"}
      </p>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  className,
  compactMobile,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
  className?: string;
  compactMobile?: boolean;
}) {
  if (compactMobile) {
    return (
      <label className="nexus-compact-control block min-w-0 rounded-md border border-white/70 bg-white/75 px-1 py-0.5 shadow-inner">
        <span className="block truncate text-[7px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={options.length === 0}
          className="mt-0.5 h-4 w-full min-w-0 bg-transparent text-[9px] font-bold leading-3 text-slate-900 outline-none disabled:text-slate-400"
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
  return (
    <label className={cn("rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-inner", className)}>
      <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
        className="mt-0.5 w-full bg-transparent text-[11px] font-bold text-slate-900 outline-none disabled:text-slate-400 sm:mt-1 sm:text-sm"
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [delayMs, value]);

  return debounced;
}

function estimateMessageHeight(message: ChatMessageV2) {
  const base = message.role === "assistant" ? 136 : 92;
  const contentWeight = Math.min(320, Math.ceil(message.content.length / 220) * 28);
  const attachmentWeight = (message.attachments?.length ?? 0) * 44;
  const generatedWeight = (message.generatedFiles?.length ?? 0) * 52;
  return base + contentWeight + attachmentWeight + generatedWeight;
}

function getVirtualMessageWindow({
  messages,
  scrollTop,
  viewportHeight,
  enabled,
}: {
  messages: ChatMessageV2[];
  scrollTop: number;
  viewportHeight: number;
  enabled: boolean;
}) {
  if (!enabled) {
    return {
      startIndex: 0,
      endIndex: messages.length,
      messages,
      topSpacer: 0,
      bottomSpacer: 0,
    };
  }

  const overscan = 5;
  const heights = messages.map(estimateMessageHeight);
  const prefix = new Array<number>(heights.length + 1).fill(0);
  for (let index = 0; index < heights.length; index += 1) {
    prefix[index + 1] = prefix[index] + heights[index];
  }

  const start = findMessageIndex(prefix, scrollTop);
  const end = findMessageIndex(prefix, scrollTop + viewportHeight + 240);
  const startIndex = Math.max(0, start - overscan);
  const endIndex = Math.min(messages.length, end + overscan + 1);

  return {
    startIndex,
    endIndex,
    messages: messages.slice(startIndex, endIndex),
    topSpacer: prefix[startIndex],
    bottomSpacer: prefix[messages.length] - prefix[endIndex],
  };
}

function findMessageIndex(prefix: number[], offset: number) {
  let low = 0;
  let high = prefix.length - 2;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (prefix[mid + 1] < offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, Math.min(prefix.length - 2, low));
}
