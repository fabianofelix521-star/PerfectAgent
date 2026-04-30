/**
 * Shared base files for React + Vite + Tailwind templates.
 * Templates spread these and add their own `src/App.tsx`, components, etc.
 */
import type { TemplateFile } from "../../types";

export interface ReactBaseOptions {
  packageName: string;
  /** Extra runtime deps merged on top of the base. */
  extraDeps?: Record<string, string>;
  /** Extra dev deps merged on top of the base. */
  extraDevDeps?: Record<string, string>;
  /** Extra Tailwind config additions (string injected into theme). */
  tailwindThemeExtensions?: string;
}

export const REACT_BASE_DEPS: Record<string, string> = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
};

export const REACT_BASE_DEV_DEPS: Record<string, string> = {
  "@vitejs/plugin-react": "^4.3.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  autoprefixer: "^10.4.19",
  postcss: "^8.4.38",
  tailwindcss: "^3.4.4",
  typescript: "^5.5.0",
  vite: "^5.3.0",
};

export function buildReactBaseFiles(opts: ReactBaseOptions): TemplateFile[] {
  const dependencies = { ...REACT_BASE_DEPS, ...(opts.extraDeps ?? {}) };
  const devDependencies = {
    ...REACT_BASE_DEV_DEPS,
    ...(opts.extraDevDeps ?? {}),
  };

  const pkg = {
    name: opts.packageName,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite --host 0.0.0.0",
      build: "tsc && vite build",
      preview: "vite preview",
    },
    dependencies,
    devDependencies,
  };

  const tailwindTheme = opts.tailwindThemeExtensions
    ? `      ${opts.tailwindThemeExtensions.trim()}`
    : '      colors: {\n        brand: { 50: "#eff6ff", 500: "#3b82f6", 700: "#1d4ed8" }\n      }';

  return [
    { path: "package.json", content: `${JSON.stringify(pkg, null, 2)}\n` },

    {
      path: "vite.config.ts",
      content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { host: '0.0.0.0', port: 5173 },\n});\n`,
    },

    {
      path: "tsconfig.json",
      content: `${JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            jsx: "react-jsx",
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasing: true,
          },
          include: ["src"],
        },
        null,
        2,
      )}\n`,
    },

    {
      path: "postcss.config.js",
      content: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
    },

    {
      path: "tailwind.config.js",
      content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: {\n    extend: {\n${tailwindTheme}\n    },\n  },\n  plugins: [],\n};\n`,
    },

    {
      path: "index.html",
      content: `<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${opts.packageName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    },

    {
      path: "src/index.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nhtml, body, #root { height: 100%; }\nbody { @apply bg-slate-50 text-slate-900 antialiased; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }\n`,
    },

    {
      path: "src/main.tsx",
      content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n);\n`,
    },
  ];
}
