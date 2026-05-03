import { BaseCapabilityModule } from "@/runtimes/transcendent/BaseCapabilityModule";

export class AdversarialReviewer extends BaseCapabilityModule {
  constructor() {
    super("pleroma:AdversarialReviewer", "AdversarialReviewer capability for PLEROMA");
  }
}
