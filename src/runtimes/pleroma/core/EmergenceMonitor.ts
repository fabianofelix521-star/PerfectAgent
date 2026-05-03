import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class EmergenceMonitor extends BaseCapabilityModule {
  constructor() {
    super("pleroma:EmergenceMonitor", "EmergenceMonitor capability for PLEROMA");
  }
}
