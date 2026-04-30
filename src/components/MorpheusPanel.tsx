/**
 * MorpheusPanel — vitrine ao vivo da Pantheon e do leiloeiro Morpheus.
 *
 * Mostra todos os agentes registrados, performance EWMA, fila de tarefas em
 * aberto e permite postar uma nova tarefa para ver o leilão acontecendo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Activity, Trophy, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Surface, SectionTitle, Tag } from "@/components/ui";
import { getMorpheus } from "@/services/morpheus";
import type { TaskUnit } from "@/modules/morpheus";
import { cn } from "@/utils/cn";

type LedgerEntry = {
  task: TaskUnit;
  winnerName?: string;
};

export function MorpheusPanel() {
  const morpheus = useMemo(() => getMorpheus(), []);
  const [agentsTick, setAgentsTick] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [input, setInput] = useState(
    "Audit the OAuth callback handler for redirect-injection and open-redirect vulnerabilities",
  );
  const [tagsRaw, setTagsRaw] = useState("security,auth");
  const [busy, setBusy] = useState(false);
  const ledgerRef = useRef<LedgerEntry[]>([]);
  ledgerRef.current = ledger;

  useEffect(() => {
    const upsert = (task: TaskUnit, patch: Partial<LedgerEntry> = {}) => {
      const existing = ledgerRef.current.find((e) => e.task.id === task.id);
      const next: LedgerEntry = existing
        ? { ...existing, task, ...patch }
        : { task, ...patch };
      const list = [
        next,
        ...ledgerRef.current.filter((e) => e.task.id !== task.id),
      ].slice(0, 12);
      setLedger(list);
    };

    const unsub = morpheus.on({
      onTaskPosted: (task) => upsert(task),
      onTaskAssigned: (task, bid) => {
        const winner = morpheus.agents.get(bid.agentId);
        upsert(task, { winnerName: winner?.name ?? bid.agentId });
        setAgentsTick((t) => t + 1);
      },
      onTaskCompleted: (task) => {
        upsert(task);
        setAgentsTick((t) => t + 1);
      },
      onTaskFailed: (task) => {
        upsert(task);
        setAgentsTick((t) => t + 1);
      },
    });
    return unsub;
  }, [morpheus]);

  const agents = useMemo(
    () => Array.from(morpheus.agents.values()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [morpheus, agentsTick],
  );

  async function handlePost() {
    const desc = input.trim();
    if (!desc || busy) return;
    setBusy(true);
    try {
      const tags = tagsRaw
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      await morpheus.runTask(desc, { tags, priority: 0.85 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle
          icon={Sparkles}
          title="Morpheus Runtime · Pantheon"
          desc={`${agents.length} agentes registrados · leiloeiro ativo · hyperledger ${morpheus.ledger.size} tarefas`}
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          live
        </span>
      </div>

      {/* Postar nova tarefa */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Postar tarefa para leilão
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
          placeholder="Descreva a tarefa em uma frase…"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="tags (ex.: security, refactor)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handlePost}
            disabled={busy || !input.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-md transition",
              busy
                ? "bg-slate-400"
                : "bg-[#17172d] hover:shadow-[0_14px_36px_rgba(23,23,45,0.28)]",
            )}
          >
            <Send className="h-3.5 w-3.5" />
            {busy ? "Leiloando…" : "Postar"}
          </motion.button>
        </div>
      </div>

      {/* Pantheon */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Pantheon ({agents.length})
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => {
            const perf = a.performance;
            const successPct = Math.round(perf.successRate * 100);
            const completed = perf.succeeded;
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {a.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {a.role}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      successPct >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : successPct >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {successPct}%
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.skills.slice(0, 4).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                  {a.skills.length > 4 && <Tag>+{a.skills.length - 4}</Tag>}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    cap {a.maxCapacity}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {completed} done
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Hyperledger (últimos {ledger.length})
        </p>
        {ledger.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-4 text-center text-xs text-slate-500">
            Sem tarefas postadas ainda. Lance a primeira acima.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {ledger.map((entry) => (
                <motion.li
                  key={entry.task.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-2 text-xs shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 flex-1 font-medium text-slate-800">
                      {entry.task.description}
                    </p>
                    <StatusPill status={entry.task.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    {entry.winnerName && (
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        {entry.winnerName}
                      </span>
                    )}
                    {entry.task.result?.durationMs != null && (
                      <span>{entry.task.result.durationMs}ms</span>
                    )}
                    {entry.task.metadata?.tags?.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Surface>
  );
}

function StatusPill({ status }: { status: TaskUnit["status"] }) {
  const map: Record<TaskUnit["status"], string> = {
    OPEN: "bg-sky-100 text-sky-700",
    ASSIGNED: "bg-violet-100 text-violet-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
    CANCELLED: "bg-slate-200 text-slate-600",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        map[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
