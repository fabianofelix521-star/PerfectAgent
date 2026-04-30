import { useMemo, useState } from "react";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Code2,
  Network,
  Brain,
  Wrench,
  GitBranch,
  Users,
  Sparkles,
  Star,
} from "lucide-react";
import {
  WorkspaceShell,
  Surface,
  SectionTitle,
  EditableField,
  SelectControl,
  ToggleRow,
  Modal,
  Spinner,
  StatusBadge,
  Tag,
  confirmDialog,
} from "@/components/ui";
import {
  useConfig,
  getRuntimeProviderSpec,
  defaultCapabilitiesFor,
  getRuntimeDecoded,
} from "@/stores/config";
import { api } from "@/services/api";
import { createAdapter } from "@/services/adapters";
import { toast } from "@/components/Toast";
import type {
  AgentRuntime,
  RuntimeNode,
  RuntimeEdge,
  RuntimeKind,
  RuntimeCapabilities,
} from "@/types";
import { cn } from "@/utils/cn";

const NODE_TYPE_OPTIONS = [
  { value: "llm", label: "LLM call" },
  { value: "tool", label: "Tool call (JS)" },
  { value: "transform", label: "Transform (JS)" },
  { value: "router", label: "Router" },
  { value: "human", label: "Human checkpoint" },
] as const;

const NODE_TYPE_ICON: Record<RuntimeNode["type"], typeof Brain> = {
  llm: Brain,
  tool: Wrench,
  transform: Code2,
  router: GitBranch,
  human: Users,
};

