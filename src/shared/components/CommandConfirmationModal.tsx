import { AlertTriangle, Shield } from "lucide-react";
import type { SystemCommand } from "@/core/permissions/PermissionEngine";
import { cn } from "@/utils/cn";

export function CommandConfirmationModal({
  command,
  onApprove,
  onReject,
}: {
  command: SystemCommand;
  onApprove: () => void;
  onReject: () => void;
}) {
  const levelColors = {
    safe: "text-green-500 bg-green-500/10",
    normal: "text-blue-500 bg-blue-500/10",
    elevated: "text-amber-500 bg-amber-500/10",
    critical: "text-red-500 bg-red-500/10",
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-white/15 bg-white p-5 shadow-2xl dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Confirmar comando
          </h3>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-xs font-bold",
              levelColors[command.permissionLevel],
            )}
          >
            {command.permissionLevel}
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {command.description}
        </p>

        <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-300">
          {command.command} {command.args.join(" ")}
        </div>

        {!command.reversible ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Esta acao nao pode ser desfeita automaticamente.
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 rounded-lg bg-[#17172d] py-2 text-sm font-bold text-white hover:bg-[#242443]"
          >
            Executar
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
