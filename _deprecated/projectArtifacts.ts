import type { ProjectFile, StudioProject } from "@/types";
import {
  extractStaticHtml,
  normalizeAssistantOutput,
} from "@/services/normalize";

export type ArtifactKind =
  | "single-html"
  | "multi-file"
  | "vite-react"
  | "static-shell"
  | "unknown";

export type ProjectArtifact = {
  kind: ArtifactKind;
  files: ProjectFile[];
  source: "assistant" | "immediate-shell" | "fallback";
};

const CODE_FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;
const FILE_PATH_RE =
  /(?:^|\s|["'`])((?:src\/)?[A-Za-z0-9_.@() -]+\.(?:tsx|jsx|ts|js|css|html|json|md|mjs|cjs))(?:\s|["'`]|$)/;

export function isProjectBuildRequest(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const hasBuildAction =
    /\b(criar|crie|gerar|gere|build|create|make|generate|construa|montar|desenvolva|desenvolver|implemente|faca|fazer|produza|desenhe)\b/.test(
      normalized,
    );
  const hasRunnableTarget =
    /\b(projeto|app|site|pagina|page|landing|dashboard|api|saas|loja|ecommerce|portfolio|interface|webapp|html|react|vite|next|checkout|jogo|game|snake|cobrinha|pacman|pac-man|labirinto|maze|arcade|3d|three|calculadora|quiz|formulario|form|componente|tela|ui)\b/.test(
      normalized,
    );
  const declarativeBuildTarget =
    /\b(landing page|pagina de venda|sales page|site de venda|venda de comunidade|comunidade gamer|dashboard saas|web app|single-file html|jogo da cobrinha|snake game|pacman|pac-man|jogo pacman|jogo 3d|game 3d|arcade game|game landing|tela de login|tela de cadastro)\b/.test(
      normalized,
    );
  const asksForExplanation =
    /\b(o que|qual|quais|como|porque|por que|explique|explica|duvida|pergunta)\b/.test(
      normalized,
    );
  const targetOnlyBuildRequest =
    hasRunnableTarget &&
    !asksForExplanation &&
    normalized.split(/\s+/).filter(Boolean).length <= 12;

  return (
    declarativeBuildTarget ||
    (hasBuildAction && hasRunnableTarget) ||
    targetOnlyBuildRequest
  );
}

export function createImmediatePreviewProject(
  prompt: string,
  options: { id?: string; name?: string; now?: number } = {},
): StudioProject {
  const now = options.now ?? Date.now();
  const name = options.name ?? inferProjectName(prompt);
  const html = buildImmediatePreviewHtml(prompt, name);
  return {
    id: options.id ?? `prj-${now.toString(36)}`,
    name,
    description: prompt,
    files: [{ path: "index.html", content: html, language: "html" }],
    activeFile: "index.html",
    createdAt: now,
    updatedAt: now,
  };
}

export function createDeterministicProjectFiles(prompt: string): ProjectFile[] {
  if (/pac\s*-?\s*man|pacman|labirinto|maze|arcade/i.test(prompt))
    return pacmanViteFiles(prompt);
  if (isCommercePrompt(prompt)) return commerceViteFiles(prompt);
  if (/dashboard|analytics|saas/i.test(prompt))
    return dashboardViteFiles(prompt);
  if (/3d|three|scene|fiber|canvas/i.test(prompt))
    return sceneViteFiles(prompt);
  return createImmediatePreviewProject(prompt).files;
}

export function extractProjectArtifactFromAssistantOutput(
  input: unknown,
  prompt = "Generated project",
): ProjectArtifact | null {
  const normalized = normalizeAssistantOutput(input);
  const html = extractStaticHtml(normalized);
  if (html) {
    return {
      kind: "single-html",
      source: "assistant",
      files: [{ path: "index.html", content: html, language: "html" }],
    };
  }

  const candidates = [
    normalized.finalMarkdown,
    ...normalized.chunks.map((chunk) => chunk.content ?? ""),
  ].filter(Boolean);
  const files: ProjectFile[] = [];
  for (const markdown of candidates)
    files.push(...extractFilesFromMarkdown(markdown));

  const unique = mergeProjectFiles([], files);
  if (unique.length === 0) return null;

  const runnable = ensureRunnableProjectFiles(unique, prompt);
  return {
    kind: detectArtifactKind(runnable),
    source: "assistant",
    files: runnable,
  };
}

export function extractFilesFromMarkdown(markdown: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  CODE_FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let unnamedIndex = 0;

  while ((match = CODE_FENCE_RE.exec(markdown)) !== null) {
    const info = match[1].trim();
    const language = normalizeLanguage(info.split(/\s+/)[0] || "text");
    const rawCode = match[2].replace(/^\n+|\n+$/g, "");
    const named = extractFilename(info, rawCode);
    const path =
      named?.path ?? defaultPathForLanguage(language, unnamedIndex++);
    if (!path) continue;
    files.push({
      path: normalizePath(path),
      content: named?.code ?? rawCode,
      language,
    });
  }

  return files.filter((file) => file.content.trim().length > 0);
}

export function ensureRunnableProjectFiles(
  files: ProjectFile[],
  prompt = "Generated project",
): ProjectFile[] {
  const normalized = mergeProjectFiles(
    [],
    files.map((file) => ({
      ...file,
      path: normalizePath(file.path),
      language: file.language ?? languageFromPath(file.path),
    })),
  );
  const hasFullHtml = normalized.some(
    (file) =>
      file.path.endsWith(".html") &&
      /<!doctype html>|<html[\s>]/i.test(file.content),
  );
  if (hasFullHtml)
    return normalized.map((file) =>
      file.path === "/index.html" ? { ...file, path: "index.html" } : file,
    );

  const hasReact = normalized.some(
    (file) =>
      /\.(tsx|jsx)$/.test(file.path) ||
      /from ["']react["']|useState\(|className=/.test(file.content),
  );
  const promptWantsApp =
    /\b(react|vite|dashboard|app|saas|3d|three|fiber)\b/i.test(prompt);
  if (hasReact || promptWantsApp)
    return ensureViteReactShell(normalized, prompt);

  const hasCss = normalized.some((file) => file.path.endsWith(".css"));
  const hasJs = normalized.some((file) => /\.(mjs|js)$/.test(file.path));
  if (hasCss || hasJs) return ensureStaticShell(normalized, prompt);

  return normalized;
}

export function mergeProjectFiles(
  existing: ProjectFile[],
  incoming: ProjectFile[],
): ProjectFile[] {
  const byPath = new Map<string, ProjectFile>();
  for (const file of existing)
    byPath.set(normalizePath(file.path), {
      ...file,
      path: normalizePath(file.path),
      language: file.language ?? languageFromPath(file.path),
    });
  for (const file of incoming)
    byPath.set(normalizePath(file.path), {
      ...file,
      path: normalizePath(file.path),
      language: file.language ?? languageFromPath(file.path),
    });
  return Array.from(byPath.values()).sort(
    (a, b) =>
      scorePath(a.path) - scorePath(b.path) || a.path.localeCompare(b.path),
  );
}

export function filesToStaticFallbackHtml(
  files: ProjectFile[],
  projectName = "Preview",
): string {
  const html = files.find((file) =>
    file.path.toLowerCase().endsWith("index.html"),
  );
  const referencesViteEntry = html
    ? /<script[^>]+src=["']\/?src\/main\.(tsx|jsx|ts|js)["']/i.test(
        html.content,
      )
    : false;
  const hasInlineBody = html ? hasMeaningfulHtmlBody(html.content) : false;
  if (
    html &&
    /<!doctype html>|<html[\s>]/i.test(html.content) &&
    (!referencesViteEntry || hasInlineBody)
  )
    return inlineStaticAssets(html.content, files, projectName);

  const shell = createImmediatePreviewProject(projectName, {
    name: projectName,
  }).files[0]?.content;
  if (shell) return shell;

  const list = files
    .map((file) => `<li>${escapeHtml(file.path)}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(projectName)}</title><style>body{margin:0;font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:32px}main{max-width:760px;margin:auto}.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:6px 10px;color:#93c5fd}</style></head><body><main><span class="badge">Static preview mode</span><h1>${escapeHtml(projectName)}</h1><p>Runtime preview is still booting. Generated files are mounted and ready for inspection.</p><ul>${list}</ul></main></body></html>`;
}

export function inlineStaticAssets(
  html: string,
  files: ProjectFile[],
  projectName = "Preview",
): string {
  const styles = files
    .filter((file) => file.path.endsWith(".css"))
    .map(
      (file) =>
        `<style data-src="${escapeHtml(file.path)}">${file.content}</style>`,
    )
    .join("\n");
  const scripts = files
    .filter(
      (file) => /\.(mjs|js)$/.test(file.path) && !file.path.endsWith(".min.js"),
    )
    .map(
      (file) =>
        `<script type="module" data-src="${escapeHtml(file.path)}">${file.content}\n<\/script>`,
    )
    .join("\n");

  let doc = html;
  if (!/<html[\s>]/i.test(doc))
    doc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(projectName)}</title></head><body>${doc}</body></html>`;
  doc = /<\/head>/i.test(doc)
    ? doc.replace(/<\/head>/i, `${styles}\n</head>`)
    : doc.replace(/<body[^>]*>/i, (body) => `<head>${styles}</head>${body}`);
  doc = /<\/body>/i.test(doc)
    ? doc.replace(/<\/body>/i, `${scripts}\n</body>`)
    : `${doc}${scripts}`;
  return doc;
}

function ensureViteReactShell(
  files: ProjectFile[],
  prompt: string,
): ProjectFile[] {
  const wantsTs = files.some(
    (file) => file.path.endsWith(".tsx") || file.path.endsWith(".ts"),
  );
  const appPath =
    files.find((file) => /src\/App\.(tsx|jsx|js)$/.test(file.path))?.path ??
    `src/App.${wantsTs ? "tsx" : "jsx"}`;
  const mainPath =
    files.find((file) => /src\/main\.(tsx|jsx|js)$/.test(file.path))?.path ??
    `src/main.${wantsTs ? "tsx" : "jsx"}`;
  const stylePath =
    files.find((file) => file.path.endsWith(".css"))?.path ?? "src/styles.css";

  return mergeProjectFiles(
    [
      {
        path: "package.json",
        language: "json",
        content: JSON.stringify(
          {
            name: slugify(prompt),
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
              dev: "vite --host 0.0.0.0",
              build: "vite build",
              preview: "vite preview",
            },
            dependencies: {
              "@vitejs/plugin-react": "^5.1.1",
              vite: "^7.2.4",
              react: "^19.2.3",
              "react-dom": "^19.2.3",
            },
            devDependencies: {},
          },
          null,
          2,
        ),
      },
      {
        path: "index.html",
        language: "html",
        content: `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(inferProjectName(prompt))}</title></head><body><div id="root"></div><script type="module" src="/${mainPath}"></script></body></html>`,
      },
      {
        path: mainPath,
        language: wantsTs ? "tsx" : "jsx",
        content:
          `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./${stylePath.split("/").pop()}";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n`.replace(
            "!",
            wantsTs ? "!" : "",
          ),
      },
      {
        path: appPath,
        language: wantsTs ? "tsx" : "jsx",
        content: `export default function App() {\n  return <main className="app-shell"><section><p className="eyebrow">Preview booting</p><h1>${escapeHtml(inferProjectName(prompt))}</h1><p>The project shell is live while the generated files stream in.</p><button type="button">Open preview</button></section></main>;\n}\n`,
      },
      {
        path: stylePath,
        language: "css",
        content: `body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#f8fafc}.app-shell{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 30% 20%,#2563eb55,transparent 32%),linear-gradient(135deg,#020617,#172554)}section{max-width:760px}h1{font-size:clamp(2.4rem,8vw,6rem);line-height:.95;margin:.2em 0}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#93c5fd;font-weight:800}button{border:0;border-radius:999px;padding:13px 18px;background:#f8fafc;color:#020617;font-weight:800}`,
      },
    ],
    files,
  );
}

