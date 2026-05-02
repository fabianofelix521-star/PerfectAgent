import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Gamepad2,
  KeyRound,
  Rocket,
  Server,
  Shield,
  X,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { cn } from "@/utils/cn";
import {
  DEPLOY_TARGETS,
  deployEnvExample,
  getDeployConfigStatus,
  getDeployTarget,
  maskSecret,
  type DeployConfigMap,
  type DeployPlatformConfig,
  type DeployTargetCategory,
  type DeployTargetDefinition,
} from "@/modules/code-studio/deployTargets";

interface DeploySettingsModalProps {
  open: boolean;
  configs: DeployConfigMap;
  initialTargetId?: string;
  onClose: () => void;
  onChangeConfig: (targetId: string, config: DeployPlatformConfig) => void;
}

const CATEGORY_LABEL: Record<DeployTargetCategory, string> = {
  frontend: "Frontend",
  fullstack: "Fullstack",
  database: "Banco",
  container: "Container",
  game: "Game",
  custom: "Custom",
};

const CATEGORY_ICON: Record<DeployTargetCategory, typeof Rocket> = {
  frontend: Rocket,
  fullstack: Server,
  database: Database,
  container: Server,
  game: Gamepad2,
  custom: Shield,
};

export function DeploySettingsModal({
  open,
  configs,
  initialTargetId = DEPLOY_TARGETS[0].id,
  onClose,
  onChangeConfig,
}: DeploySettingsModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState(initialTargetId);
  const selectedTarget = getDeployTarget(selectedTargetId);
  const selectedConfig = configs[selectedTarget.id] ?? { values: {} };
  const selectedStatus = getDeployConfigStatus(selectedTarget, selectedConfig);
  const groupedTargets = useMemo(
    () =>
      DEPLOY_TARGETS.reduce<Record<DeployTargetCategory, DeployTargetDefinition[]>>(
        (groups, target) => {
          groups[target.category] = [...(groups[target.category] ?? []), target];
          return groups;
        },
        {
          frontend: [],
          fullstack: [],
          database: [],
          container: [],
          game: [],
          custom: [],
        },
      ),
    [],
  );

  if (!open) return null;

  const updateField = (key: string, value: string) => {
    onChangeConfig(selectedTarget.id, {
      ...selectedConfig,
      enabled: true,
      updatedAt: Date.now(),
      values: {
        ...selectedConfig.values,
        [key]: value,
      },
    });
  };

  const updateNotes = (value: string) => {
    onChangeConfig(selectedTarget.id, {
      ...selectedConfig,
      enabled: true,
      updatedAt: Date.now(),
      notes: value,
    });
  };

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard?.writeText(value);
    toast.success(message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
      <div className="flex h-[min(840px,94vh)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_32px_120px_rgba(15,23,42,0.35)]">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200/70 bg-slate-50/80 p-3 md:block">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Deploy MCP
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Plataformas
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-800"
              aria-label="Fechar configuracoes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {(Object.keys(groupedTargets) as DeployTargetCategory[]).map((category) => {
              const targets = groupedTargets[category];
              if (!targets.length) return null;
              const CategoryIcon = CATEGORY_ICON[category];
              return (
                <div key={category}>
                  <p className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <CategoryIcon className="h-3 w-3" />
                    {CATEGORY_LABEL[category]}
                  </p>
                  <div className="space-y-1">
                    {targets.map((target) => {
                      const status = getDeployConfigStatus(target, configs[target.id]);
                      const active = target.id === selectedTarget.id;
                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => setSelectedTargetId(target.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left transition",
                            active
                              ? "bg-[#17172d] text-white shadow"
                              : "text-slate-600 hover:bg-white hover:text-slate-950",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {target.label}
                          </span>
                          {status.configured ? (
                            <CheckCircle2 className={cn("h-4 w-4", active ? "text-emerald-300" : "text-emerald-500")} />
                          ) : (
                            <span className={cn("h-2 w-2 rounded-full", active ? "bg-amber-300" : "bg-slate-300")} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-3 md:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {selectedTarget.label}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {CATEGORY_LABEL[selectedTarget.category]}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                    selectedTarget.fullstackReady
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {selectedTarget.fullstackReady ? "Fullstack" : "Complementar"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                {selectedTarget.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 md:hidden"
              aria-label="Fechar configuracoes"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 p-4 md:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Credenciais e auth
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-950">
                      Campos exigidos pela plataforma
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                      selectedStatus.configured
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {selectedStatus.configured ? "Pronto" : `${selectedStatus.missing.length} pendente(s)`}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[...selectedTarget.requiredFields, ...selectedTarget.optionalFields].map((field) => {
                    const requiredMissing = selectedStatus.missing.includes(field.key);
                    return (
                      <label key={field.key} className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                          {field.secret ? <KeyRound className="h-3.5 w-3.5" /> : null}
                          {field.label}
                          {field.required !== false && selectedTarget.requiredFields.some((item) => item.key === field.key) ? (
                            <span className="text-rose-500">*</span>
                          ) : null}
                        </span>
                        <input
                          type={field.secret ? "password" : "text"}
                          value={selectedConfig.values[field.key] ?? ""}
                          onChange={(event) => updateField(field.key, event.target.value)}
                          placeholder={field.placeholder ?? field.key}
                          className={cn(
                            "w-full rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-100",
                            requiredMissing ? "border-amber-300" : "border-slate-200",
                          )}
                        />
                      </label>
                    );
                  })}
                </div>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                    Notas locais
                  </span>
                  <textarea
                    value={selectedConfig.notes ?? ""}
                    onChange={(event) => updateNotes(event.target.value)}
                    placeholder="Ambiente, branch, domínio, plano, observações de rollback..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      MCP
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-950">
                      {selectedTarget.mcp.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(selectedTarget.mcp.command, "Comando MCP copiado.")}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Copiar comando MCP"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-emerald-300">
                  {selectedTarget.mcp.command}
                </pre>
                <ul className="mt-3 space-y-2 text-xs font-medium leading-5 text-slate-600">
                  {selectedTarget.mcp.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-5 border-t border-slate-200/70 bg-slate-50/70 p-4 lg:border-l lg:border-t-0 md:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      .env
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-950">
                      Variáveis para o projeto
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(deployEnvExample(selectedTarget, selectedConfig), ".env copiado.")}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Copiar exemplo .env"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="min-h-32 overflow-x-auto rounded-2xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-cyan-200">
                  {deployEnvExample(selectedTarget, selectedConfig) || "# Preencha as credenciais para gerar o .env"}
                </pre>
                {Object.entries(selectedConfig.values).some(([, value]) => value.trim()) ? (
                  <div className="mt-3 grid gap-2 text-xs">
                    {Object.entries(selectedConfig.values)
                      .filter(([, value]) => value.trim())
                      .slice(0, 6)
                      .map(([key, value]) => {
                        const field = [...selectedTarget.requiredFields, ...selectedTarget.optionalFields].find((item) => item.key === key);
                        return (
                          <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                            <span className="font-mono font-semibold text-slate-600">{key}</span>
                            <span className="truncate text-slate-500">{maskSecret(value, field?.secret)}</span>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Exigências
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTarget.requirements.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Comandos
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-950">
                      Sequência sugerida
                    </h3>
                  </div>
                  <a
                    href={selectedTarget.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Abrir docs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="space-y-2">
                  {selectedTarget.commands.map((command) => (
                    <button
                      key={command}
                      type="button"
                      onClick={() => void copyText(command, "Comando copiado.")}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950 px-3 py-2 text-left font-mono text-[11px] text-emerald-300 transition hover:bg-slate-900"
                    >
                      <span className="truncate">{command}</span>
                      <Copy className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}