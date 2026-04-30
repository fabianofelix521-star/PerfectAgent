import { useEffect, useState } from "react";
import { Plug, Plus, Trash2, Pencil, Send, CheckCircle2, XCircle } from "lucide-react";
import { useConfig, getIntegrationDecoded } from "@/stores/config";
import { WorkspaceShell, Surface, HeaderAction, Modal, EditableField, SelectControl, Spinner, StatusBadge } from "@/components/ui";
import type { Integration } from "@/types";
import { api } from "@/services/api";
import { toast } from "@/components/Toast";

function rid() { return `in-${Math.random().toString(36).slice(2, 9)}`; }

const KIND_PRESETS: Array<{ value: Integration["kind"]; label: string; defaults: Partial<Integration> }> = [
  { value: "webhook", label: "Webhook genérico", defaults: { method: "POST", headers: { "content-type": "application/json" } } },
  { value: "slack", label: "Slack (Incoming Webhook)", defaults: { method: "POST", headers: { "content-type": "application/json" }, bodyTemplate: '{"text":"olá do PerfectAgent"}' } },
  { value: "github", label: "GitHub API", defaults: { method: "GET", url: "https://api.github.com/user" } },
  { value: "stripe", label: "Stripe API", defaults: { method: "GET", url: "https://api.stripe.com/v1/charges?limit=1" } },
  { value: "supabase", label: "Supabase REST", defaults: { method: "GET" } },
  { value: "notion", label: "Notion API", defaults: { method: "GET", url: "https://api.notion.com/v1/users/me", headers: { "notion-version": "2022-06-28" } } },
  { value: "google", label: "Google API", defaults: { method: "GET" } },
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

  return (
    <WorkspaceShell
      eyebrow="Integrações"
      title="Conexões com serviços externos"
      description="Configure webhooks e APIs. Tokens são armazenados localmente com obfuscação leve."
      action={<HeaderAction icon={Plus} label="Nova integração" onClick={() => setCreating(true)} />}
    >
      <Surface>
        <div className="grid gap-3 lg:grid-cols-2">
          {integrations.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
              Sem integrações. <button className="font-bold text-slate-900 underline" onClick={() => setCreating(true)}>Adicionar uma</button>
            </div>
          ) : integrations.map((i) => (
            <div key={i.id} className="rounded-3xl border border-white/70 bg-white/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17172d] text-white"><Plug className="h-5 w-5" /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{i.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{i.kind}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{i.method ?? "POST"} {i.url ?? "—"}</p>
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
              <div className="mt-3 flex justify-end gap-2">
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
