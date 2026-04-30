import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Crown, Network, Zap } from "lucide-react";
import {
  getSupremeCoordinator,
  SUPERVISORS,
  STRATEGIC_NODES,
  INFRASTRUCTURE_NODES,
  type SwarmAgent,
  type SupervisorDef,
} from "@/services/supremeCoordinator";
import { Modal } from "@/components/ui";
import { cn } from "@/utils/cn";

const TIER_LABEL: Record<SupervisorDef["tier"], string> = {
  hot: "HOT < 100ms",
  warm: "WARM < 2s",
  cold: "COLD < 30s",
};
const TIER_COLOR: Record<SupervisorDef["tier"], string> = {
  hot: "text-rose-600 bg-rose-50 border-rose-200",
  warm: "text-amber-700 bg-amber-50 border-amber-200",
  cold: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export function SupremeCoordinatorPanel() {
  const store = getSupremeCoordinator();
  const [agents, setAgents] = useState<SwarmAgent[]>(() => store.list());
  const [openSup, setOpenSup] = useState<string | null>("financial");
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<string | null>(null);

  useEffect(() => store.subscribe(setAgents), [store]);

  const tiers = useMemo(
    () => ({
      hot: SUPERVISORS.filter((s) => s.tier === "hot"),
      warm: SUPERVISORS.filter((s) => s.tier === "warm"),
      cold: SUPERVISORS.filter((s) => s.tier === "cold"),
    }),
    [],
  );

  function countFor(supId: string) {
    return agents.filter((a) => a.supervisorId === supId).length;
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">
            Supreme Coordinator
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {agents.length} agentes · 15 supervisores
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddPrefill(null);
            setAddOpen(true);
          }}
          className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={12} /> Novo agente
        </button>
      </header>

      {/* Strategic Layer */}
      <Section icon={<Zap size={12} />} title="Strategic Layer">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {STRATEGIC_NODES.map((n) => (
            <div
              key={n.id}
              className="rounded-md border border-slate-200/70 bg-slate-50/60 px-2 py-1.5"
            >
              <div className="text-[11px] font-bold text-slate-800">
                {n.name}
              </div>
              <div className="text-[10px] leading-tight text-slate-500">
                {n.role}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Domain Supervisors */}
      <Section icon={<Network size={12} />} title="Domain Supervisors (15)">
        {(["hot", "warm", "cold"] as const).map((tier) => (
          <div key={tier} className="mb-2">
            <div
              className={cn(
                "mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                TIER_COLOR[tier],
              )}
            >
              {TIER_LABEL[tier]}
            </div>
            <div className="space-y-1">
              {tiers[tier].map((sup) => {
                const count = countFor(sup.id);
                const isOpen = openSup === sup.id;
                return (
                  <div
                    key={sup.id}
                    className="rounded-md border border-slate-200/60 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenSup(isOpen ? null : sup.id)}
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{sup.emoji}</span>
                        <span className="text-[11px] font-bold text-slate-900">
                          {sup.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {count}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-slate-100 px-2 py-1.5">
                        <div className="mb-1 text-[10px] text-slate-500">
                          {sup.description}
                        </div>
                        <ul className="space-y-1">
                          {agents
                            .filter((a) => a.supervisorId === sup.id)
                            .map((a) => (
                              <li
                                key={a.id}
                                className="flex items-start justify-between gap-2 rounded border border-slate-100 bg-slate-50/40 px-1.5 py-1"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-900">
                                    <span className="truncate">{a.name}</span>
                                    {a.builtIn ? (
                                      <span className="rounded bg-amber-100 px-1 text-[9px] text-amber-700">
                                        built-in
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-[10px] leading-tight text-slate-500">
                                    {a.description}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                                    {a.tags.slice(0, 6).map((t) => (
                                      <span
                                        key={t}
                                        className="rounded bg-white px-1 text-[9px] text-slate-500"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {!a.builtIn ? (
                                  <button
                                    type="button"
                                    onClick={() => store.removeAgent(a.id)}
                                    className="text-slate-400 hover:text-rose-600"
                                    title="Remover agente"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          {agents.filter((a) => a.supervisorId === sup.id)
                            .length === 0 ? (
                            <li className="text-[10px] italic text-slate-400">
                              Nenhum agente registrado.
                            </li>
                          ) : null}
                        </ul>
                        <button
                          type="button"
                          onClick={() => {
                            setAddPrefill(sup.id);
                            setAddOpen(true);
                          }}
                          className="mt-1 flex items-center gap-1 rounded text-[10px] font-semibold text-slate-700 hover:text-slate-900"
                        >
                          <Plus size={10} /> Adicionar agente em {sup.name}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Section>

      {/* Infrastructure */}
      <Section icon={<Network size={12} />} title="Infrastructure">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {INFRASTRUCTURE_NODES.map((n) => (
            <div
              key={n.id}
              className="rounded-md border border-slate-200/70 bg-slate-50/60 px-2 py-1.5"
            >
              <div className="text-[11px] font-bold text-slate-800">
                {n.name}
              </div>
              <div className="text-[10px] leading-tight text-slate-500">
                {n.role}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <AddAgentModal
        open={addOpen}
        defaultSupervisorId={addPrefill}
        onClose={() => setAddOpen(false)}
        onAdd={(input) => {
          store.addAgent(input);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function AddAgentModal({
  open,
  defaultSupervisorId,
  onClose,
  onAdd,
}: {
  open: boolean;
  defaultSupervisorId: string | null;
  onClose: () => void;
  onAdd: (input: {
    supervisorId: string;
    name: string;
    description: string;
    soulPrompt: string;
    tags: string[];
    code?: string;
  }) => void;
}) {
  const [supervisorId, setSupervisorId] = useState(
    defaultSupervisorId ?? "engineering",
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [soulPrompt, setSoulPrompt] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) {
      setSupervisorId(defaultSupervisorId ?? "engineering");
      setName("");
      setDescription("");
      setTags("");
      setSoulPrompt("");
      setCode("");
    }
  }, [open, defaultSupervisorId]);

  const canAdd = name.trim() && soulPrompt.trim() && supervisorId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo agente do swarm"
      width={640}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            disabled={!canAdd}
            onClick={() =>
              onAdd({
                supervisorId,
                name: name.trim(),
                description: description.trim(),
                soulPrompt: soulPrompt.trim(),
                tags: tags
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
                code: code.trim() || undefined,
              })
            }
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
              canAdd
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-300 cursor-not-allowed",
            )}
          >
            Adicionar agente
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <Field label="Supervisor">
          <select
            value={supervisorId}
            onChange={(e) => setSupervisorId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            {(["hot", "warm", "cold"] as const).map((t) => (
              <optgroup key={t} label={TIER_LABEL[t]}>
                {SUPERVISORS.filter((s) => s.tier === t).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: NFT Floor Sniper"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </Field>
        <Field label="Descrição curta">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que o agente faz em uma linha."
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </Field>
        <Field label="Tags (vírgula)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="solana, nft, floor, opensea"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </Field>
        <Field label="Soul prompt (system prompt do agente)">
          <textarea
            value={soulPrompt}
            onChange={(e) => setSoulPrompt(e.target.value)}
            rows={5}
            placeholder="You are X — a specialist in Y. You always do Z…"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono"
          />
        </Field>
        <Field label="Código TypeScript de referência (opcional, mostrado ao LLM como guia)">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={10}
            placeholder="// agents/your-agent.ts&#10;export class YourAgent { … }"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-mono"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
