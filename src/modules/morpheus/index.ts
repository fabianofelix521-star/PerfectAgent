/**
 * Morpheus Runtime — public entrypoint.
 *
 * Quick start:
 *
 * ```ts
 * import { MorpheusRuntime, buildPowerfulAgents } from '@/modules/morpheus';
 *
 * const morpheus = new MorpheusRuntime(buildPowerfulAgents());
 * morpheus.start();
 *
 * const result = await morpheus.runTask(
 *   'Audit the OAuth callback for redirect-injection vulnerabilities',
 *   { tags: ['security', 'auth'], priority: 0.9 },
 * );
 * ```
 */

export { MorpheusRuntime } from "./MorpheusRuntime";
export { AuctioneerDaemon } from "./AuctioneerDaemon";
export { Agent } from "./Agent";
export { BiddingModule } from "./BiddingModule";
export { vectorize, cosineSimilarity, VECTOR_DIM } from "./vectorize";

export {
  POWERFUL_AGENT_DEFINITIONS,
  buildPowerfulAgents,
  ARCHITECT,
  CODE_SMITH,
  REASONER,
  RESEARCHER,
  CRITIC,
  REFACTORER,
  TEST_ENGINEER,
  SECURITY_AUDITOR,
  UX_DESIGNER,
  DATA_ANALYST,
  DEVOPS,
  DEBUGGER,
} from "./agents/powerful";

export type {
  AgentDefinition,
  AgentExecutor,
  AgentPerformance,
  Bid,
  RuntimeEvents,
  TaskMetadata,
  TaskResult,
  TaskStatus,
  TaskUnit,
  Vector,
} from "./types";

export type { RuntimeOptions, PostTaskOptions } from "./MorpheusRuntime";
export type { AuctioneerOptions } from "./AuctioneerDaemon";
export type { BiddingOptions } from "./BiddingModule";
