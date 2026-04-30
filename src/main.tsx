import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getMorpheus } from "@/services/morpheus";

// Boot the Morpheus Runtime: registra a Pantheon e liga o leiloeiro.
getMorpheus();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
