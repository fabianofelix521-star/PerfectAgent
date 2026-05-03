import { eventBus } from "@/services/eventBus";

export interface RuntimeEventPayload {
  runtimeId: string;
  type:
    | "agent.lifecycle"
    | "runtime.health"
    | "runtime.process"
    | "runtime.resonance";
  correlationId: string;
  at: number;
  data: Record<string, unknown>;
}

export class RuntimeEventBus {
  static emit(payload: RuntimeEventPayload): void {
    eventBus.emit("verifyReady", {
      runtimeEventType: payload.type,
      runtimeId: payload.runtimeId,
      correlationId: payload.correlationId,
      at: payload.at,
      ...payload.data,
    });
  }
}