function ensureStaticShell(
  files: ProjectFile[],
  prompt: string,
): ProjectFile[] {
  const css = files.find((file) => file.path.endsWith(".css"));
  const js = files.find((file) => /\.(mjs|js)$/.test(file.path));
  return mergeProjectFiles(
    [
      {
        path: "index.html",
        language: "html",
        content: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(inferProjectName(prompt))}</title>${css ? `<link rel="stylesheet" href="/${css.path}">` : ""}</head><body><main id="app"><h1>${escapeHtml(inferProjectName(prompt))}</h1><p>Static preview is ready.</p></main>${js ? `<script type="module" src="/${js.path}"><\/script>` : ""}</body></html>`,
      },
    ],
    files,
  );
}

function baseViteTsFiles(
  prompt: string,
  appContent: string,
  stylesContent: string,
  extraDependencies: Record<string, string> = {},
): ProjectFile[] {
  const name = inferProjectName(prompt);
  return [
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify(
        {
          name: slugify(prompt),
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite --host 0.0.0.0",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            "@vitejs/plugin-react": "^5.1.1",
            vite: "^7.2.4",
            typescript: "^5.9.3",
            react: "^19.2.3",
            "react-dom": "^19.2.3",
            ...extraDependencies,
          },
          devDependencies: {},
        },
        null,
        2,
      ),
    },
    {
      path: "tsconfig.json",
      language: "json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            useDefineForClassFields: true,
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            allowJs: false,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            module: "ESNext",
            moduleResolution: "Bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
          },
          include: ["src"],
          references: [],
        },
        null,
        2,
      ),
    },
    {
      path: "vite.config.ts",
      language: "typescript",
      content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()], server: { host: true } });\n`,
    },
    {
      path: "index.html",
      language: "html",
      content: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
    },
    {
      path: "src/main.tsx",
      language: "tsx",
      content: `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n`,
    },
    { path: "src/App.tsx", language: "tsx", content: appContent },
    { path: "src/styles.css", language: "css", content: stylesContent },
  ];
}

function pacmanViteFiles(prompt: string): ProjectFile[] {
  const app = `import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const size = 17;
const directions: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function key(point: Point) {
  return point.x + "," + point.y;
}

function isWall(x: number, y: number) {
  if (x < 0 || y < 0 || x >= size || y >= size) return true;
  if (x === 0 || y === 0 || x === size - 1 || y === size - 1) return true;
  if (x % 4 === 0 && y > 1 && y < size - 2) return true;
  if (y % 4 === 0 && x > 2 && x < size - 3 && x !== 8) return true;
  return false;
}

function createPellets() {
  const pellets = new Set<string>();
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (!isWall(x, y) && !(x === 1 && y === 1)) pellets.add(x + "," + y);
    }
  }
  return pellets;
}

function nextPoint(point: Point, direction: Point) {
  return {
    x: (point.x + direction.x + size) % size,
    y: (point.y + direction.y + size) % size,
  };
}

function createGame() {
  return {
    pac: { x: 1, y: 1 },
    dir: { x: 1, y: 0 },
    ghosts: [
      { x: 15, y: 15, color: "#ff4fd8" },
      { x: 15, y: 1, color: "#60a5fa" },
      { x: 1, y: 15, color: "#fb923c" },
    ],
    pellets: createPellets(),
    frame: 0,
    status: "Colete pellets e evite os ghosts.",
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const gameRef = useRef(createGame());
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(gameRef.current.status);
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") directionRef.current = { x: 0, y: -1 };
      if (event.key === "ArrowDown") directionRef.current = { x: 0, y: 1 };
      if (event.key === "ArrowLeft") directionRef.current = { x: -1, y: 0 };
      if (event.key === "ArrowRight") directionRef.current = { x: 1, y: 0 };
      if (event.key === " ") setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    gameRef.current = createGame();
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    setStatus(gameRef.current.status);
  }, [resetTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let raf = 0;

    const resize = () => {
      const side = Math.min(window.innerWidth, window.innerHeight) * 0.82;
      canvas.width = side * window.devicePixelRatio;
      canvas.height = side * window.devicePixelRatio;
      canvas.style.width = side + "px";
      canvas.style.height = side + "px";
    };

    const draw = () => {
      const game = gameRef.current;
      const cell = canvas.width / size;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#050816";
      context.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (isWall(x, y)) {
            context.fillStyle = "#1d4ed8";
            context.shadowColor = "#60a5fa";
            context.shadowBlur = 16;
            context.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
            context.shadowBlur = 0;
          }
        }
      }
      context.fillStyle = "#fde68a";
      game.pellets.forEach((pellet) => {
        const parts = pellet.split(",").map(Number);
        context.beginPath();
        context.arc((parts[0] + 0.5) * cell, (parts[1] + 0.5) * cell, cell * 0.1, 0, Math.PI * 2);
        context.fill();
      });
      const mouth = Math.sin(game.frame / 6) * 0.35 + 0.48;
      const angle = Math.atan2(game.dir.y, game.dir.x);
      context.fillStyle = "#facc15";
      context.beginPath();
      context.moveTo((game.pac.x + 0.5) * cell, (game.pac.y + 0.5) * cell);
      context.arc((game.pac.x + 0.5) * cell, (game.pac.y + 0.5) * cell, cell * 0.42, angle + mouth, angle + Math.PI * 2 - mouth);
      context.closePath();
      context.fill();
      game.ghosts.forEach((ghost) => {
        context.fillStyle = ghost.color;
        context.beginPath();
        context.arc((ghost.x + 0.5) * cell, (ghost.y + 0.5) * cell, cell * 0.38, Math.PI, 0);
        context.lineTo((ghost.x + 0.88) * cell, (ghost.y + 0.88) * cell);
        context.lineTo((ghost.x + 0.12) * cell, (ghost.y + 0.88) * cell);
        context.closePath();
        context.fill();
      });
    };

    const step = () => {
      const game = gameRef.current;
      if (!paused && game.frame % 10 === 0) {
        const desired = nextPoint(game.pac, directionRef.current);
        if (!isWall(desired.x, desired.y)) game.dir = directionRef.current;
        const candidate = nextPoint(game.pac, game.dir);
        if (!isWall(candidate.x, candidate.y)) game.pac = candidate;
        if (game.pellets.delete(key(game.pac))) {
          const nextScore = score + 10;
          setScore(nextScore);
          setStatus("Pellet coletado. Continue no fluxo.");
        }
        game.ghosts = game.ghosts.map((ghost, index) => {
          const options = directions
            .map((direction) => nextPoint(ghost, direction))
            .filter((point) => !isWall(point.x, point.y));
          const ordered = options.sort(
            (left, right) =>
              Math.abs(left.x - game.pac.x) + Math.abs(left.y - game.pac.y) -
              (Math.abs(right.x - game.pac.x) + Math.abs(right.y - game.pac.y)),
          );
          const next = ordered[(game.frame / 10 + index) % Math.max(1, ordered.length)] ?? ghost;
          return { ...ghost, x: next.x, y: next.y };
        });
        if (game.ghosts.some((ghost) => ghost.x === game.pac.x && ghost.y === game.pac.y)) {
          setStatus("Ghost encostou. Reinicie e tente outra rota.");
          setPaused(true);
        }
        if (game.pellets.size === 0) {
          setStatus("Labirinto limpo. Vitoria!");
          setPaused(true);
        }
      }
      game.frame += 1;
      draw();
      raf = requestAnimationFrame(step);
    };

    resize();
    window.addEventListener("resize", resize);
    step();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [paused, resetTick, score]);

  return (
    <main className="arcade" data-testid="pacman-game">
      <section className="hud">
        <p className="eyebrow">3D arcade preview</p>
        <h1>Pac-Man Neon Maze</h1>
        <p>{status}</p>
        <div className="stats">
          <span>Score <strong>{score}</strong></span>
          <span>Mode <strong>{paused ? "Paused" : "Running"}</strong></span>
        </div>
        <div className="actions">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Play" : "Pause"}</button>
          <button onClick={() => setResetTick((value) => value + 1)}>Restart</button>
        </div>
      </section>
      <canvas ref={canvasRef} aria-label="Playable Pac-Man maze" />
    </main>
  );
}
`;
  const css = `html,body,#root{height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui;background:#050816;color:#f8fafc;overflow:hidden}.arcade{min-height:100%;display:grid;grid-template-columns:360px 1fr;gap:24px;align-items:center;padding:24px;background:radial-gradient(circle at 70% 18%,rgba(250,204,21,.22),transparent 28%),radial-gradient(circle at 82% 82%,rgba(59,130,246,.2),transparent 32%),linear-gradient(145deg,#050816,#10142c 62%,#020617)}.hud{position:relative;z-index:2;border:1px solid rgba(250,204,21,.28);border-radius:22px;background:rgba(15,23,42,.74);box-shadow:0 30px 100px rgba(0,0,0,.35);padding:22px;backdrop-filter:blur(16px)}.eyebrow{margin:0;text-transform:uppercase;letter-spacing:.2em;color:#facc15;font-size:12px;font-weight:950}h1{margin:10px 0;font-size:48px;line-height:.9}p{color:#cbd5e1;line-height:1.6}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.stats span{border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.05);padding:12px;color:#94a3b8}.stats strong{display:block;color:#f8fafc;font-size:22px}.actions{display:flex;gap:10px;flex-wrap:wrap}button{border:1px solid rgba(250,204,21,.45);border-radius:999px;background:#facc15;color:#111827;font-weight:950;padding:12px 16px;cursor:pointer}button+button{background:transparent;color:#facc15}canvas{justify-self:center;border:1px solid rgba(96,165,250,.35);border-radius:28px;background:#050816;box-shadow:0 50px 130px rgba(0,0,0,.5),0 0 80px rgba(59,130,246,.2);transform:perspective(900px) rotateX(7deg)}@media(max-width:900px){.arcade{grid-template-columns:1fr;align-content:start;overflow:auto}.hud{order:2}canvas{max-width:92vw;max-height:58vh}}`;
  return baseViteTsFiles(prompt, app, css);
}

