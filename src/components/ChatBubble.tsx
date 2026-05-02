import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import { Code2 } from "lucide-react";
import type { ChatMessageV2 } from "@/types";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MessageActionBar } from "@/components/MessageActionBar";
import { StreamingText } from "@/components/AIStreamingRenderer";
import { ThinkingPanel } from "@/components/ThinkingPanel";
import { normalizeAssistantOutput } from "@/services/normalize";
import { cn } from "@/utils/cn";
import {
  AttachmentViewerCard,
  createViewerFileFromAttachment,
  createViewerFileFromProjectFile,
  GeneratedFileCard,
} from "@/shared/components/viewer/UniversalViewer";

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
export const ChatBubble = memo(function ChatBubble({
  message,
  index = 0,
  compact,
  enableApplyToEditor,
  onApplyToEditor,
}: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isAssistantStreaming = !isUser && Boolean(message.streaming);

  const normalized = useMemo(() => {
    if (isUser || isAssistantStreaming) return null;
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
    isAssistantStreaming,
    message.id,
    message.createdAt,
    message.providerId,
    message.modelId,
    message.runtimeId,
    message.content,
  ]);
  const codeBlockCount = useMemo(
    () => countFencedCodeBlocks(message.content),
    [message.content],
  );
  const streamingText = useMemo(() => {
    if (!isAssistantStreaming) return "";
    return stripFencedCodeBlocks(message.content);
  }, [isAssistantStreaming, message.content]);

  const bubble = (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-[20px] break-words shadow-[0_10px_30px_rgba(103,115,160,0.10)] [overflow-wrap:anywhere]",
        compact ? "px-3.5 py-2.5 text-sm" : "px-4.5 py-3 text-sm sm:text-base",
        isUser
          ? "rounded-br-sm bg-[#17172d] text-white"
          : "rounded-tl-sm bg-white/95 text-slate-900",
      )}
    >
      {isUser ? (
        <div className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
              content={
                compact && message.generatedFiles?.length
                  ? stripFencedCodeBlocks(normalized.finalMarkdown)
                  : normalized.finalMarkdown
              }
              enableApplyToEditor={enableApplyToEditor}
              onApplyToEditor={onApplyToEditor}
              compact={compact}
            />
          ) : isAssistantStreaming ? (
            <>
              <StreamingText
                text={streamingText}
                isStreaming
                className="min-w-0 whitespace-pre-wrap break-words text-[13px] leading-5 text-slate-700 [overflow-wrap:anywhere]"
              />
              {codeBlockCount > 0 ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <Code2 className="h-3 w-3" />
                  {codeBlockCount} bloco(s) de codigo oculto(s) ate concluir
                </div>
              ) : null}
            </>
          ) : (
            <span className="text-slate-400">
              {message.streaming ? "▍" : ""}
            </span>
          )}
          {message.streaming && (
            <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-current align-middle" />
          )}
          {message.generatedFiles?.length ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500">
                {message.generatedFiles.length} arquivo(s) gerado(s)
              </p>
              {message.generatedFiles.map((file) => (
                <GeneratedFileCard
                  key={file.path}
                  file={createViewerFileFromProjectFile(file)}
                />
              ))}
            </div>
          ) : null}
          {!isAssistantStreaming && (
            <MessageActionBar
              messageContent={message.content}
              messageId={message.id}
            />
          )}
        </>
      )}
      {message.attachments?.length ? (
        <div className="mt-2 grid gap-2">
          {message.attachments.map((a, i) => (
            <AttachmentViewerCard
              key={i}
              file={createViewerFileFromAttachment(a)}
            />
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
          "group relative flex min-w-0 max-w-full flex-col",
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
}, areChatBubblePropsEqual);

function areChatBubblePropsEqual(prev: ChatBubbleProps, next: ChatBubbleProps) {
  if (prev.index !== next.index) return false;
  if (prev.compact !== next.compact) return false;
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.streaming !== next.message.streaming) return false;
  if (next.message.streaming) {
    return prev.message.content === next.message.content;
  }
  return (
    prev.message.content === next.message.content &&
    prev.message.error === next.message.error &&
    prev.message.attachments?.length === next.message.attachments?.length &&
    prev.message.generatedFiles?.length === next.message.generatedFiles?.length
  );
}

function stripFencedCodeBlocks(input: string): string {
  return input.replace(/```[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function countFencedCodeBlocks(input: string): number {
  return (input.match(/```[\s\S]*?```/g) ?? []).length;
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
