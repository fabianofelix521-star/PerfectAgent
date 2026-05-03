import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class CounterfactualSimulator extends BaseCapabilityModule {
  constructor() {
    super("panacea:CounterfactualSimulator", "CounterfactualSimulator capability for PANACEA");
  }
}
