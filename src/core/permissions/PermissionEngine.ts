import { api } from "@/services/api";
import { useConfig } from "@/stores/config";

export type PermissionLevel = "safe" | "normal" | "elevated" | "critical";

export interface SystemCommand {
  id: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  permissionLevel: PermissionLevel;
  description: string;
  reversible: boolean;
  estimatedDurationMs?: number;
}

export interface CommandResult {
  commandId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  success: boolean;
}

export interface InstallRequest {
  type:
    | "npm"
    | "yarn"
    | "pnpm"
    | "pip"
    | "brew"
    | "apt"
    | "cargo"
    | "gem"
    | "go"
    | "github"
    | "mcp"
    | "custom";
  packages?: string[];
  githubUrl?: string;
  customCommand?: string;
  isDev?: boolean;
  global?: boolean;
  version?: string;
  targetPath?: string;
}

export interface GitHubInstallResult {
  success: boolean;
  installedFiles: string[];
  skillRegistered: boolean;
  dependenciesInstalled: boolean;
  analysis: ContentAnalysis;
  targetPath?: string;
}

export interface ContentAnalysis {
  hasPackageJson: boolean;
  isAgentSkill: boolean;
  isMCPServer: boolean;
  isRuntime: boolean;
  mainLanguage: string;
  files: string[];
}

export interface ExternalServiceConfig {
  type: "telegram" | "whatsapp" | "discord" | "slack" | "webhook" | "custom";
  name: string;
  config: Record<string, unknown>;
}

export interface RefactorRequest {
  description: string;
  affectedGlobs?: string[];
  strategy?: "rename" | "extract" | "move" | "format" | "custom";
}

export interface RefactorImpact {
  affectedFiles: string[];
  isBreakingChange: boolean;
}

export interface RefactorResult {
  success: boolean;
  reason?: string;
  affectedFiles?: string[];
}

interface GitHubContentFile {
  path: string;
  name: string;
  content?: string;
  type?: string;
  download_url?: string;
}

export class PermissionEngine {
  private readonly approvedCommands = new Set<string>();
  private readonly commandHistory: CommandResult[] = [];
  private onConfirmationNeeded?: (command: SystemCommand) => Promise<boolean>;

  onNeedsConfirmation(callback: (command: SystemCommand) => Promise<boolean>): void {
    this.onConfirmationNeeded = callback;
  }

  getHistory(): CommandResult[] {
    return [...this.commandHistory];
  }

  approveCommand(commandId: string): void {
    this.approvedCommands.add(commandId);
  }

  async install(request: InstallRequest): Promise<CommandResult> {
    if (request.type === "github" && request.githubUrl) {
      const result = await this.installFromGitHub(request.githubUrl, {
        installDeps: true,
        targetPath: request.targetPath,
      });
      return {
        commandId: `github-${Date.now()}`,
        exitCode: result.success ? 0 : 1,
        stdout: JSON.stringify(result, null, 2),
        stderr: result.success ? "" : "GitHub install failed",
        durationMs: 0,
        success: result.success,
      };
    }
    return this.executeCommand(this.buildInstallCommand(request));
  }

  async executeCommand(command: SystemCommand): Promise<CommandResult> {
    if (command.permissionLevel === "elevated" || command.permissionLevel === "critical") {
      const approved = await this.requestApproval(command);
      if (!approved) {
        return {
          commandId: command.id,
          exitCode: -1,
          stdout: "",
          stderr: "Execução cancelada pelo usuário",
          durationMs: 0,
          success: false,
        };
      }
    }

    const result = await this.runCommand(command);
    this.commandHistory.unshift(result);
    this.commandHistory.splice(100);
    return result;
  }

