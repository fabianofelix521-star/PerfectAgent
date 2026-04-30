/**
 * Singleton boot for the Morpheus Runtime.
 *
 * Initialises the auctioneer and registers the full Pantheon of powerful
 * agents at app start. Also exposes the runtime on `window.__morpheus` so
 * it can be poked from DevTools.
 */

import { MorpheusRuntime, buildPowerfulAgents } from "@/modules/morpheus";
import type { AgentDefinition, TaskResult, TaskUnit } from "@/modules/morpheus";

let instance: MorpheusRuntime | null = null;

type MorpheusDebugWindow = Window & {
  __morpheus?: MorpheusRuntime;
};

export function getMorpheus(): MorpheusRuntime {
  if (!instance) {
    instance = new MorpheusRuntime(buildPowerfulAgents(), {
      tickMs: 100,
      fastTrackScore: 0.95,
    });
    instance.start();
    if (typeof window !== "undefined") {
      (window as MorpheusDebugWindow).__morpheus = instance;
    }
  }
  return instance;
}

/** Stop and dispose (used in tests / HMR teardown). */
export function disposeMorpheus(): void {
  instance?.stop();
  instance = null;
}

export type { AgentDefinition, TaskResult, TaskUnit };