function commerceViteFiles(prompt: string): ProjectFile[] {
  const app = `import { useMemo, useState } from "react";

type Product = {
  name: string;
  tag: string;
  price: number;
  color: string;
  badge: string;
};

const products: Product[] = [
  { name: "Aero Runner Pro", tag: "Corrida", price: 589, color: "#67e8f9", badge: "Novo" },
  { name: "Court Legacy High", tag: "Basquete", price: 749, color: "#facc15", badge: "Drop" },
  { name: "Street Pulse 90", tag: "Lifestyle", price: 429, color: "#fb7185", badge: "Hot" },
  { name: "Trail Carbon X", tag: "Outdoor", price: 899, color: "#86efac", badge: "Pro" },
];

export default function App() {
  const [filter, setFilter] = useState("Todos");
  const [cart, setCart] = useState<Product[]>([]);
  const visible = useMemo(
    () => products.filter((item) => filter === "Todos" || item.tag === filter),
    [filter],
  );
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const filters = ["Todos", ...Array.from(new Set(products.map((item) => item.tag)))];

  return (
    <main className="store" data-testid="commerce-store">
      <nav>
        <strong>Sneaker Vault</strong>
        <span>{cart.length} itens - R$ {total.toLocaleString("pt-BR")}</span>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">loja de tenis online</p>
          <h1>Drop premium para vender no primeiro frame.</h1>
          <p>Catalogo responsivo, filtros, carrinho e cards de produto prontos para evoluir para checkout real.</p>
          <div className="actions">
            <button onClick={() => setCart((items) => [...items, products[0]])}>Comprar destaque</button>
            <a href="#catalogo">Ver catalogo</a>
          </div>
        </div>
        <div className="shoe-stage" aria-label="Hero sneaker visual"><div className="shoe" /></div>
      </section>
      <section id="catalogo" className="catalog">
        <div className="catalog-head">
          <div><p className="eyebrow">catalogo</p><h2>Tenis em destaque</h2></div>
          <div className="filters">
            {filters.map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="grid">
          {visible.map((product) => (
            <article className="card" key={product.name}>
              <span className="badge">{product.badge}</span>
              <div className="mini-shoe" style={{ background: product.color }} />
              <h3>{product.name}</h3>
              <p>{product.tag}</p>
              <footer><strong>R$ {product.price}</strong><button onClick={() => setCart((items) => [...items, product])}>Adicionar</button></footer>
            </article>
          ))}
        </div>
      </section>
      <aside className="cart">
        <strong>Carrinho</strong>
        <span>{cart.length ? cart.map((item) => item.name).slice(-2).join(" + ") : "Nenhum item ainda"}</span>
      </aside>
    </main>
  );
}
`;
  const css = `*{box-sizing:border-box}html,body,#root{min-height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui;background:#f5f7fb;color:#101624}.store{min-height:100vh;background:radial-gradient(circle at 78% 10%,rgba(103,232,249,.32),transparent 28%),linear-gradient(145deg,#f8fafc,#e8eef9 62%,#dbe7ff);padding:20px clamp(18px,4vw,64px);position:relative;overflow:hidden}nav{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(15,23,42,.08);border-radius:20px;background:rgba(255,255,255,.75);backdrop-filter:blur(16px);padding:14px 18px;box-shadow:0 20px 60px rgba(50,65,110,.1)}nav strong{text-transform:uppercase;letter-spacing:.16em}.hero{display:grid;grid-template-columns:1fr .85fr;gap:32px;align-items:center;padding:48px 0 30px}.eyebrow{margin:0;text-transform:uppercase;letter-spacing:.2em;color:#2563eb;font-size:12px;font-weight:950}h1{margin:12px 0;font-size:clamp(44px,8vw,96px);line-height:.9;letter-spacing:0}h2{margin:6px 0 0;font-size:32px}.hero p{max-width:620px;color:#516071;font-size:18px;line-height:1.65}.actions,.filters{display:flex;gap:10px;flex-wrap:wrap}.actions{margin-top:24px}button,.actions a{border:0;border-radius:999px;background:#101624;color:white;padding:12px 16px;font-weight:900;text-decoration:none;cursor:pointer}.actions a,.filters button{background:white;color:#101624;border:1px solid rgba(15,23,42,.1)}.filters button.active{background:#2563eb;color:white}.shoe-stage{min-height:420px;border-radius:34px;background:linear-gradient(150deg,#111827,#273657);display:grid;place-items:center;box-shadow:0 34px 100px rgba(20,33,66,.28);position:relative;overflow:hidden}.shoe-stage:before{content:"";position:absolute;inset:14%;border-radius:999px;background:radial-gradient(circle,rgba(103,232,249,.34),transparent 64%)}.shoe,.mini-shoe{position:relative;border-radius:999px 999px 30px 999px;transform:rotate(-14deg);box-shadow:0 26px 60px rgba(0,0,0,.28)}.shoe{width:310px;height:120px;background:linear-gradient(135deg,#facc15,#fb7185)}.shoe:after,.mini-shoe:after{content:"";position:absolute;left:18%;right:12%;bottom:-14px;height:26px;border-radius:999px;background:#0f172a}.catalog{border:1px solid rgba(15,23,42,.08);border-radius:28px;background:rgba(255,255,255,.72);padding:20px;box-shadow:0 26px 80px rgba(50,65,110,.12)}.catalog-head{display:flex;justify-content:space-between;gap:16px;align-items:end}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}.card{border:1px solid rgba(15,23,42,.08);border-radius:22px;background:#fff;padding:16px;min-height:280px;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(50,65,110,.08)}.badge{align-self:flex-start;border-radius:999px;background:#eff6ff;color:#2563eb;padding:6px 9px;font-size:11px;font-weight:950}.mini-shoe{width:150px;height:64px;margin:30px auto 24px}.card h3{margin:0;font-size:18px}.card p{color:#64748b;margin:6px 0 18px}.card footer{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px}.card footer button{padding:10px 12px}.cart{position:fixed;right:28px;bottom:24px;max-width:320px;border:1px solid rgba(15,23,42,.1);border-radius:18px;background:#101624;color:white;padding:14px 16px;box-shadow:0 24px 70px rgba(16,22,36,.26)}.cart strong{display:block}.cart span{color:#cbd5e1;font-size:13px}@media(max-width:980px){.hero{grid-template-columns:1fr}.shoe-stage{min-height:300px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-head{display:block}.filters{margin-top:12px}}@media(max-width:560px){.grid{grid-template-columns:1fr}nav{display:block}.cart{left:18px;right:18px}.store{padding-bottom:96px}h1{font-size:46px}}`;
  return baseViteTsFiles(prompt, app, css);
}