  async installFromGitHub(
    githubUrl: string,
    options: { branch?: string; installDeps?: boolean; targetPath?: string } = {},
  ): Promise<GitHubInstallResult> {
    const { owner, repo, path } = this.parseGitHubUrl(githubUrl);
    const content = await this.fetchGitHubContent(owner, repo, path, options.branch);
    const analysis = await this.analyzeGitHubContent(content);
    const targetPath =
      options.targetPath ?? `.nexus-imports/${sanitizePathSegment(repo)}-${Date.now().toString(36)}`;

    const cloneResult = await this.executeCommand({
      id: `github-clone-${Date.now()}`,
      command: "git",
      args: ["clone", `https://github.com/${owner}/${repo}.git`, targetPath],
      permissionLevel: "normal",
      description: `Clonar ${owner}/${repo} em ${targetPath}`,
      reversible: true,
      estimatedDurationMs: 180_000,
    });

    if (!cloneResult.success) {
      return {
        success: false,
        installedFiles: [],
        skillRegistered: false,
        dependenciesInstalled: false,
        analysis,
        targetPath,
      };
    }

    let dependenciesInstalled = false;
    if (options.installDeps && analysis.hasPackageJson) {
      const installCwd = path ? `${targetPath}/${path}` : targetPath;
      const installResult = await this.install({
        type: "npm",
        packages: [],
        targetPath: installCwd,
      });
      dependenciesInstalled = installResult.success;
    }
    if (analysis.isAgentSkill) {
      await this.registerAsSkill(content, analysis);
    }
    if (analysis.isMCPServer) {
      useConfig.getState().upsertMcpServer({
        id: `github-mcp-${Date.now().toString(36)}`,
        name: `${repo} MCP`,
        transport: "command",
        command: `node ${targetPath}`,
        enabled: true,
      });
    }

    return {
      success: true,
      installedFiles: analysis.files,
      skillRegistered: analysis.isAgentSkill,
      dependenciesInstalled,
      analysis,
      targetPath,
    };
  }

  async integrateService(service: ExternalServiceConfig): Promise<void> {
    const now = Date.now().toString(36);
    const url = stringValue(service.config.url);
    useConfig.getState().upsertIntegration({
      id: `integration-${service.type}-${now}`,
      name: service.name,
      kind: service.type === "webhook" ? "webhook" : service.type,
      url,
      method: stringValue(service.config.method, "POST") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      headers: recordOfStrings(service.config.headers),
      bodyTemplate: stringValue(service.config.bodyTemplate),
      secrets: recordOfStrings(service.config.secrets),
      connected: false,
    });
  }

  async refactorSystem(request: RefactorRequest): Promise<RefactorResult> {
    const impact = await this.analyzeRefactorImpact(request);
    await this.createBackup(impact.affectedFiles);
    if (impact.affectedFiles.length > 10 || impact.isBreakingChange) {
      const approved = await this.requestApproval({
        id: `refactor-${Date.now()}`,
        command: "refactor",
        args: [request.description],
        permissionLevel: "elevated",
        description: `Refatorar ${impact.affectedFiles.length} arquivos`,
        reversible: true,
      });
      if (!approved) return { success: false, reason: "Cancelado" };
    }
    return this.executeRefactor(request, impact);
  }

