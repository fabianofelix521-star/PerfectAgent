import { useEffect, useMemo, useState } from "react";
import { Wrench, Plus, Pencil, Trash2, Play, Code2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useConfig } from "@/stores/config";
import { WorkspaceShell, Surface, HeaderAction, Modal, EditableField, ToggleRow, Spinner, SelectControl } from "@/components/ui";
import type { Tool, ToolKind, ToolParam } from "@/types";
import { api } from "@/services/api";
import { toast } from "@/components/Toast";

function rid() { return `tl-${Math.random().toString(36).slice(2, 9)}`; }

const KIND_LABEL: Record<ToolKind, string> = {
  http: "HTTP", json: "JSON Transform", websearch: "Busca Web", calculator: "Calculadora", fs: "Filesystem", shell: "Shell", custom: "Custom JS",
};

export function ToolsPage() {
  const tools = useConfig((s) => s.tools);
  const upsertTool = useConfig((s) => s.upsertTool);
  const removeTool = useConfig((s) => s.removeTool);
  const toggleTool = useConfig((s) => s.toggleTool);
  const [running, setRunning] = useState<Tool | null>(null);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <WorkspaceShell
      eyebrow="Tools"
      title="Ferramentas que o agente pode chamar"
      description="Cada ferramenta tem schema, código e pode ser executada diretamente. Habilite as que quiser disponibilizar."
      action={<HeaderAction icon={Plus} label="Nova tool" onClick={() => setCreating(true)} />}
    >
      <Surface>
        <div className="grid gap-3 lg:grid-cols-2">
          {tools.map((t) => (
            <div key={t.id} className="rounded-3xl border border-white/70 bg-white/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17172d] text-white"><Wrench className="h-5 w-5" /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{t.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{KIND_LABEL[t.kind]}</span>
                      {t.builtIn && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Built-in</span>}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">{t.description}</p>
                  </div>
                </div>
                <button onClick={() => toggleTool(t.id)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${t.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${t.enabled ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.params.map((p) => (
                  <span key={p.key} className="rounded-full bg-slate-950/5 px-2.5 py-1 text-[11px] font-mono text-slate-600">
                    {p.key}: {p.type}{p.required ? "*" : ""}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setRunning(t)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Play className="h-3 w-3" /> Testar
                </button>
                <button onClick={() => setEditing(t)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                {!t.builtIn && (
                  <button onClick={() => { if (confirm(`Excluir "${t.name}"?`)) removeTool(t.id); }} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <ToolEditor open={creating} tool={null}
        onSave={(t) => { upsertTool(t); setCreating(false); toast.success(`Tool "${t.name}" criada`); }}
        onClose={() => setCreating(false)} />
      <ToolEditor open={!!editing} tool={editing}
        onSave={(t) => { upsertTool(t); setEditing(null); toast.success(`Tool "${t.name}" atualizada`); }}
        onClose={() => setEditing(null)} />
      <ToolRunner tool={running} onClose={() => setRunning(null)} />
    </WorkspaceShell>
  );
}

function ToolEditor({ open, tool, onSave, onClose }: { open: boolean; tool: Tool | null; onSave: (t: Tool) => void; onClose: () => void }) {
  const [name, setName] = useState(tool?.name ?? "");
  const [description, setDescription] = useState(tool?.description ?? "");
  const [kind, setKind] = useState<ToolKind>(tool?.kind ?? "custom");
  const [code, setCode] = useState(tool?.code ?? "// receives `args`, return any JSON-serializable value\nreturn { ok: true, args };");
  const [paramsJson, setParamsJson] = useState(JSON.stringify(tool?.params ?? [{ key: "input", type: "string", required: true }], null, 2));
  const [configJson, setConfigJson] = useState(JSON.stringify(tool?.config ?? {}, null, 2));
  const [enabled, setEnabled] = useState(tool?.enabled ?? true);

  useEffect(() => {
    if (!open) return;
    setName(tool?.name ?? "");
    setDescription(tool?.description ?? "");
    setKind(tool?.kind ?? "custom");
    setCode(tool?.code ?? "// receives `args`, return any JSON-serializable value\nreturn { ok: true, args };");
    setParamsJson(JSON.stringify(tool?.params ?? [{ key: "input", type: "string", required: true }], null, 2));
    setConfigJson(JSON.stringify(tool?.config ?? {}, null, 2));
    setEnabled(tool?.enabled ?? true);
  }, [open, tool]);

  const save = () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    let params: ToolParam[] = [];
    try { params = JSON.parse(paramsJson); } catch { toast.error("Params: JSON inválido"); return; }
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(configJson || "{}"); } catch { toast.error("Config: JSON inválido"); return; }
    onSave({
      id: tool?.id ?? rid(),
      name: name.trim(), description: description.trim(),
      kind, params, code: kind === "custom" ? code : tool?.code,
      config,
      enabled, builtIn: tool?.builtIn,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={tool ? "Editar tool" : "Nova tool"} width={760}
      footer={<><button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
        <button onClick={save} className="rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white">Salvar</button></>}>
      <div className="space-y-3">
        <EditableField label="Nome" value={name} onChange={setName} />
        <EditableField label="Descrição" value={description} onChange={setDescription} />
        <SelectControl label="Tipo" value={kind} onChange={(v) => setKind(v as ToolKind)}
          options={[
            { value: "http", label: "HTTP" },
            { value: "json", label: "JSON Transform" },
            { value: "websearch", label: "Web Search" },
            { value: "calculator", label: "Calculator" },
            { value: "fs", label: "Filesystem" },
            { value: "shell", label: "Shell" },
            { value: "custom", label: "Custom JS" },
          ]} />
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Parâmetros (JSON)</div>
          <textarea value={paramsJson} onChange={(e) => setParamsJson(e.target.value)} rows={6}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-400" />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Config (JSON)</div>
          <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={4}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-400" />
        </div>
        {kind === "custom" && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <Code2 className="h-3 w-3" /> Código JS
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Editor height="240px" defaultLanguage="javascript" value={code} onChange={(v) => setCode(v ?? "")} theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 13 }} />
            </div>
          </div>
        )}
        <ToggleRow title="Ativa" desc="Quando ativa, fica disponível para o agente" active={enabled} onToggle={() => setEnabled((v) => !v)} />
      </div>
    </Modal>
  );
}

function ToolRunner({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>("");
  const [running, setRunning] = useState(false);

  const open = !!tool;
  const params = useMemo(() => tool?.params ?? [], [tool]);

  const run = async () => {
    if (!tool) return;
    setRunning(true);
    setResult("");
    try {
      const args: Record<string, unknown> = {};
      for (const p of params) {
        const raw = argValues[p.key] ?? p.default ?? "";
        if (p.type === "number") args[p.key] = Number(raw);
        else if (p.type === "boolean") args[p.key] = raw === "true";
        else if (p.type === "json") { try { args[p.key] = JSON.parse(raw || "null"); } catch { args[p.key] = raw; } }
        else args[p.key] = raw;
      }
      const r = await api.runTool({
        kind: tool.kind,
        args: { ...(tool.config ?? {}), ...args },
        code: tool.code,
      });
      setResult(JSON.stringify(r, null, 2));
      if (r.ok) toast.success(`Tool executada (${r.latencyMs}ms)`);
      else toast.error(`Erro: ${r.error}`);
    } catch (err) {
      setResult(String((err as Error).message));
      toast.error((err as Error).message);
    } finally { setRunning(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Testar: ${tool?.name ?? ""}`} width={680}
      footer={<><button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Fechar</button>
        <button onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {running ? <Spinner size={14} /> : <Play className="h-4 w-4" />} Executar
        </button></>}>
      <div className="space-y-3">
        {params.map((p) => (
          <EditableField key={p.key} label={`${p.key}${p.required ? " *" : ""} (${p.type})`}
            value={argValues[p.key] ?? p.default ?? ""}
            onChange={(v) => setArgValues((s) => ({ ...s, [p.key]: v }))}
            placeholder={p.description} />
        ))}
        {result && (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Resultado</div>
            <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-[11px] text-emerald-200">{result}</pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
