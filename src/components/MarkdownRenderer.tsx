import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, ClipboardCopy, FilePlus2 } from "lucide-react";
import { motion } from "framer-motion";
import { normalizeMarkdown } from "@/services/normalize";
import { cn } from "@/utils/cn";

export interface AIMessageRendererProps {
  markdown: string;
  className?: string;
  enableApplyToEditor?: boolean;
  onApplyToEditor?: (info: { language: string; code: string }) => void;
  compact?: boolean;
}

export interface MarkdownRendererProps extends Omit<
  AIMessageRendererProps,
  "markdown"
> {
  content: string;
}

export function AIMessageRenderer({
  markdown,
  className,
  enableApplyToEditor,
  onApplyToEditor,
  compact,
}: AIMessageRendererProps) {
  const normalized = useMemo(() => normalizeMarkdown(markdown), [markdown]);
  const components = {
    h1: ({ children }) => (
      <h1 className="mb-2 mt-3 text-xl font-semibold tracking-tight text-slate-950">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-3 text-lg font-semibold tracking-tight text-slate-950">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-1.5 mt-2.5 text-base font-semibold text-slate-950">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="my-2 first:mt-0 last:mb-0">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-5 marker:text-slate-400">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-400">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-4 border-indigo-200 bg-indigo-50/60 px-3 py-2 text-slate-700">
        {children}
      </blockquote>
    ),
    a: ({ children, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noreferrer noopener"
        className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
        {children}
      </td>
    ),
    code({ className: codeClassName, children, node: _node, ...props }) {
      const code = String(children).replace(/\n$/, "");
      const language =
        /language-([a-z0-9_-]+)/i.exec(codeClassName ?? "")?.[1] ??
        inferCodeLanguage(code);
      const isBlock = code.includes("\n") || Boolean(codeClassName);

      if (isBlock && language !== "text") {
        return (
          <CodeBlockRenderer
            language={language}
            code={code}
            enableApplyToEditor={enableApplyToEditor}
            onApplyToEditor={onApplyToEditor}
          />
        );
      }

      return (
        <code
          className={cn(
            "rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[0.86em] font-semibold text-slate-800",
            codeClassName,
          )}
          {...props}
        >
          {children}
        </code>
      );
    },
  } satisfies Components;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "ai-message-renderer max-w-none wrap-break-word text-slate-800",
        compact ? "text-[13px] leading-5" : "text-sm leading-6 sm:text-[15px]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </motion.div>
  );
}

export function MarkdownRenderer({ content, ...props }: MarkdownRendererProps) {
  return <AIMessageRenderer markdown={content} {...props} />;
}

export function CodeBlockRenderer({
  language,
  code,
  enableApplyToEditor,
  onApplyToEditor,
}: {
  language: string;
  code: string;
  enableApplyToEditor?: boolean;
  onApplyToEditor?: (info: { language: string; code: string }) => void;
}) {
  const [copied, setCopied] = useState(false);
  const displayLanguage = language || "text";
  const canInsert =
    enableApplyToEditor && code.trim().length > 0 && displayLanguage !== "text";

  async function copy() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="not-prose my-3 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.22)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3 py-2">
        <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
          {displayLanguage}
        </span>
        <div className="flex items-center gap-1.5">
          {canInsert ? (
            <button
              type="button"
              onClick={() =>
                onApplyToEditor?.({ language: displayLanguage, code })
              }
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-400/12 px-2.5 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-400/20"
              title="Insert into editor"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Insert
            </button>
          ) : null}
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/8 px-2.5 text-[11px] font-bold text-slate-200 transition hover:bg-white/14 hover:text-white"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={displayLanguage}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: 12,
          lineHeight: 1.55,
          padding: "14px 16px",
          background: "#020617",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          },
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </motion.div>
  );
}

function inferCodeLanguage(code: string): string {
  const trimmed = code.trim();
  if (/^<!doctype html>|^<html[\s>]/i.test(trimmed)) return "html";
  if (/^[[{]/.test(trimmed)) return "json";
  if (
    /\b(className=|useState\(|from\s+["']react["']|<[A-Z][A-Za-z0-9]*[\s>])/.test(
      trimmed,
    )
  )
    return "tsx";
  if (
    /\b(import|export|const|let|function|document\.|window\.)\b/.test(trimmed)
  )
    return "javascript";
  if (/\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(trimmed)) return "css";
  if (/^(npm|pnpm|yarn|node|npx|git|curl|cd|mkdir)\b/m.test(trimmed))
    return "bash";
  return "text";
}

export function MarkdownInline({ children }: { children: ReactNode }) {
  return <span className="text-sm leading-6 text-slate-700">{children}</span>;
}
