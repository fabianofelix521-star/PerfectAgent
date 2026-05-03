import { useEffect, useMemo, useState } from "react";
import { Plug, Plus, Trash2, Pencil, Send, CheckCircle2, XCircle } from "lucide-react";
import { APP_BRAND_NAME, useConfig, getIntegrationDecoded } from "@/stores/config";
import { WorkspaceShell, Surface, HeaderAction, Modal, EditableField, SelectControl, Spinner, StatusBadge } from "@/components/ui";
import type { Integration } from "@/types";
import { api } from "@/services/api";
import { toast } from "@/components/Toast";
import { TELEGRAM_BOT_COMMANDS } from "@/modules/integrations/integrations/TelegramIntegration";

function rid() { return `in-${Math.random().toString(36).slice(2, 9)}`; }

const KIND_PRESETS: Array<{ value: Integration["kind"]; label: string; defaults: Partial<Integration> }> = [
  { value: "webhook", label: "Webhook genérico", defaults: { method: "POST", headers: { "content-type": "application/json" } } },
  { value: "slack", label: "Slack (Incoming Webhook)", defaults: { method: "POST", headers: { "content-type": "application/json" }, bodyTemplate: `{"text":"olá do ${APP_BRAND_NAME}"}` } },
  { value: "telegram", label: "Telegram Bot API", defaults: { method: "POST", url: "https://api.telegram.org/bot{TOKEN}/sendMessage", headers: { "content-type": "application/json" }, bodyTemplate: `{"chat_id":"SEU_CHAT_ID","text":"Olá do ${APP_BRAND_NAME}!"}` } },
  { value: "whatsapp", label: "WhatsApp (Meta Cloud API)", defaults: { method: "POST", url: "https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages", headers: { "content-type": "application/json" }, bodyTemplate: `{"messaging_product":"whatsapp","to":"5511999999999","type":"text","text":{"body":"Olá do ${APP_BRAND_NAME}!"}}` } },
  { value: "discord", label: "Discord Webhook", defaults: { method: "POST", headers: { "content-type": "application/json" }, bodyTemplate: `{"content":"Olá do ${APP_BRAND_NAME}!","username":"${APP_BRAND_NAME}"}` } },
  { value: "github", label: "GitHub API", defaults: { method: "GET", url: "https://api.github.com/user" } },
  { value: "stripe", label: "Stripe API", defaults: { method: "GET", url: "https://api.stripe.com/v1/charges?limit=1" } },
  { value: "supabase", label: "Supabase REST", defaults: { method: "GET" } },
  { value: "notion", label: "Notion API", defaults: { method: "GET", url: "https://api.notion.com/v1/users/me", headers: { "notion-version": "2022-06-28" } } },
  { value: "google", label: "Google API", defaults: { method: "GET" } },
  { value: "airtable", label: "Airtable API", defaults: { method: "GET", url: "https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}" } },
  { value: "linear", label: "Linear API", defaults: { method: "POST", url: "https://api.linear.app/graphql", headers: { "content-type": "application/json" }, bodyTemplate: '{"query":"{ viewer { id name } }"}' } },
  { value: "custom", label: "Custom HTTP", defaults: { method: "POST" } },
];

