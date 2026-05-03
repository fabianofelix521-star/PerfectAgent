/**
 * Bolt Artifact Protocol — Parser + System Prompt
 *
 * Parses <boltArtifact> / <boltAction> tags from AI output into structured
 * file actions and shell commands. Falls back to code-fence extraction.
 */
import type { ProjectFile } from "@/types";

export interface BoltAction {
  type: "file" | "shell";
  filePath?: string;
  content: string;
}

export interface BoltArtifact {
  id: string;
  title: string;
  actions: BoltAction[];
}

const ARTIFACT_OPEN = /<boltArtifact\s+id=["']([^"']+)["']\s+title=["']([^"']+)["'][^>]*>/;
const ARTIFACT_CLOSE = /<\/boltArtifact>/;
const ACTION_OPEN = /<boltAction\s+type=["']([^"']+)["'](?:\s+filePath=["']([^"']+)["'])?[^>]*>/;
const ACTION_CLOSE = /<\/boltAction>/;
const CODE_FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;

/**
 * Parse bolt artifact tags from raw AI output.
 * Returns null if no artifact tags found.
 */
export function parseBoltArtifact(raw: string): BoltArtifact | null {
  const openMatch = raw.match(ARTIFACT_OPEN);
  if (!openMatch) return null;

  const id = openMatch[1];
  const title = openMatch[2];
  const afterOpen = raw.slice(raw.indexOf(openMatch[0]) + openMatch[0].length);
  const closeIdx = afterOpen.search(ARTIFACT_CLOSE);
  const body = closeIdx >= 0 ? afterOpen.slice(0, closeIdx) : afterOpen;

  const actions: BoltAction[] = [];
  let remaining = body;

  while (remaining.length > 0) {
    const actionMatch = remaining.match(ACTION_OPEN);
    if (!actionMatch) break;

    const type = actionMatch[1] as "file" | "shell";
    const filePath = actionMatch[2];
    const afterActionOpen = remaining.slice(
      remaining.indexOf(actionMatch[0]) + actionMatch[0].length,
    );
    const actionCloseIdx = afterActionOpen.search(ACTION_CLOSE);
    const content = actionCloseIdx >= 0
      ? afterActionOpen.slice(0, actionCloseIdx).trim()
      : afterActionOpen.trim();

    actions.push({ type, filePath, content });
    remaining = actionCloseIdx >= 0
      ? afterActionOpen.slice(actionCloseIdx + ACTION_CLOSE.source.length)
      : "";
  }

  return { id, title, actions };
}

/**
 * Extract file actions from a bolt artifact.
 */
export function extractFiles(artifact: BoltArtifact): ProjectFile[] {
  return artifact.actions
    .filter((a) => a.type === "file" && a.filePath)
    .map((a) => ({
      path: a.filePath!,
      content: a.content,
      language: languageFromPath(a.filePath!),
    }));
}

/**
 * Extract shell commands from a bolt artifact.
 */
export function extractShellCommands(artifact: BoltArtifact): string[] {
  return artifact.actions
    .filter((a) => a.type === "shell")
    .map((a) => a.content.trim());
}

/**
 * Fallback: extract files from markdown code fences when no artifact tags found.
 */
export function extractFilesFromCodeFences(markdown: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  CODE_FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let unnamedIdx = 0;

  while ((match = CODE_FENCE_RE.exec(markdown)) !== null) {
    const info = match[1].trim();
    const lang = normalizeLang(info.split(/\s+/)[0] || "text");
    const code = match[2].replace(/^\n+|\n+$/g, "");
    const filePath = extractFilePath(info, code) ?? defaultPathForLang(lang, unnamedIdx++);
    if (!filePath) continue;
    files.push({ path: filePath, content: code, language: lang });
  }

  return files.filter((f) => f.content.trim().length > 0);
}

/**
 * Full extraction: try bolt artifact first, fall back to code fences.
 */
export function extractProjectFiles(raw: string): {
  files: ProjectFile[];
  shellCommands: string[];
  method: "bolt-artifact" | "code-fences" | "none";
} {
  const artifact = parseBoltArtifact(raw);
  if (artifact) {
    return {
      files: extractFiles(artifact),
      shellCommands: extractShellCommands(artifact),
      method: "bolt-artifact",
    };
  }

  const files = extractFilesFromCodeFences(raw);
  if (files.length > 0) {
    return { files, shellCommands: [], method: "code-fences" };
  }

  return { files: [], shellCommands: [], method: "none" };
}

