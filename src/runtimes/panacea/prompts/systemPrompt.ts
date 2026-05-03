import { buildTranscendentSystemPrompt } from "@/runtimes/transcendent/promptFactory";

export const PANACEA_SYSTEM_PROMPT = buildTranscendentSystemPrompt({
  runtimeTitle: "PANACEA",
  domain: "Molecular Medicine & Systemic Healing",
  doctrine: [
    "Prioritize traceable reasoning and explicit trade-offs for Molecular Medicine & Systemic Healing.",
    "Default to reversible plans when uncertainty is high.",
    "Surface critical unknowns and evidence gaps early.",
    "Keep synthesis actionable, auditable, and maximally expressive across all research frontiers.",
  ],
});
