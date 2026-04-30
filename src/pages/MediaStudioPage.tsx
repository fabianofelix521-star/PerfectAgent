import { useMemo, useState } from "react";
import { Image, Music, Send, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { WorkspaceShell, Surface, SectionTitle, SelectControl, Spinner } from "@/components/ui";
import { useConfig } from "@/stores/config";
import { toast } from "@/components/Toast";

export type MediaStudioKind = "image" | "video" | "audio";

const META = {
  image: {
    eyebrow: "Image Studio",
    title: "Geração de imagens",
    desc: "Usa os providers configurados para preparar prompts e registrar solicitações de imagem.",
    icon: Image,
    providerIds: ["openai", "stability", "replicate", "openrouter"],
  },
  video: {
    eyebrow: "Video Studio",
    title: "Geração de vídeo",
    desc: "Organiza prompts e providers compatíveis para fluxos de vídeo.",
    icon: Video,
    providerIds: ["replicate", "openrouter", "custom"],
  },
  audio: {
    eyebrow: "Audio Studio",
    title: "Geração de áudio",
    desc: "Organiza prompts e providers compatíveis para voz e áudio.",
    icon: Music,
    providerIds: ["elevenlabs", "replicate", "openrouter"],
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
  const [prompt, setPrompt] = useState("");
  const [providerId, setProviderId] = useState("");
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
    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setSubmitting(false);
    toast.info(
      "Solicitação preparada. O backend de geração de mídia ainda precisa de um endpoint específico para executar este provider.",
    );
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
            <SelectControl<string>
              label="Provider"
              value={providerId || configuredProviders[0].id}
              onChange={setProviderId}
              options={configuredProviders.map((provider) => ({
                value: provider.id,
                label: provider.name,
              }))}
            />
          ) : (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Nenhum provider compatível configurado.
            </div>
          )}
          <div className="rounded-2xl bg-white/60 p-4 text-xs font-medium leading-6 text-slate-600">
            Este módulo evita simular mídia. Quando uma API key compatível estiver configurada e houver endpoint de mídia no backend, a mesma tela executará a geração real.
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