function dashboardViteFiles(prompt: string): ProjectFile[] {
  const app = `import { useMemo, useState } from "react";

type SortKey = "account" | "arr" | "status";

const rows = [
  { account: "Northstar Labs", plan: "Enterprise", status: "Healthy", arr: 42000 },
  { account: "Acme Cloud", plan: "Scale", status: "Watch", arr: 18000 },
  { account: "Blue River", plan: "Pro", status: "Active", arr: 9000 },
  { account: "Nova Retail", plan: "Starter", status: "Risk", arr: 4000 },
  { account: "Atlas Ops", plan: "Scale", status: "Healthy", arr: 27000 },
  { account: "Signal Works", plan: "Pro", status: "Active", arr: 12000 },
];

export default function App() {
  const [range, setRange] = useState("Last 30 days");
  const [sortKey, setSortKey] = useState<SortKey>("arr");
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    return [...rows].sort((left, right) => {
      if (sortKey === "arr") return right.arr - left.arr;
      return String(left[sortKey]).localeCompare(String(right[sortKey]));
    });
  }, [sortKey]);
  const pageSize = 3;
  const maxPage = Math.ceil(sorted.length / pageSize) - 1;
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="app-shell" data-testid="dashboard-app">
      <aside className="sidebar">
        <div className="logo">Orbit Analytics</div>
        <button className="active">Overview</button>
        <button>Revenue</button>
        <button>Customers</button>
        <button>Settings</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">SaaS analytics</p>
            <h1>Executive Dashboard</h1>
          </div>
          <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Date range">
            <option>Last 30 days</option>
            <option>Last quarter</option>
            <option>This year</option>
          </select>
        </header>

        <section className="kpis">
          <article><span>MRR</span><strong>$84.2k</strong><small>+18.4% for {range}</small></article>
          <article><span>Users</span><strong>24,891</strong><small>+9.1%</small></article>
          <article><span>Churn</span><strong>2.1%</strong><small>-0.8%</small></article>
          <article><span>NPS</span><strong>64</strong><small>+7 pts</small></article>
        </section>

        <section className="charts">
          <article className="panel line-chart"><span>Revenue trend</span><i /></article>
          <article className="panel bars"><span>Pipeline</span><div><i /><i /><i /><i /><i /></div></article>
        </section>

        <section className="panel table-panel">
          <div className="table-head">
            <h2>Accounts</h2>
            <div>
              <button onClick={() => setSortKey("account")}>Sort name</button>
              <button onClick={() => setSortKey("arr")}>Sort ARR</button>
              <button onClick={() => setSortKey("status")}>Sort status</button>
            </div>
          </div>
          <table>
            <thead><tr><th>Account</th><th>Plan</th><th>Status</th><th>ARR</th></tr></thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.account}>
                  <td>{row.account}</td><td>{row.plan}</td><td><span className={"badge " + row.status.toLowerCase()}>{row.status}</span></td><td>\${row.arr.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="pager">
            <button onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
            <span>Page {page + 1} of {maxPage + 1}</span>
            <button onClick={() => setPage((value) => Math.min(maxPage, value + 1))}>Next</button>
          </footer>
        </section>
      </main>
    </div>
  );
}
`;
  const css = `*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:#0a0f1e;color:#e5eefc}.app-shell{min-height:100vh;display:grid;grid-template-columns:260px 1fr;background:linear-gradient(135deg,#0a0f1e,#12182b)}.sidebar{border-right:1px solid #243049;padding:24px;background:#0d1324}.logo{font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc;margin-bottom:32px}.sidebar button{display:block;width:100%;border:0;border-radius:12px;background:transparent;color:#9fb0ce;text-align:left;padding:12px;font-weight:800}.sidebar button.active{background:#17223a;color:white}main{min-width:0;padding:22px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:20px}.topbar h1{margin:0;font-size:28px}.eyebrow{margin:0;color:#8aa0c4;font-weight:800;text-transform:uppercase;font-size:12px}select,.table-head button,.pager button{border:1px solid #2b3856;background:#10182b;color:#e5eefc;border-radius:12px;padding:10px 12px;font-weight:800}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.kpis article,.panel{border:1px solid #263553;background:#111a2f;border-radius:16px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.18)}.kpis span,.panel span{color:#8aa0c4;font-size:12px;font-weight:800;text-transform:uppercase}.kpis strong{display:block;margin-top:10px;font-size:30px}.charts{display:grid;grid-template-columns:1.4fr .9fr;gap:14px;margin-top:14px}.line-chart{height:270px;position:relative;overflow:hidden}.line-chart i{position:absolute;inset:58px 22px 48px;border-bottom:2px solid #2b3856;background:linear-gradient(135deg,transparent 48%,#38bdf8 49%,#38bdf8 51%,transparent 52%)}.bars div{display:flex;align-items:end;gap:12px;height:205px;margin-top:18px}.bars i{flex:1;border-radius:10px 10px 0 0;background:linear-gradient(#a78bfa,#38bdf8)}.bars i:nth-child(1){height:42%}.bars i:nth-child(2){height:68%}.bars i:nth-child(3){height:53%}.bars i:nth-child(4){height:88%}.bars i:nth-child(5){height:76%}.table-panel{margin-top:14px;overflow-x:auto}.table-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.table-head div{display:flex;gap:8px;flex-wrap:wrap}table{width:100%;min-width:640px;border-collapse:collapse;margin-top:14px;overflow:hidden;border-radius:16px}th,td{text-align:left;border-bottom:1px solid #25314c;padding:13px}th{color:#8aa0c4;font-size:12px;text-transform:uppercase}.badge{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900}.healthy,.active{background:#064e3b;color:#86efac}.watch{background:#713f12;color:#fde68a}.risk{background:#7f1d1d;color:#fecaca}.pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px;color:#8aa0c4}@media(max-width:900px){.app-shell{grid-template-columns:1fr}.sidebar{position:sticky;top:0;z-index:2}.kpis,.charts{grid-template-columns:1fr}.topbar,.table-head{display:block}.table-head div{margin-top:10px}}`;
  return baseViteTsFiles(prompt, app, css);
}

function sceneViteFiles(prompt: string): ProjectFile[] {
  const app = `import { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let time = 0;
    const mouse = { x: 0.5, y: 0.35 };
    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    const pointer = (event: PointerEvent) => {
      mouse.x = event.clientX / window.innerWidth;
      mouse.y = event.clientY / window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer);
    const vertices = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] as const;
    const faces = [[0,1,2,3,"#38bdf8"],[4,5,6,7,"#a78bfa"],[0,1,5,4,"#22c55e"],[2,3,7,6,"#f59e0b"],[1,2,6,5,"#ec4899"],[0,3,7,4,"#14b8a6"]] as const;
    const project = (x: number, y: number, z: number) => {
      const scale = 360 / (z + 5);
      return [canvas.width / 2 + x * scale * window.devicePixelRatio, canvas.height / 2 + y * scale * window.devicePixelRatio, scale] as const;
    };
    const draw = () => {
      if (!paused) time += 0.012;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = context.createRadialGradient(canvas.width * mouse.x, canvas.height * mouse.y, 20, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
      gradient.addColorStop(0, "rgba(103,232,249,.22)");
      gradient.addColorStop(1, "rgba(2,6,23,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const cy = Math.cos(time), sy = Math.sin(time), cx = Math.cos(time * 0.7), sx = Math.sin(time * 0.7);
      const points = vertices.map(([x, y, z]) => {
        const nx = x * cy - z * sy;
        let nz = x * sy + z * cy;
        const ny = y * cx - nz * sx;
        nz = y * sx + nz * cx;
        return project(nx, ny, nz);
      });
      faces.map((face) => ({ face, z: face.slice(0, 4).reduce((total, index) => total + points[index as number][2], 0) }))
        .sort((left, right) => left.z - right.z)
        .forEach(({ face }) => {
          context.beginPath();
          face.slice(0, 4).forEach((index, itemIndex) => {
            const point = points[index as number];
            if (itemIndex) context.lineTo(point[0], point[1]); else context.moveTo(point[0], point[1]);
          });
          context.closePath();
          context.fillStyle = String(face[4]);
          context.globalAlpha = 0.82;
          context.fill();
          context.globalAlpha = 1;
          context.strokeStyle = "rgba(255,255,255,.45)";
          context.lineWidth = 2 * window.devicePixelRatio;
          context.stroke();
        });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
    };
  }, [paused]);

  return (
    <main className="scene" data-testid="three-scene">
      <canvas ref={canvasRef} aria-label="Responsive 3D canvas" />
      <div className="overlay">
        <section className="panel">
          <p className="eyebrow">React canvas 3D fallback</p>
          <h1>Kinetic 3D Scene</h1>
          <p>Rotating cube with lighting depth, pointer-driven glow, and a responsive canvas. The structure is ready to swap to React Three Fiber when dependency install is preferred.</p>
        </section>
        <button onClick={() => setPaused((value) => !value)}>{paused ? "Play rotation" : "Pause rotation"}</button>
      </div>
      <div className="hint">Move the pointer over the preview to shift light direction</div>
    </main>
  );
}
`;
  const css = `html,body,#root{height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui;background:#050816;color:#eef2ff;overflow:hidden}.scene{position:relative;min-height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(56,189,248,.26),transparent 28%),linear-gradient(145deg,#050816,#111827 58%,#020617)}canvas{position:absolute;inset:0;width:100%;height:100%}.overlay{position:fixed;left:22px;top:22px;right:22px;display:flex;justify-content:space-between;gap:16px;align-items:start;z-index:2}.panel{max-width:460px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(15,23,42,.62);backdrop-filter:blur(18px);padding:18px}.panel p{color:#b6c3da;line-height:1.6}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#67e8f9;font-size:12px;font-weight:900}h1{font-size:clamp(32px,6vw,72px);line-height:.95;margin:8px 0}button{border:1px solid rgba(103,232,249,.44);border-radius:999px;background:#67e8f9;color:#03111a;font-weight:900;padding:12px 16px;cursor:pointer}.hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);border-radius:999px;background:rgba(15,23,42,.72);padding:9px 13px;color:#cbd5e1;font-size:13px}@media(max-width:720px){.overlay{display:block}.panel{max-width:100%;margin-bottom:12px}button{width:100%}.hint{width:max-content;max-width:calc(100% - 32px)}}`;
  return baseViteTsFiles(prompt, app, css);
}

function detectArtifactKind(files: ProjectFile[]): ArtifactKind {
  if (files.length === 1 && files[0]?.path === "index.html")
    return "single-html";
  if (
    files.some((file) => file.path === "package.json") &&
    files.some((file) => /src\/App\.(tsx|jsx|js)$/.test(file.path))
  )
    return "vite-react";
  if (files.length > 1) return "multi-file";
  return "unknown";
}

