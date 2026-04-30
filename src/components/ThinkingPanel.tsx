import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Bug,
  Check,
  ChevronRight,
  ClipboardCopy,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import type { PipelineChunk, PipelineStage } from "@/services/normalize";
import { AIMessageRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/utils/cn";

export interface ThinkingPanelProps {
  chunks: PipelineChunk[];
  defaultOpen?: boolean;
  compact?: boolean;
}

const STAGE_META: Record<
  PipelineStage,
  { label: string; icon: typeof Brain; chip: string; dot: string }
> = {
  plan: {
    label: "Plan",
    icon: Brain,
    chip: "bg-sky-100 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  act: {
    label: "Act",
    icon: Zap,
    chip: "bg-violet-100 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
  },
  verify: {
    label: "Verify",
    icon: ShieldCheck,
    chip: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  debug: {
    label: "Debug",
    icon: Bug,
    chip: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
};

export function ThinkingPanel({
  chunks,
  defaultOpen = false,
  compact,
}: ThinkingPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<PipelineStage | "logs">("plan");
  const ordered = useMemo(
    () =>
      chunks
        .slice()
        .sort(
          (a, b) => (a.createdAt ?? a.ts ?? 0) - (b.createdAt ?? b.ts ?? 0),
        ),
    [chunks],
  );
  const stages = useMemo(
    () => Array.from(new Set(ordered.map((chunk) => chunk.stage))),
    [ordered],
  );
  const tabs = useMemo(() => {
    const primary = (["plan", "act", "verify"] as PipelineStage[]).filter(
      (stage) => stages.includes(stage),
    );
    const extra = stages.filter((stage) => !primary.includes(stage));
    const hasLogs = ordered.some((chunk) => chunk.logs?.length);
    return [...primary, ...extra, ...(hasLogs ? (["logs"] as const) : [])];
  }, [ordered, stages]);
  const running = ordered.some((chunk) => chunk.status === "running");
  const selectedTab = tabs.includes(activeTab) ? activeTab : tabs[0];
  const visibleChunks =
    selectedTab && selectedTab !== "logs"
      ? ordered.filter((chunk) => chunk.stage === selectedTab)
      : [];
  const allLogs = ordered.flatMap((chunk) =>
    (chunk.logs ?? []).map(
      (line) => `[${STAGE_META[chunk.stage].label}] ${line}`,
    ),
  );

  if (ordered.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-2 overflow-hidden rounded-2xl border border-white/70 bg-white/55 shadow-inner backdrop-blur",
        compact && "text-xs",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-white/45"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              running ? "animate-pulse bg-emerald-500" : "bg-slate-400",
            )}
          />
          <span className="truncate text-[12px] font-bold text-slate-700">
            Thinking · {ordered.length}{" "}
            {ordered.length === 1 ? "step" : "steps"}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {stages.map((stage) => {
              const meta = STAGE_META[stage];
              const Icon = meta.icon;
              return (
                <span
                  key={stage}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
                    meta.chip,
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {meta.label}
                </span>
              );
            })}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/70"
          >
            <div className="space-y-2 p-2.5">
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/70 p-1">
                {tabs.map((tab) => {
                  const label = tab === "logs" ? "Logs" : STAGE_META[tab].label;
                  const active = tab === selectedTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                        active
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedTab === "logs" ? (
                <pre className="max-h-44 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] leading-4 text-slate-200">
                  {allLogs.join("\n") || "No logs for this message."}
                </pre>
              ) : (
                visibleChunks.map((chunk) => (
                  <ThinkingChunk
                    key={chunk.id}
                    chunk={chunk}
                    compact={compact}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ThinkingChunk({
  chunk,
  compact,
}: {
  chunk: PipelineChunk;
  compact?: boolean;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = STAGE_META[chunk.stage];
  const Icon = meta.icon;
  const rawText =
    chunk.raw === undefined
      ? undefined
      : typeof chunk.raw === "string"
        ? chunk.raw
        : JSON.stringify(chunk.raw, null, 2);

  async function copyChunk() {
    const text = chunk.content ?? chunk.summary ?? rawText ?? "";
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/85 p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                meta.chip,
              )}
            >
              <Icon className="h-3 w-3" />
              {chunk.title || meta.label}
            </span>
            <StatusPill status={chunk.status} />
          </div>
          {chunk.summary ? (
            <p className="mt-1.5 text-[12px] leading-5 text-slate-700">
              {chunk.summary}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {rawText ? (
            <button
              type="button"
              onClick={() => setShowRaw((value) => !value)}
              className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
            >
              {showRaw ? "Hide raw" : "Raw debug data"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={copyChunk}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
            title="Copy thinking step"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <ClipboardCopy className="h-3 w-3" />
            )}
            Copy
          </button>
        </div>
      </div>

      {chunk.content && chunk.content !== chunk.summary ? (
        <div className="mt-2 rounded-xl bg-slate-50/80 px-2.5 py-1.5">
          <AIMessageRenderer markdown={chunk.content} compact={compact} />
        </div>
      ) : null}

      {chunk.logs?.length ? (
        <pre className="mt-2 max-h-28 overflow-auto rounded-lg bg-slate-950 p-2 font-mono text-[10px] leading-4 text-slate-200">
          {chunk.logs.join("\n")}
        </pre>
      ) : null}

      <AnimatePresence initial={false}>
        {showRaw && rawText ? (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-950 p-2 font-mono text-[10px] leading-4 text-emerald-200"
          >
            {rawText}
          </motion.pre>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: PipelineChunk["status"] }) {
  const tone =
    status === "error"
      ? "bg-rose-100 text-rose-700"
      : status === "warn"
        ? "bg-amber-100 text-amber-700"
        : status === "running"
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700";
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        tone,
      )}
    >
      {status}
    </span>
  );
}
