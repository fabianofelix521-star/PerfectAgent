import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class CounterfactualSimulator extends BaseCapabilityModule {
  constructor() {
    super("akasha:CounterfactualSimulator", "CounterfactualSimulator capability for AKASHA");
  }
}
