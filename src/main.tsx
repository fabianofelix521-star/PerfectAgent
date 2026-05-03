import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getMorpheus } from "@/services/morpheus";
import { initializeNexusTools } from "@/tools";

// Boot the Morpheus Runtime: registra a Pantheon e liga o leiloeiro.
getMorpheus();

// Boot Nexus Tools: registra ToolRegistry e inicia jobs Chrono (background, non-blocking).
void initializeNexusTools({ startChrono: true, startFailurePredictor: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
