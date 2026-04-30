/**
 * ErrorAnalyzer — turns raw error strings (build, runtime, install) into
 * structured `AnalyzedError` objects and assembles a fix prompt context.
 */

export type ErrorSource = "build" | "runtime" | "install" | "unknown";

export interface AnalyzedError {
  source: ErrorSource;
  message: string;
  stackTrace?: string;
  file?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  fixable: boolean;
}

export interface ErrorContext {
  errors: AnalyzedError[];
  relevantFiles: Array<{ path: string; content: string }>;
  fixPrompt: string;
}

export class ErrorAnalyzer {
  analyze(errorString: string, source: ErrorSource = "unknown"): AnalyzedError {
    const detected = this.detectSource(errorString, source);
    let parsed: Partial<AnalyzedError> = {};
    if (detected === "build") parsed = this.parseTypescriptError(errorString);
    else if (detected === "runtime")
      parsed = this.parseRuntimeError(errorString);
    else if (detected === "install")
      parsed = this.parseInstallError(errorString);

    const analyzed: AnalyzedError = {
      source: detected,
      message: parsed.message ?? errorString.split("\n")[0] ?? errorString,
      stackTrace: parsed.stackTrace ?? this.extractStack(errorString),
      file: parsed.file,
      line: parsed.line,
      column: parsed.column,
      severity: /warning/i.test(errorString) ? "warning" : "error",
      fixable: false,
    };
    analyzed.fixable = this.isFixable(analyzed);
    return analyzed;
  }

  analyzeMultiple(
    errors: string[],
    source: ErrorSource = "unknown",
  ): AnalyzedError[] {
    return errors.map((e) => this.analyze(e, source));
  }

  async buildFixContext(
    errors: AnalyzedError[],
    allFiles: Array<{ path: string; content: string }>,
  ): Promise<ErrorContext> {
    const relevant = this.findRelatedFiles(errors, allFiles);
    const errorList = errors
      .map((e) => {
        const loc = e.file ? ` (${e.file}${e.line ? `:${e.line}` : ""})` : "";
        return `- [${e.source}] ${e.message}${loc}`;
      })
      .join("\n");

    const fileBlocks = relevant
      .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const fixPrompt = [
      "## ERROS DETECTADOS",
      errorList,
      "",
      "## ARQUIVOS RELACIONADOS",
      fileBlocks,
      "",
      "Identifique a causa raiz e devolva os arquivos corrigidos no JSON padrão.",
    ].join("\n");

    return { errors, relevantFiles: relevant, fixPrompt };
  }

  extractFilePath(stackTrace: string): string | null {
    const match =
      stackTrace.match(
        /(?:at\s+|\()([\w./-]+\.(?:tsx?|jsx?|css|json)):(\d+)(?::(\d+))?/,
      ) ?? stackTrace.match(/([\w./-]+\.(?:tsx?|jsx?)):(\d+)/);
    return match ? match[1] : null;
  }

  isFixable(error: AnalyzedError): boolean {
    if (error.source === "install") {
      // Network or registry errors usually aren't fixable by changing code.
      return !/E403|ENOTFOUND|ECONNREFUSED|registry/i.test(error.message);
    }
    return true;
  }

  // -----------------------------------------------------------------------

  private detectSource(error: string, hint: ErrorSource): ErrorSource {
    if (hint !== "unknown") return hint;
    if (/npm ERR|yarn error|pnpm error/i.test(error)) return "install";
    if (/TS\d{4}|vite|rollup|esbuild|cannot find module/i.test(error))
      return "build";
    if (/\bat\s+.+\(.*:\d+:\d+\)/.test(error)) return "runtime";
    return "unknown";
  }

  private parseTypescriptError(error: string): Partial<AnalyzedError> {
    // e.g. "src/App.tsx(12,5): error TS2304: Cannot find name 'foo'."
    const tsMatch = error.match(
      /([\w./-]+)[(:](\d+)[,:](\d+)\)?:\s*(?:error\s+)?(TS\d+:\s*)?(.+)/,
    );
    if (tsMatch) {
      return {
        file: tsMatch[1],
        line: Number.parseInt(tsMatch[2], 10),
        column: Number.parseInt(tsMatch[3], 10),
        message: (tsMatch[5] ?? "").trim(),
      };
    }
    return { message: error.split("\n")[0] };
  }

  private parseRuntimeError(error: string): Partial<AnalyzedError> {
    const file = this.extractFilePath(error) ?? undefined;
    const lineMatch = error.match(/:(\d+):(\d+)/);
    return {
      file,
      line: lineMatch ? Number.parseInt(lineMatch[1], 10) : undefined,
      column: lineMatch ? Number.parseInt(lineMatch[2], 10) : undefined,
      message: error.split("\n")[0],
      stackTrace: error,
    };
  }

  private parseInstallError(error: string): Partial<AnalyzedError> {
    const codeMatch = error.match(
      /(E\d{3}|ENOENT|EACCES|ENOTFOUND|ECONNREFUSED|EPERM|ELIFECYCLE)/,
    );
    return {
      message: codeMatch
        ? `${codeMatch[1]}: ${error.split("\n")[0]}`
        : error.split("\n")[0],
    };
  }

  private extractStack(error: string): string | undefined {
    const lines = error.split("\n").slice(1);
    if (lines.length === 0) return undefined;
    return lines.join("\n");
  }

  private findRelatedFiles(
    errors: AnalyzedError[],
    allFiles: Array<{ path: string; content: string }>,
  ): Array<{ path: string; content: string }> {
    const wanted = new Set<string>();
    for (const err of errors) {
      if (err.file) wanted.add(err.file.replace(/^\.?\//, ""));
    }
    const related = allFiles.filter((f) => {
      const path = f.path;
      for (const target of wanted) {
        if (
          path === target ||
          path.endsWith(`/${target}`) ||
          target.endsWith(`/${path}`)
        ) {
          return true;
        }
      }
      return false;
    });
    // Always include package.json as context for install errors.
    if (errors.some((e) => e.source === "install")) {
      const pkg = allFiles.find((f) => /(^|\/)package\.json$/.test(f.path));
      if (pkg && !related.includes(pkg)) related.push(pkg);
    }
    return related;
  }
}

export const errorAnalyzer = new ErrorAnalyzer();
