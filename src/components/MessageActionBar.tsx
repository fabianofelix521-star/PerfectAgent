import { memo, useCallback, useState, type ReactNode } from "react";
import { Check, Copy, FileText, Share2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface MessageActionBarProps {
  messageContent: string;
  messageId: string;
}

export const MessageActionBar = memo(function MessageActionBar({
  messageContent,
  messageId,
}: MessageActionBarProps) {
  const [copiedState, setCopiedState] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "generating">("idle");

  const markCopied = useCallback(() => {
    setCopiedState(true);
    window.setTimeout(() => setCopiedState(false), 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(messageContent);
      markCopied();
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = messageContent;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      markCopied();
    }
  }, [markCopied, messageContent]);

  const handlePDF = useCallback(async () => {
    setPdfState("generating");

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "800px";
      iframe.style.height = "1000px";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      const printableWindow = iframe.contentWindow;
      if (!doc || !printableWindow) throw new Error("Print frame unavailable");

      doc.open();
      doc.write(renderPrintableDocument(messageContent, messageId));
      doc.close();

      await new Promise((resolve) => window.setTimeout(resolve, 500));
      printableWindow.focus();
      printableWindow.print();
      window.setTimeout(() => iframe.remove(), 1000);
    } finally {
      setPdfState("idle");
    }
  }, [messageContent, messageId]);

  const handleShare = useCallback(async () => {
    const shareData: ShareData = {
      title: "Nexus Ultra AGI - Resposta",
      text: messageContent.length > 200 ? `${messageContent.slice(0, 200)}...` : messageContent,
    };

    try {
      const canShare =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare(shareData));
      if (canShare) {
        await navigator.share(shareData);
        return;
      }
      await handleCopy();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.warn("Share failed:", error);
      }
    }
  }, [handleCopy, messageContent]);

  return (
    <div
      className={cn(
        "message-action-bar mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
      )}
      aria-label="Ações da mensagem"
    >
      <ActionButton
        onClick={handleCopy}
        title="Copiar resposta"
        active={copiedState}
      >
        {copiedState ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copiedState ? "Copiado" : "Copiar"}
      </ActionButton>

      <ActionButton
        onClick={handlePDF}
        title="Salvar como PDF"
        disabled={pdfState === "generating"}
      >
        <FileText className="h-3 w-3" />
        {pdfState === "generating" ? "Gerando..." : "PDF"}
      </ActionButton>

      <ActionButton onClick={handleShare} title="Compartilhar">
        <Share2 className="h-3 w-3" />
        Compartilhar
      </ActionButton>
    </div>
  );
});

function ActionButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150",
        active
          ? "bg-emerald-100 text-emerald-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        "disabled:cursor-wait disabled:opacity-45",
      )}
    >
      {children}
    </button>
  );
}

function renderPrintableDocument(markdown: string, messageId: string): string {
  const generatedAt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nexus Ultra AGI - Resposta ${escapeHtml(messageId)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      line-height: 1.7;
      color: #1a1a2e;
      padding: 48px;
      max-width: 800px;
    }
    h1, h2, h3 { margin: 16px 0 8px; }
    h1 { font-size: 20px; color: #4338ca; }
    h2 { font-size: 16px; color: #6366f1; }
    h3 { font-size: 14px; }
    p { margin: 8px 0; }
    pre {
      background: #f1f5f9;
      padding: 12px;
      border-radius: 6px;
      font-size: 10px;
      overflow-x: auto;
      margin: 8px 0;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      white-space: pre-wrap;
    }
    code {
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 10px;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    blockquote {
      border-left: 3px solid #6366f1;
      padding: 8px 16px;
      margin: 12px 0;
      background: #f8fafc;
      font-style: italic;
    }
    ul, ol { padding-left: 24px; margin: 8px 0; }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #6366f1;
    }
    .header-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
    }
    .header-text { font-size: 10px; color: #64748b; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">N</div>
    <div>
      <div style="font-weight:700;font-size:14px;">Nexus Ultra AGI</div>
      <div class="header-text">Gerado em ${escapeHtml(generatedAt)}</div>
    </div>
  </div>
  <main>${convertMarkdownToHTML(markdown)}</main>
  <div class="footer">
    Nexus Ultra AGI - Autonomous Intelligence Network<br>
    Este documento foi gerado automaticamente.
  </div>
</body>
</html>`;
}

function convertMarkdownToHTML(markdown: string): string {
  return escapeHtml(markdown)
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^&gt; (.*$)/gm, "<blockquote>$1</blockquote>")
    .replace(/^(?:\*|-|\d+\.) (.*$)/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}