/**
 * System prompt injected into every Code Studio generation request.
 */
export const CODE_STUDIO_SYSTEM_PROMPT = `You are an expert full-stack developer who creates complete, production-grade web applications.

ENVIRONMENT: Code runs in a WebContainer (in-browser Node.js via WebAssembly).
Use only pure-JS/TS dependencies. Avoid native binaries.

FILE TYPE SUPPORT:
- React/Vue/Svelte apps → Vite + package.json with "dev": "vite" (preferred for complex apps)
- Plain HTML/CSS/JS → output ONLY index.html (+ style.css, script.js). Do NOT add package.json for static files. The runtime will serve them automatically.
- Single-page vanilla JS → index.html with inline or linked CSS/JS
- Multi-file static → index.html + linked CSS/JS files, no package.json needed

OUTPUT FORMAT: You MUST output all code inside <boltArtifact> tags with <boltAction> elements.
Never output incomplete code. Always output the full working application.

Example (React app):
<boltArtifact id="project-001" title="My App">
  <boltAction type="file" filePath="package.json">
    { "name": "project", "scripts": { "dev": "vite" }, "dependencies": { "react": "^18", "react-dom": "^18" }, "devDependencies": { "vite": "^5", "@vitejs/plugin-react": "^4" } }
  </boltAction>
  <boltAction type="file" filePath="index.html">
    <!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
  </boltAction>
  <boltAction type="file" filePath="src/main.tsx">
    import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')!).render(<App />);
  </boltAction>
  <boltAction type="file" filePath="src/App.tsx">
    // ... full component
  </boltAction>
</boltArtifact>

Example (static HTML — no package.json needed):
<boltArtifact id="project-002" title="Landing Page">
  <boltAction type="file" filePath="index.html">
    <!doctype html>...full page...
  </boltAction>
  <boltAction type="file" filePath="style.css">
    /* full styles */
  </boltAction>
</boltArtifact>

DEFAULT TECH STACK (unless user specifies otherwise):
- Vite + React 18 + TypeScript
- Tailwind CSS for styling (via CDN for static, via package for React apps)
- Zustand for client state
- React Router for navigation

CODE QUALITY:
- Production-grade TypeScript (no \`any\`)
- Proper error boundaries and loading states
- Accessible (ARIA labels, keyboard nav)
- Responsive (mobile-first)
- Beautiful, modern design (dark mode, clean typography, proper spacing)

Always generate a COMPLETE, RUNNABLE application. Not a demo. Not a skeleton.`;

/* ---- helpers ---- */

function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    tsx: "tsx", jsx: "jsx", ts: "typescript", js: "javascript",
    css: "css", html: "html", json: "json", md: "markdown",
    py: "python", sh: "bash", yml: "yaml", yaml: "yaml",
  };
  return map[ext] ?? "text";
}

function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    html: "html", css: "css", js: "javascript", javascript: "javascript",
    ts: "typescript", typescript: "typescript", tsx: "tsx", jsx: "jsx",
    json: "json", bash: "bash", sh: "bash", shell: "bash",
    python: "python", py: "python", md: "markdown",
  };
  return map[lang.toLowerCase()] ?? lang.toLowerCase();
}

function extractFilePath(info: string, code: string): string | null {
  // Check info string for filename patterns like "tsx src/App.tsx"
  const infoMatch = info.match(/(?:^|\s)((?:src\/)?[A-Za-z0-9_./@-]+\.(?:tsx|jsx|ts|js|css|html|json|md|py|sh|yml|yaml))(?:\s|$)/);
  if (infoMatch) return infoMatch[1];

  // Check first line of code for filename comment
  const firstLine = code.split("\n")[0] ?? "";
  const commentMatch = firstLine.match(/(?:\/\/|#|<!--)\s*(?:file|path|filename)?:?\s*((?:src\/)?[A-Za-z0-9_./@-]+\.\w+)/i);
  if (commentMatch) return commentMatch[1];

  return null;
}

function defaultPathForLang(lang: string, idx: number): string | null {
  const map: Record<string, string> = {
    html: "index.html",
    css: "src/styles.css",
    javascript: `src/file${idx}.js`,
    typescript: `src/file${idx}.ts`,
    tsx: `src/Component${idx}.tsx`,
    jsx: `src/Component${idx}.jsx`,
    json: `data${idx}.json`,
  };
  return map[lang] ?? null;
}
