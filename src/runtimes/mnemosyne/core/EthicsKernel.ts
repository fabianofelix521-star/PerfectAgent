import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class EthicsKernel extends BaseCapabilityModule {
  constructor() {
    super("mnemosyne:EthicsKernel", "EthicsKernel capability for MNEMOSYNE");
  }
}
