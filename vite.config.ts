import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const singleFileBuild = process.env.VITE_SINGLE_FILE === "true" || process.env.SINGLE_FILE_BUILD === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singleFileBuild ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@core": path.resolve(__dirname, "src/core"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@tools": path.resolve(__dirname, "src/tools"),
      "@runtimes": path.resolve(__dirname, "src/runtimes"),
    },
  },
  server: {
    headers: {
      // Required for WebContainer (SharedArrayBuffer / cross-origin isolation).
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["@webcontainer/api"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/@monaco-editor") || id.includes("node_modules/monaco-editor")) {
            return "vendor-editor";
          }
          if (/[\\/]node_modules[\\/](@webcontainer[\\/]api|@xterm|xterm)[\\/]/.test(id)) {
            return "vendor-runtime-shell";
          }
          if (/[\\/]node_modules[\\/](@xenova[\\/]transformers|chromadb|@huggingface[\\/]inference)[\\/]/.test(id)) {
            return "vendor-ml";
          }
          if (/[\\/]node_modules[\\/](@langchain|langchain|openai|@anthropic-ai|@google)[\\/]/.test(id)) {
            return "vendor-ai";
          }
          if (/[\\/]node_modules[\\/](pdfjs-dist|mammoth|xlsx|jszip|tesseract\.js)[\\/]/.test(id)) {
            return "vendor-viewers";
          }
          if (/[\\/]node_modules[\\/](react-markdown|remark-gfm|react-syntax-highlighter)[\\/]/.test(id)) {
            return "vendor-markdown";
          }
          if (/[\\/]node_modules[\\/](reactflow|dagre)[\\/]/.test(id)) {
            return "vendor-visualization";
          }
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) {
            return "vendor-charts";
          }
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) {
            return "vendor-motion";
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|react-router|@remix-run|zustand|scheduler|use-sync-external-store)[\\/]/.test(id)) {
            return "vendor-framework";
          }
          if (/[\\/]node_modules[\/]highlight\.js[\\/]/.test(id)) {
            return "vendor-highlight";
          }
          if (/[\\/]node_modules[\/]refractor[\\/]/.test(id)) {
            return "vendor-refractor";
          }
          if (/[\\/]node_modules[\/](xmldom|xmlbuilder)[\\/]/.test(id)) {
            return "vendor-xml";
          }
          if (/[\\/]node_modules[\/]lodash[\\/]/.test(id)) {
            return "vendor-lodash";
          }
          if (/[\\/]node_modules[\/]bluebird[\\/]/.test(id)) {
            return "vendor-bluebird";
          }
          return "vendor";
        },
      },
    },
  },
  esbuild: {
    drop: ["debugger"],
  },
});
