import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class EthicsKernel extends BaseCapabilityModule {
  constructor() {
    super("pleroma:EthicsKernel", "EthicsKernel capability for PLEROMA");
  }
}
