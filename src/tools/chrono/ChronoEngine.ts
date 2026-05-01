import { clamp01, mean } from "@/tools/core/toolUtils";

export type ChronoTriggerType =
  | "cron"
  | "interval"
  | "condition"
  | "event"
  | "cascade"
  | "adaptive"
  | "market-aware"
  | "cognitive";

export interface SystemHealthState {
  timestamp: number;
  activeJobs: number;
  stress: number;
  memoryPressure: number;
  avgRecentQuality: number;
}

export interface ChronoJobDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: ChronoTriggerType;
    cronExpression?: string;
    intervalMs?: number;
    condition?: () => Promise<boolean>;
    eventName?: string;
    parentJobId?: string;
  };
  execution: {
    priority: 1 | 2 | 3 | 4 | 5;
    timeoutMs: number;
    maxRetries: number;
    retryBackoffMs: number;
    allowConcurrent: boolean;
    preferredRuntime?: string;
    preferredAgent?: string;
  };
  learning: {
    enabled: boolean;
    adaptSchedule: boolean;
    adaptParameters: boolean;
    memoryWindowSize: number;
    qualityThreshold: number;
  };
  collaboration: {
    cascadeOnSuccess?: string[];
    cascadeOnFailure?: string[];
    shareDataWith?: string[];
    requiresDataFrom?: string[];
  };
  handler: ChronoJobHandler;
}

export interface ChronoJobContext {
  jobId: string;
  executionId: string;
  runNumber: number;
  previousRun?: ChronoExecution;
  executionHistory: ChronoExecution[];
  sharedData: Map<string, unknown>;
  systemState: SystemHealthState;
  triggerData?: unknown;
}

export interface ChronoExecution {
  executionId: string;
  jobId: string;
  startTime: number;
  endTime?: number;
  status: "running" | "success" | "failed" | "skipped" | "timeout";
  result?: unknown;
  error?: string;
  quality?: number;
  adaptationsTriggered?: string[];
  cascadesTriggered?: string[];
  insights?: string[];
}

export type ChronoJobHandler = (
  context: ChronoJobContext,
) => Promise<ChronoJobResult>;

export interface ChronoJobResult {
  success: boolean;
  data?: unknown;
  quality: number;
  insights: string[];
  scheduleAdjustment?: {
    newIntervalMs?: number;
    newCronExpression?: string;
    reason: string;
  };
  parameterAdjustments?: Record<string, unknown>;
  triggerCascades?: string[];
  priority?: number;
}

export interface FailurePrediction {
  jobId: string;
  failureProbability: number;
  reasons: string[];
  recommendations: string[];
}

export interface FailurePattern {
  type: string;
  description: string;
  recommendation: string;
  confidence: number;
}

export interface JobsDashboard {
  jobs: Array<{
    id: string;
    name: string;
    status: "running" | "idle";
    lastExecution?: ChronoExecution;
    metrics: ChronoJobMetrics;
    nextExecution?: number;
  }>;
  totalJobs: number;
  runningJobs: number;
  systemHealth: number;
}

export interface ChronoJobMetrics {
  totalRuns: number;
  successRate: number;
  avgLatencyMs: number;
  avgQuality: number;
  lastStatus?: ChronoExecution["status"];
}

type TimerHandle = ReturnType<typeof setTimeout>;

export class ChronoScheduler {
  private readonly jobs = new Map<string, ChronoJobDefinition>();
  private readonly executions = new Map<string, ChronoExecution[]>();
  private readonly runningJobs = new Set<string>();
  private readonly sharedData = new Map<string, unknown>();
  private readonly adaptiveSchedules = new Map<string, AdaptiveSchedule>();
  private readonly timers = new Map<string, TimerHandle>();

