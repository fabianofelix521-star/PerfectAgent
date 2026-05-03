import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class CounterfactualSimulator extends BaseCapabilityModule {
  constructor() {
    super("mnemosyne:CounterfactualSimulator", "CounterfactualSimulator capability for MNEMOSYNE");
  }
}
