import { useEffect, useMemo, useState } from "react";
import {
  Brain, KeyRound, Settings as SettingsIcon, Plug, Palette, ShieldCheck,
  Plus, Trash2, RefreshCw, Download, Upload, Check, AlertCircle,
} from "lucide-react";
import { WorkspaceShell, Surface, SectionTitle, EditableField, SelectControl, Modal, Spinner, ToggleRow, StatusBadge, Tag } from "@/components/ui";
import { useConfig, ensurePresetsRegistered } from "@/stores/config";
import { PROVIDER_PRESETS, presetById } from "@/services/providers";
import { api } from "@/services/api";
import { deobfuscate } from "@/services/storage";
import { getModelOptions, providerIsUsable } from "@/services/configSelectors";
import { toast } from "@/components/Toast";
import { BackendStatusBadge } from "@/components/BackendStatus";
import type { ModelConfig, ProviderConfig } from "@/types";
import { cn } from "@/utils/cn";

type Tab = "models" | "general" | "security" | "appearance";

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("models");

  useEffect(() => { ensurePresetsRegistered(); }, []);

  return (
    <WorkspaceShell
      eyebrow="Configurações"
      title="Centro de controle do SaaS agêntico"
      description="Modelos, governança, aparência e segurança em um só lugar."
      action={<BackendStatusBadge />}
    >
      <div className="mb-5 flex flex-wrap gap-2 rounded-full bg-white/50 p-1 shadow-inner">
        {[
          { id: "models" as const, label: "Modelos", icon: Brain },
          { id: "general" as const, label: "Geral", icon: SettingsIcon },
          { id: "security" as const, label: "Segurança", icon: ShieldCheck },
          { id: "appearance" as const, label: "Aparência", icon: Palette },
        ].map((t) => {
          const I = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition",
                tab === t.id ? "bg-[#17172d] text-white shadow-lg" : "text-slate-600 hover:text-slate-950")}>
              <I className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {tab === "models" && <ModelsTab />}
      {tab === "general" && <GeneralTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "appearance" && <AppearanceTab />}
    </WorkspaceShell>
  );
}

/* ---------------------------------------------------------------- Models ---*/

