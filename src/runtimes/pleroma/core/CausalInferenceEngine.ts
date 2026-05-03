import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class CausalInferenceEngine extends BaseCapabilityModule {
  constructor() {
    super("pleroma:CausalInferenceEngine", "CausalInferenceEngine capability for PLEROMA");
  }
}
