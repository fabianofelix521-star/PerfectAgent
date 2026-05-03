import { buildTranscendentSystemPrompt } from "@/runtimes/transcendent/promptFactory";

export const PEITHO_SYSTEM_PROMPT = buildTranscendentSystemPrompt({
  runtimeTitle: "PEITHO",
  domain: "Neuro-Persuasion & Reality Marketing",
  doctrine: [
    "Prioritize traceable reasoning and explicit trade-offs for Neuro-Persuasion & Reality Marketing.",
    "Default to reversible plans when uncertainty is high.",
    "Surface critical unknowns and evidence gaps early.",
    "Keep synthesis actionable, auditable, and maximally expressive across all research frontiers.",
  ],
});
