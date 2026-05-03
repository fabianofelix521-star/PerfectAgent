import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class EmergenceMonitor extends BaseCapabilityModule {
  constructor() {
    super("mnemosyne:EmergenceMonitor", "EmergenceMonitor capability for MNEMOSYNE");
  }
}
