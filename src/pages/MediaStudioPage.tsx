import { useEffect, useMemo, useState } from "react";
import { Image, Music, Send, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { WorkspaceShell, Surface, SectionTitle, SelectControl, Spinner, EditableField } from "@/components/ui";
import { useConfig } from "@/stores/config";
import { toast } from "@/components/Toast";
import { getModelOptions } from "@/services/configSelectors";
import { presetById } from "@/services/providers";
import type { ProviderAudioMode } from "@/types";

export type MediaStudioKind = "image" | "video" | "audio";

const DEFAULT_AUDIO_MODES: ProviderAudioMode[] = ["tts", "stt", "realtime"];
const DEFAULT_AUDIO_VOICES = ["default", "alloy", "nova", "verse", "calm"];

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
  const [submitting, setSubmitting] = useState(false);
  const meta = META[kind];
  const Icon = meta.icon;

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
  const modelOptions = useMemo(
    () => (activeProvider ? getModelOptions(activeProvider.id, providers, models, true) : []),
    [activeProvider, models, providers],
  );
  const audioModes = activePreset?.audioModes?.length ? activePreset.audioModes : DEFAULT_AUDIO_MODES;
  const voiceOptions = activePreset?.presetVoices?.length ? activePreset.presetVoices : DEFAULT_AUDIO_VOICES;

  useEffect(() => {
    const nextModel = modelOptions[0]?.id ?? activeProvider?.defaultModel ?? "";
    if (nextModel && !modelId) setModelId(nextModel);
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
    ]
      .filter(Boolean)
      .join(" • ");
    toast.info(`Solicitação preparada. ${summary}. O backend de mídia ainda precisa do endpoint específico para executar a geração real.`);
  }

  return (
    <WorkspaceShell eyebrow={meta.eyebrow} title={meta.title} description={meta.desc}>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Surface className="space-y-4">
          <SectionTitle icon={Icon} title="Prompt" desc="A solicitação é validada contra providers configurados." />
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={8}
            placeholder="Descreva o resultado esperado..."
            className="app-scrollbar w-full resize-none rounded-[20px] border border-white/70 bg-white/70 p-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
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
            Este módulo evita simular mídia. Agora ele já registra provider, modelo e, no áudio, voz + modo. Quando houver endpoint de mídia no backend, a mesma tela executará a geração real com essa configuração.
          </div>
        </Surface>
      </div>
    </WorkspaceShell>
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