function ModelsTab() {
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
  const runtimes = useConfig((s) => s.runtimes);
  const settings = useConfig((s) => s.settings);
  const setSettings = useConfig((s) => s.setSettings);
  const setProviderEnabled = useConfig((s) => s.setProviderEnabled);
  const setModelEnabled = useConfig((s) => s.setModelEnabled);
  const upsertModel = useConfig((s) => s.upsertModel);
  const removeModel = useConfig((s) => s.removeModel);
  const setDefaultRuntime = useConfig((s) => s.setDefaultRuntime);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [newModelProvider, setNewModelProvider] = useState("");
  const [newModelId, setNewModelId] = useState("");

  const sorted = useMemo(() => {
    return PROVIDER_PRESETS.map((p) => providers[p.id]).filter(Boolean) as ProviderConfig[];
  }, [providers]);

  const providerOptions = sorted.map((p) => ({ value: p.id, label: `${p.name}${providerIsUsable(p) ? "" : " (disabled)"}` }));
  const defaultProviderId = settings.defaultProviderId ?? sorted.find(providerIsUsable)?.id ?? sorted[0]?.id ?? "";
  const modelOptions = getModelOptions(defaultProviderId, providers, models, true).map((m) => ({
    value: m.id,
    label: m.enabled ? m.label : `${m.label} (disabled)`,
  }));
  const runtimeOptions = runtimes.map((r) => ({ value: r.id, label: r.name }));

  function addCustomModel() {
    const providerId = newModelProvider || sorted[0]?.id;
    if (!providerId) { toast.error("Escolha um provedor."); return; }
    if (!newModelId.trim()) { toast.error("Informe o ID do modelo."); return; }
    const id = newModelId.trim();
    const model: ModelConfig = { id, providerId, name: id, label: id, enabled: true };
    upsertModel(model);
    setNewModelId("");
    toast.success(`Modelo ${id} adicionado.`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Surface>
        <SectionTitle icon={Brain} title="Provedores de IA" desc="Configure baseURL, chave de API, busque modelos e teste a conexão." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sorted.map((p) => (
            <ProviderCard key={p.id} cfg={p} onToggle={() => setProviderEnabled(p.id, !p.enabled)} onEdit={() => setEditingId(p.id)} />
          ))}
        </div>
      </Surface>

      <Surface className="space-y-5">
        <SectionTitle icon={KeyRound} title="Padrões globais" desc="Defaults compartilhados por Chat e Code Studio." />
        {providerOptions.length ? (
          <SelectControl<string>
            label="Provedor padrão"
            value={defaultProviderId}
            onChange={(id) => {
              const firstModel = getModelOptions(id, providers, models, true)[0]?.id;
              setSettings({ defaultProviderId: id, defaultModelId: firstModel });
            }}
            options={providerOptions}
          />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Configure pelo menos um provedor para definir o padrão.
          </div>
        )}
        {modelOptions.length ? (
          <SelectControl<string>
            label="Modelo padrão"
            value={settings.defaultModelId ?? modelOptions[0].value}
            onChange={(id) => setSettings({ defaultModelId: id })}
            options={modelOptions}
          />
        ) : null}
        {runtimeOptions.length ? (
          <SelectControl<string>
            label="Runtime padrão"
            value={settings.defaultRuntimeId ?? runtimes.find((r) => r.isDefault)?.id ?? runtimeOptions[0].value}
            onChange={(id) => setDefaultRuntime(id)}
            options={runtimeOptions}
          />
        ) : null}
        <div className="rounded-[20px] border border-white/70 bg-white/60 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Model registry</div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {models.map((m) => (
              <div key={`${m.providerId}:${m.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => setModelEnabled(m.providerId, m.id, !m.enabled)}
                  className={cn("h-4 w-8 rounded-full transition", m.enabled ? "bg-emerald-500" : "bg-slate-300")}
                  aria-label={`Toggle ${m.id}`}
                />
                <span className="min-w-0 flex-1 truncate font-mono font-bold text-slate-700">{m.providerId}/{m.label}</span>
                <button type="button" onClick={() => removeModel(m.id, m.providerId)} className="text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            <SelectControl<string>
              label="Provider"
              value={newModelProvider || sorted[0]?.id || ""}
              onChange={setNewModelProvider}
              options={sorted.map((p) => ({ value: p.id, label: p.name }))}
            />
            <EditableField label="Novo model ID" value={newModelId} onChange={setNewModelId} placeholder="ex: gpt-4.1-mini" />
            <button type="button" onClick={addCustomModel} className="rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white">
              <Plus className="mr-1 inline h-4 w-4" />Adicionar modelo
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-white/60 p-4 text-xs font-medium leading-6 text-slate-600">
          Chaves de API são armazenadas localmente com ofuscação base64. Em produção, mova para um cofre real (AWS Secrets Manager, Vault, etc.).
        </div>
      </Surface>

      <ProviderEditor providerId={editingId} onClose={() => setEditingId(undefined)} />
    </div>
  );
}

function ProviderCard({ cfg, onToggle, onEdit }: { cfg: ProviderConfig; onToggle: () => void; onEdit: () => void }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{cfg.name}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{cfg.spec.baseUrl}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition", cfg.enabled ? "bg-emerald-500" : "bg-slate-300")}
          aria-label={`Toggle ${cfg.name}`}
        >
          <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition", cfg.enabled ? "left-6" : "left-1")} />
        </button>
      </div>
      <div className="mt-3"><StatusBadge status={cfg.enabled ? (cfg.configured ? "enabled" : "needs key") : "disabled"} /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Tag>{cfg.spec.shape}</Tag>
        <Tag>{cfg.spec.authMode ?? "none"}</Tag>
        {cfg.defaultModel ? <Tag>{cfg.defaultModel}</Tag> : null}
        {cfg.fetchedModels?.length ? <Tag>{cfg.fetchedModels.length} models</Tag> : null}
      </div>
      {cfg.lastTest ? (
        <div className={cn("mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
          cfg.lastTest.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
          {cfg.lastTest.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {cfg.lastTest.ok ? `OK ${cfg.lastTest.latencyMs}ms` : (cfg.lastTest.error ?? `HTTP ${cfg.lastTest.status}`)}
        </div>
      ) : null}
      <button onClick={onEdit} className="mt-4 w-full rounded-full bg-[#17172d] px-4 py-2.5 text-sm font-bold text-white">
        Configurar
      </button>
    </div>
  );
}

function ProviderEditor({ providerId, onClose }: { providerId?: string; onClose: () => void }) {
  const providers = useConfig((s) => s.providers);
  const upsertProvider = useConfig((s) => s.upsertProvider);
  const setProviderTest = useConfig((s) => s.setProviderTest);
  const setProviderModels = useConfig((s) => s.setProviderModels);
  const cfg = providerId ? providers[providerId] : undefined;
  const preset = providerId ? presetById(providerId) : undefined;

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setApiKey(cfg.spec.apiKey ? deobfuscate(cfg.spec.apiKey) : "");
    setBaseUrl(cfg.spec.baseUrl);
    setDefaultModel(cfg.defaultModel ?? preset?.presetModels?.[0] ?? "");
    setExtras((cfg.spec.extraHeaders ?? {}) as Record<string, string>);
    setEnabled(cfg.enabled);
  }, [providerId, cfg, preset]);

  if (!cfg || !preset) return null;

  const modelOptions = (cfg.fetchedModels?.length ? cfg.fetchedModels.map((m) => m.id) : preset.presetModels ?? []);

  function buildSpec() {
    let url = baseUrl;
    // resolve {resource} for azure
    for (const k of Object.keys(extras)) url = url.replaceAll(`{${k}}`, extras[k] ?? "");
    return {
      ...cfg!.spec,
      baseUrl: url,
      apiKey: apiKey || undefined,
    };
  }

  async function handleTest() {
    setTesting(true);
    const spec = buildSpec();
    try {
      const res = await api.testProvider(spec);
      setProviderTest(cfg!.id, { ok: res.ok, status: res.status, latencyMs: res.latencyMs, error: res.error, at: Date.now() });
      if (res.ok) toast.success(`${cfg!.name}: OK ${res.latencyMs}ms (${res.modelCount ?? 0} modelos)`);
      else toast.error(`${cfg!.name}: ${res.error ?? `HTTP ${res.status}`}`);
    } catch (err) {
      toast.error(`Falha: ${(err as Error).message}`);
    } finally { setTesting(false); }
  }

  async function handleFetchModels() {
    setFetching(true);
    try {
      const models = await api.fetchModels(buildSpec());
      setProviderModels(cfg!.id, models);
      toast.success(`${models.length} modelos carregados de ${cfg!.name}`);
    } catch (err) {
      toast.error(`Falha ao carregar modelos: ${(err as Error).message}`);
    } finally { setFetching(false); }
  }

  function handleSave() {
    upsertProvider({
      ...cfg!,
      baseUrl,
      apiKey: apiKey || undefined,
      enabled,
      spec: { ...cfg!.spec, baseUrl, apiKey: apiKey || undefined },
      defaultModel: defaultModel || undefined,
      configured: Boolean(apiKey || cfg!.spec.authMode === "none"),
    });
    toast.success(`${cfg!.name} salvo.`);
    onClose();
  }

  return (
    <Modal open={Boolean(providerId)} onClose={onClose} title={`Configurar ${cfg.name}`} width={620}
      footer={
        <>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Cancelar</button>
          <button onClick={handleSave} className="rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white">Salvar</button>
        </>
      }>
      <div className="space-y-4">
        {preset.notes ? (
          <div className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600">{preset.notes}</div>
        ) : null}
        <EditableField label="Base URL" value={baseUrl} onChange={setBaseUrl} />
        {preset.authMode !== "none" && (
          <EditableField label={preset.envVar ?? "API Key"} value={apiKey} onChange={setApiKey} type="password" placeholder="sk-..." />
        )}
        {(preset.extraFields ?? []).map((f) => (
          <EditableField key={f.key}
            label={f.label}
            value={extras[f.key] ?? ""}
            onChange={(v) => setExtras((cur) => ({ ...cur, [f.key]: v }))}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
          />
        ))}
        <ToggleRow title="Habilitado" desc="Provedores desabilitados não aparecem nos pickers como opção utilizável."
          active={enabled} onToggle={() => setEnabled((v) => !v)} />
        <div className="flex flex-wrap gap-2">
          <button onClick={handleTest} disabled={testing}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-60">
            {testing ? <Spinner size={14} /> : <Plug className="h-4 w-4" />} Testar conexão
          </button>
          <button onClick={handleFetchModels} disabled={fetching}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-60">
            {fetching ? <Spinner size={14} /> : <RefreshCw className="h-4 w-4" />} Buscar modelos
          </button>
        </div>
        {modelOptions.length > 0 && (
          <SelectControl<string> label="Modelo padrão" value={defaultModel || modelOptions[0]} onChange={setDefaultModel} options={modelOptions} />
        )}
        {cfg.lastTest && (
          <div className={cn("rounded-xl p-3 text-xs font-bold",
            cfg.lastTest.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            Último teste: {cfg.lastTest.ok ? `OK ${cfg.lastTest.latencyMs}ms` : (cfg.lastTest.error ?? `HTTP ${cfg.lastTest.status}`)}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- General ---*/

function GeneralTab() {
  const settings = useConfig((s) => s.settings);
  const setSettings = useConfig((s) => s.setSettings);
  const resetSettings = useConfig((s) => s.resetSettings);
  const exportConfig = useConfig((s) => s.exportConfig);
  const importConfig = useConfig((s) => s.importConfig);

  function handleExport() {
    const json = exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `perfectagent-config-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Configuração exportada.");
  }

  async function handleImport(file: File) {
    const text = await file.text();
    if (importConfig(text)) toast.success("Configuração importada.");
    else toast.error("Arquivo inválido.");
  }

  return (
    <Surface className="space-y-5">
      <SectionTitle icon={SettingsIcon} title="Configurações gerais" desc="Branding, idioma e auto-save." />
      <EditableField label="Nome do app" value={settings.appName} onChange={(v) => setSettings({ appName: v })} />
      <SelectControl<"pt-BR" | "en-US"> label="Idioma" value={settings.language} onChange={(v) => setSettings({ language: v })}
        options={[{ value: "pt-BR", label: "Português (Brasil)" }, { value: "en-US", label: "English (US)" }]} />
      <SelectControl<"light" | "dark" | "system"> label="Tema" value={settings.theme} onChange={(v) => setSettings({ theme: v })}
        options={[{ value: "light", label: "Claro" }, { value: "dark", label: "Escuro" }, { value: "system", label: "Sistema" }]} />
      <EditableField label="Diretório de projetos" value={settings.defaultProjectDir} onChange={(v) => setSettings({ defaultProjectDir: v })} />
      <ToggleRow title="Auto-save" desc={`Salvar a cada ${settings.autoSaveInterval}s`}
        active={settings.autoSave} onToggle={() => setSettings({ autoSave: !settings.autoSave })} />
      <ToggleRow title="Telemetria" desc="Enviar métricas anônimas de uso."
        active={settings.telemetry} onToggle={() => setSettings({ telemetry: !settings.telemetry })} />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
          <Download className="h-4 w-4" />Exportar
        </button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
          <Upload className="h-4 w-4" />Importar
          <input type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
        </label>
        <button onClick={() => { if (confirm("Resetar todas as configurações?")) { resetSettings(); toast.info("Configurações resetadas."); } }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
          <Trash2 className="h-4 w-4" />Resetar
        </button>
      </div>
    </Surface>
  );
}

/* --------------------------------------------------------------- Security ---*/

function SecurityTab() {
  const settings = useConfig((s) => s.settings);
  const setSettings = useConfig((s) => s.setSettings);
  const [newOrigin, setNewOrigin] = useState("");

  function regenerate() {
    const k = "pa-" + Math.random().toString(36).slice(2, 16);
    setSettings({ masterKey: k });
    toast.success("Master key regenerada.");
  }
  function addOrigin() {
    if (!newOrigin.trim()) return;
    const next = Array.from(new Set([...settings.corsOrigins, newOrigin.trim()]));
    setSettings({ corsOrigins: next });
    setNewOrigin("");
  }
  function removeOrigin(o: string) {
    setSettings({ corsOrigins: settings.corsOrigins.filter((x) => x !== o) });
  }

  return (
    <Surface className="space-y-5">
      <SectionTitle icon={ShieldCheck} title="API e segurança" desc="Master key, CORS e rate limiting." />
      <div className="rounded-[20px] border border-white/70 bg-white/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Master API Key</span>
          <button onClick={regenerate} className="text-xs font-bold text-slate-700 hover:text-slate-950">Regenerar</button>
        </div>
        <code className="mt-2 block break-all rounded-xl bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-100">{settings.masterKey}</code>
      </div>
      <div className="rounded-[20px] border border-white/70 bg-white/60 p-4">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">CORS Origins</span>
        <div className="space-y-2">
          {settings.corsOrigins.map((o) => (
            <div key={o} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
              <span className="truncate">{o}</span>
              <button onClick={() => removeOrigin(o)} className="text-rose-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="https://app.exemplo.com"
            className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold outline-none" />
          <button onClick={addOrigin} className="rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="rounded-[20px] border border-white/70 bg-white/60 p-4">
        <div className="flex items-center justify-between text-sm font-bold text-slate-700">
          <span>Rate limit (req/min)</span>
          <span>{settings.rateLimitPerMinute}</span>
        </div>
        <input type="range" min="10" max="600" value={settings.rateLimitPerMinute} onChange={(e) => setSettings({ rateLimitPerMinute: Number(e.target.value) })}
          className="mt-3 w-full accent-[#17172d]" />
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------- Appearance ---*/

function AppearanceTab() {
  const settings = useConfig((s) => s.settings);
  const setSettings = useConfig((s) => s.setSettings);

  return (
    <Surface className="space-y-5">
      <SectionTitle icon={Palette} title="Aparência" desc="Cores, fontes e tema do editor." />
      <div className="rounded-[20px] border border-white/70 bg-white/60 p-4">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cor primária</span>
        <div className="flex items-center gap-3">
          <input type="color" value={settings.primaryColor}
            onChange={(e) => setSettings({ primaryColor: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded-xl border border-slate-200" />
          <input value={settings.primaryColor} onChange={(e) => setSettings({ primaryColor: e.target.value })}
            className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 outline-none" />
        </div>
      </div>
      <SelectControl<"small" | "medium" | "large"> label="Tamanho da fonte" value={settings.fontSize}
        onChange={(v) => setSettings({ fontSize: v })}
        options={[{ value: "small", label: "Pequena" }, { value: "medium", label: "Média" }, { value: "large", label: "Grande" }]} />
      <SelectControl<string> label="Tema do editor (Monaco)" value={settings.editorTheme}
        onChange={(v) => setSettings({ editorTheme: v })}
        options={["vs-dark", "vs", "hc-black"]} />
      <SelectControl<"left" | "right"> label="Posição da sidebar" value={settings.sidebarPosition}
        onChange={(v) => setSettings({ sidebarPosition: v })}
        options={[{ value: "left", label: "Esquerda" }, { value: "right", label: "Direita" }]} />
      <ToggleRow title="Modo compacto" desc="Reduz espaçamento e tamanho de elementos."
        active={settings.compactMode} onToggle={() => setSettings({ compactMode: !settings.compactMode })} />
    </Surface>
  );
}
