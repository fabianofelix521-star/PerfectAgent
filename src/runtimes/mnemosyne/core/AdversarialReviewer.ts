import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class AdversarialReviewer extends BaseCapabilityModule {
  constructor() {
    super("mnemosyne:AdversarialReviewer", "AdversarialReviewer capability for MNEMOSYNE");
  }
}
