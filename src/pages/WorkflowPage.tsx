import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitBranch, Play, Save, Workflow } from "lucide-react";
import {
  WorkspaceShell,
  Surface,
  SectionTitle,
  SelectControl,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/services/api";
import { resolveRuntimeLlmConfig } from "@/services/configSelectors";
import { getRuntimeProviderSpec, useConfig } from "@/stores/config";
import { toast } from "@/components/Toast";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function WorkflowPage() {
  const runtimes = useConfig((s) => s.runtimes);
  const upsertRuntime = useConfig((s) => s.upsertRuntime);
  const providers = useConfig((s) => s.providers);
  const models = useConfig((s) => s.models);
  const settings = useConfig((s) => s.settings);
  const studioSelection = useConfig((s) => s.studioSelection);
  const [runtimeId, setRuntimeId] = useState(runtimes[0]?.id ?? "");
  const [input, setInput] = useState('{"question":"Explique este workflow."}');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const workflowRuntime =
    runtimes.find((runtime) => runtime.id === runtimeId) ?? runtimes[0];

  const flow = useMemo(() => {
    const nodes: Node[] =
      workflowRuntime?.nodes.map((node, index) => ({
        id: node.id,
        type: "default",
        position: {
          x: (index % 3) * 250,
          y: Math.floor(index / 3) * 140,
        },
        data: {
          label: `${node.label ?? node.id}\n${node.type}`,
        },
      })) ?? [];
    const edges: Edge[] =
      workflowRuntime?.edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.condition,
        animated: running,
      })) ?? [];
    return { nodes, edges };
  }, [running, workflowRuntime]);

  function appendLog(line: string) {
    setLogs((current) =>
      [...current, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-160),
    );
  }

  async function runWorkflow() {
    if (!workflowRuntime) return;
    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(input) as Record<string, unknown>;
    } catch {
      toast.error("Input JSON inválido.");
      return;
    }
    const resolvedLlm = resolveRuntimeLlmConfig(workflowRuntime, {
      providers,
      models,
      defaultProviderId: settings.defaultProviderId,
      defaultModelId: settings.defaultModelId,
      selectionProviderId: studioSelection.providerId,
      selectionModel: studioSelection.model,
    });
    const llmSpec = getRuntimeProviderSpec(resolvedLlm.providerId);
    if (
      workflowRuntime.nodes.some((node) => node.type === "llm") &&
      (!llmSpec || !resolvedLlm.modelId)
    ) {
      toast.error("Selecione uma IA padrão no app ou defina um override no runtime.");
      return;
    }

    setRunning(true);
    setLogs([]);
    appendLog("Workflow started");
    const startedAt = Date.now();
    api.streamGraph({
      body: {
        nodes: workflowRuntime.nodes,
        edges: workflowRuntime.edges,
        entry: workflowRuntime.entry,
        exits: workflowRuntime.exits.length
          ? workflowRuntime.exits
          : [workflowRuntime.nodes.at(-1)?.id].filter(Boolean),
        input: parsedInput,
        llmSpec,
        llmModel: resolvedLlm.modelId,
      },
      onEvent: (name, data) => {
        if (name === "node:start" && isRecord(data)) {
          appendLog(`start ${String(data.id)} (${String(data.type)})`);
        } else if (name === "node:end" && isRecord(data)) {
          appendLog(`done ${String(data.id)}`);
        } else if (name === "token" && isRecord(data)) {
          appendLog(`token ${String(data.delta ?? "").replace(/\n/g, "↵")}`);
        } else if (name === "final") {
          appendLog("final state emitted");
        }
      },
      onDone: () => {
        setRunning(false);
        upsertRuntime({
          ...workflowRuntime,
          status: "ready",
          lastRun: {
            at: Date.now(),
            durationMs: Date.now() - startedAt,
            ok: true,
          },
        });
        toast.success("Workflow executado.");
      },
      onError: (err) => {
        setRunning(false);
        appendLog(`error ${err}`);
        upsertRuntime({
          ...workflowRuntime,
          status: "error",
          lastRun: {
            at: Date.now(),
            durationMs: Date.now() - startedAt,
            ok: false,
          },
        });
        toast.error(err);
      },
    });
  }

  const configuredProviders = Object.values(providers).filter(
    (provider) => provider.configured,
  );

  return (
    <WorkspaceShell
      eyebrow="Workflow"
      title="Executor visual de workflows"
      description="Visualize e execute os grafos reais cadastrados no módulo de Agentes. A edição estrutural continua no editor de runtimes."
    >
      <div className="grid h-[calc(100%-1rem)] min-h-[620px] gap-5 xl:grid-cols-[1fr_360px]">
        <Surface className="min-h-0 overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle icon={Workflow} title="Canvas React Flow" desc="Nós e edges são lidos do runtime selecionado." />
            {workflowRuntime ? <StatusBadge status={workflowRuntime.status} /> : null}
          </div>
          <div className="h-[520px] overflow-hidden rounded-[22px] border border-white/70 bg-white/55">
            {flow.nodes.length ? (
              <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView>
                <Background color="#cbd5e1" />
                <Controls />
                <MiniMap />
              </ReactFlow>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                Nenhum nó no runtime selecionado.
              </div>
            )}
          </div>
        </Surface>

        <Surface className="flex min-h-0 flex-col">
          <SectionTitle icon={GitBranch} title="Execução" desc="Rode o grafo com input JSON e acompanhe os eventos." />
          <div className="mt-4 space-y-3">
            <SelectControl<string>
              label="Workflow"
              value={workflowRuntime?.id ?? ""}
              onChange={setRuntimeId}
              options={runtimes.map((runtime) => ({
                value: runtime.id,
                label: runtime.name,
              }))}
            />
            <div className="rounded-[14px] border border-white/70 bg-white/65 px-3 py-2">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Input JSON
              </span>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={5}
                className="w-full resize-none bg-transparent font-mono text-xs font-bold text-slate-800 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={runWorkflow}
              disabled={running || !workflowRuntime}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#17172d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {running ? <Spinner size={14} /> : <Play className="h-4 w-4" />}
              {running ? "Executando" : "Executar workflow"}
            </button>
            <a
              href="/agents"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <Save className="h-4 w-4" />
              Editar no módulo Agentes
            </a>
            {configuredProviders.length === 0 ? (
              <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Workflows com nós LLM precisam de uma API key configurada.
              </div>
            ) : null}
          </div>
          <pre className="app-scrollbar mt-4 min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-950 p-3 text-[11px] leading-5 text-cyan-100">
            {logs.length ? logs.join("\n") : "Sem execução ativa."}
          </pre>
        </Surface>
      </div>
    </WorkspaceShell>
  );
}
