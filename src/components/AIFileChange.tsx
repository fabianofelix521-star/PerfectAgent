import { memo, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, File, Loader2 } from "lucide-react";
import type { ProjectFile } from "@/types";
import { cn } from "@/utils/cn";

export type AIFileStatus = "pending" | "writing" | "done" | "error";

interface AIFileChangeProps {
  file: ProjectFile;
  status?: AIFileStatus;
  compact?: boolean;
}

export const AIFileChange = memo(function AIFileChange({
  file,
  status = "done",
  compact,
}: AIFileChangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const lines = file.content.split("\n").length;
    const sizeKb = (new Blob([file.content]).size / 1024).toFixed(1);
    return { lines, sizeKb };
  }, [file.content]);

  const statusIcon = {
    pending: <Loader2 size={12} className="animate-spin text-slate-400" />,
    writing: <Loader2 size={12} className="animate-spin text-blue-500" />,
    done: <Check size={12} className="text-emerald-500" />,
    error: <span className="text-xs font-bold text-rose-500">!</span>,
  }[status];

  const maxLines = compact ? 80 : 120;
  const codeLines = file.content.split("\n");
  const truncated = codeLines.length > maxLines;
  const previewContent = truncated
    ? `${codeLines.slice(0, maxLines).join("\n")}\n... +${codeLines.length - maxLines} linhas`
    : file.content;

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/70">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
      >
        {isOpen ? (
          <ChevronDown size={13} className="shrink-0 text-slate-500" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-slate-500" />
        )}
        <File size={12} className="shrink-0 text-indigo-500" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold text-slate-700">
          {file.path}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          {stats.lines}L · {stats.sizeKb}kb
        </span>
        <span className="shrink-0">{statusIcon}</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <Copy size={11} />
              {copied ? "Copiado" : "Copiar código"}
            </button>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {getLanguageFromPath(file.path)}
            </span>
          </div>
          <pre className={cn("max-h-[360px] overflow-auto bg-slate-950 p-3 text-[11px] leading-5 text-slate-100", compact && "max-h-[300px]")}>
            <code>{previewContent}</code>
          </pre>
        </div>
      )}
    </div>
  );
});

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "text";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    css: "CSS",
    html: "HTML",
    json: "JSON",
    md: "Markdown",
    py: "Python",
    rs: "Rust",
    go: "Go",
    sh: "Shell",
  };
  return map[ext] ?? ext.toUpperCase();
}