export function IntegrationsPage() {
  const integrations = useConfig((s) => s.integrations);
  const upsert = useConfig((s) => s.upsertIntegration);
  const remove = useConfig((s) => s.removeIntegration);
  const setTest = useConfig((s) => s.setIntegrationTest);

  const [editing, setEditing] = useState<Integration | null>(null);
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const installedKinds = useMemo(
    () => new Set(integrations.map((item) => item.kind)),
    [integrations],
  );

  const test = async (id: string) => {
    const i = getIntegrationDecoded(id);
    if (!i?.url) { toast.error("URL é obrigatória"); return; }
    setTestingId(id);
    try {
      const headers: Record<string, string> = { ...(i.headers ?? {}) };
      if (i.secrets?.token) headers["authorization"] = `Bearer ${i.secrets.token}`;
      const body = i.bodyTemplate;
      const r = await api.testIntegration({ url: i.url, method: i.method ?? "GET", headers, body });
      setTest(id, { ok: r.ok, status: r.status, latencyMs: r.latencyMs, error: r.error, at: Date.now() });
      r.ok ? toast.success(`OK (${r.status} • ${r.latencyMs}ms)`) : toast.error(r.error ?? `HTTP ${r.status}`);
    } finally { setTestingId(null); }
  };

  const installPreset = (preset: (typeof KIND_PRESETS)[number]) => {
    const existing = integrations.find((item) => item.kind === preset.value);
    if (existing) {
      setEditing(existing);
      return;
    }

    upsert({
      id: `in-${preset.value}`,
      name: preset.label,
      kind: preset.value,
      connected: false,
      method: "POST",
      ...preset.defaults,
    });
    toast.success(`${preset.label} adicionado ao banco`);
  };

  return (
    <WorkspaceShell
      eyebrow="Integrações"
      title="Conexões com serviços externos"
      description="Configure webhooks e APIs. Tokens são armazenados localmente com obfuscação leve."
      action={<HeaderAction icon={Plus} label="Nova integração" onClick={() => setCreating(true)} />}
    >
      <Surface>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Conexões configuradas</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {integrations.length ? `${integrations.length} integração(ões) no workspace.` : "Nenhuma conexão ativa ainda."}
            </p>
          </div>
          {integrations.length === 0 ? (
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => setCreating(true)}>
              Custom HTTP
            </button>
          ) : null}
        </div>
        {integrations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
            Use o banco abaixo para adicionar Slack, GitHub, Notion, Airtable, Linear e outros presets.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {integrations.map((i) => (
            <div key={i.id} className="min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-3 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17172d] text-white"><Plug className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words text-sm font-semibold text-slate-950 sm:text-base">{i.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{i.kind}</span>
                    </div>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{i.method ?? "POST"} {i.url ?? "—"}</p>
                  </div>
                </div>
                <StatusBadge status={i.connected ? "Conectado" : "Pronto"} />
              </div>
              {i.lastTest && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {i.lastTest.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                  <span className="text-slate-600">
                    {i.lastTest.ok ? `${i.lastTest.status} • ${i.lastTest.latencyMs}ms` : i.lastTest.error}
                  </span>
                </div>
              )}
              {i.kind === "telegram" ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Bot commands</p>
                  <div className="mt-2 grid gap-1">
                    {TELEGRAM_BOT_COMMANDS.map((item) => (
                      <p key={item.command} className="text-xs font-medium text-slate-600">
                        <span className="font-mono font-bold text-slate-800">{item.command}</span>
                        {" - "}
                        {item.description}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-start gap-2 sm:justify-end">
                <button onClick={() => test(i.id)} disabled={testingId === i.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {testingId === i.id ? <Spinner size={12} /> : <Send className="h-3 w-3" />} Testar
                </button>
                <button onClick={() => setEditing(i)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => { if (confirm(`Excluir "${i.name}"?`)) { remove(i.id); toast.info("Integração removida"); } }} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="mt-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-950">Banco de integrações</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Presets prontos para configurar endpoints, tokens e payloads sem começar do zero.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {KIND_PRESETS.map((preset) => {
            const installed = installedKinds.has(preset.value);
            return (
              <div key={preset.value} className="min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">{preset.label}</h3>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                      {preset.defaults.method ?? "POST"} {preset.defaults.url ?? "URL configurável"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                    {preset.value}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => installPreset(preset)}
                  className="mt-4 rounded-full bg-[#17172d] px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {installed ? "Configurar" : "Adicionar"}
                </button>
              </div>
            );
          })}
        </div>
      </Surface>

      <IntegrationEditor open={creating} integration={null}
        onSave={(i) => { upsert(i); setCreating(false); toast.success(`"${i.name}" criada`); }}
        onClose={() => setCreating(false)} />
      <IntegrationEditor open={!!editing} integration={editing}
        onSave={(i) => { upsert(i); setEditing(null); toast.success(`"${i.name}" atualizada`); }}
        onClose={() => setEditing(null)} />
    </WorkspaceShell>
  );
}

function IntegrationEditor({ open, integration, onSave, onClose }: { open: boolean; integration: Integration | null; onSave: (i: Integration) => void; onClose: () => void }) {
  const decoded = integration ? getIntegrationDecoded(integration.id) : null;
  const [name, setName] = useState(integration?.name ?? "");
  const [kind, setKind] = useState<Integration["kind"]>(integration?.kind ?? "webhook");
  const [url, setUrl] = useState(integration?.url ?? "");
  const [method, setMethod] = useState<NonNullable<Integration["method"]>>(integration?.method ?? "POST");
  const [headersJson, setHeadersJson] = useState(JSON.stringify(integration?.headers ?? { "content-type": "application/json" }, null, 2));
  const [bodyTemplate, setBodyTemplate] = useState(integration?.bodyTemplate ?? "");
  const [token, setToken] = useState(decoded?.secrets?.token ?? "");

  useEffect(() => {
    if (!open) return;
    const current = integration ? getIntegrationDecoded(integration.id) : null;
    setName(integration?.name ?? "");
    setKind(integration?.kind ?? "webhook");
    setUrl(integration?.url ?? "");
    setMethod(integration?.method ?? "POST");
    setHeadersJson(JSON.stringify(integration?.headers ?? { "content-type": "application/json" }, null, 2));
    setBodyTemplate(integration?.bodyTemplate ?? "");
    setToken(current?.secrets?.token ?? "");
  }, [open, integration]);

  const onKindChange = (k: Integration["kind"]) => {
    setKind(k);
    const preset = KIND_PRESETS.find((p) => p.value === k)?.defaults ?? {};
    if (preset.url) setUrl(preset.url);
    if (preset.method) setMethod(preset.method);
    if (preset.headers) setHeadersJson(JSON.stringify(preset.headers, null, 2));
    if (preset.bodyTemplate) setBodyTemplate(preset.bodyTemplate);
  };

  const save = () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    let headers: Record<string, string> = {};
    try { headers = JSON.parse(headersJson); } catch { toast.error("Headers: JSON inválido"); return; }
    onSave({
      id: integration?.id ?? rid(),
      name: name.trim(), kind, url: url.trim(), method,
      headers, bodyTemplate: bodyTemplate || undefined,
      secrets: token ? { token } : undefined,
      connected: integration?.connected ?? false,
      lastTest: integration?.lastTest,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={integration ? "Editar integração" : "Nova integração"} width={680}
      footer={<><button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
        <button onClick={save} className="rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white">Salvar</button></>}>
      <div className="space-y-3">
        <EditableField label="Nome" value={name} onChange={setName} placeholder="Ex: Slack alerts" />
        <SelectControl label="Tipo" value={kind} onChange={(v) => onKindChange(v as Integration["kind"])}
          options={KIND_PRESETS.map((p) => ({ value: p.value, label: p.label }))} />
        <EditableField label="URL" value={url} onChange={setUrl} placeholder="https://..." />
        <SelectControl label="Método" value={method} onChange={(v) => setMethod(v as NonNullable<Integration["method"]>)}
          options={[{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }, { value: "PATCH", label: "PATCH" }, { value: "DELETE", label: "DELETE" }]} />
        <EditableField label="Token (opcional, vai como Bearer)" type="password" value={token} onChange={setToken} placeholder="ghp_xxx, xoxb-xxx, sk_xxx..." />
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Headers (JSON)</div>
          <textarea value={headersJson} onChange={(e) => setHeadersJson(e.target.value)} rows={4}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-400" />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Body template</div>
          <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} rows={5}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-400"
            placeholder='{"hello": "world"}' />
        </div>
      </div>
    </Modal>
  );
}
