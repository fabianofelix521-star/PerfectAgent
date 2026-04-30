import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Surface, SectionTitle } from "@/components/ui";
import {
  CODE_STUDIO_TEST_SPECS,
  loadGenerationTestResults,
  runCodeStudioGenerationTest,
  runCodeStudioTestBattery,
  type GenerationTestResult,
} from "@/services/codeStudioTestBattery";
import { previewManager } from "@/services/previewManager";
import { useConfig } from "@/stores/config";
import { cn } from "@/utils/cn";

export function CodeStudioTestSuite() {
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationTestResult[]>(() =>
    loadGenerationTestResults(),
  );
  const projects = useConfig((state) => state.projects);
  const setActiveProject = useConfig((state) => state.setActiveProject);
  const orderedResults = useMemo(() => {
    return CODE_STUDIO_TEST_SPECS.map((spec) =>
      results.find((result) => result.projectName === spec.projectName),
    ).filter(Boolean) as GenerationTestResult[];
  }, [results]);

  async function runAll() {
    setRunning(true);
    setRunningId("all");
    const next: GenerationTestResult[] = [];
    await runCodeStudioTestBattery((result) => {
      next.push(result);
      setResults([...next]);
    });
    setResults(loadGenerationTestResults());
    setRunning(false);
    setRunningId(null);
  }

  async function rerun(id: string) {
    const spec = CODE_STUDIO_TEST_SPECS.find((item) => item.id === id);
    if (!spec) return;
    setRunning(true);
    setRunningId(id);
    const result = await runCodeStudioGenerationTest(spec);
    setResults((current) => [
      result,
      ...current.filter((item) => item.projectName !== result.projectName),
    ]);
    setRunning(false);
    setRunningId(null);
  }

  function openProject(projectName: string) {
    const project = projects.find((item) => item.name === projectName);
    if (!project) return;
    setActiveProject(project.id);
    previewManager.prepareProject(project, "Opening generated test project...");
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Surface className="min-h-0 overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle
            icon={Play}
            title="3-project validation battery"
            desc="Measures first preview, generated files, clean markdown, and fallback behavior."
          />
          <button
            type="button"
            onClick={runAll}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-full bg-[#17172d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {runningId === "all" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run all
          </button>
        </div>
        <div className="grid gap-3">
          {CODE_STUDIO_TEST_SPECS.map((spec) => {
            const result = results.find(
              (item) => item.projectName === spec.projectName,
            );
            return (
              <article
                key={spec.id}
                className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {result ? (
                        result.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-600" />
                        )
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-slate-200" />
                      )}
                      <h3 className="text-base font-semibold text-slate-950">
                        {spec.projectName}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                      {spec.prompt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => rerun(spec.id)}
                      disabled={running}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-50"
                    >
                      {runningId === spec.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Rerun
                    </button>
                    <button
                      type="button"
                      onClick={() => openProject(spec.projectName)}
                      disabled={!result}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open project
                    </button>
                  </div>
                </div>
                {result ? (
                  <ResultDetails result={result} />
                ) : (
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    Not run yet.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </Surface>
      <Surface className="min-h-0">
        <SectionTitle
          icon={CheckCircle2}
          title="Latest results"
          desc="Stored locally for repeat inspection."
        />
        <div className="mt-4 space-y-2">
          {orderedResults.length === 0 ? (
            <p className="text-sm text-slate-500">No test artifacts yet.</p>
          ) : null}
          {orderedResults.map((result) => (
            <div
              key={result.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  {result.projectName}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-bold",
                    result.passed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700",
                  )}
                >
                  {result.passed ? "pass" : "fail"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-slate-500">
                <span>First preview</span>
                <strong className="text-right text-slate-800">
                  {formatMs(result.timeToFirstPreviewMs)}
                </strong>
                <span>Mode</span>
                <strong className="text-right text-slate-800">
                  {result.previewMode ?? "-"}
                </strong>
                <span>Files</span>
                <strong className="text-right text-slate-800">
                  {result.generatedFiles.length}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function ResultDetails({ result }: { result: GenerationTestResult }) {
  return (
    <div className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-4">
      <Metric
        label="Status"
        value={result.passed ? "Passed" : "Failed"}
        tone={result.passed ? "ok" : "error"}
      />
      <Metric
        label="First preview"
        value={formatMs(result.timeToFirstPreviewMs)}
      />
      <Metric label="Preview mode" value={result.previewMode ?? "-"} />
      <Metric
        label="Generated files"
        value={String(result.generatedFiles.length)}
      />
      {result.failures.length ? (
        <div className="md:col-span-4 rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-700">
          {result.failures.join("; ")}
        </div>
      ) : (
        <div className="md:col-span-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-700">
          All acceptance checks passed.
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "error";
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <strong
        className={cn(
          "mt-1 block text-sm",
          tone === "ok"
            ? "text-emerald-700"
            : tone === "error"
              ? "text-rose-700"
              : "text-slate-900",
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function formatMs(value: number | undefined): string {
  if (value == null) return "-";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}