export function AgentsPage() {
  const runtimes = useConfig((s) => s.runtimes);
  const upsertRuntime = useConfig((s) => s.upsertRuntime);
  const removeRuntime = useConfig((s) => s.removeRuntime);
  const setDefaultRuntime = useConfig((s) => s.setDefaultRuntime);
  const providers = useConfig((s) => s.providers);

  const [activeId, setActiveId] = useState<string>(runtimes[0]?.id ?? "");
  const active = runtimes.find((r) => r.id === activeId) ?? runtimes[0];
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testInput, setTestInput] = useState(
    '{"question": "Explain LangGraph in one sentence."}',
  );
  const [createOpen, setCreateOpen] = useState(false);

  const configuredProviders = useMemo(
    () => Object.values(providers).filter((p) => p.configured),
    [providers],
  );

  function pushLog(line: string) {
    setLogs((l) =>
      [...l, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-200),
    );
  }

  function patchActive(patch: Partial<AgentRuntime>) {
    if (!active) return;
    upsertRuntime({ ...active, ...patch });
  }

  function addNode() {
    if (!active) return;
    const id = `n_${Date.now().toString(36)}`;
    const node: RuntimeNode = {
      id,
      type: "transform",
      label: "New node",
      transformCode: "return { hello: 'world' };",
    };
    upsertRuntime({ ...active, nodes: [...active.nodes, node] });
  }

  function updateNode(id: string, patch: Partial<RuntimeNode>) {
    if (!active) return;
    upsertRuntime({
      ...active,
      nodes: active.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  }

  function removeNode(id: string) {
    if (!active) return;
    upsertRuntime({
      ...active,
      nodes: active.nodes.filter((n) => n.id !== id),
      edges: active.edges.filter((e) => e.from !== id && e.to !== id),
      entry:
        active.entry === id
          ? (active.nodes.find((n) => n.id !== id)?.id ?? "")
          : active.entry,
      exits: active.exits.filter((x) => x !== id),
    });
  }

  function addEdge() {
    if (!active || active.nodes.length < 2) return;
    const e: RuntimeEdge = {
      id: `e_${Date.now().toString(36)}`,
      from: active.nodes[0].id,
      to: active.nodes[1].id,
    };
    upsertRuntime({ ...active, edges: [...active.edges, e] });
  }
  function updateEdge(id: string, patch: Partial<RuntimeEdge>) {
    if (!active) return;
    upsertRuntime({
      ...active,
      edges: active.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  }
  function removeEdge(id: string) {
    if (!active) return;
    upsertRuntime({
      ...active,
      edges: active.edges.filter((e) => e.id !== id),
    });
  }

  function handleRun() {
    if (!active) return;
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(testInput);
    } catch {
      toast.error("Input JSON inválido");
      return;
    }

    const llmSpec = active.llmProviderId
      ? getRuntimeProviderSpec(active.llmProviderId)
      : undefined;
    if (
      active.nodes.some((n) => n.type === "llm") &&
      (!llmSpec || !active.llmModel)
    ) {
      toast.error("Configure provedor + modelo para nós LLM.");
      return;
    }

    setRunning(true);
    setLogs([]);
    patchActive({ status: "running" });
    pushLog("Graph started");

    const start = Date.now();
    api.streamGraph({
      body: {
        nodes: active.nodes,
        edges: active.edges,
        entry: active.entry,
        exits: active.exits.length
          ? active.exits
          : [active.nodes.at(-1)?.id].filter(Boolean),
        input,
        llmSpec,
        llmModel: active.llmModel,
      },
      onEvent: (name, data) => {
        if (name === "node:start") pushLog(`▶ ${data.id} (${data.type})`);
        else if (name === "node:end") pushLog(`✔ ${data.id} done`);
        else if (name === "token")
          pushLog(`  …${(data.delta as string).replace(/\n/g, "↵")}`);
        else if (name === "human:checkpoint")
          pushLog(`⏸ human checkpoint: ${data.id}`);
        else if (name === "final")
          pushLog(
            `◉ final state: ${JSON.stringify(data.output ?? data).slice(0, 400)}`,
          );
      },
      onDone: () => {
        setRunning(false);
        const dur = Date.now() - start;
        upsertRuntime({
          ...active,
          status: "ready",
          lastRun: { at: Date.now(), durationMs: dur, ok: true },
        });
        toast.success(`Graph completou em ${dur}ms`);
      },
      onError: (err) => {
        setRunning(false);
        pushLog(`✖ error: ${err}`);
        upsertRuntime({
          ...active,
          status: "error",
          lastRun: {
            at: Date.now(),
            durationMs: Date.now() - start,
            ok: false,
          },
        });
        toast.error(`Graph error: ${err}`);
      },
    });
  }

  if (!active) {
    return (
      <WorkspaceShell
        eyebrow="Agentes"
        title="Nenhum runtime"
        description="Crie um runtime para começar."
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-[#17172d] px-5 py-3 text-sm font-bold text-white"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Novo runtime
        </button>
        <CreateRuntimeModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      </WorkspaceShell>
    );
  }

  const modelOptions = (() => {
    if (!active.llmProviderId) return [];
    const cfg = providers[active.llmProviderId];
    if (!cfg) return [];
    if (cfg.fetchedModels?.length) return cfg.fetchedModels.map((m) => m.id);
    return cfg.defaultModel ? [cfg.defaultModel] : [];
  })();

  return (
    <WorkspaceShell
      eyebrow="Agentes"
      title="Runtime real com LangGraph"
      description="Construa, edite e execute grafos de agentes. Cada nó pode ser LLM, ferramenta, router, transformação ou checkpoint humano."
    >
      <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        {/* Left: list of runtimes */}
        <Surface className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle
              icon={Workflow}
              title="Runtimes"
              desc="LangGraph é o padrão. Adicione outros."
            />
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-[#17172d] px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {runtimes.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-[24px] border p-4 text-left transition",
                active.id === r.id
                  ? "border-slate-900/20 bg-white/85 shadow-lg"
                  : "border-white/70 bg-white/55 hover:bg-white/75",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17172d] text-white">
                <Workflow className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-slate-950">
                    {r.name}
                  </span>
                  {r.isDefault && (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  )}
                  <StatusBadge status={r.status} />
                </span>
                <span className="mt-1 block truncate text-sm font-medium text-slate-500">
                  {r.description ??
                    `${r.nodes.length} nós, ${r.edges.length} edges`}
                </span>
              </span>
            </button>
          ))}
        </Surface>

        {/* Right: editor */}
        <Surface className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <input
                value={active.name}
                onChange={(e) => patchActive({ name: e.target.value })}
                className="w-full bg-transparent text-xl font-bold text-slate-950 outline-none"
              />
              <input
                value={active.description ?? ""}
                onChange={(e) => patchActive({ description: e.target.value })}
                placeholder="Descrição..."
                className="mt-1 w-full bg-transparent text-sm font-medium text-slate-500 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-60"
              >
                {running ? <Spinner size={14} /> : <Play className="h-4 w-4" />}
                {running ? "Executando" : "Executar"}
              </button>
              <button
                onClick={() => patchActive({ status: "paused" })}
                className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
              <button
                onClick={() => setDefaultRuntime(active.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                <Star className="h-4 w-4" />
                Padrão
              </button>
              <button
                onClick={() => {
                  if (confirmDialog(`Excluir ${active.name}?`)) {
                    removeRuntime(active.id);
                    toast.success("Runtime excluído.");
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectControl<string>
              label="Provedor LLM"
              value={active.llmProviderId ?? ""}
              onChange={(v) =>
                patchActive({
                  llmProviderId: v || undefined,
                  llmModel: undefined,
                })
              }
              options={[
                { value: "", label: "(nenhum)" },
                ...configuredProviders.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
            <SelectControl<string>
              label="Modelo"
              value={active.llmModel ?? ""}
              onChange={(v) => patchActive({ llmModel: v || undefined })}
              options={
                modelOptions.length ? modelOptions : ["(configure provedor)"]
              }
            />
          </div>

          <RuntimeKindBlock active={active} patchActive={patchActive} />

          <ToggleRow
            title="Memória persistente"
            desc="Mantém checkpoints entre execuções (in-memory por enquanto)."
            active={active.memory}
            onToggle={() => patchActive({ memory: !active.memory })}
          />

          {/* Nodes editor */}
          <div className="rounded-[24px] border border-white/70 bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">
                <Network className="mr-2 inline h-4 w-4" />
                Nós ({active.nodes.length})
              </h3>
              <button
                onClick={addNode}
                className="rounded-full bg-[#17172d] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Adicionar nó
              </button>
            </div>
            <div className="space-y-3">
              {active.nodes.map((n) => {
                const Icon = NODE_TYPE_ICON[n.type];
                return (
                  <div
                    key={n.id}
                    className="rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17172d] text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <input
                        value={n.id}
                        onChange={(e) =>
                          updateNode(n.id, {
                            id: e.target.value.replace(/\W/g, "_"),
                          })
                        }
                        className="w-32 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold outline-none"
                      />
                      <select
                        value={n.type}
                        onChange={(e) =>
                          updateNode(n.id, {
                            type: e.target.value as RuntimeNode["type"],
                          })
                        }
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold outline-none"
                      >
                        {NODE_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={n.label ?? ""}
                        onChange={(e) =>
                          updateNode(n.id, { label: e.target.value })
                        }
                        placeholder="Label"
                        className="flex-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold outline-none"
                      />
                      {active.entry === n.id && <Tag>entry</Tag>}
                      {active.exits.includes(n.id) && <Tag>exit</Tag>}
                      <button
                        onClick={() => patchActive({ entry: n.id })}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900"
                      >
                        →entry
                      </button>
                      <button
                        onClick={() =>
                          patchActive({
                            exits: active.exits.includes(n.id)
                              ? active.exits.filter((x) => x !== n.id)
                              : [...active.exits, n.id],
                          })
                        }
                        className="text-xs font-bold text-slate-500 hover:text-slate-900"
                      >
                        ↔exit
                      </button>
                      <button
                        onClick={() => removeNode(n.id)}
                        className="text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {n.type === "llm" && (
                      <textarea
                        value={n.prompt ?? ""}
                        onChange={(e) =>
                          updateNode(n.id, { prompt: e.target.value })
                        }
                        placeholder="Prompt (use {{varName}} para interpolar)"
                        rows={3}
                        className="mt-2 w-full rounded-lg bg-slate-50 p-2 font-mono text-xs outline-none"
                      />
                    )}
                    {(n.type === "tool" || n.type === "transform") && (
                      <textarea
                        value={n.toolCode ?? n.transformCode ?? ""}
                        onChange={(e) =>
                          updateNode(
                            n.id,
                            n.type === "tool"
                              ? { toolCode: e.target.value }
                              : { transformCode: e.target.value },
                          )
                        }
                        placeholder="async (state, input) => { return {...} }"
                        rows={3}
                        className="mt-2 w-full rounded-lg bg-slate-950 p-2 font-mono text-xs text-cyan-100 outline-none"
                      />
                    )}
                    {n.type === "router" && (
                      <input
                        value={n.routerKey ?? ""}
                        onChange={(e) =>
                          updateNode(n.id, { routerKey: e.target.value })
                        }
                        placeholder="Campo do state que define o branch (ex: 'category')"
                        className="mt-2 w-full rounded-lg bg-slate-50 p-2 font-mono text-xs outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edges editor */}
          <div className="rounded-[24px] border border-white/70 bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">
                <GitBranch className="mr-2 inline h-4 w-4" />
                Edges ({active.edges.length})
              </h3>
              <button
                onClick={addEdge}
                className="rounded-full bg-[#17172d] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Edge
              </button>
            </div>
            <div className="space-y-2">
              {active.edges.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 shadow-sm"
                >
                  <select
                    value={e.from}
                    onChange={(ev) =>
                      updateEdge(e.id, { from: ev.target.value })
                    }
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold outline-none"
                  >
                    {active.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-400">→</span>
                  <select
                    value={e.to}
                    onChange={(ev) => updateEdge(e.id, { to: ev.target.value })}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold outline-none"
                  >
                    {active.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id}
                      </option>
                    ))}
                  </select>
                  <input
                    value={e.condition ?? ""}
                    onChange={(ev) =>
                      updateEdge(e.id, {
                        condition: ev.target.value || undefined,
                      })
                    }
                    placeholder="branch (opcional)"
                    className="flex-1 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold outline-none"
                  />
                  <button
                    onClick={() => removeEdge(e.id)}
                    className="text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Test panel */}
          <div className="rounded-[24px] bg-[#17172d] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">
                <Sparkles className="mr-2 inline h-4 w-4" />
                Test input (JSON)
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-white/60 hover:text-white"
              >
                limpar log
              </button>
            </div>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl bg-black/40 p-3 font-mono text-xs text-cyan-100 outline-none"
            />
            <pre className="app-scrollbar mt-3 max-h-60 overflow-auto rounded-xl bg-black/40 p-3 text-xs leading-5 text-cyan-100">
              {logs.length
                ? logs.join("\n")
                : "(execute o grafo para ver eventos)"}
            </pre>
          </div>
        </Surface>
      </div>

      <CreateRuntimeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setActiveId(id)}
      />
    </WorkspaceShell>
  );
}

function CreateRuntimeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const upsertRuntime = useConfig((s) => s.upsertRuntime);

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const id = `rt-${Date.now().toString(36)}`;
    const node: RuntimeNode = {
      id: "start",
      type: "transform",
      label: "Start",
      transformCode: "return { input };",
    };
    upsertRuntime({
      id,
      name: name.trim(),
      description: desc.trim() || undefined,
      nodes: [node],
      edges: [],
      entry: "start",
      exits: ["start"],
      memory: true,
      status: "ready",
    });
    toast.success(`${name} criado`);
    setName("");
    setDesc("");
    onCreated?.(id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo runtime"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white"
          >
            Criar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <EditableField
          label="Nome"
          value={name}
          onChange={setName}
          placeholder="Meu agente"
        />
        <EditableField
          label="Descrição"
          value={desc}
          onChange={setDesc}
          placeholder="O que esse runtime faz?"
        />
      </div>
    </Modal>
  );
}

const RUNTIME_KIND_OPTIONS: Array<{
  value: RuntimeKind;
  label: string;
  desc: string;
}> = [
  {
    value: "langgraph-dag",
    label: "LangGraph DAG (in-app)",
    desc: "Executa o grafo desta página via /api/runtimes/langgraph/run.",
  },
  {
    value: "langgraph",
    label: "LangGraph (remoto)",
    desc: "Endpoint HTTP de uma instância LangGraph Cloud / self-hosted.",
  },
  {
    value: "crewai",
    label: "CrewAI",
    desc: "Endpoint HTTP de um servidor CrewAI.",
  },
  {
    value: "autogen",
    label: "AutoGen",
    desc: "Endpoint HTTP de um servidor AutoGen.",
  },
  {
    value: "llamaindex",
    label: "LlamaIndex",
    desc: "Endpoint HTTP de um workflow LlamaIndex.",
  },
  {
    value: "webcontainer",
    label: "WebContainer (preview)",
    desc: "Sandbox local de execução para preview ao vivo.",
  },
  {
    value: "omega-cognition",
    label: "OmegaCognitionEngine",
    desc: "Overlay cognitivo de 8 camadas (Global Workspace + Active Inference + Metacognitive Monitor) sobre qualquer LLM configurado.",
  },
  {
    value: "custom",
    label: "HTTP Custom",
    desc: "Qualquer endpoint que aceite POST {messages, model, system}.",
  },
  {
    value: "generic",
    label: "Generic LLM",
    desc: "Sem runtime — usa o modelo selecionado direto.",
  },
];

const CAP_LABELS: Record<keyof RuntimeCapabilities, string> = {
  canPlan: "Planeja",
  canGenerateCode: "Gera código",
  canExecute: "Executa",
  canDebug: "Depura",
  canCritiqueVisual: "Crítica visual",
  canStream: "Stream",
  supportsLivePreview: "Live preview",
};

function RuntimeKindBlock({
  active,
  patchActive,
}: {
  active: AgentRuntime;
  patchActive: (p: Partial<AgentRuntime>) => void;
}) {
  const setRuntimeTest = useConfig((s) => s.setRuntimeTest);
  const [testing, setTesting] = useState(false);
  const [testingCode, setTestingCode] = useState(false);
  const kind: RuntimeKind = active.kind ?? "langgraph-dag";
  const caps: RuntimeCapabilities =
    active.capabilities ?? defaultCapabilitiesFor(kind);

  function setKind(k: RuntimeKind) {
    patchActive({ kind: k, capabilities: defaultCapabilitiesFor(k) });
  }

  function toggleCap(key: keyof RuntimeCapabilities) {
    patchActive({ capabilities: { ...caps, [key]: !caps[key] } });
  }

  async function testConnection() {
    if (
      !active.endpoint &&
      kind !== "langgraph-dag" &&
      kind !== "generic" &&
      kind !== "webcontainer" &&
      kind !== "omega-cognition"
    ) {
      toast.error("Defina o endpoint primeiro.");
      return;
    }
    setTesting(true);
    try {
      if (
        kind === "langgraph-dag" ||
        kind === "generic" ||
        kind === "webcontainer" ||
        kind === "omega-cognition"
      ) {
        const r = await api.health();
        const result = {
          ok: r.ok,
          latencyMs: 0,
          at: Date.now(),
          error: r.error,
        };
        setRuntimeTest(active.id, result);
        toast[r.ok ? "success" : "error"](
          r.ok ? "Backend OK" : `Falhou: ${r.error}`,
        );
      } else {
        const decoded = getRuntimeDecoded(active.id);
        const r = await api.testRuntime({
          url: decoded?.endpoint ?? active.endpoint!,
          apiKey: decoded?.apiKey,
        });
        setRuntimeTest(active.id, {
          ok: r.ok,
          latencyMs: r.latencyMs,
          error: r.error,
          at: Date.now(),
        });
        toast[r.ok ? "success" : "error"](
          r.ok
            ? `Conectado em ${r.latencyMs}ms`
            : `Falhou: ${r.error ?? r.status}`,
        );
      }
    } finally {
      setTesting(false);
    }
  }

  async function testCodeGen() {
    setTestingCode(true);
    try {
      const adapter = createAdapter(active);
      const cfg = useConfig.getState();
      const provId =
        cfg.studioSelection.providerId ?? Object.keys(cfg.providers)[0];
      const spec = provId ? getRuntimeProviderSpec(provId) : undefined;
      const model =
        cfg.studioSelection.model ?? cfg.providers[provId ?? ""]?.defaultModel;
      const r = await adapter.testCodeGeneration({ spec, model });
      if (r.ok)
        toast.success(
          `Code-gen OK${r.latencyMs ? ` em ${r.latencyMs}ms` : ""}${r.details ? ` — ${r.details}` : ""}`,
        );
      else
        toast.error(
          `Code-gen nao concluiu: ${r.error ?? "erro"}${r.details ? ` — ${r.details}` : ""}`,
        );
    } finally {
      setTestingCode(false);
    }
  }

  const needsEndpoint = ![
    "langgraph-dag",
    "generic",
    "webcontainer",
    "omega-cognition",
  ].includes(kind);
  const lastTest = active.lastTest;
  const decodedActive = getRuntimeDecoded(active.id);

  return (
    <div className="rounded-[24px] border border-white/70 bg-white/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-950">Tipo de runtime</h3>
          <p className="text-xs font-medium text-slate-500">
            Determina como o Code Studio chama este runtime.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {testing ? <Spinner size={12} /> : null}
            Testar conexão
          </button>
          <button
            onClick={testCodeGen}
            disabled={testingCode}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            title="Confirma que o runtime + provider conseguem produzir JSON estruturado para o pipeline de geração de código"
          >
            {testingCode ? <Spinner size={12} /> : null}
            Testar geração
          </button>
        </div>
      </div>
      <SelectControl<RuntimeKind>
        label="Kind"
        value={kind}
        onChange={(v) => setKind(v)}
        options={RUNTIME_KIND_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
      />
      <p className="mt-2 text-xs text-slate-500">
        {RUNTIME_KIND_OPTIONS.find((o) => o.value === kind)?.desc}
      </p>

      {needsEndpoint && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <EditableField
            label="Endpoint"
            value={active.endpoint ?? ""}
            onChange={(v) => patchActive({ endpoint: v })}
            placeholder="https://api.example.com/agent"
          />
          <EditableField
            label="API Key (Bearer)"
            type="password"
            value={decodedActive?.apiKey ?? active.apiKey ?? ""}
            onChange={(v) => patchActive({ apiKey: v })}
            placeholder="opcional"
          />
        </div>
      )}

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Capacidades
        </h4>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CAP_LABELS) as Array<keyof RuntimeCapabilities>).map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleCap(k)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition",
                  caps[k]
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {caps[k] ? "✓ " : "○ "}
                {CAP_LABELS[k]}
              </button>
            ),
          )}
        </div>
      </div>

      {lastTest && (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Último teste:{" "}
          {lastTest.ok ? (
            <span className="text-emerald-600">
              OK em {lastTest.latencyMs ?? "?"}ms
            </span>
          ) : (
            <span className="text-rose-600">erro: {lastTest.error}</span>
          )}{" "}
          ({new Date(lastTest.at).toLocaleString()})
        </p>
      )}
    </div>
  );
}