  register(job: ChronoJobDefinition, options: { schedule?: boolean } = {}): void {
    this.jobs.set(job.id, job);
    if (!this.executions.has(job.id)) this.executions.set(job.id, []);
    if (job.trigger.type === "adaptive" || job.learning.adaptSchedule) {
      this.adaptiveSchedules.set(job.id, new AdaptiveSchedule(job));
    }
    if (options.schedule ?? true) this.scheduleJob(job);
  }

  unregister(jobId: string): void {
    this.clearTimer(jobId);
    this.jobs.delete(jobId);
    this.executions.delete(jobId);
    this.runningJobs.delete(jobId);
    this.adaptiveSchedules.delete(jobId);
  }

  stop(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  emit(eventName: string, data?: unknown): void {
    for (const job of this.jobs.values()) {
      const eventMatches =
        job.trigger.type === "event" && job.trigger.eventName === eventName;
      const cognitiveMatches =
        job.trigger.type === "cognitive" &&
        eventName === `cognitive:trigger:${job.id}`;
      if (eventMatches || cognitiveMatches) void this.executeJob(job.id, data);
    }
  }

  async executeJob(
    jobId: string,
    triggerData?: unknown,
    attempt = 0,
  ): Promise<ChronoExecution> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} nao encontrado`);

    if (this.runningJobs.has(jobId) && !job.execution.allowConcurrent) {
      return this.createSkippedExecution(jobId, "Ja em execucao");
    }

    const systemState = this.getSystemState();
    if (!this.canExecuteGivenSystemState(job, systemState)) {
      return this.createSkippedExecution(jobId, "Sistema sob stress");
    }

    const executionId = `${jobId}-${Date.now()}-${attempt}`;
    const execution: ChronoExecution = {
      executionId,
      jobId,
      startTime: Date.now(),
      status: "running",
    };
    this.runningJobs.add(jobId);
    this.addExecution(jobId, execution);

    try {
      const history = this.executions.get(jobId) ?? [];
      const context: ChronoJobContext = {
        jobId,
        executionId,
        runNumber: history.length,
        previousRun: history[history.length - 2],
        executionHistory: history.slice(-job.learning.memoryWindowSize),
        sharedData: this.getSharedDataForJob(job),
        systemState,
        triggerData,
      };

      const result = await Promise.race([
        job.handler(context),
        this.createTimeout(job.execution.timeoutMs),
      ]);

      execution.status = result.success ? "success" : "failed";
      execution.result = result.data;
      execution.quality = clamp01(result.quality);
      execution.insights = result.insights;
      execution.endTime = Date.now();

      this.adaptiveSchedules.get(job.id)?.recordExecution(execution);
      await this.applyLearning(job, result, execution);
      this.shareJobData(job, result);
      this.triggerCascades(job, result, execution);
      return execution;
    } catch (error) {
      execution.status = error instanceof ChronoTimeoutError ? "timeout" : "failed";
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = Date.now();
      this.adaptiveSchedules.get(job.id)?.recordExecution(execution);

      if (attempt < job.execution.maxRetries) {
        this.scheduleRetry(job, triggerData, attempt + 1);
      } else {
        this.triggerFailureCascades(job, execution);
      }
      return execution;
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  async predictFailures(): Promise<FailurePrediction[]> {
    const predictions: FailurePrediction[] = [];
    for (const [jobId, executions] of this.executions) {
      const prediction = await ChronoPredictor.analyze(jobId, executions);
      if (prediction.failureProbability > 0.7) {
        predictions.push(prediction);
        this.applyPreventiveAdjustments(jobId, prediction);
      }
    }
    return predictions;
  }

  getJobsDashboard(): JobsDashboard {
    const jobs = [...this.jobs.values()].map((job) => ({
      id: job.id,
      name: job.name,
      status: this.runningJobs.has(job.id) ? ("running" as const) : ("idle" as const),
      lastExecution: this.executions.get(job.id)?.slice(-1)[0],
      metrics: this.calculateJobMetrics(job.id),
      nextExecution: this.getNextExecution(job.id),
    }));
    return {
      jobs,
      totalJobs: jobs.length,
      runningJobs: this.runningJobs.size,
      systemHealth: this.calculateSystemHealth(),
    };
  }

  private scheduleJob(job: ChronoJobDefinition): void {
    this.clearTimer(job.id);
    switch (job.trigger.type) {
      case "cron":
        this.scheduleCron(job);
        break;
      case "interval":
        this.scheduleInterval(job);
        break;
      case "condition":
        this.scheduleCondition(job);
        break;
      case "adaptive":
        this.scheduleAdaptive(job);
        break;
      case "market-aware":
        this.scheduleMarketAware(job);
        break;
      case "event":
      case "cognitive":
      case "cascade":
        break;
    }
  }

  private scheduleCron(job: ChronoJobDefinition): void {
    const parser = new ChronoCronParser(job.trigger.cronExpression ?? "*/5 * * * *");
    const delay = Math.max(0, parser.getNextExecution().getTime() - Date.now());
    this.timers.set(
      job.id,
      setTimeout(() => {
        void this.executeJob(job.id).finally(() => this.scheduleCron(job));
      }, delay),
    );
  }

  private scheduleInterval(job: ChronoJobDefinition): void {
    const interval = this.adaptiveSchedules.get(job.id)?.getCurrentInterval()
      ?? job.trigger.intervalMs
      ?? 60_000;
    this.timers.set(
      job.id,
      setTimeout(() => {
        void this.executeJob(job.id).finally(() => this.scheduleInterval(job));
      }, interval),
    );
  }

  private scheduleCondition(job: ChronoJobDefinition): void {
    const check = async (): Promise<void> => {
      if (await job.trigger.condition?.()) await this.executeJob(job.id);
      this.timers.set(job.id, setTimeout(() => void check(), this.calculateConditionCheckInterval(job.id)));
    };
    this.timers.set(job.id, setTimeout(() => void check(), 1000));
  }

  private scheduleAdaptive(job: ChronoJobDefinition): void {
    this.scheduleInterval(job);
  }

  private scheduleMarketAware(job: ChronoJobDefinition): void {
    const interval = this.calculateMarketAwareInterval(job);
    this.timers.set(
      job.id,
      setTimeout(() => {
        void this.executeJob(job.id, { trigger: "market-aware" }).finally(() => this.scheduleMarketAware(job));
      }, interval),
    );
  }

  private calculateMarketAwareInterval(job: ChronoJobDefinition): number {
    const base = this.adaptiveSchedules.get(job.id)?.getCurrentInterval()
      ?? job.trigger.intervalMs
      ?? 30_000;
    const recent = this.executions.get(job.id)?.slice(-5) ?? [];
    const highSignal = recent.some((execution) => (execution.quality ?? 0) > 0.8);
    return highSignal ? Math.max(2000, Math.floor(base * 0.5)) : base;
  }

  private calculateConditionCheckInterval(jobId: string): number {
    const history = this.executions.get(jobId) ?? [];
    if (!history.length) return 5000;
    const successRate = history.filter((execution) => execution.status === "success").length / history.length;
    return Math.round(5000 * (1 + (1 - successRate) * 10));
  }

  private async applyLearning(
    job: ChronoJobDefinition,
    result: ChronoJobResult,
    execution: ChronoExecution,
  ): Promise<void> {
    const adaptations: string[] = [];
    if (result.scheduleAdjustment && job.learning.adaptSchedule) {
      this.applyScheduleAdjustment(job, result.scheduleAdjustment);
      adaptations.push(result.scheduleAdjustment.reason);
    }
    if (result.parameterAdjustments && job.learning.adaptParameters) {
      this.sharedData.set(`parameters:${job.id}`, result.parameterAdjustments);
      adaptations.push("parametros ajustados");
    }
    if (adaptations.length) execution.adaptationsTriggered = adaptations;
  }

  private applyScheduleAdjustment(
    job: ChronoJobDefinition,
    adjustment: { newIntervalMs?: number; newCronExpression?: string; reason: string },
  ): void {
    const adaptive = this.adaptiveSchedules.get(job.id);
    if (adjustment.newIntervalMs) adaptive?.setInterval(adjustment.newIntervalMs);
    if (adjustment.newCronExpression) {
      this.sharedData.set(`cron:${job.id}`, adjustment.newCronExpression);
    }
  }

  private shareJobData(job: ChronoJobDefinition, result: ChronoJobResult): void {
    if (!result.data || !job.collaboration.shareDataWith) return;
    for (const targetJobId of job.collaboration.shareDataWith) {
      this.sharedData.set(`${job.id}:${targetJobId}`, result.data);
    }
  }

  private triggerCascades(
    job: ChronoJobDefinition,
    result: ChronoJobResult,
    execution: ChronoExecution,
  ): void {
    const configured = result.success ? job.collaboration.cascadeOnSuccess : job.collaboration.cascadeOnFailure;
    const cascades = [...new Set([...(configured ?? []), ...(result.triggerCascades ?? [])])];
    if (!cascades.length) return;
    execution.cascadesTriggered = cascades;
    for (const cascadeJobId of cascades) {
      if (!this.jobs.has(cascadeJobId)) continue;
      setTimeout(() => void this.executeJob(cascadeJobId, { parentJobId: job.id }), 100);
    }
  }

  private triggerFailureCascades(job: ChronoJobDefinition, execution: ChronoExecution): void {
    const cascades = job.collaboration.cascadeOnFailure ?? [];
    execution.cascadesTriggered = cascades;
    for (const cascadeJobId of cascades) {
      if (!this.jobs.has(cascadeJobId)) continue;
      setTimeout(() => void this.executeJob(cascadeJobId, { parentJobId: job.id }), 100);
    }
  }

  private scheduleRetry(job: ChronoJobDefinition, triggerData: unknown, attempt: number): void {
    const delay = job.execution.retryBackoffMs * Math.max(1, attempt);
    setTimeout(() => void this.executeJob(job.id, triggerData, attempt), delay);
  }

  private getSharedDataForJob(job: ChronoJobDefinition): Map<string, unknown> {
    const data = new Map<string, unknown>();
    const required = job.collaboration.requiresDataFrom ?? [];
    for (const [key, value] of this.sharedData) {
      const [source, target] = key.split(":");
      if (target === job.id || required.includes(source) || key === `parameters:${job.id}`) {
        data.set(key, value);
      }
    }
    return data;
  }

  private addExecution(jobId: string, execution: ChronoExecution): void {
    const executions = this.executions.get(jobId) ?? [];
    executions.push(execution);
    this.executions.set(jobId, executions.slice(-500));
  }

  private createSkippedExecution(jobId: string, reason: string): ChronoExecution {
    const execution: ChronoExecution = {
      executionId: `${jobId}-skipped-${Date.now()}`,
      jobId,
      startTime: Date.now(),
      endTime: Date.now(),
      status: "skipped",
      error: reason,
      quality: 0,
    };
    this.addExecution(jobId, execution);
    return execution;
  }

  private createTimeout(timeoutMs: number): Promise<ChronoJobResult> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new ChronoTimeoutError(`Timeout apos ${timeoutMs}ms`)), timeoutMs);
    });
  }

  private getSystemState(): SystemHealthState {
    const recent = [...this.executions.values()].flatMap((items) => items.slice(-5));
    const avgRecentQuality = mean(recent.map((execution) => execution.quality ?? 0.8));
    const failurePressure =
      recent.filter((execution) => execution.status === "failed" || execution.status === "timeout").length /
      Math.max(1, recent.length);
    const memoryPressure = clamp01(recent.length / 500);
    const stress = clamp01(this.runningJobs.size / 8 + failurePressure * 0.5 + memoryPressure * 0.2);
    return {
      timestamp: Date.now(),
      activeJobs: this.runningJobs.size,
      stress,
      memoryPressure,
      avgRecentQuality,
    };
  }

  private canExecuteGivenSystemState(
    job: ChronoJobDefinition,
    systemState: SystemHealthState,
  ): boolean {
    return systemState.stress < 0.85 || job.execution.priority <= 2;
  }

  private applyPreventiveAdjustments(jobId: string, prediction: FailurePrediction): void {
    const adaptive = this.adaptiveSchedules.get(jobId);
    if (!adaptive) return;
    const current = adaptive.getCurrentInterval();
    const next = Math.round(current * (1 + prediction.failureProbability * 0.5));
    adaptive.setInterval(next);
  }

  private calculateJobMetrics(jobId: string): ChronoJobMetrics {
    const executions = this.executions.get(jobId) ?? [];
    const completed = executions.filter((execution) => execution.status !== "running");
    const successes = completed.filter((execution) => execution.status === "success");
    const latencies = completed
      .filter((execution) => execution.endTime)
      .map((execution) => (execution.endTime ?? execution.startTime) - execution.startTime);
    return {
      totalRuns: completed.length,
      successRate: completed.length ? successes.length / completed.length : 1,
      avgLatencyMs: mean(latencies),
      avgQuality: mean(completed.map((execution) => execution.quality ?? 0)),
      lastStatus: completed.slice(-1)[0]?.status,
    };
  }

  private getNextExecution(jobId: string): number | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    if (job.trigger.type === "cron") {
      return new ChronoCronParser(job.trigger.cronExpression ?? "*/5 * * * *").getNextExecution().getTime();
    }
    if (["interval", "adaptive", "market-aware", "condition"].includes(job.trigger.type)) {
      return Date.now() + (this.adaptiveSchedules.get(jobId)?.getCurrentInterval() ?? job.trigger.intervalMs ?? 5000);
    }
    return undefined;
  }

  private calculateSystemHealth(): number {
    const metrics = [...this.jobs.keys()].map((jobId) => this.calculateJobMetrics(jobId));
    if (!metrics.length) return 1;
    return clamp01(mean(metrics.map((metric) => metric.successRate * 0.6 + metric.avgQuality * 0.4)));
  }

  private clearTimer(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) clearTimeout(timer);
    this.timers.delete(jobId);
  }
}

export class AdaptiveSchedule {
  private readonly successTimes: number[] = [];
  private readonly intervals: number[] = [];
  private currentInterval: number;

  constructor(job: ChronoJobDefinition) {
    this.currentInterval = job.trigger.intervalMs ?? 60_000;
  }

  getCurrentInterval(): number {
    return this.currentInterval;
  }

  setInterval(newInterval: number): void {
    this.currentInterval = Math.max(1000, Math.round(newInterval));
    this.intervals.push(this.currentInterval);
  }

  recordExecution(execution: ChronoExecution): void {
    if (execution.status === "success") this.successTimes.push(execution.startTime);
    if (execution.quality !== undefined && execution.quality < 0.5) {
      this.setInterval(this.currentInterval * 1.2);
    }
    if (this.successTimes.length > 300) this.successTimes.shift();
  }

  getBestExecutionTimes(): number[] {
    if (this.successTimes.length < 3) return [];
    const hourlySuccess = new Array<number>(24).fill(0);
    for (const time of this.successTimes) hourlySuccess[new Date(time).getHours()]++;
    return hourlySuccess
      .map((success, hour) => ({ hour, success }))
      .sort((left, right) => right.success - left.success)
      .slice(0, 3)
      .map((item) => item.hour);
  }
}

export class ChronoPredictor {
  static async analyze(
    jobId: string,
    executions: ChronoExecution[],
  ): Promise<FailurePrediction> {
    if (executions.length < 5) {
      return { jobId, failureProbability: 0, reasons: [], recommendations: [] };
    }
    const recent = executions.slice(-10);
    const failureRate =
      recent.filter((execution) => execution.status === "failed" || execution.status === "timeout").length /
      recent.length;
    const patterns = this.detectFailurePatterns(recent);
    const failureProbability = clamp01(
      failureRate + patterns.reduce((sum, pattern) => sum + pattern.confidence * 0.1, 0),
    );
    return {
      jobId,
      failureProbability,
      reasons: patterns.map((pattern) => pattern.description),
      recommendations: patterns.map((pattern) => pattern.recommendation),
    };
  }

  private static detectFailurePatterns(executions: ChronoExecution[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const failHours = executions
      .filter((execution) => execution.status === "failed" || execution.status === "timeout")
      .map((execution) => new Date(execution.startTime).getHours());
    if (failHours.length > 2) {
      const hour = this.mode(failHours);
      patterns.push({
        type: "time-based",
        description: `Falha frequente as ${hour}h`,
        recommendation: `Reduzir ou deslocar execucoes perto de ${hour}h`,
        confidence: 0.7,
      });
    }

    const consecutiveSuccesses = this.countConsecutiveSuccesses(executions);
    if (consecutiveSuccesses > 20) {
      patterns.push({
        type: "fatigue",
        description: `${consecutiveSuccesses} execucoes sem falha; verificar degradacao silenciosa`,
        recommendation: "Executar consolidacao preventiva de memoria e recursos",
        confidence: 0.5,
      });
    }

    const latencies = executions
      .filter((execution) => execution.endTime)
      .map((execution) => (execution.endTime ?? execution.startTime) - execution.startTime);
    if (this.isTrendIncreasing(latencies)) {
      patterns.push({
        type: "latency-growth",
        description: "Latencia crescendo progressivamente",
        recommendation: "Aumentar timeout ou reduzir escopo do proximo ciclo",
        confidence: 0.8,
      });
    }
    return patterns;
  }

  private static mode(values: number[]): number {
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 0;
  }

  private static countConsecutiveSuccesses(executions: ChronoExecution[]): number {
    let count = 0;
    for (let index = executions.length - 1; index >= 0; index--) {
      if (executions[index].status === "success") count++;
      else break;
    }
    return count;
  }

  private static isTrendIncreasing(values: number[]): boolean {
    if (values.length < 10) return false;
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    return mean(recent) > mean(older) * 1.3;
  }
}

export class ChronoEngine extends ChronoScheduler {}

class ChronoTimeoutError extends Error {}

class ChronoCronParser {
  private readonly parts: string[];

  constructor(expression: string) {
    this.parts = expression.trim().split(/\s+/);
  }

  getNextExecution(from = new Date()): Date {
    const start = new Date(from.getTime() + 60_000);
    start.setSeconds(0, 0);
    for (let minuteOffset = 0; minuteOffset < 60 * 24 * 8; minuteOffset++) {
      const candidate = new Date(start.getTime() + minuteOffset * 60_000);
      if (this.matches(candidate)) return candidate;
    }
    return new Date(from.getTime() + 300_000);
  }

  private matches(date: Date): boolean {
    const [minute = "*", hour = "*", day = "*", month = "*", weekday = "*"] = this.parts;
    return (
      this.partMatches(minute, date.getMinutes()) &&
      this.partMatches(hour, date.getHours()) &&
      this.partMatches(day, date.getDate()) &&
      this.partMatches(month, date.getMonth() + 1) &&
      this.partMatches(weekday, date.getDay())
    );
  }

  private partMatches(part: string, value: number): boolean {
    if (part === "*") return true;
    if (part.startsWith("*/")) {
      const step = Number(part.slice(2));
      return Number.isFinite(step) && step > 0 ? value % step === 0 : false;
    }
    if (part.includes(",")) {
      return part.split(",").some((piece) => this.partMatches(piece, value));
    }
    return Number(part) === value;
  }
}
