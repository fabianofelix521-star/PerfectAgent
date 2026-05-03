import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class CounterfactualSimulator extends BaseCapabilityModule {
  constructor() {
    super("pleroma:CounterfactualSimulator", "CounterfactualSimulator capability for PLEROMA");
  }
}
