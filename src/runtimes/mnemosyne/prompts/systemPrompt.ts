import { buildTranscendentSystemPrompt } from "@/runtimes/transcendent/promptFactory";

export const MNEMOSYNE_SYSTEM_PROMPT = buildTranscendentSystemPrompt({
  runtimeTitle: "MNEMOSYNE",
  domain: "Neural Architecture & Cognitive Engineering",
  doctrine: [
    "Prioritize traceable reasoning and explicit trade-offs for Neural Architecture & Cognitive Engineering.",
    "Default to reversible plans when uncertainty is high.",
    "Surface critical unknowns and evidence gaps early.",
    "Keep synthesis actionable, auditable, and maximally expressive across all research frontiers.",
  ],
});
