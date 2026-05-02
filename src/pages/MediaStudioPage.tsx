import { useEffect, useMemo, useState } from "react";
import { Download, FileAudio, FileText, Image, Music, Send, Upload, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { WorkspaceShell, Surface, SectionTitle, SelectControl, Spinner, EditableField } from "@/components/ui";
import { useConfig } from "@/stores/config";
import { toast } from "@/components/Toast";
import { getModelOptions } from "@/services/configSelectors";
import { presetById, resolveProviderSpec } from "@/services/providers";
import { api } from "@/services/api";
import type { ProviderAudioMode } from "@/types";

export type MediaStudioKind = "image" | "video" | "audio";

interface MediaOutput {
  kind: MediaStudioKind;
  url: string;
  filename: string;
  mimeType: string;
  createdAt: number;
}

const DEFAULT_AUDIO_MODES: ProviderAudioMode[] = ["tts", "stt", "realtime"];
const DEFAULT_AUDIO_VOICES = ["default", "alloy", "nova", "verse", "calm"];
const MAX_MEDIA_INPUT_BYTES = 8 * 1024 * 1024;

const META = {
  image: {
    eyebrow: "Image Studio",
    title: "Geração de imagens",
    desc: "Usa os providers configurados para preparar prompts e registrar solicitações de imagem.",
    icon: Image,
    providerIds: ["openai", "stability", "replicate", "openrouter", "dashscope", "custom"],
  },
  video: {
    eyebrow: "Video Studio",
    title: "Geração de vídeo",
    desc: "Organiza prompts e providers compatíveis para fluxos de vídeo.",
    icon: Video,
    providerIds: ["replicate", "openrouter", "openai", "dashscope", "xiaomi-mimo", "custom"],
  },
  audio: {
    eyebrow: "Audio Studio",
    title: "Geração de áudio",
    desc: "Organiza prompts e providers compatíveis para voz e áudio.",
    icon: Music,
    providerIds: ["elevenlabs", "replicate", "openrouter", "openai", "xai-voice", "xai", "dashscope", "xiaomi-mimo", "custom"],
  },
} satisfies Record<
  MediaStudioKind,
  {
    eyebrow: string;
    title: string;
    desc: string;
    icon: typeof Image;
    providerIds: string[];
  }
>;

export function MediaStudioPage({ kind = "image" }: { kind?: MediaStudioKind }) {
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
  const [prompt, setPrompt] = useState("");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [audioMode, setAudioMode] = useState<ProviderAudioMode>("tts");
  const [voiceName, setVoiceName] = useState("");
  const [voiceCloneFile, setVoiceCloneFile] = useState<File | null>(null);
  const [lipSyncAudioFile, setLipSyncAudioFile] = useState<File | null>(null);
  const [lipSyncText, setLipSyncText] = useState("");
  const [output, setOutput] = useState<MediaOutput | null>(null);
  const [lastRequestSummary, setLastRequestSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingNow, setGeneratingNow] = useState(false);
  const meta = META[kind];
  const Icon = meta.icon;
  const voiceClonePreviewUrl = useObjectUrl(voiceCloneFile);
  const lipSyncPreviewUrl = useObjectUrl(lipSyncAudioFile);

  const configuredProviders = useMemo(
    () =>
      Object.values(providers).filter(
        (provider) =>
          provider.configured &&
          provider.enabled &&
          (meta.providerIds.includes(provider.id) ||
            provider.spec.shape === "openai" ||
            provider.spec.shape === "custom"),
      ),
    [meta.providerIds, providers],
  );

  useEffect(() => {
    if (!providerId && configuredProviders[0]) {
      setProviderId(configuredProviders[0].id);
    }
  }, [configuredProviders, providerId]);

  const activeProviderId = providerId || configuredProviders[0]?.id || "";
  const activeProvider = activeProviderId ? providers[activeProviderId] : undefined;
  const activePreset = activeProvider ? presetById(activeProvider.presetId) : undefined;
  const baseModelOptions = useMemo(
    () => (activeProvider ? getModelOptions(activeProvider.id, providers, models, true) : []),
    [activeProvider, models, providers],
  );
  const modelOptions = useMemo(
    () =>
      mergeMediaModelOptions(
        baseModelOptions,
        mediaModelOptions(kind, activeProvider?.presetId ?? activeProvider?.id ?? "", activeProviderId),
      ),
    [activeProvider?.id, activeProvider?.presetId, activeProviderId, baseModelOptions, kind],
  );
  const audioModes = activePreset?.audioModes?.length ? activePreset.audioModes : DEFAULT_AUDIO_MODES;
  const voiceOptions = activePreset?.presetVoices?.length ? activePreset.presetVoices : DEFAULT_AUDIO_VOICES;

  useEffect(() => {
    const nextModel = modelOptions[0]?.id ?? activeProvider?.defaultModel ?? "";
    if (nextModel && (!modelId || !modelOptions.some((model) => model.id === modelId))) {
      setModelId(nextModel);
    }
  }, [activeProvider?.defaultModel, modelId, modelOptions]);

  useEffect(() => {
    if (kind !== "audio") return;
    if (!audioModes.includes(audioMode)) {
      setAudioMode(audioModes[0] ?? "tts");
    }
  }, [audioMode, audioModes, kind]);

  useEffect(() => {
    if (kind !== "audio") return;
    if (!voiceName) {
      setVoiceName(voiceOptions[0] ?? "default");
    }
  }, [kind, voiceName, voiceOptions]);

  useEffect(() => {
    setOutput(null);
    setLastRequestSummary("");
    setVoiceCloneFile(null);
    setLipSyncAudioFile(null);
    setLipSyncText("");
  }, [kind]);

  async function submit() {
    const clean = prompt.trim();
    if (!clean) {
      toast.error("Descreva o que deseja gerar.");
      return;
    }
    if (configuredProviders.length === 0) {
      toast.error("Configure uma API key compatível antes de gerar.");
      return;
    }
    if (!modelId.trim()) {
      toast.error("Escolha ou informe um modelo para a geração.");
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setSubmitting(false);
    const summary = [
      `Provider: ${activeProvider?.name ?? activeProviderId}`,
      `Modelo: ${modelId}`,
      kind === "audio" ? `Modo: ${audioMode}` : null,
      kind === "audio" ? `Voz: ${voiceName || "default"}` : null,
      kind === "audio" && voiceCloneFile ? `Clone: ${voiceCloneFile.name}` : null,
      kind === "video" && lipSyncAudioFile ? `Lipsync audio: ${lipSyncAudioFile.name}` : null,
      kind === "video" && lipSyncText.trim() ? "Lipsync texto configurado" : null,
    ]
      .filter(Boolean)
      .join(" • ");
    setLastRequestSummary(summary);
    toast.info(`Solicitação preparada. ${summary}. O backend de mídia ainda precisa do endpoint específico para executar a geração real.`);
  }

  async function generateNow() {
    const clean = prompt.trim();
    if (!clean) {
      toast.error("Descreva o que deseja gerar.");
      return;
    }
    if (!activeProvider) {
      toast.error("Configure uma API key compatível antes de gerar.");
      return;
    }
    if (!modelId.trim()) {
      toast.error("Escolha ou informe um modelo para a geração.");
      return;
    }

    const summary = buildRequestSummary({
      providerName: activeProvider.name ?? activeProviderId,
      model: modelId,
      kind,
      audioMode,
      voiceName,
      voiceCloneFile,
      lipSyncAudioFile,
      lipSyncText,
    });

    setGeneratingNow(true);
    setLastRequestSummary(summary);
    try {
      const [voiceClone, lipSyncAudio] = await Promise.all([
        kind === "audio" && voiceCloneFile ? fileToMediaPayload(voiceCloneFile) : Promise.resolve(undefined),
        kind === "video" && lipSyncAudioFile ? fileToMediaPayload(lipSyncAudioFile) : Promise.resolve(undefined),
      ]);
      const generated = await api.generateMedia({
        kind,
        providerId: activeProvider.id,
        presetId: activeProvider.presetId,
        spec: resolveProviderSpec(activeProvider.spec),
        model: modelId,
        prompt: clean,
        voiceName: voiceName || undefined,
        audioMode: kind === "audio" ? audioMode : undefined,
        voiceClone,
        lipSync: kind === "video"
          ? {
              audio: lipSyncAudio,
              text: lipSyncText.trim() || undefined,
            }
          : undefined,
      });
      setOutput(generated);
      toast.success("Conteúdo gerado e enviado para o output.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar mídia.");
    } finally {
      setGeneratingNow(false);
    }
  }

  function downloadOutput() {
    if (!output) return;
    const anchor = document.createElement("a");
    anchor.href = output.url;
    anchor.download = output.filename;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  return (
    <WorkspaceShell eyebrow={meta.eyebrow} title={meta.title} description={meta.desc}>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Surface className="space-y-4">
            <SectionTitle icon={Icon} title="Prompt" desc="A solicitação é validada contra providers configurados." />
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              placeholder="Descreva o resultado esperado..."
              className="app-scrollbar w-full resize-none rounded-[20px] border border-white/70 bg-white/70 p-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300"
            />

            {kind === "audio" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <FileInputCard
                  icon={FileAudio}
                  label="Input para clonagem de voz"
                  description="Envie uma amostra de voz para anexar ao pedido de clonagem."
                  accept="audio/*"
                  file={voiceCloneFile}
                  onChange={setVoiceCloneFile}
                />
                <div className="rounded-[18px] border border-white/70 bg-white/55 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Preview da amostra
                  </p>
                  {voiceClonePreviewUrl ? (
                    <audio src={voiceClonePreviewUrl} controls className="mt-3 w-full" />
                  ) : (
                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                      Nenhuma amostra de clonagem selecionada.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {kind === "video" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <FileInputCard
                  icon={FileAudio}
                  label="Input de áudio para lipsync"
                  description="Envie o áudio que será sincronizado com o vídeo/personagem."
                  accept="audio/*"
                  file={lipSyncAudioFile}
                  onChange={setLipSyncAudioFile}
                />
                <label className="block rounded-[18px] border border-white/70 bg-white/55 p-3">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    Input de texto para lipsync
                  </span>
                  <textarea
                    value={lipSyncText}
                    onChange={(event) => setLipSyncText(event.target.value)}
                    rows={5}
                    placeholder="Texto que guia o lipsync..."
                    className="app-scrollbar w-full resize-none bg-transparent text-sm font-semibold leading-6 text-slate-800 outline-none"
                  />
                </label>
                {lipSyncPreviewUrl ? (
                  <div className="rounded-[18px] border border-white/70 bg-white/55 p-3 lg:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Preview do áudio de lipsync
                    </p>
                    <audio src={lipSyncPreviewUrl} controls className="mt-3 w-full" />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void generateNow()}
                disabled={generatingNow}
                className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {generatingNow ? <Spinner size={14} /> : <Icon className="h-4 w-4" />}
                Gerar agora
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                {submitting ? <Spinner size={14} /> : <Send className="h-4 w-4" />}
                Preparar geração
              </button>
              <Link
                to="/settings/api-keys"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
              >
                Configurar API keys
              </Link>
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle
                icon={Icon}
                title="Output gerado"
                desc={output ? "Mídia pronta para inspeção e download." : "A saída aparece aqui quando o backend/provider retornar a mídia real."}
              />
              <button
                type="button"
                onClick={downloadOutput}
                disabled={!output}
                className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
            <MediaOutputFrame kind={kind} output={output} lastRequestSummary={lastRequestSummary} />
          </Surface>
        </div>

        <Surface className="space-y-4">
          <SectionTitle icon={Icon} title="Provider" desc="Lista real baseada nas chaves configuradas." />
          {configuredProviders.length ? (
            <>
              <SelectControl<string>
                label="Provider"
                value={activeProviderId}
                onChange={(value) => {
                  setProviderId(value);
                  const nextModel = getModelOptions(value, providers, models, true)[0]?.id ?? providers[value]?.defaultModel ?? "";
                  setModelId(nextModel);
                }}
                options={configuredProviders.map((provider) => ({
                  value: provider.id,
                  label: provider.name,
                }))}
              />
              {modelOptions.length ? (
                <SelectControl<string>
                  label="Modelo"
                  value={modelId || modelOptions[0].id}
                  onChange={setModelId}
                  options={modelOptions.map((model) => ({
                    value: model.id,
                    label: model.label,
                  }))}
                />
              ) : (
                <EditableField
                  label="Modelo"
                  value={modelId}
                  onChange={setModelId}
                  placeholder="Informe o model id"
                />
              )}
              {kind === "audio" ? (
                <>
                  <SelectControl<ProviderAudioMode>
                    label="Modo"
                    value={audioMode}
                    onChange={setAudioMode}
                    options={audioModes.map((mode) => ({
                      value: mode,
                      label: mode.toUpperCase(),
                    }))}
                  />
                  {voiceOptions.length ? (
                    <SelectControl<string>
                      label="Voz"
                      value={voiceName || voiceOptions[0]}
                      onChange={setVoiceName}
                      options={voiceOptions.map((voice) => ({
                        value: voice,
                        label: voice,
                      }))}
                    />
                  ) : (
                    <EditableField
                      label="Voz"
                      value={voiceName}
                      onChange={setVoiceName}
                      placeholder="Nome da voz"
                    />
                  )}
                </>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Nenhum provider compatível configurado.
            </div>
          )}
          <div className="rounded-2xl bg-white/60 p-4 text-xs font-medium leading-6 text-slate-600">
            Este módulo evita simular mídia. Ele registra provider, modelo, inputs extras e mostra o output real quando o backend de mídia retornar uma URL ou arquivo gerado.
          </div>
        </Surface>
      </div>
    </WorkspaceShell>
  );
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

function buildRequestSummary({
  providerName,
  model,
  kind,
  audioMode,
  voiceName,
  voiceCloneFile,
  lipSyncAudioFile,
  lipSyncText,
}: {
  providerName: string;
  model: string;
  kind: MediaStudioKind;
  audioMode: ProviderAudioMode;
  voiceName: string;
  voiceCloneFile: File | null;
  lipSyncAudioFile: File | null;
  lipSyncText: string;
}) {
  return [
    `Provider: ${providerName}`,
    `Modelo: ${model}`,
    kind === "audio" ? `Modo: ${audioMode}` : null,
    kind === "audio" ? `Voz: ${voiceName || "default"}` : null,
    kind === "audio" && voiceCloneFile ? `Clone: ${voiceCloneFile.name}` : null,
    kind === "video" && lipSyncAudioFile ? `Lipsync audio: ${lipSyncAudioFile.name}` : null,
    kind === "video" && lipSyncText.trim() ? "Lipsync texto configurado" : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

async function fileToMediaPayload(file: File) {
  if (file.size > MAX_MEDIA_INPUT_BYTES) {
    throw new Error(`Arquivo ${file.name} excede ${(MAX_MEDIA_INPUT_BYTES / 1024 / 1024).toFixed(0)} MB.`);
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}.`));
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    dataUrl,
  };
}

function mediaModelOptions(kind: MediaStudioKind, presetId: string, providerId: string) {
  if (presetId === "openai") {
    if (kind === "image") {
      return ["dall-e-3", "gpt-image-1"].map((id) => ({
        id,
        providerId,
        name: id,
        label: id,
        enabled: true,
      }));
    }
    if (kind === "audio") {
      return ["tts-1", "gpt-4o-mini-tts"].map((id) => ({
        id,
        providerId,
        name: id,
        label: id,
        enabled: true,
      }));
    }
  }
  return [];
}

function mergeMediaModelOptions<T extends { id: string }>(base: T[], extras: T[]) {
  const seen = new Set<string>();
  return [...extras, ...base].filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

function FileInputCard({
  icon: Icon,
  label,
  description,
  accept,
  file,
  onChange,
}: {
  icon: typeof Upload;
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-[18px] border border-white/70 bg-white/55 p-3 transition hover:bg-white/75">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="flex min-h-[92px] flex-col justify-center rounded-[14px] border border-dashed border-slate-300/80 bg-white/50 px-3 py-4 text-center">
        <Upload className="mx-auto h-5 w-5 text-slate-400" />
        <span className="mt-2 text-xs font-semibold leading-5 text-slate-600">
          {file ? file.name : description}
        </span>
        {file ? (
          <span className="mt-1 text-[11px] font-semibold text-slate-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        ) : null}
      </span>
    </label>
  );
}

function MediaOutputFrame({
  kind,
  output,
  lastRequestSummary,
}: {
  kind: MediaStudioKind;
  output: MediaOutput | null;
  lastRequestSummary: string;
}) {
  if (output) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70">
        {kind === "image" ? (
          <img src={output.url} alt="Output gerado" className="max-h-[520px] w-full object-contain" />
        ) : null}
        {kind === "audio" ? (
          <div className="p-4">
            <audio src={output.url} controls className="w-full" />
          </div>
        ) : null}
        {kind === "video" ? (
          <video src={output.url} controls className="max-h-[560px] w-full bg-black" />
        ) : null}
        <div className="border-t border-white/70 px-4 py-3 text-xs font-semibold text-slate-500">
          {output.filename} • {output.mimeType}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300/80 bg-white/50 p-6 text-center">
      {kind === "image" ? <Image className="h-9 w-9 text-slate-300" /> : null}
      {kind === "audio" ? <Music className="h-9 w-9 text-slate-300" /> : null}
      {kind === "video" ? <Video className="h-9 w-9 text-slate-300" /> : null}
      <p className="mt-3 text-sm font-bold text-slate-700">
        Nenhum output gerado ainda
      </p>
      <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-slate-500">
        {lastRequestSummary
          ? `Última solicitação: ${lastRequestSummary}. O output real será exibido aqui quando a API de mídia retornar o arquivo.`
          : "Execute uma geração para visualizar o arquivo final nesta área."}
      </p>
    </div>
  );
}

export function ImageStudioPage() {
  return <MediaStudioPage kind="image" />;
}

export function VideoStudioPage() {
  return <MediaStudioPage kind="video" />;
}

export function AudioStudioPage() {
  return <MediaStudioPage kind="audio" />;
}