  private buildInstallCommand(request: InstallRequest): SystemCommand {
    const packages = request.packages?.map((item) =>
      request.version && request.packages?.length === 1 ? `${item}@${request.version}` : item,
    ) ?? [];
    const cwd = request.targetPath;
    const commands: Record<InstallRequest["type"], () => SystemCommand> = {
      npm: () => ({
        id: `npm-${Date.now()}`,
        command: "npm",
        args: ["install", ...packages, ...(request.isDev ? ["--save-dev"] : []), ...(request.global ? ["-g"] : [])],
        cwd,
        permissionLevel: request.global ? "elevated" : "normal",
        description: `npm install ${packages.join(" ") || "(package.json)"}`,
        reversible: true,
      }),
      yarn: () => ({
        id: `yarn-${Date.now()}`,
        command: "yarn",
        args: ["add", ...packages, ...(request.isDev ? ["--dev"] : [])],
        cwd,
        permissionLevel: request.global ? "elevated" : "normal",
        description: `yarn add ${packages.join(" ")}`,
        reversible: true,
      }),
      pnpm: () => ({
        id: `pnpm-${Date.now()}`,
        command: "pnpm",
        args: ["add", ...packages, ...(request.isDev ? ["-D"] : []), ...(request.global ? ["-g"] : [])],
        cwd,
        permissionLevel: request.global ? "elevated" : "normal",
        description: `pnpm add ${packages.join(" ")}`,
        reversible: true,
      }),
      pip: () => ({
        id: `pip-${Date.now()}`,
        command: "pip",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "normal",
        description: `pip install ${packages.join(" ")}`,
        reversible: true,
      }),
      brew: () => ({
        id: `brew-${Date.now()}`,
        command: "brew",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "elevated",
        description: `brew install ${packages.join(" ")}`,
        reversible: true,
      }),
      apt: () => ({
        id: `apt-${Date.now()}`,
        command: "sudo",
        args: ["apt", "install", "-y", ...packages],
        cwd,
        permissionLevel: "critical",
        description: `apt install ${packages.join(" ")}`,
        reversible: false,
      }),
      cargo: () => ({
        id: `cargo-${Date.now()}`,
        command: "cargo",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "normal",
        description: `cargo install ${packages.join(" ")}`,
        reversible: true,
      }),
      gem: () => ({
        id: `gem-${Date.now()}`,
        command: "gem",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "normal",
        description: `gem install ${packages.join(" ")}`,
        reversible: true,
      }),
      go: () => ({
        id: `go-${Date.now()}`,
        command: "go",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "normal",
        description: `go install ${packages.join(" ")}`,
        reversible: true,
      }),
      github: () => ({
        id: `github-${Date.now()}`,
        command: "git",
        args: ["clone", request.githubUrl ?? ""],
        cwd,
        permissionLevel: "normal",
        description: `git clone ${request.githubUrl ?? ""}`,
        reversible: true,
      }),
      mcp: () => ({
        id: `mcp-${Date.now()}`,
        command: "npm",
        args: ["install", ...packages],
        cwd,
        permissionLevel: "normal",
        description: `instalar MCP ${packages.join(" ")}`,
        reversible: true,
      }),
      custom: () => ({
        id: `custom-${Date.now()}`,
        ...toParsedCommand(request.customCommand ?? ""),
        cwd,
        permissionLevel: inferPermissionLevel(request.customCommand ?? ""),
        description: request.customCommand ?? "",
        reversible: false,
      }),
    };
    return commands[request.type]();
  }

  private async requestApproval(command: SystemCommand): Promise<boolean> {
    if (this.approvedCommands.has(command.id)) return true;
    if (this.onConfirmationNeeded) return this.onConfirmationNeeded(command);
    return command.permissionLevel === "safe" || command.permissionLevel === "normal";
  }

