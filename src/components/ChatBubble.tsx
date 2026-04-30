import { motion } from "framer-motion";
import { useMemo } from "react";
import type { ChatMessageV2 } from "@/types";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ThinkingPanel } from "@/components/ThinkingPanel";
import { normalizeAssistantOutput } from "@/services/normalize";
import { cn } from "@/utils/cn";

export interface ChatBubbleProps {
  message: ChatMessageV2;
  index?: number;
  /** Compact density (used in Code Studio chat). */
  compact?: boolean;
  enableApplyToEditor?: boolean;
  onApplyToEditor?: (info: { language: string; code: string }) => void;
}

/**
 * Unified chat bubble used by both the normal Chat (App.tsx) and the
 * Code Studio chat (CodeStudioPage.tsx).
 *
 * - User bubbles: dark, right-aligned, plain text
 * - Assistant bubbles: light, markdown-rendered via MarkdownRenderer,
 *   thinking chunks (plan/act/verify) extracted by `normalizeAssistantOutput`
 *   and rendered through the collapsible `ThinkingPanel` — never as raw JSON.
 */
export function ChatBubble({
  message,
  index = 0,
  compact,
  enableApplyToEditor,
  onApplyToEditor,
}: ChatBubbleProps) {
  const isUser = message.role === "user";

  const normalized = useMemo(() => {
    if (isUser) return null;
    return normalizeAssistantOutput({
      id: message.id,
      createdAt: message.createdAt,
      meta: {
        providerId: message.providerId,
        modelId: message.modelId,
        runtimeId: message.runtimeId,
      },
      raw: message.content,
    });
  }, [
    isUser,
    message.id,
    message.createdAt,
    message.providerId,
    message.modelId,
    message.runtimeId,
    message.content,
  ]);

  const bubble = (
    <div
      className={cn(
        "rounded-[20px] shadow-[0_10px_30px_rgba(103,115,160,0.10)]",
        compact ? "px-3.5 py-2.5 text-sm" : "px-4.5 py-3 text-sm sm:text-base",
        isUser
          ? "rounded-br-sm bg-[#17172d] text-white"
          : "rounded-tl-sm bg-white/95 text-slate-900",
      )}
    >
      {isUser ? (
        <div className="whitespace-pre-wrap">
          {message.content || (message.streaming ? "..." : "")}
        </div>
      ) : (
        <>
          {!compact &&
            (message.providerId || message.modelId || message.runtimeId) && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {message.runtimeId && <Badge>{message.runtimeId}</Badge>}
                {message.providerId && (
                  <Badge tone="indigo">{message.providerId}</Badge>
                )}
                {message.modelId && (
                  <Badge tone="emerald">{message.modelId}</Badge>
                )}
              </div>
            )}
          {normalized && normalized.finalMarkdown ? (
            <MarkdownRenderer
              content={normalized.finalMarkdown}
              enableApplyToEditor={enableApplyToEditor}
              onApplyToEditor={onApplyToEditor}
              compact={compact}
            />
          ) : (
            <span className="text-slate-400">
              {message.streaming ? "▍" : ""}
            </span>
          )}
          {message.streaming && (
            <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-current align-middle" />
          )}
        </>
      )}
      {message.attachments?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.attachments.map((a, i) => (
            <span
              key={i}
              className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold"
            >
              {a.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index * 0.02, 0.18),
        duration: 0.22,
        ease: "easeOut",
      }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          compact ? "max-w-[92%]" : "max-w-[88%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {bubble}
        {!isUser && normalized && normalized.chunks.length > 0 && (
          <ThinkingPanel chunks={normalized.chunks} compact={compact} />
        )}
        {message.error && (
          <p className="mt-1 text-[11px] font-bold text-rose-600">
            {message.error}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "indigo" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
  } as const;
  return (
    <span className={cn("rounded-full px-1.5 py-0.5", tones[tone])}>
      {children}
    </span>
  );
}
