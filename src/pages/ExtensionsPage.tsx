import { useEffect, useState } from "react";
import { Blocks, Plus, RefreshCw, Trash2, Pencil, Play, CheckCircle2, XCircle } from "lucide-react";
import { useConfig, getMcpServerDecoded } from "@/stores/config";
import { WorkspaceShell, Surface, HeaderAction, Modal, EditableField, SelectControl, ToggleRow, Spinner, StatusBadge } from "@/components/ui";
import type { McpServer } from "@/types";
import { api } from "@/services/api";
import { toast } from "@/components/Toast";

function rid() { return `mcp-${Math.random().toString(36).slice(2, 9)}`; }

export function ExtensionsPage() {
  const servers = useConfig((s) => s.mcpServers);
  const upsert = useConfig((s) => s.upsertMcpServer);
  const remove = useConfig((s) => s.removeMcpServer);
  const setTools = useConfig((s) => s.setMcpServerTools);
  const setTest = useConfig((s) => s.setMcpServerTest);

  const [editing, setEditing] = useState<McpServer | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calling, setCalling] = useState<{ server: McpServer; toolName: string } | null>(null);

  const refreshTools = async (id: string) => {
    const m = getMcpServerDecoded(id);
    if (!m?.url) { toast.error("URL é obrigatória"); return; }
    setBusyId(id);
    try {
      const r = await api.mcpList({ url: m.url, apiKey: m.apiKey });
      if (r.ok) {
        setTools(id, r.tools ?? []);
        setTest(id, { ok: true, latencyMs: r.latencyMs, at: Date.now() });
        toast.success(`${r.tools?.length ?? 0} tools (${r.latencyMs}ms)`);
      } else {
        setTest(id, { ok: false, error: r.error, at: Date.now() });
        toast.error(r.error ?? "Erro");
      }
    } finally { setBusyId(null); }
  };

  return (
    <WorkspaceShell
      eyebrow="MCP"
      title="Servidores Model Context Protocol"
      description="Conecte servidores MCP via HTTP (JSON-RPC). Liste tools, chame com argumentos e use no Code Studio."
      action={<HeaderAction icon={Plus} label="Novo servidor" onClick={() => setCreating(true)} />}
    >
      <Surface>
        {servers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
            Nenhum servidor MCP. <button className="font-bold text-slate-900 underline" onClick={() => setCreating(true)}>Adicionar</button>
            <div className="mt-4 text-xs">
              Servidores MCP via HTTP recebem requisições JSON-RPC 2.0 (<code>tools/list</code>, <code>tools/call</code>).
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((m) => (
              <div key={m.id} className="rounded-3xl border border-white/70 bg-white/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17172d] text-white"><Blocks className="h-5 w-5" /></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{m.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{m.transport}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{m.url ?? m.command ?? "—"}</p>
                    </div>
                  </div>
                  <StatusBadge status={m.lastTest?.ok ? "Conectado" : m.lastTest ? "Erro" : "Pronto"} />
                </div>

                {m.lastTest && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {m.lastTest.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                    <span className="text-slate-600">{m.lastTest.ok ? `${m.lastTest.latencyMs}ms` : m.lastTest.error}</span>
                  </div>
                )}

                {m.tools && m.tools.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Tools disponíveis</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {m.tools.map((t) => (
                        <button key={t.name} onClick={() => setCalling({ server: m, toolName: t.name })}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-400">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">{t.name}</span>
                            <Play className="h-3 w-3 text-slate-400" />
                          </div>
                          {t.description && <p className="mt-1 text-[11px] text-slate-500">{t.description}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => refreshTools(m.id)} disabled={busyId === m.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {busyId === m.id ? <Spinner size={12} /> : <RefreshCw className="h-3 w-3" />} Atualizar tools
                  </button>
                  <button onClick={() => setEditing(m)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button onClick={() => { if (confirm(`Excluir "${m.name}"?`)) { remove(m.id); toast.info("Servidor removido"); } }}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <McpEditor open={creating} server={null}
        onSave={(m) => { upsert(m); setCreating(false); toast.success(`"${m.name}" adicionado`); }}
        onClose={() => setCreating(false)} />
      <McpEditor open={!!editing} server={editing}
        onSave={(m) => { upsert(m); setEditing(null); toast.success(`"${m.name}" atualizado`); }}
        onClose={() => setEditing(null)} />
      {calling && <McpToolCaller server={calling.server} toolName={calling.toolName} onClose={() => setCalling(null)} />}
    </WorkspaceShell>
  );
}

function McpEditor({ open, server, onSave, onClose }: { open: boolean; server: McpServer | null; onSave: (m: McpServer) => void; onClose: () => void }) {
  const decoded = server ? getMcpServerDecoded(server.id) : null;
  const [name, setName] = useState(server?.name ?? "");
  const [transport, setTransport] = useState<McpServer["transport"]>(server?.transport ?? "http");
  const [url, setUrl] = useState(server?.url ?? "");
  const [command, setCommand] = useState(server?.command ?? "");
  const [apiKey, setApiKey] = useState(decoded?.apiKey ?? "");
  const [enabled, setEnabled] = useState(server?.enabled ?? true);

  useEffect(() => {
    if (!open) return;
    const current = server ? getMcpServerDecoded(server.id) : null;
    setName(server?.name ?? "");
    setTransport(server?.transport ?? "http");
    setUrl(server?.url ?? "");
    setCommand(server?.command ?? "");
    setApiKey(current?.apiKey ?? "");
    setEnabled(server?.enabled ?? true);
  }, [open, server]);

  const save = () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    if (transport === "http" && !url.trim()) { toast.error("URL obrigatória para HTTP"); return; }
    onSave({
      id: server?.id ?? rid(),
      name: name.trim(), transport,
      url: transport === "http" ? url.trim() : undefined,
      command: transport === "command" ? command.trim() : undefined,
      apiKey: apiKey || undefined,
      enabled, tools: server?.tools, lastTest: server?.lastTest,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={server ? "Editar servidor MCP" : "Novo servidor MCP"} width={620}
      footer={<><button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
        <button onClick={save} className="rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white">Salvar</button></>}>
      <div className="space-y-3">
        <EditableField label="Nome" value={name} onChange={setName} placeholder="Ex: Filesystem MCP" />
        <SelectControl label="Transporte" value={transport} onChange={(v) => setTransport(v as McpServer["transport"])}
          options={[{ value: "http", label: "HTTP (JSON-RPC)" }, { value: "command", label: "Command (futuro)" }]} />
        {transport === "http" ? (
          <>
            <EditableField label="URL" value={url} onChange={setUrl} placeholder="http://localhost:8080/mcp" />
            <EditableField label="API Key (opcional)" type="password" value={apiKey} onChange={setApiKey} />
          </>
        ) : (
          <EditableField label="Comando" value={command} onChange={setCommand} placeholder="npx @modelcontextprotocol/server-filesystem /tmp" />
        )}
        <ToggleRow title="Ativar" desc="Servidores ativos podem ser usados pelo agente" active={enabled} onToggle={() => setEnabled((v) => !v)} />
      </div>
    </Modal>
  );
}

function McpToolCaller({ server, toolName, onClose }: { server: McpServer; toolName: string; onClose: () => void }) {
  const tool = server.tools?.find((t) => t.name === toolName);
  const [argsJson, setArgsJson] = useState("{}");
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult("");
    try {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(argsJson || "{}"); } catch { toast.error("JSON inválido"); setRunning(false); return; }
      const decoded = getMcpServerDecoded(server.id);
      if (!decoded?.url) { toast.error("URL não configurada"); setRunning(false); return; }
      const r = await api.mcpCall({ url: decoded.url, apiKey: decoded.apiKey, name: toolName, arguments: args });
      setResult(JSON.stringify(r, null, 2));
      r.ok ? toast.success(`Executado (${r.latencyMs}ms)`) : toast.error(r.error ?? "erro");
    } finally { setRunning(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Chamar tool: ${toolName}`} width={680}
      footer={<><button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Fechar</button>
        <button onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {running ? <Spinner size={14} /> : <Play className="h-4 w-4" />} Chamar
        </button></>}>
      <div className="space-y-3">
        {tool?.description && <p className="text-sm text-slate-600">{tool.description}</p>}
        {tool?.inputSchema && (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Schema</div>
            <pre className="max-h-32 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
          </div>
        )}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Argumentos (JSON)</div>
          <textarea value={argsJson} onChange={(e) => setArgsJson(e.target.value)} rows={6}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-400" />
        </div>
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
