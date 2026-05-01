import { useMemo, useState } from "react";
import { Download, Eye, FileText, Search } from "lucide-react";
import JSZip from "jszip";
import { WorkspaceShell, Surface, SectionTitle } from "@/components/ui";
import { APP_BRAND_SLUG, useConfig } from "@/stores/config";
import { toast } from "@/components/Toast";
import {
  createViewerFileFromProjectFile,
  UniversalViewer,
  type ViewerFile,
} from "@/shared/components/viewer/UniversalViewer";

export function DocumentsPage() {
  const projects = useConfig((s) => s.projects);
  const chatThreads = useConfig((s) => s.chatThreads);
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ViewerFile | null>(null);

  const documents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const projectFiles = projects.flatMap((project) =>
      project.files.map((file) => ({
        id: `project:${project.id}:${file.path}`,
        title: file.path,
        source: project.name,
        content: file.content,
        kind: "Projeto",
      })),
    );
    const chatExports = chatThreads.map((thread) => ({
      id: `chat:${thread.id}`,
      title: `${thread.title}.md`,
      source: "Chat Hub",
      content: thread.messages
        .map((message) => `## ${message.role}\n\n${message.content}`)
        .join("\n\n"),
      kind: "Conversa",
      viewerFile: {
        id: `chat-view:${thread.id}`,
        name: `${thread.title}.md`,
        type: "markdown" as const,
        content: thread.messages
          .map((message) => `## ${message.role}\n\n${message.content}`)
          .join("\n\n"),
        mimeType: "text/markdown",
      },
    }));
    const enrichedProjectFiles = projectFiles.map((doc) => ({
      ...doc,
      viewerFile: createViewerFileFromProjectFile({
        path: doc.title,
        content: doc.content,
      }),
    }));
    const all = [...enrichedProjectFiles, ...chatExports];
    if (!needle) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.source.toLowerCase().includes(needle) ||
        item.content.toLowerCase().includes(needle),
    );
  }, [chatThreads, projects, query]);

  async function exportZip() {
    const zip = new JSZip();
    for (const doc of documents) {
      const safeName = doc.title.replace(/^\/+/, "").replace(/[<>:"\\|?*]/g, "_");
      zip.file(safeName, doc.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${APP_BRAND_SLUG}-documents-${Date.now()}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Documentos exportados.");
  }

  return (
    <WorkspaceShell
      eyebrow="Documents"
      title="Documentos e arquivos"
      description="Índice real de arquivos gerados no Code Studio e conversas exportáveis do Chat Hub."
    >
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={FileText} title="Biblioteca" desc={`${documents.length} itens encontrados.`} />
          <button
            type="button"
            onClick={exportZip}
            disabled={documents.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar ZIP
          </button>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/65 px-3 py-2 text-sm font-semibold text-slate-500">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar em arquivos e conversas"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.length ? (
            documents.map((doc) => (
              <article key={doc.id} className="rounded-[20px] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-950">
                    {doc.title}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                    {doc.kind}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-medium text-slate-500">
                  {doc.source}
                </p>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                  {doc.content || "Sem conteúdo."}
                </p>
                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(doc.viewerFile)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-2xl bg-white/55 p-8 text-center text-sm font-semibold text-slate-500">
              Nenhum documento disponível.
            </div>
          )}
        </div>
      </Surface>
      {selectedFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur" onClick={() => setSelectedFile(null)}>
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <UniversalViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
