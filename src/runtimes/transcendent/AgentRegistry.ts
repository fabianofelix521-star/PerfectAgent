import type { AgentCapabilityDeclaration } from "@/runtimes/transcendent/interfaces";

const registry = new Map<string, AgentCapabilityDeclaration>();

export class AgentRegistry {
  static register(agent: AgentCapabilityDeclaration): void {
    registry.set(agent.id, agent);
  }

  static all(): AgentCapabilityDeclaration[] {
    return Array.from(registry.values());
  }

  static byRuntimePrefix(prefix: string): AgentCapabilityDeclaration[] {
    return this.all().filter((agent) => agent.id.startsWith(prefix));
  }
}
