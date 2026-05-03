const insightStore = new Map<string, string[]>();

export class ResonanceProtocolBus {
  static publish(runtimeId: string, insights: string[]): void {
    const prior = insightStore.get(runtimeId) ?? [];
    const merged = Array.from(new Set([...prior, ...insights])).slice(-80);
    insightStore.set(runtimeId, merged);
  }

  static read(runtimeId: string): string[] {
    return insightStore.get(runtimeId) ?? [];
  }

  static crossRuntime(currentRuntimeId: string): string[] {
    const shared: string[] = [];
    for (const [runtimeId, insights] of insightStore.entries()) {
      if (runtimeId === currentRuntimeId) continue;
      shared.push(...insights.slice(-3));
    }
    return shared.slice(-20);
  }
}