  private async runCommand(command: SystemCommand): Promise<CommandResult> {
    const result = await api.runSystemCommand(command);
    return {
      commandId: command.id,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      success: result.success,
    };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string; path: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(?:tree|blob)\/[^/]+\/(.*))?$/);
    return {
      owner: match?.[1] ?? "",
      repo: (match?.[2] ?? "").replace(/\.git$/, ""),
      path: match?.[3] ?? "",
    };
  }

  private async fetchGitHubContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string,
  ): Promise<GitHubContentFile[]> {
    const suffix = path ? `/${path}` : "";
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents${suffix}${ref}`,
      { headers: { accept: "application/vnd.github.v3+json" } },
    );
    const data = await response.json() as unknown;
    const list = Array.isArray(data) ? data : [data];
    const normalized = list
      .filter((item): item is GitHubContentFile => Boolean(item) && typeof item === "object")
      .map((item) => ({
        path: stringValue(item.path),
        name: stringValue(item.name),
        type: stringValue(item.type),
        download_url: stringValue(item.download_url),
        content: typeof item.content === "string" ? item.content : undefined,
      }));
    return Promise.all(
      normalized.map(async (item) => {
        if (item.content || !item.download_url || item.type !== "file") return item;
        try {
          const fileResponse = await fetch(item.download_url);
          const fileContent = await fileResponse.text();
          return { ...item, content: fileContent };
        } catch {
          return item;
        }
      }),
    );
  }

  private async analyzeGitHubContent(content: GitHubContentFile[]): Promise<ContentAnalysis> {
    const files = content.map((file) => file.path || file.name).filter(Boolean);
    const lower = files.map((file) => file.toLowerCase());
    return {
      hasPackageJson: lower.some((file) => file.endsWith("package.json")),
      isAgentSkill: lower.some((file) => /skill|agent|prompt|system/.test(file)),
      isMCPServer: lower.some((file) => /mcp|model-context/.test(file)),
      isRuntime: lower.some((file) => /runtime/.test(file)),
      mainLanguage: lower.some((file) => file.endsWith(".py"))
        ? "python"
        : lower.some((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
          ? "typescript"
          : "markdown",
      files,
    };
  }

  private async registerAsSkill(
    content: GitHubContentFile[],
    analysis: ContentAnalysis,
  ): Promise<void> {
    const source = content.find((file) => /readme|skill|prompt/i.test(file.name));
    useConfig.getState().upsertSkill({
      id: `github-skill-${Date.now().toString(36)}`,
      name: source?.name ?? "GitHub Skill",
      description: `Instalada via GitHub (${analysis.mainLanguage})`,
      systemPrompt: source?.content ? decodeBase64(source.content).slice(0, 4000) : "Skill importada do GitHub.",
      tags: ["github", analysis.mainLanguage],
      enabled: true,
    });
  }

  private async createBackup(files: string[]): Promise<void> {
    if (!files.length) return;
    await this.executeCommand({
      id: `backup-${Date.now()}`,
      command: "tar",
      args: ["-czf", `.nexus-backup-${Date.now()}.tgz`, ...files],
      permissionLevel: "normal",
      description: `Backup de ${files.length} arquivos antes da refatoracao`,
      reversible: true,
    });
  }

  private async analyzeRefactorImpact(request: RefactorRequest): Promise<RefactorImpact> {
    return {
      affectedFiles: request.affectedGlobs ?? [],
      isBreakingChange: /breaking|api|schema|rename/i.test(request.description),
    };
  }

  private async executeRefactor(
    request: RefactorRequest,
    impact: RefactorImpact,
  ): Promise<RefactorResult> {
    return {
      success: true,
      affectedFiles: impact.affectedFiles,
      reason: `Refatoracao registrada: ${request.description}`,
    };
  }
}

export const permissionEngine = new PermissionEngine();

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function recordOfStrings(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function decodeBase64(value: string): string {
  try {
    return atob(value.replace(/\s/g, ""));
  } catch {
    return value;
  }
}

function toParsedCommand(commandLine: string): Pick<SystemCommand, "command" | "args"> {
  const tokens = tokenizeCommandLine(commandLine);
  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
  };
}

function tokenizeCommandLine(commandLine: string): string[] {
  const matches = commandLine.match(/(?:[^"]\S*|".+?")+/g) ?? [];
  return matches.map((token) => token.replace(/^"|"$/g, ""));
}

function inferPermissionLevel(commandLine: string): PermissionLevel {
  const firstToken = tokenizeCommandLine(commandLine)[0]?.toLowerCase() ?? "";
  if (firstToken === "sudo") return "critical";
  if (["brew", "apt", "apt-get"].includes(firstToken)) return "elevated";
  if (["npm", "pnpm", "yarn", "pip", "cargo", "gem", "go", "git"].includes(firstToken)) {
    return "normal";
  }
  return "elevated";
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "repo";
}
