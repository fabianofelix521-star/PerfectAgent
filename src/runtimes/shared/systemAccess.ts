import { permissionEngine, type InstallRequest, type PermissionLevel } from "@/core/permissions/PermissionEngine";
import type { AgentTool } from "@/types/agents";

export const SYSTEM_ACCESS_RUNTIME_RULE = `SYSTEM ACCESS RUNTIME:
Este runtime pode vasculhar a estrutura do app, ler/escrever arquivos do workspace, instalar ferramentas e executar comandos operacionais via PermissionEngine.
Capacidades previstas: npm, pnpm, yarn, pip, brew, apt/sudo, cargo, gem, go, git, curl, filesystem, build, test, deploy e diagnostico de ambiente.
Regras operacionais: registrar comando, cwd, argumentos, stdout/stderr e resultado; comandos elevated/critical passam pelo broker de permissao; nunca persistir senhas em prompt, log, arquivo ou localStorage.`;

export function buildSystemAccessTool(runtimeId: string, ownerLabel = runtimeId): AgentTool {
  return {
    name: "system_access",
    description: `${ownerLabel} system access broker: comandos, instalacao de ferramentas, filesystem e deploy via PermissionEngine.`,
    execute: async (params) => {
      const action = String(params.action ?? params.mode ?? "command");
      if (action === "install") {
        const installRequest = normalizeInstallRequest(params);
        return permissionEngine.install(installRequest);
      }

      const commandLine = String(params.commandLine ?? params.command ?? "").trim();
      if (!commandLine) throw new Error("missing commandLine");
      const tokens = tokenizeCommandLine(commandLine);
      const command = tokens[0] ?? "";
      if (!command) throw new Error("missing command");

      return permissionEngine.executeCommand({
        id: `${runtimeId}-system-${Date.now().toString(36)}`,
        command,
        args: tokens.slice(1),
        cwd: typeof params.cwd === "string" ? params.cwd : undefined,
        env: normalizeEnv(params.env),
        permissionLevel: normalizePermission(params.permissionLevel, commandLine),
        description: String(params.description ?? `${ownerLabel}: ${commandLine}`),
        reversible: Boolean(params.reversible ?? !/^(sudo|rm|mv|apt|apt-get)\b/.test(commandLine)),
        estimatedDurationMs: Number(params.estimatedDurationMs ?? 120_000),
      });
    },
  };
}

export function withSystemAccessTool(
  tools: AgentTool[] = [],
  runtimeId: string,
  ownerLabel = runtimeId,
): AgentTool[] {
  if (tools.some((tool) => tool.name === "system_access")) return tools;
  return [...tools, buildSystemAccessTool(runtimeId, ownerLabel)];
}

function normalizeInstallRequest(params: Record<string, unknown>): InstallRequest {
  const packages = Array.isArray(params.packages)
    ? params.packages.map((item) => String(item)).filter(Boolean)
    : typeof params.package === "string"
      ? [params.package]
      : undefined;
  return {
    type: normalizeInstallType(params.type),
    packages,
    githubUrl: typeof params.githubUrl === "string" ? params.githubUrl : undefined,
    customCommand: typeof params.customCommand === "string" ? params.customCommand : undefined,
    isDev: Boolean(params.isDev),
    global: Boolean(params.global),
    version: typeof params.version === "string" ? params.version : undefined,
    targetPath: typeof params.targetPath === "string" ? params.targetPath : undefined,
  };
}

function normalizeInstallType(value: unknown): InstallRequest["type"] {
  const text = String(value ?? "custom");
  const allowed: InstallRequest["type"][] = [
    "npm",
    "yarn",
    "pnpm",
    "pip",
    "brew",
    "apt",
    "cargo",
    "gem",
    "go",
    "github",
    "mcp",
    "custom",
  ];
  return allowed.includes(text as InstallRequest["type"]) ? (text as InstallRequest["type"]) : "custom";
}

function normalizeEnv(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizePermission(value: unknown, commandLine: string): PermissionLevel {
  if (value === "safe" || value === "normal" || value === "elevated" || value === "critical") return value;
  const first = tokenizeCommandLine(commandLine)[0]?.toLowerCase() ?? "";
  if (first === "sudo") return "critical";
  if (["brew", "apt", "apt-get"].includes(first)) return "elevated";
  if (["npm", "pnpm", "yarn", "pip", "cargo", "gem", "go", "git", "curl"].includes(first)) return "normal";
  return "elevated";
}

function tokenizeCommandLine(commandLine: string): string[] {
  const matches = commandLine.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return matches.map((token) => token.replace(/^"|"$/g, ""));
}
