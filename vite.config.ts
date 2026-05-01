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
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/@monaco-editor") || id.includes("node_modules/monaco-editor")) {
            return "vendor-editor";
          }
          if (/[\\/]node_modules[\\/](@langchain|langchain|openai|@anthropic-ai|@google)[\\/]/.test(id)) {
            return "vendor-ai";
          }
          if (/[\\/]node_modules[\\/](pdfjs-dist|mammoth|xlsx|jszip|tesseract.js)[\\/]/.test(id)) {
            return "vendor-viewers";
          }
          if (/[\\/]node_modules[\\/](reactflow|recharts|dagre)[\\/]/.test(id)) {
            return "vendor-visualization";
          }
          return "vendor";
        },
      },
    },
  },
});