function hasMeaningfulHtmlBody(html: string): boolean {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div\s+id=["']root["']\s*><\/div>/gi, "")
    .replace(/<div\s+id=["']app["']\s*><\/div>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+/g, "")
    .trim();
  return cleaned.length > 0;
}

function extractFilename(
  info: string,
  code: string,
): { path: string; code: string } | null {
  const infoMatch =
    info.match(/(?:title|file|filename|path)=['"]?([^'"\s]+)['"]?/i) ??
    info.match(FILE_PATH_RE);
  if (infoMatch?.[1]) return { path: infoMatch[1], code };

  const lines = code.split("\n");
  const first = lines[0]?.trim() ?? "";
  const commentMatch = first.match(
    /^(?:\/\/|#|\/\*|<!--)\s*([^*<-]+\.(?:tsx|jsx|ts|js|css|html|json|md|mjs|cjs))/i,
  );
  if (!commentMatch?.[1]) return null;
  return {
    path: commentMatch[1].trim(),
    code: lines
      .slice(1)
      .join("\n")
      .replace(/^\s*\*\/\s*/, ""),
  };
}

function defaultPathForLanguage(
  language: string,
  index: number,
): string | null {
  if (language === "html")
    return index === 0 ? "index.html" : `page-${index + 1}.html`;
  if (language === "css")
    return index === 0 ? "styles.css" : `styles-${index + 1}.css`;
  if (language === "javascript")
    return index === 0 ? "main.js" : `script-${index + 1}.js`;
  if (language === "jsx")
    return index === 0 ? "src/App.jsx" : `src/component-${index + 1}.jsx`;
  if (language === "tsx")
    return index === 0 ? "src/App.tsx" : `src/component-${index + 1}.tsx`;
  if (language === "typescript")
    return index === 0 ? "src/main.ts" : `src/file-${index + 1}.ts`;
  if (language === "json")
    return index === 0 ? "package.json" : `data-${index + 1}.json`;
  return null;
}

function normalizeLanguage(language: string): string {
  const value = language.toLowerCase();
  if (value === "js") return "javascript";
  if (value === "ts") return "typescript";
  if (value === "react") return "tsx";
  if (value === "sh" || value === "shell") return "bash";
  return value || "text";
}

function languageFromPath(path: string): string {
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs"))
    return "javascript";
  if (path.endsWith(".json")) return "json";
  return "text";
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .trim();
}

function scorePath(path: string): number {
  if (path === "package.json") return 0;
  if (path === "index.html") return 1;
  if (/src\/main\./.test(path)) return 2;
  if (/src\/App\./.test(path)) return 3;
  if (path.endsWith(".css")) return 4;
  return 10;
}

function inferProjectName(prompt: string): string {
  if (/pac\s*-?\s*man|pacman|labirinto|maze|arcade/i.test(prompt))
    return "Pac-Man Neon Maze";
  if (isCommercePrompt(prompt)) return "Sneaker Vault";
  if (/cobrinha|snake/i.test(prompt)) return "Snake Arena";
  if (/gamer|gaming|comunidade|discord|clan|clube/i.test(prompt))
    return "Guilda Prime";
  if (/perfume|fragrance|luxury/i.test(prompt)) return "Perfume Noir";
  if (/dashboard|analytics|saas/i.test(prompt)) return "Orbit Analytics";
  if (/3d|three|scene|fiber/i.test(prompt)) return "Kinetic 3D Scene";
  return prompt.trim().slice(0, 42) || "Generated Project";
}

function slugify(value: string): string {
  return (
    inferProjectName(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "generated-project"
  ).slice(0, 60);
}

function buildImmediatePreviewHtml(prompt: string, name: string): string {
  if (/pac\s*-?\s*man|pacman|labirinto|maze|arcade/i.test(prompt))
    return pacmanGameHtml(name);
  if (isCommercePrompt(prompt)) return commerceStoreHtml(name);
  if (/cobrinha|snake/i.test(prompt)) return snakeGameHtml(name);
  if (/gamer|gaming|comunidade|discord|clan|clube/i.test(prompt))
    return gamerCommunityLandingHtml(name);
  if (/perfume|fragrance|luxury/i.test(prompt)) return perfumeLandingHtml(name);
  if (/dashboard|analytics|saas/i.test(prompt)) return dashboardHtml(name);
  if (/3d|three|scene|fiber|canvas/i.test(prompt)) return scene3dHtml(name);
  return genericShellHtml(name);
}

function isCommercePrompt(prompt: string): boolean {
  return /loja|e-?commerce|commerce|tenis|tênis|sneaker|sapato|shoe|store|shop|produto|catalogo|catálogo|carrinho|checkout/i.test(
    prompt,
  );
}

function pacmanGameHtml(name: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
  *{box-sizing:border-box}html,body{height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui;background:#050816;color:#f8fafc;overflow:hidden}.arcade{min-height:100%;display:grid;grid-template-columns:340px 1fr;gap:22px;align-items:center;padding:22px;background:radial-gradient(circle at 75% 18%,rgba(250,204,21,.22),transparent 28%),linear-gradient(145deg,#050816,#10142c 64%,#020617)}.hud{border:1px solid rgba(250,204,21,.28);border-radius:22px;background:rgba(15,23,42,.78);box-shadow:0 30px 100px rgba(0,0,0,.36);padding:22px}.eyebrow{text-transform:uppercase;letter-spacing:.2em;color:#facc15;font-size:12px;font-weight:950}h1{margin:10px 0;font-size:clamp(42px,7vw,76px);line-height:.9}.hud p{color:#cbd5e1;line-height:1.6}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.stats span{border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.05);padding:12px;color:#94a3b8}.stats strong{display:block;color:#f8fafc;font-size:24px}.actions{display:flex;gap:10px;flex-wrap:wrap}.btn{border:1px solid rgba(250,204,21,.45);border-radius:999px;background:#facc15;color:#111827;font-weight:950;padding:12px 16px;cursor:pointer}.btn.secondary{background:transparent;color:#facc15}canvas{justify-self:center;width:min(78vh,58vw);height:min(78vh,58vw);border:1px solid rgba(96,165,250,.35);border-radius:28px;background:#050816;box-shadow:0 50px 130px rgba(0,0,0,.5),0 0 80px rgba(59,130,246,.2);transform:perspective(900px) rotateX(7deg)}@media(max-width:900px){body{overflow:auto}.arcade{grid-template-columns:1fr}.hud{order:2}canvas{width:min(92vw,62vh);height:min(92vw,62vh)}}
  </style></head><body><main class="arcade" data-perfectagent-shell="pacman"><section class="hud"><p class="eyebrow">3d arcade preview</p><h1>${escapeHtml(name)}</h1><p id="status">Use as setas para coletar pellets e fugir dos ghosts.</p><div class="stats"><span>Score<strong id="score">0</strong></span><span>Modo<strong id="mode">Running</strong></span></div><div class="actions"><button class="btn" id="toggle">Pause</button><button class="btn secondary" id="restart">Restart</button></div></section><canvas id="game" aria-label="Playable Pac-Man maze"></canvas></main><script>
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),scoreEl=document.getElementById('score'),modeEl=document.getElementById('mode'),statusEl=document.getElementById('status');const size=17,dirs=[[1,0],[-1,0],[0,1],[0,-1]];let pac,dir,ghosts,pellets,score,paused=false,frame=0;function wall(x,y){return x<0||y<0||x>=size||y>=size||x===0||y===0||x===size-1||y===size-1||(x%4===0&&y>1&&y<size-2)||(y%4===0&&x>2&&x<size-3&&x!==8)}function key(x,y){return x+','+y}function makePellets(){const p=new Set;for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(!wall(x,y)&&!(x===1&&y===1))p.add(key(x,y));return p}function reset(){pac={x:1,y:1};dir={x:1,y:0};ghosts=[{x:15,y:15,c:'#ff4fd8'},{x:15,y:1,c:'#60a5fa'},{x:1,y:15,c:'#fb923c'}];pellets=makePellets();score=0;paused=false;scoreEl.textContent='0';modeEl.textContent='Running';statusEl.textContent='Use as setas para coletar pellets e fugir dos ghosts.'}function resize(){const side=Math.min(innerWidth*.58,innerHeight*.78,760)*devicePixelRatio;canvas.width=side;canvas.height=side}function next(p,d){return{x:(p.x+d.x+size)%size,y:(p.y+d.y+size)%size}}function draw(){const cell=canvas.width/size;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#050816';ctx.fillRect(0,0,canvas.width,canvas.height);for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(wall(x,y)){ctx.fillStyle='#1d4ed8';ctx.shadowColor='#60a5fa';ctx.shadowBlur=14;ctx.fillRect(x*cell+2,y*cell+2,cell-4,cell-4);ctx.shadowBlur=0}ctx.fillStyle='#fde68a';pellets.forEach(v=>{const [x,y]=v.split(',').map(Number);ctx.beginPath();ctx.arc((x+.5)*cell,(y+.5)*cell,cell*.1,0,Math.PI*2);ctx.fill()});const mouth=Math.sin(frame/6)*.35+.48,angle=Math.atan2(dir.y,dir.x);ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo((pac.x+.5)*cell,(pac.y+.5)*cell);ctx.arc((pac.x+.5)*cell,(pac.y+.5)*cell,cell*.42,angle+mouth,angle+Math.PI*2-mouth);ctx.closePath();ctx.fill();ghosts.forEach(g=>{ctx.fillStyle=g.c;ctx.beginPath();ctx.arc((g.x+.5)*cell,(g.y+.5)*cell,cell*.38,Math.PI,0);ctx.lineTo((g.x+.88)*cell,(g.y+.88)*cell);ctx.lineTo((g.x+.12)*cell,(g.y+.88)*cell);ctx.closePath();ctx.fill()})}function step(){if(!paused&&frame%10===0){let cand=next(pac,dir);if(!wall(cand.x,cand.y))pac=cand;if(pellets.delete(key(pac.x,pac.y))){score+=10;scoreEl.textContent=score;statusEl.textContent='Pellet coletado. Continue no fluxo.'}ghosts=ghosts.map((g,i)=>{const opts=dirs.map(d=>({x:(g.x+d[0]+size)%size,y:(g.y+d[1]+size)%size,c:g.c})).filter(p=>!wall(p.x,p.y)).sort((a,b)=>Math.abs(a.x-pac.x)+Math.abs(a.y-pac.y)-Math.abs(b.x-pac.x)-Math.abs(b.y-pac.y));return opts[(frame/10+i)%Math.max(1,opts.length)]||g});if(ghosts.some(g=>g.x===pac.x&&g.y===pac.y)){paused=true;modeEl.textContent='Paused';statusEl.textContent='Ghost encostou. Reinicie e tente outra rota.'}if(pellets.size===0){paused=true;modeEl.textContent='Paused';statusEl.textContent='Labirinto limpo. Vitoria!'}}frame++;draw();requestAnimationFrame(step)}addEventListener('keydown',e=>{if(e.key==='ArrowUp')dir={x:0,y:-1};if(e.key==='ArrowDown')dir={x:0,y:1};if(e.key==='ArrowLeft')dir={x:-1,y:0};if(e.key==='ArrowRight')dir={x:1,y:0};if(e.key===' ')document.getElementById('toggle').click()});document.getElementById('toggle').onclick=()=>{paused=!paused;modeEl.textContent=paused?'Paused':'Running';document.getElementById('toggle').textContent=paused?'Play':'Pause'};document.getElementById('restart').onclick=reset;addEventListener('resize',resize);resize();reset();step();
  <\/script></body></html>`;
}

function commerceStoreHtml(name: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:#f5f7fb;color:#101624}.store{min-height:100vh;background:radial-gradient(circle at 78% 10%,rgba(103,232,249,.32),transparent 28%),linear-gradient(145deg,#f8fafc,#e8eef9 62%,#dbe7ff);padding:20px clamp(18px,4vw,64px);position:relative;overflow:hidden}nav{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(15,23,42,.08);border-radius:20px;background:rgba(255,255,255,.75);backdrop-filter:blur(16px);padding:14px 18px;box-shadow:0 20px 60px rgba(50,65,110,.1)}nav strong{text-transform:uppercase;letter-spacing:.16em}.hero{display:grid;grid-template-columns:1fr .85fr;gap:32px;align-items:center;padding:48px 0 30px}.eyebrow{margin:0;text-transform:uppercase;letter-spacing:.2em;color:#2563eb;font-size:12px;font-weight:950}h1{margin:12px 0;font-size:clamp(44px,8vw,96px);line-height:.9}h2{margin:6px 0 0;font-size:32px}.hero p{max-width:620px;color:#516071;font-size:18px;line-height:1.65}.actions,.filters{display:flex;gap:10px;flex-wrap:wrap}.actions{margin-top:24px}button,.actions a{border:0;border-radius:999px;background:#101624;color:white;padding:12px 16px;font-weight:900;text-decoration:none;cursor:pointer}.actions a,.filters button{background:white;color:#101624;border:1px solid rgba(15,23,42,.1)}.filters button.active{background:#2563eb;color:white}.shoe-stage{min-height:420px;border-radius:34px;background:linear-gradient(150deg,#111827,#273657);display:grid;place-items:center;box-shadow:0 34px 100px rgba(20,33,66,.28);position:relative;overflow:hidden}.shoe-stage:before{content:"";position:absolute;inset:14%;border-radius:999px;background:radial-gradient(circle,rgba(103,232,249,.34),transparent 64%)}.shoe,.mini-shoe{position:relative;border-radius:999px 999px 30px 999px;transform:rotate(-14deg);box-shadow:0 26px 60px rgba(0,0,0,.28)}.shoe{width:310px;height:120px;background:linear-gradient(135deg,#facc15,#fb7185)}.shoe:after,.mini-shoe:after{content:"";position:absolute;left:18%;right:12%;bottom:-14px;height:26px;border-radius:999px;background:#0f172a}.catalog{border:1px solid rgba(15,23,42,.08);border-radius:28px;background:rgba(255,255,255,.72);padding:20px;box-shadow:0 26px 80px rgba(50,65,110,.12)}.catalog-head{display:flex;justify-content:space-between;gap:16px;align-items:end}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}.card{border:1px solid rgba(15,23,42,.08);border-radius:22px;background:#fff;padding:16px;min-height:270px;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(50,65,110,.08)}.badge{align-self:flex-start;border-radius:999px;background:#eff6ff;color:#2563eb;padding:6px 9px;font-size:11px;font-weight:950}.mini-shoe{width:150px;height:64px;margin:30px auto 24px}.card h3{margin:0;font-size:18px}.card p{color:#64748b;margin:6px 0 18px}.card footer{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px}.card footer button{padding:10px 12px}.cart{position:fixed;right:28px;bottom:24px;max-width:320px;border:1px solid rgba(15,23,42,.1);border-radius:18px;background:#101624;color:white;padding:14px 16px;box-shadow:0 24px 70px rgba(16,22,36,.26)}.cart span{display:block;color:#cbd5e1;font-size:13px}@media(max-width:980px){.hero{grid-template-columns:1fr}.shoe-stage{min-height:300px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-head{display:block}.filters{margin-top:12px}}@media(max-width:560px){.grid{grid-template-columns:1fr}nav{display:block}.cart{left:18px;right:18px}.store{padding-bottom:96px}h1{font-size:46px}}
  </style></head><body><main class="store" data-perfectagent-shell="commerce"><nav><strong>${escapeHtml(name)}</strong><span id="cartTop">0 itens - R$ 0</span></nav><section class="hero"><div><p class="eyebrow">loja de tenis online</p><h1>Drop premium para vender no primeiro frame.</h1><p>Catalogo responsivo, filtros, carrinho e cards de produto prontos para evoluir para checkout real.</p><div class="actions"><button id="heroBuy">Comprar destaque</button><a href="#catalogo">Ver catalogo</a></div></div><div class="shoe-stage"><div class="shoe"></div></div></section><section id="catalogo" class="catalog"><div class="catalog-head"><div><p class="eyebrow">catalogo</p><h2>Tenis em destaque</h2></div><div class="filters"><button class="active" data-filter="Todos">Todos</button><button data-filter="Corrida">Corrida</button><button data-filter="Basquete">Basquete</button><button data-filter="Lifestyle">Lifestyle</button></div></div><div class="grid" id="grid"></div></section><aside class="cart"><strong>Carrinho</strong><span id="cartState">Nenhum item ainda</span></aside></main><script>
  const products=[['Aero Runner Pro','Corrida',589,'#67e8f9','Novo'],['Court Legacy High','Basquete',749,'#facc15','Drop'],['Street Pulse 90','Lifestyle',429,'#fb7185','Hot'],['Trail Carbon X','Outdoor',899,'#86efac','Pro']];let cart=[],filter='Todos';function money(v){return 'R$ '+v.toLocaleString('pt-BR')}function add(p){cart.push(p);document.getElementById('cartTop').textContent=cart.length+' itens - '+money(cart.reduce((s,i)=>s+i[2],0));document.getElementById('cartState').textContent=cart.slice(-2).map(i=>i[0]).join(' + ')}function render(){document.getElementById('grid').innerHTML=products.filter(p=>filter==='Todos'||p[1]===filter).map((p,i)=>'<article class="card"><span class="badge">'+p[4]+'</span><div class="mini-shoe" style="background:'+p[3]+'"></div><h3>'+p[0]+'</h3><p>'+p[1]+'</p><footer><strong>'+money(p[2])+'</strong><button data-add="'+i+'">Adicionar</button></footer></article>').join('');document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(products[Number(b.dataset.add)]))}document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()});document.getElementById('heroBuy').onclick=()=>add(products[0]);render();
  <\/script></body></html>`;
}

function snakeGameHtml(name: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,rgba(34,197,94,.24),transparent 30%),linear-gradient(135deg,#020617,#0f172a);color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui}.wrap{width:min(92vw,760px);display:grid;gap:18px}.top{display:flex;justify-content:space-between;align-items:end;gap:16px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#86efac;font-size:12px;font-weight:900}h1{margin:6px 0 0;font-size:clamp(38px,7vw,78px);line-height:.9}.score{border:1px solid rgba(134,239,172,.28);border-radius:18px;background:rgba(15,23,42,.72);padding:14px 18px;text-align:right}.score strong{display:block;color:#86efac;font-size:28px}.board{position:relative;aspect-ratio:1;border:1px solid rgba(134,239,172,.35);border-radius:26px;background:#07111f;box-shadow:0 30px 90px rgba(0,0,0,.42);overflow:hidden}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(134,239,172,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(134,239,172,.08) 1px,transparent 1px);background-size:5% 5%}.snake,.food{position:absolute;width:5%;height:5%;border-radius:10px}.snake{background:#86efac;box-shadow:0 0 20px rgba(134,239,172,.45)}.food{background:#fb7185;box-shadow:0 0 22px rgba(251,113,133,.6)}.controls{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;color:#cbd5e1}.btn{border:0;border-radius:999px;background:#86efac;color:#02130a;font-weight:900;padding:12px 16px;cursor:pointer}@media(max-width:700px){.top{display:block}.score{text-align:left}.board{border-radius:18px}}
  </style></head><body><main class="wrap" data-perfectagent-shell="snake"><div class="top"><div><p class="eyebrow">preview jogavel</p><h1>${escapeHtml(name)}</h1></div><div class="score"><span>Pontos</span><strong id="score">0</strong></div></div><section class="board" id="board"><div class="grid"></div></section><div class="controls"><span>Use as setas do teclado. O preview abre enquanto o builder gera os arquivos finais.</span><button class="btn" id="restart">Reiniciar</button></div></main><script>
  const board=document.getElementById('board'),scoreEl=document.getElementById('score');let snake,dir,food,score,timer;const size=20;function cell(x,y,cls){const el=document.createElement('div');el.className=cls;el.style.left=x*5+'%';el.style.top=y*5+'%';board.appendChild(el)}function placeFood(){food={x:Math.floor(Math.random()*size),y:Math.floor(Math.random()*size)}}function reset(){snake=[{x:8,y:10},{x:7,y:10},{x:6,y:10}];dir={x:1,y:0};score=0;placeFood();clearInterval(timer);timer=setInterval(tick,130);draw()}function draw(){board.querySelectorAll('.snake,.food').forEach(n=>n.remove());snake.forEach(p=>cell(p.x,p.y,'snake'));cell(food.x,food.y,'food');scoreEl.textContent=score}function tick(){const h={x:(snake[0].x+dir.x+size)%size,y:(snake[0].y+dir.y+size)%size};if(snake.some(p=>p.x===h.x&&p.y===h.y)){reset();return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;placeFood()}else snake.pop();draw()}addEventListener('keydown',e=>{if(e.key==='ArrowUp'&&dir.y!==1)dir={x:0,y:-1};if(e.key==='ArrowDown'&&dir.y!==-1)dir={x:0,y:1};if(e.key==='ArrowLeft'&&dir.x!==1)dir={x:-1,y:0};if(e.key==='ArrowRight'&&dir.x!==-1)dir={x:1,y:0}});document.getElementById('restart').onclick=reset;reset();
  <\/script></body></html>`;
}

function gamerCommunityLandingHtml(name: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(name)}</title>
  <style>
    :root{color-scheme:dark;--bg:#070812;--panel:#101326;--neon:#55f0ff;--pink:#ff3df2;--lime:#b8ff4d;--text:#f7fbff;--muted:#9aa6c7}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:var(--bg);color:var(--text)}.page{min-height:100vh;overflow:hidden;background:radial-gradient(circle at 18% 14%,rgba(85,240,255,.2),transparent 27%),radial-gradient(circle at 88% 12%,rgba(255,61,242,.18),transparent 30%),linear-gradient(145deg,#070812,#15152b 62%,#080814)}header{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:18px clamp(18px,5vw,72px);border-bottom:1px solid rgba(255,255,255,.08);background:rgba(7,8,18,.7);backdrop-filter:blur(18px)}.brand{font-weight:950;letter-spacing:.16em;text-transform:uppercase;color:var(--neon);text-shadow:0 0 22px rgba(85,240,255,.45)}nav{display:flex;gap:18px;color:var(--muted);font-size:13px;font-weight:800}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:42px;align-items:center;padding:clamp(48px,8vw,104px) clamp(18px,5vw,72px)}.eyebrow{text-transform:uppercase;letter-spacing:.2em;color:var(--lime);font-size:12px;font-weight:950}.hero h1{font-size:clamp(48px,9vw,112px);line-height:.9;margin:14px 0;max-width:900px}.hero h1 span{color:var(--pink);text-shadow:0 0 36px rgba(255,61,242,.45)}.hero p{max-width:650px;color:#cbd5f5;font-size:clamp(16px,2vw,20px);line-height:1.65}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.btn{border:1px solid rgba(85,240,255,.55);border-radius:999px;padding:14px 20px;background:linear-gradient(135deg,var(--neon),#8b5cf6);color:#050816;font-weight:950;text-decoration:none;box-shadow:0 16px 44px rgba(85,240,255,.18);cursor:pointer}.btn.secondary{background:transparent;color:var(--text);border-color:rgba(255,255,255,.2);box-shadow:none}.arena{min-height:480px;border:1px solid rgba(85,240,255,.22);border-radius:30px;background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));position:relative;overflow:hidden;box-shadow:0 42px 120px rgba(0,0,0,.38)}.arena:before{content:"";position:absolute;inset:10%;border:2px solid rgba(85,240,255,.2);transform:perspective(680px) rotateX(62deg) rotateZ(-8deg);box-shadow:0 0 60px rgba(85,240,255,.18)}.orb{position:absolute;width:150px;height:150px;border-radius:36px;background:linear-gradient(135deg,var(--pink),var(--neon));left:50%;top:45%;transform:translate(-50%,-50%) rotate(18deg);box-shadow:0 0 80px rgba(255,61,242,.4);animation:pulse 3s ease-in-out infinite}.hud{position:absolute;left:22px;right:22px;bottom:22px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.hud div,.card,.plan,.faq details{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(16,19,38,.82);padding:18px}.hud strong{display:block;color:var(--neon);font-size:22px}section{padding:34px clamp(18px,5vw,72px)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card h3,.plan h3{color:var(--neon);margin-top:0}.includes{display:grid;grid-template-columns:.8fr 1.2fr;gap:18px}.list{display:grid;gap:10px}.list span{display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:13px;background:rgba(255,255,255,.04)}.plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.plan.featured{border-color:rgba(255,61,242,.55);box-shadow:0 0 60px rgba(255,61,242,.16)}.price{font-size:36px;font-weight:950}.faq{display:grid;gap:10px}.faq summary{cursor:pointer;font-weight:900}.final{display:flex;justify-content:space-between;gap:20px;align-items:center;border:1px solid rgba(85,240,255,.22);border-radius:24px;background:linear-gradient(135deg,rgba(85,240,255,.12),rgba(255,61,242,.12));padding:28px}@keyframes pulse{50%{transform:translate(-50%,-56%) rotate(32deg) scale(1.06)}}@media(max-width:900px){nav{display:none}.hero,.includes{grid-template-columns:1fr}.grid,.plans{grid-template-columns:1fr}.arena{min-height:360px}.hud{grid-template-columns:1fr}.final{display:block}.final .btn{margin-top:16px;display:inline-flex}.hero h1{font-size:52px}}
  </style>
</head>
<body>
  <div class="page" data-perfectagent-shell="gamer-community">
    <header><div class="brand">${escapeHtml(name)}</div><nav><span>Beneficios</span><span>Incluso</span><span>Planos</span><span>FAQ</span></nav></header>
    <main>
      <section class="hero"><div><p class="eyebrow">comunidade gamer premium</p><h1>Suba de nível com uma <span>guilda privada</span>.</h1><p>Treinos, squads, eventos, calls táticas, drops exclusivos e networking para jogadores que querem evoluir com consistência.</p><div class="actions"><a class="btn" href="#planos">Entrar agora</a><a class="btn secondary" href="#beneficios">Ver benefícios</a></div></div><div class="arena"><div class="orb"></div><div class="hud"><div><strong>2.8k</strong>Membros</div><div><strong>40+</strong>Eventos/mês</div><div><strong>24/7</strong>Discord ativo</div></div></div></section>
      <section id="beneficios"><p class="eyebrow">beneficios</p><div class="grid"><article class="card"><h3>Squads por nível</h3><p>Encontre players compatíveis para ranqueadas, raids, campeonatos e sessões de treino.</p></article><article class="card"><h3>Conteúdo fechado</h3><p>Guias, VOD reviews, aulas ao vivo e checklists para acelerar sua evolução.</p></article><article class="card"><h3>Eventos com premiação</h3><p>Torneios internos, desafios semanais e recompensas para membros ativos.</p></article></div></section>
      <section class="includes"><p class="eyebrow">o que esta incluso</p><div class="list"><span>Canal Discord premium com moderação e matchmaking</span><span>Calendário de lives, scrims e torneios</span><span>Biblioteca de estratégias para FPS, MOBA e survival</span><span>Badges de ranking e trilhas de progresso</span></div></section>
      <section id="planos"><p class="eyebrow">planos</p><div class="plans"><article class="plan"><h3>Starter</h3><p class="price">R$29</p><p>Acesso à comunidade e eventos abertos.</p><button class="btn">Começar</button></article><article class="plan featured"><h3>Pro Guild</h3><p class="price">R$79</p><p>Mentorias, squads privados e desafios com premiação.</p><button class="btn">Mais popular</button></article><article class="plan"><h3>Elite</h3><p class="price">R$149</p><p>Coaching em grupo, VOD review e acesso vitalício a replays.</p><button class="btn">Virar elite</button></article></div></section>
      <section><p class="eyebrow">prova social</p><div class="grid"><blockquote class="card">“Achei squad fixo em uma semana e subi duas divisões.”<br><strong>- Rafa</strong></blockquote><blockquote class="card">“Os reviews mudaram minha tomada de decisão.”<br><strong>- Nika</strong></blockquote><blockquote class="card">“A comunidade é ativa de verdade, todo dia tem call.”<br><strong>- Leo</strong></blockquote></div></section>
      <section class="faq"><p class="eyebrow">faq</p><details open><summary>Serve para iniciantes?</summary><p>Sim. Os canais são segmentados por nível e objetivo.</p></details><details><summary>Como recebo acesso?</summary><p>Após o pagamento, o convite do Discord chega automaticamente por e-mail.</p></details><details><summary>Posso cancelar?</summary><p>Sim, o plano mensal pode ser cancelado quando quiser.</p></details></section>
      <section><div class="final"><div><p class="eyebrow">vagas da temporada</p><h2>Entre antes do próximo torneio interno.</h2></div><a class="btn" href="#planos">Garantir minha vaga</a></div></section>
    </main>
  </div>
</body>
</html>`;
}

function perfumeLandingHtml(name: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(name)}</title>
  <style>
    :root{color-scheme:dark;--gold:#d9b76a;--ink:#050506;--cream:#f7edd9;--muted:#b8aa92}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:#050506;color:var(--cream)}.page{min-height:100vh;background:radial-gradient(circle at 78% 10%,rgba(217,183,106,.24),transparent 34%),linear-gradient(145deg,#050506,#17130d 58%,#050506)}header{display:flex;justify-content:space-between;align-items:center;padding:22px clamp(18px,5vw,72px);position:sticky;top:0;background:rgba(5,5,6,.72);backdrop-filter:blur(18px);z-index:2}.brand{font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}nav{display:flex;gap:18px;color:var(--muted);font-size:13px}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;padding:clamp(42px,8vw,96px) clamp(18px,5vw,72px)}.eyebrow{color:var(--gold);text-transform:uppercase;letter-spacing:.22em;font-weight:800;font-size:12px}.hero h1{font-family:Georgia,serif;font-size:clamp(52px,10vw,128px);line-height:.88;margin:16px 0}.hero p{max-width:620px;color:#d7c9ae;font-size:clamp(16px,2vw,20px);line-height:1.7}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn{border:1px solid rgba(217,183,106,.5);border-radius:999px;padding:13px 20px;background:var(--gold);color:#110d08;font-weight:900;cursor:pointer}.btn.secondary{background:transparent;color:var(--cream)}.bottle{min-height:520px;border:1px solid rgba(217,183,106,.28);border-radius:28px;background:radial-gradient(circle at 50% 24%,rgba(255,241,205,.28),transparent 18%),linear-gradient(160deg,rgba(217,183,106,.18),rgba(255,255,255,.04));display:grid;place-items:center;box-shadow:0 40px 120px rgba(0,0,0,.45)}.flacon{width:160px;height:310px;border-radius:42px 42px 24px 24px;background:linear-gradient(90deg,rgba(255,255,255,.18),rgba(217,183,106,.5),rgba(0,0,0,.2));border:1px solid rgba(255,238,180,.5);position:relative;animation:float 4s ease-in-out infinite}.flacon:before{content:"";position:absolute;left:45px;right:45px;top:-58px;height:58px;border-radius:16px 16px 4px 4px;background:#d9b76a}.flacon:after{content:"NOIR";position:absolute;inset:auto 18px 82px;text-align:center;border:1px solid rgba(5,5,6,.5);padding:20px 8px;font-family:Georgia,serif;color:#100d08;background:rgba(247,237,217,.72)}section{padding:34px clamp(18px,5vw,72px)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card,.quote,.newsletter{border:1px solid rgba(217,183,106,.22);border-radius:18px;background:rgba(255,255,255,.055);padding:22px}.card h3,.quote strong{color:var(--gold)}.story{display:grid;grid-template-columns:.8fr 1.2fr;gap:18px;align-items:start}.newsletter{display:flex;justify-content:space-between;gap:16px;align-items:center}.newsletter input{min-width:240px;border:1px solid rgba(217,183,106,.34);border-radius:999px;background:#0c0b0a;color:var(--cream);padding:13px 16px}@keyframes float{50%{transform:translateY(-14px) rotate(1deg)}}@media(max-width:860px){nav{display:none}.hero,.story{grid-template-columns:1fr}.bottle{min-height:360px}.grid{grid-template-columns:1fr}.newsletter{display:block}.newsletter input{width:100%;margin:12px 0}.hero h1{font-size:58px}}
  </style>
</head>
<body>
  <div class="page" data-perfectagent-shell="perfume">
    <header><div class="brand">${escapeHtml(name)}</div><nav><span>Colecao</span><span>Historia</span><span>Reviews</span></nav></header>
    <main>
      <section class="hero"><div><p class="eyebrow">eau de parfum artesanal</p><h1>Luxo que permanece.</h1><p>Uma assinatura olfativa em portugues, com notas de oud, bergamota e baunilha negra para noites inesqueciveis.</p><div class="actions"><button class="btn" id="cartBtn">Adicionar ao carrinho</button><a class="btn secondary" href="#produtos">Ver notas</a></div><p id="cartState" aria-live="polite"></p></div><div class="bottle"><div class="flacon"></div></div></section>
      <section id="produtos"><div class="grid"><article class="card"><h3>Notas de topo</h3><p>Bergamota dourada, pimenta rosa e brilho citrico.</p></article><article class="card"><h3>Coracao</h3><p>Jasmim noturno, iris cremosa e acorde ambarado.</p></article><article class="card"><h3>Fundo</h3><p>Oud macio, baunilha negra e madeiras raras.</p></article></div></section>
      <section class="story"><p class="eyebrow">brand story</p><div><h2>Feito para vender desejo, nao ruido.</h2><p>Cada detalhe da pagina prioriza contraste, hierarquia e movimento suave para transformar curiosidade em compra.</p></div></section>
      <section><div class="grid"><blockquote class="quote"><strong>Marina</strong><p>Elegante, intenso e memoravel.</p></blockquote><blockquote class="quote"><strong>Caio</strong><p>O presente mais sofisticado do ano.</p></blockquote><blockquote class="quote"><strong>Lia</strong><p>A embalagem e a fragrancia parecem joias.</p></blockquote></div></section>
      <section><div class="newsletter"><div><p class="eyebrow">newsletter</p><h2>Receba lancamentos exclusivos.</h2></div><div><input placeholder="seu@email.com"><button class="btn">Quero acesso</button></div></div></section>
    </main>
  </div>
  <script>document.getElementById('cartBtn').addEventListener('click',function(){document.getElementById('cartState').textContent='Produto adicionado ao carrinho. Frete premium liberado.'})<\/script>
</body>
</html>`;
}

function dashboardHtml(name: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:#0a0f1e;color:#e5eefc}.app{min-height:100vh;display:grid;grid-template-columns:260px 1fr;background:linear-gradient(135deg,#0a0f1e,#12182b)}aside{border-right:1px solid #243049;padding:24px;background:#0d1324}.logo{font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc;margin-bottom:32px}.nav{display:grid;gap:8px}.nav button{border:0;border-radius:12px;background:transparent;color:#9fb0ce;text-align:left;padding:12px;font-weight:800}.nav button.active{background:#17223a;color:white}main{min-width:0;padding:22px}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:20px}.top h1{margin:0;font-size:28px}.filter,.table-tools button,.pager button{border:1px solid #2b3856;background:#10182b;color:#e5eefc;border-radius:12px;padding:10px 12px;font-weight:800}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{border:1px solid #263553;background:#111a2f;border-radius:16px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.18)}.card span{color:#8aa0c4;font-size:12px;font-weight:800;text-transform:uppercase}.card strong{display:block;margin-top:10px;font-size:30px}.charts{display:grid;grid-template-columns:1.4fr .9fr;gap:14px;margin-top:14px}.chart{height:270px;position:relative;overflow:hidden}.line{position:absolute;inset:44px 22px 48px;border-bottom:2px solid #2b3856;background:linear-gradient(135deg,transparent 48%,#38bdf8 49%,#38bdf8 51%,transparent 52%)}.bars{display:flex;align-items:end;gap:12px;height:180px;margin-top:22px}.bars i{flex:1;border-radius:10px 10px 0 0;background:linear-gradient(#a78bfa,#38bdf8)}.table-tools{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:14px;border:1px solid #263553;background:#111a2f;border-radius:16px;padding:14px}.table-tools div{display:flex;gap:8px;flex-wrap:wrap}table{width:100%;border-collapse:collapse;margin-top:14px;overflow:hidden;border-radius:16px;background:#111a2f}th,td{text-align:left;border-bottom:1px solid #25314c;padding:13px}th{color:#8aa0c4;font-size:12px;text-transform:uppercase}.badge{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900}.ok{background:#064e3b;color:#86efac}.warn{background:#713f12;color:#fde68a}.err{background:#7f1d1d;color:#fecaca}.pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px;color:#8aa0c4}@media(max-width:900px){.app{grid-template-columns:1fr}aside{position:sticky;top:0;z-index:2}.nav{grid-template-columns:repeat(4,1fr)}.kpis,.charts{grid-template-columns:1fr}.top,.table-tools{display:block}.table-tools div{margin-top:10px}}
  </style></head><body><div class="app" data-perfectagent-shell="dashboard"><aside><div class="logo">${escapeHtml(name)}</div><div class="nav"><button class="active">Overview</button><button>Revenue</button><button>Customers</button><button>Settings</button></div></aside><main><div class="top"><div><p style="margin:0;color:#8aa0c4;font-weight:800;text-transform:uppercase;font-size:12px">SaaS analytics</p><h1>Executive Dashboard</h1></div><select class="filter" id="dateFilter"><option>Last 30 days</option><option>Last quarter</option><option>This year</option></select></div><section class="kpis"><div class="card"><span>MRR</span><strong>$84.2k</strong><small>+18.4%</small></div><div class="card"><span>Users</span><strong>24,891</strong><small>+9.1%</small></div><div class="card"><span>Churn</span><strong>2.1%</strong><small>-0.8%</small></div><div class="card"><span>NPS</span><strong>64</strong><small>+7 pts</small></div></section><section class="charts"><div class="card chart"><span>Line chart</span><div class="line"></div></div><div class="card chart"><span>Bar chart</span><div class="bars"><i style="height:42%"></i><i style="height:68%"></i><i style="height:53%"></i><i style="height:88%"></i><i style="height:76%"></i></div></div></section><div class="table-tools"><strong>Accounts</strong><div><button id="sortName">Sort name</button><button id="sortArr">Sort ARR</button><button id="sortStatus">Sort status</button></div></div><table><thead><tr><th>Account</th><th>Plan</th><th>Status</th><th>ARR</th></tr></thead><tbody id="rows"></tbody></table><div class="pager"><button id="prevPage">Previous</button><span id="pageState">Page 1 of 2</span><button id="nextPage">Next</button></div></main></div><script>const rows=[['Northstar Labs','Enterprise','Healthy',42000],['Acme Cloud','Scale','Watch',18000],['Blue River','Pro','Active',9000],['Nova Retail','Starter','Risk',4000],['Atlas Ops','Scale','Healthy',27000],['Signal Works','Pro','Active',12000]];let sort='arr',page=0;const cls={Healthy:'ok',Active:'ok',Watch:'warn',Risk:'err'};function render(){const sorted=[...rows].sort((a,b)=>sort==='arr'?b[3]-a[3]:String(a[sort==='name'?0:2]).localeCompare(String(b[sort==='name'?0:2])));const max=Math.ceil(sorted.length/3)-1;page=Math.max(0,Math.min(max,page));document.getElementById('rows').innerHTML=sorted.slice(page*3,page*3+3).map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td><span class="badge '+cls[r[2]]+'">'+r[2]+'</span></td><td>$'+Math.round(r[3]/1000)+'k</td></tr>').join('');document.getElementById('pageState').textContent='Page '+(page+1)+' of '+(max+1)}document.getElementById('sortName').onclick=()=>{sort='name';render()};document.getElementById('sortArr').onclick=()=>{sort='arr';render()};document.getElementById('sortStatus').onclick=()=>{sort='status';render()};document.getElementById('prevPage').onclick=()=>{page--;render()};document.getElementById('nextPage').onclick=()=>{page++;render()};document.getElementById('dateFilter').addEventListener('change',function(){document.querySelector('h1').textContent='Executive Dashboard - '+this.value});render()<\/script></body></html>`;
}

function scene3dHtml(name: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
  html,body{height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui;background:#050816;color:#eef2ff;overflow:hidden}.scene{position:relative;min-height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(56,189,248,.26),transparent 28%),linear-gradient(145deg,#050816,#111827 58%,#020617)}canvas{position:absolute;inset:0;width:100%;height:100%}.overlay{position:fixed;left:22px;top:22px;right:22px;display:flex;justify-content:space-between;gap:16px;align-items:start;z-index:2}.panel{max-width:420px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(15,23,42,.62);backdrop-filter:blur(18px);padding:18px}.panel p{color:#b6c3da;line-height:1.6}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#67e8f9;font-size:12px;font-weight:900}h1{font-size:clamp(32px,6vw,72px);line-height:.95;margin:8px 0}button{border:1px solid rgba(103,232,249,.44);border-radius:999px;background:#67e8f9;color:#03111a;font-weight:900;padding:12px 16px;cursor:pointer}.hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);border-radius:999px;background:rgba(15,23,42,.72);padding:9px 13px;color:#cbd5e1;font-size:13px}@media(max-width:720px){.overlay{display:block}.panel{margin-bottom:12px}button{width:100%}.hint{width:max-content;max-width:calc(100% - 32px)}}
  </style></head><body><div class="scene" data-perfectagent-shell="3d"><canvas id="canvas"></canvas><div class="overlay"><div class="panel"><div class="eyebrow">interactive 3d fallback</div><h1>${escapeHtml(name)}</h1><p>A live canvas scene is available immediately while heavier 3D dependencies can continue loading.</p></div><button id="toggle">Pause rotation</button></div><div class="hint">Drag over the preview to shift the light direction</div></div><script>
  const canvas=document.getElementById('canvas');const ctx=canvas.getContext('2d');let w=0,h=0,t=0,paused=false,mouse={x:.5,y:.35};function size(){w=canvas.width=innerWidth*devicePixelRatio;h=canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px'}addEventListener('resize',size);size();document.getElementById('toggle').onclick=function(){paused=!paused;this.textContent=paused?'Play rotation':'Pause rotation'};addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth;mouse.y=e.clientY/innerHeight});function project(x,y,z){const s=360/(z+5);return [w/2+x*s*devicePixelRatio,h/2+y*s*devicePixelRatio,s]}const verts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces=[[0,1,2,3,'#38bdf8'],[4,5,6,7,'#a78bfa'],[0,1,5,4,'#22c55e'],[2,3,7,6,'#f59e0b'],[1,2,6,5,'#ec4899'],[0,3,7,4,'#14b8a6']];function draw(){if(!paused)t+=.012;ctx.clearRect(0,0,w,h);const g=ctx.createRadialGradient(w*mouse.x,h*mouse.y,20,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,'rgba(103,232,249,.22)');g.addColorStop(1,'rgba(2,6,23,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const cy=Math.cos(t),sy=Math.sin(t),cx=Math.cos(t*.7),sx=Math.sin(t*.7);const pts=verts.map(([x,y,z])=>{let nx=x*cy-z*sy,nz=x*sy+z*cy,ny=y*cx-nz*sx;nz=y*sx+nz*cx;return project(nx,ny,nz)});faces.map(f=>({f,z:f.slice(0,4).reduce((a,i)=>a+pts[i][2],0)})).sort((a,b)=>a.z-b.z).forEach(({f})=>{ctx.beginPath();f.slice(0,4).forEach((i,j)=>{const p=pts[i];j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.closePath();ctx.fillStyle=f[4];ctx.globalAlpha=.82;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=2*devicePixelRatio;ctx.stroke()});requestAnimationFrame(draw)}draw();
  <\/script></body></html>`;
}

function genericShellHtml(name: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:#0f172a;color:#f8fafc}.shell{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 30% 25%,rgba(56,189,248,.22),transparent 30%),linear-gradient(135deg,#020617,#1e293b)}section{max-width:760px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#7dd3fc;font-weight:900}h1{font-size:clamp(42px,8vw,88px);line-height:.95;margin:12px 0}p{color:#cbd5e1;font-size:18px;line-height:1.65}.btn{display:inline-flex;border-radius:999px;background:#f8fafc;color:#020617;padding:13px 18px;font-weight:900}</style></head><body><main class="shell" data-perfectagent-shell="generic"><section><div class="eyebrow">Preview booting</div><h1>${escapeHtml(name)}</h1><p>A runnable first preview is already open. Generated files will replace this shell as they arrive.</p><a class="btn">Continue</a></section></main></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
