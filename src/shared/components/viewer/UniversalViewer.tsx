import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Fullscreen,
  Pause,
  Play,
  Plus,
  Minus,
  ScanSearch,
  Share2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import JSZip from "jszip";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import type { ProjectFile } from "@/types";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/utils/cn";
import { toast } from "@/components/Toast";

const PDF_WORKER_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

export type FileType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "code"
  | "markdown"
  | "csv"
  | "json"
  | "xml"
  | "docx"
  | "xlsx"
  | "pptx"
  | "svg"
  | "text";

export interface ViewerFile {
  id: string;
  name: string;
  type: FileType;
  url?: string;
  content?: string;
  blob?: Blob;
  mimeType: string;
  sizeBytes?: number;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export function UniversalViewer({
  file,
  onClose,
  onDownload,
  onShare,
  showOCR = true,
}: {
  file: ViewerFile;
  onClose?: () => void;
  onDownload?: (file: ViewerFile) => void;
  onShare?: (file: ViewerFile) => void;
  showOCR?: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isRunningOCR, setIsRunningOCR] = useState(false);
  const [zoom, setZoom] = useState(1);

  async function handleOCR() {
    if (!["image", "pdf"].includes(file.type)) return;
    setIsRunningOCR(true);
    try {
      const text = await runOCR(file);
      setOcrText(text || "Nenhum texto detectado.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRunningOCR(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
      )}
    >
      <ViewerToolbar
        file={file}
        zoom={zoom}
        onZoomIn={() => setZoom((value) => Math.min(value + 0.25, 4))}
        onZoomOut={() => setZoom((value) => Math.max(value - 0.25, 0.25))}
        onZoomReset={() => setZoom(1)}
        onFullscreen={() => setIsFullscreen((value) => !value)}
        onDownload={() => (onDownload ? onDownload(file) : void downloadViewerFile(file))}
        onShare={() => (onShare ? onShare(file) : void shareViewerFile(file))}
        onOCR={showOCR ? handleOCR : undefined}
        isRunningOCR={isRunningOCR}
        onClose={onClose}
      />

      <div className="relative min-h-[320px] flex-1 overflow-hidden bg-slate-100/70 dark:bg-slate-950/80">
        {file.type === "pdf" ? <PDFViewer file={file} zoom={zoom} /> : null}
        {file.type === "image" ? <ImageViewer file={file} zoom={zoom} /> : null}
        {file.type === "video" ? <VideoViewer file={file} /> : null}
        {file.type === "audio" ? <AudioViewer file={file} /> : null}
        {file.type === "code" ? <CodeViewer file={file} /> : null}
        {file.type === "markdown" ? <MarkdownFileViewer file={file} /> : null}
        {file.type === "csv" ? <CSVViewer file={file} /> : null}
        {file.type === "json" ? <JSONViewer file={file} /> : null}
        {file.type === "xml" ? <TextViewer file={file} language="xml" /> : null}
        {file.type === "svg" ? <SVGViewer file={file} zoom={zoom} /> : null}
        {file.type === "docx" ? <DocxViewer file={file} /> : null}
        {file.type === "xlsx" ? <XlsxViewer file={file} /> : null}
        {file.type === "pptx" ? <PptxViewer file={file} /> : null}
        {file.type === "text" ? <TextViewer file={file} language="text" /> : null}

        {ocrText ? (
          <OCRResultPanel
            text={ocrText}
            onClose={() => setOcrText(null)}
            onCopy={() => navigator.clipboard.writeText(ocrText)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function GeneratedFileCard({
  file,
}: {
  file: ViewerFile;
}) {
  const [open, setOpen] = useState(false);
  const typeIcon = viewerEmoji(file.type);
  const sizeStr = file.sizeBytes
    ? file.sizeBytes > 1024 * 1024
      ? `${(file.sizeBytes / 1024 / 1024).toFixed(1)}MB`
      : `${Math.max(1, Math.round(file.sizeBytes / 1024))}KB`
    : null;

  return (
    <>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-slate-900/82">
        <div className="text-2xl">{typeIcon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {file.type.toUpperCase()}
            {sizeStr ? ` · ${sizeStr}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#17172d] px-2.5 py-1.5 text-xs font-bold text-white"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </button>
          <button
            type="button"
            onClick={() => void downloadViewerFile(file)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open ? (
        <ViewerModal onClose={() => setOpen(false)}>
          <UniversalViewer file={file} onClose={() => setOpen(false)} />
        </ViewerModal>
      ) : null}
    </>
  );
}

export function AttachmentViewerCard({
  file,
}: {
  file: ViewerFile;
}) {
  return <GeneratedFileCard file={file} />;
}

export function createViewerFileFromProjectFile(file: ProjectFile): ViewerFile {
  return {
    id: `generated:${file.path}`,
    name: file.path,
    type: detectFileType(file.path),
    content: file.content,
    mimeType: mimeTypeFor(file.path),
    sizeBytes: new Blob([file.content]).size,
  };
}

export function createViewerFileFromAttachment(attachment: {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}): ViewerFile {
  return {
    id: `attachment:${attachment.name}:${attachment.size}`,
    name: attachment.name,
    type: detectFileType(attachment.name, attachment.type),
    url: attachment.dataUrl,
    mimeType: attachment.type || mimeTypeFor(attachment.name),
    sizeBytes: attachment.size,
  };
}

function ViewerToolbar({
  file,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFullscreen,
  onDownload,
  onShare,
  onOCR,
  isRunningOCR,
  onClose,
}: {
  file: ViewerFile;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFullscreen: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOCR?: () => void;
  isRunningOCR: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/70 bg-white/85 px-3 py-2 dark:border-white/10 dark:bg-slate-900/88">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {file.type}
        </p>
      </div>
      {file.type === "image" || file.type === "pdf" || file.type === "svg" ? (
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button type="button" onClick={onZoomOut} className="rounded-full p-1 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onZoomReset} className="px-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={onZoomIn} className="rounded-full p-1 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {onOCR ? (
        <button
          type="button"
          onClick={onOCR}
          disabled={isRunningOCR}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          {isRunningOCR ? "OCR..." : "OCR"}
        </button>
      ) : null}
      <button type="button" onClick={onShare} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
        <Share2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDownload} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
        <Download className="h-4 w-4" />
      </button>
      <button type="button" onClick={onFullscreen} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
        <Fullscreen className="h-4 w-4" />
      </button>
      {onClose ? (
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function ViewerModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function PDFViewer({ file, zoom }: { file: ViewerFile; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentLike | null>(null);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const pdfjsLib = await import("pdfjs-dist") as unknown as PdfJsLike;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      const src = await resolveFileUrl(file);
      const doc = await pdfjsLib.getDocument(src).promise;
      if (disposed) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      await renderPdfPage(doc, 1, zoom, canvasRef.current);
    })();
    return () => {
      disposed = true;
    };
  }, [file]);

  useEffect(() => {
    void renderPdfPage(pdfDoc, currentPage, zoom, canvasRef.current);
  }, [currentPage, pdfDoc, zoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="shadow-lg" />
        </div>
      </div>
      {numPages > 1 ? (
        <div className="flex items-center justify-center gap-3 border-t border-white/70 bg-white/70 p-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900/82 dark:text-slate-300">
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="rounded-lg px-2 py-1 disabled:opacity-40">
            ←
          </button>
          <span>
            {currentPage} / {numPages}
          </span>
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, numPages))} disabled={currentPage === numPages} className="rounded-lg px-2 py-1 disabled:opacity-40">
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ImageViewer({ file, zoom }: { file: ViewerFile; zoom: number }) {
  const url = useResolvedFileUrl(file);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  return (
    <div
      className="flex h-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6),rgba(226,232,240,0.8))]"
      onMouseDown={(event) => {
        setIsDragging(true);
        dragStart.current = {
          x: event.clientX - position.x,
          y: event.clientY - position.y,
        };
      }}
      onMouseMove={(event) => {
        if (!isDragging) return;
        setPosition({
          x: event.clientX - dragStart.current.x,
          y: event.clientY - dragStart.current.y,
        });
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {url ? (
        <img
          src={url}
          alt={file.name}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.1s ease",
            maxWidth: "none",
            userSelect: "none",
          }}
        />
      ) : null}
    </div>
  );
}

function VideoViewer({ file }: { file: ViewerFile }) {
  const url = useResolvedFileUrl(file);
  return (
    <div className="flex h-full items-center justify-center bg-black">
      {url ? <video src={url} controls className="max-h-full max-w-full" /> : null}
    </div>
  );
}

function AudioViewer({ file }: { file: ViewerFile }) {
  const url = useResolvedFileUrl(file);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-24 w-full max-w-lg items-center gap-0.5">
        {Array.from({ length: 80 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 rounded-full bg-[#17172d]/60"
            style={{
              height: `${20 + Math.sin(index * 0.3) * 30 + Math.random() * 30}%`,
              opacity: duration > 0 && currentTime / duration > index / 80 ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      <div className="text-center">
        <p className="font-medium text-slate-900">{file.name}</p>
        <p className="text-sm text-slate-500">{formatTime(currentTime)} / {formatTime(duration)}</p>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }} className="rounded-full p-2 hover:bg-white/70">
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (isPlaying) audioRef.current?.pause();
            else audioRef.current?.play();
            setIsPlaying((value) => !value);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#17172d] text-white"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>
        <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }} className="rounded-full p-2 hover:bg-white/70">
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(event) => {
          if (audioRef.current) audioRef.current.currentTime = Number(event.target.value);
        }}
        className="w-full max-w-lg accent-[#17172d]"
      />

      {url ? (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
        />
      ) : null}
    </div>
  );
}

function CodeViewer({ file }: { file: ViewerFile }) {
  return (
    <div className="h-full overflow-auto bg-[#0d1117] p-4 text-[12px] text-[#e6edf3]">
      <pre className="whitespace-pre-wrap font-mono leading-6">{file.content ?? ""}</pre>
    </div>
  );
}

function MarkdownFileViewer({ file }: { file: ViewerFile }) {
  return (
    <div className="app-scrollbar h-full overflow-auto p-4">
      <MarkdownRenderer content={file.content ?? ""} />
    </div>
  );
}

function CSVViewer({ file }: { file: ViewerFile }) {
  const rows = useMemo(() => parseCsv(file.content ?? ""), [file.content]);
  if (!rows.length) return null;
  const headers = rows[0];
  const body = rows.slice(1);
  return (
    <div className="app-scrollbar h-full overflow-auto p-4">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="sticky top-0 border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-100 px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs font-medium text-slate-500">{body.length} linhas · {headers.length} colunas</p>
    </div>
  );
}

function JSONViewer({ file }: { file: ViewerFile }) {
  const data = useMemo(() => {
    try {
      return JSON.parse(file.content ?? "{}");
    } catch {
      return file.content ?? "{}";
    }
  }, [file.content]);

  return (
    <div className="app-scrollbar h-full overflow-auto bg-slate-950 p-4 text-sm text-slate-100">
      <JsonTreeNode label="root" value={data} depth={0} />
    </div>
  );
}

function JsonTreeNode({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isObject = typeof value === "object" && value !== null;
  const isArray = Array.isArray(value);

  if (!isObject) {
    return (
      <div className="font-mono text-[12px] leading-6">
        <span className="text-slate-400">{label}: </span>
        <span className="text-cyan-300">{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div className="font-mono text-[12px] leading-6">
      <button type="button" onClick={() => setOpen((state) => !state)} className="inline-flex items-center gap-1 text-slate-200">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{label}</span>
        <span className="text-slate-500">{isArray ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </button>
      {open ? (
        <div className="ml-4 border-l border-slate-800 pl-3">
          {entries.map(([key, nested]) => (
            <JsonTreeNode key={key} label={key} value={nested} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SVGViewer({ file, zoom }: { file: ViewerFile; zoom: number }) {
  const url = useResolvedFileUrl(file);
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      {url ? <img src={url} alt={file.name} style={{ transform: `scale(${zoom})`, transformOrigin: "center" }} /> : null}
    </div>
  );
}

function sanitizeViewerHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blockedTags = new Set([
    "base",
    "button",
    "embed",
    "form",
    "iframe",
    "input",
    "link",
    "meta",
    "object",
    "script",
    "select",
    "style",
    "textarea",
  ]);

  doc.body.querySelectorAll("*").forEach((node) => {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    if (blockedTags.has(tagName)) {
      element.remove();
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isUrlAttribute = name === "href" || name === "src" || name === "xlink:href";
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "style" ||
        (isUrlAttribute && /^(javascript|data):/.test(value))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function DocxViewer({ file }: { file: ViewerFile }) {
  const [html, setHtml] = useState("<p>Carregando...</p>");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const arrayBuffer = await resolveArrayBuffer(file);
      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (!cancelled) setHtml(sanitizeViewerHtml(result.value || "<p>Sem conteúdo.</p>"));
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return <div className="app-scrollbar h-full overflow-auto p-5 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

function XlsxViewer({ file }: { file: ViewerFile }) {
  const [rows, setRows] = useState<Array<Array<string | number>>>([]);
  const [sheetName, setSheetName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const arrayBuffer = await resolveArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0] ?? "";
      const sheet = workbook.Sheets[firstSheet];
      const nextRows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { header: 1 });
      if (!cancelled) {
        setSheetName(firstSheet);
        setRows(nextRows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!rows.length) return null;
  return (
    <div className="app-scrollbar h-full overflow-auto p-4">
      <p className="mb-3 text-sm font-semibold text-slate-700">Planilha: {sheetName}</p>
      <table className="min-w-full border-collapse text-left text-xs">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-100 px-3 py-2 text-slate-700">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PptxViewer({ file }: { file: ViewerFile }) {
  const [slides, setSlides] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const blob = await resolveBlob(file);
      const zip = await JSZip.loadAsync(blob);
      const slideEntries = Object.keys(zip.files)
        .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
      const contents = await Promise.all(
        slideEntries.map(async (path) => stripXmlText(await zip.file(path)!.async("text"))),
      );
      if (!cancelled) setSlides(contents.filter(Boolean));
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="app-scrollbar h-full overflow-auto p-4">
      {slides.length ? (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <article key={index} className="rounded-xl border border-slate-200 bg-white/80 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Slide {index + 1}</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{slide}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-6 text-sm font-medium text-slate-500">Nenhum texto extraído da apresentação.</div>
      )}
    </div>
  );
}

function TextViewer({ file, language }: { file: ViewerFile; language: string }) {
  return (
    <div className="app-scrollbar h-full overflow-auto bg-slate-950 p-4 text-[12px] text-slate-100">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{language}</p>
      <pre className="whitespace-pre-wrap font-mono leading-6">{file.content ?? ""}</pre>
    </div>
  );
}

function OCRResultPanel({ text, onClose, onCopy }: { text: string; onClose: () => void; onCopy: () => void }) {
  return (
    <div className="absolute bottom-4 right-4 top-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Texto extraído</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCopy} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
            <Copy className="mr-1 inline h-3.5 w-3.5" /> Copiar
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="app-scrollbar flex-1 overflow-auto p-4 text-sm leading-6 text-slate-700">
        <pre className="whitespace-pre-wrap font-sans">{text}</pre>
      </div>
    </div>
  );
}

async function renderPdfPage(
  doc: PdfDocumentLike | null,
  pageNum: number,
  scale: number,
  canvas: HTMLCanvasElement | null,
) {
  if (!doc || !canvas) return;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport }).promise;
}

async function runOCR(file: ViewerFile): Promise<string> {
  if (file.type === "pdf") {
    const pdfjsLib = await import("pdfjs-dist") as unknown as PdfJsLike;
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    const src = await resolveFileUrl(file);
    const doc = await pdfjsLib.getDocument(src).promise;
    const pages = Math.min(doc.numPages, 6);
    const texts: string[] = [];
    for (let pageNum = 1; pageNum <= pages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      texts.push(textContent.items.map((item) => item.str ?? "").join(" "));
    }
    return texts.join("\n\n").trim();
  }

  const Tesseract = await import("tesseract.js") as unknown as TesseractLike;
  const source = await resolveFileUrl(file);
  const { data } = await Tesseract.recognize(source, "por+eng");
  return data.text;
}

export function detectFileType(filename: string, mimeType?: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const lowerMime = mimeType?.toLowerCase() ?? "";

  if (lowerMime.startsWith("image/")) return ext === "svg" ? "svg" : "image";
  if (lowerMime.startsWith("video/")) return "video";
  if (lowerMime.startsWith("audio/")) return "audio";
  if (lowerMime.includes("pdf")) return "pdf";

  const typeMap: Record<string, FileType> = {
    pdf: "pdf",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
    bmp: "image",
    tiff: "image",
    avif: "image",
    heic: "image",
    mp4: "video",
    webm: "video",
    mov: "video",
    avi: "video",
    mkv: "video",
    m4v: "video",
    mp3: "audio",
    wav: "audio",
    ogg: "audio",
    m4a: "audio",
    flac: "audio",
    aac: "audio",
    ts: "code",
    tsx: "code",
    js: "code",
    jsx: "code",
    py: "code",
    rs: "code",
    go: "code",
    java: "code",
    cpp: "code",
    c: "code",
    cs: "code",
    php: "code",
    rb: "code",
    swift: "code",
    kt: "code",
    sh: "code",
    json: "json",
    xml: "xml",
    csv: "csv",
    md: "markdown",
    mdx: "markdown",
    docx: "docx",
    xlsx: "xlsx",
    pptx: "pptx",
    svg: "svg",
    txt: "text",
    log: "text",
  };

  return typeMap[ext] ?? "text";
}

async function downloadViewerFile(file: ViewerFile) {
  const blob = await resolveBlob(file);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function shareViewerFile(file: ViewerFile) {
  if (navigator.share) {
    try {
      await navigator.share({ title: file.name, text: file.name, url: file.url });
      return;
    } catch {
      // ignore and fallback below
    }
  }
  if (file.url) {
    await navigator.clipboard.writeText(file.url);
    toast.success("Link copiado.");
    return;
  }
  await navigator.clipboard.writeText(file.content ?? file.name);
  toast.success("Conteúdo copiado.");
}

function useResolvedFileUrl(file: ViewerFile) {
  const [url, setUrl] = useState<string | undefined>(file.url);
  useEffect(() => {
    let objectUrl: string | undefined;
    void (async () => {
      objectUrl = await resolveFileUrl(file);
      setUrl(objectUrl);
    })();
    return () => {
      if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return url;
}

async function resolveFileUrl(file: ViewerFile): Promise<string> {
  if (file.url) return file.url;
  if (file.blob) return URL.createObjectURL(file.blob);
  if (file.type === "svg" && file.content) {
    return URL.createObjectURL(new Blob([file.content], { type: "image/svg+xml" }));
  }
  return URL.createObjectURL(await resolveBlob(file));
}

async function resolveBlob(file: ViewerFile): Promise<Blob> {
  if (file.blob) return file.blob;
  if (file.url) {
    const response = await fetch(file.url);
    return response.blob();
  }
  return new Blob([file.content ?? ""], { type: file.mimeType || "text/plain" });
}

async function resolveArrayBuffer(file: ViewerFile): Promise<ArrayBuffer> {
  const blob = await resolveBlob(file);
  return blob.arrayBuffer();
}

function parseCsv(content: string) {
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => row.split(",").map((cell) => cell.trim()));
}

function stripXmlText(xml: string) {
  return xml
    .replace(/<a:br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function viewerEmoji(type: FileType) {
  const icons: Record<FileType, string> = {
    pdf: "📄",
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    code: "💻",
    markdown: "📝",
    csv: "📊",
    json: "{}",
    xml: "📋",
    docx: "📄",
    xlsx: "📈",
    pptx: "📽️",
    svg: "🎨",
    text: "📝",
  };
  return icons[type] ?? "📎";
}

function mimeTypeFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "txt";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    json: "application/json",
    csv: "text/csv",
    md: "text/markdown",
    xml: "application/xml",
    svg: "image/svg+xml",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
  };
  return mimeMap[ext] ?? "text/plain";
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNum: number) => Promise<{
    getViewport: (args: { scale: number }) => { width: number; height: number };
    render: (args: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  }>;
};

type PdfJsLike = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string) => { promise: Promise<PdfDocumentLike> };
};

type TesseractLike = {
  recognize: (
    source: string,
    language: string,
    options?: { logger?: (message: { status?: string; progress?: number }) => void },
  ) => Promise<{ data: { text: string } }>;
};