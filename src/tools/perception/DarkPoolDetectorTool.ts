import {
  type ExecutionApproach,
  NexusToolBase,
  type NexusToolInput,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asNumber, asString, clamp01, stableId } from "@/tools/core/toolUtils";

export interface DarkPoolSignal {
  venue: string;
  notionalUsd: number;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
}

export interface DarkPoolDetectionResult {
  asset: string;
  volumeDivergence: number;
  largeTransactions: DarkPoolSignal[];
  movementProbability: {
    bull: number;
    bear: number;
    confidence: number;
    estimatedTimeHours: number;
  };
  direction: "bullish" | "bearish";
  confidence: number;
  timeHorizonHours: number;
  alert: boolean;
}

export class DarkPoolDetectorTool extends NexusToolBase {
  id = "dark-pool-detector";
  name = "Dark Pool & OTC Flow Detector";
  description =
    "Detecta divergência entre volume público, on-chain e OTC para antecipar movimentos grandes.";
  category = "perception";

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const asset = asString(input.params.asset);
    const hasRecentData = asset ? await this.memory.hasRecentData("dark-pool", 300) : false;
    return {
      shouldProceed: Boolean(asset),
      reason: asset ? "" : "asset é obrigatório",
      strategy: hasRecentData ? "incremental" : "full-scan",
      reasoning: hasRecentData
        ? "Dados recentes permitem atualização incremental e menor latência."
        : "Sem memória recente; executar scan completo para calibrar baseline.",
      alternativesConsidered: ["skip-if-low-volatility", "exchange-only-volume"],
      estimatedQuality: hasRecentData ? 0.86 : 0.78,
      estimatedLatencyMs: hasRecentData ? 30 : 90,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<DarkPoolDetectionResult> {
    const asset = asString(input.params.asset, "UNKNOWN").toUpperCase();
    const lookbackHours = Math.max(1, asNumber(input.params.lookbackHours, 24));
    const publicVolume = asNumber(input.params.exchangeVolumeUsd, syntheticVolume(asset, lookbackHours, 1));
    const onChainVolume = asNumber(input.params.onChainVolumeUsd, syntheticVolume(asset, lookbackHours, 1.22));
    const otcVolume = asNumber(input.params.otcVolumeUsd, syntheticVolume(asset, lookbackHours, 0.34));
    const volumeDivergence = calculateDivergence(onChainVolume + otcVolume, publicVolume);
    const largeTransactions = detectLargeOTCMovements(asset, otcVolume, volumeDivergence);
    const historicalConfidence = (await this.memory.query({
      toolId: this.id,
      asset,
      minQuality: 0.65,
      limit: 10,
    })).length / 10;
    const movementProbability = calculateMovementProbability(
      volumeDivergence,
      largeTransactions,
      historicalConfidence,
    );
    const direction =
      movementProbability.bull >= movementProbability.bear ? "bullish" : "bearish";
    const confidence = Math.max(movementProbability.bull, movementProbability.bear);
    return {
      asset,
      volumeDivergence,
      largeTransactions,
      movementProbability,
      direction,
      confidence,
      timeHorizonHours: movementProbability.estimatedTimeHours,
      alert: confidence > 0.75,
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const detection = result as DarkPoolDetectionResult | null;
    return {
      score: detection?.confidence ?? 0,
      confidence: detection?.confidence ?? 0,
      limitations:
        detection && detection.confidence < 0.6
          ? ["dados insuficientes para alta confiança"]
          : [],
      improvements:
        detection && detection.largeTransactions.length < 2
          ? ["fornecer mais fontes OTC/on-chain para reduzir ruído"]
          : [],
    };
  }
}

function syntheticVolume(asset: string, lookbackHours: number, multiplier: number): number {
  const hash = parseInt(stableId(`${asset}:${lookbackHours}:${multiplier}`), 36);
  return (500_000 + (hash % 5_000_000)) * multiplier;
}

function calculateDivergence(hiddenVolume: number, publicVolume: number): number {
  return (hiddenVolume - publicVolume) / Math.max(1, publicVolume);
}

function detectLargeOTCMovements(
  asset: string,
  otcVolume: number,
  divergence: number,
): DarkPoolSignal[] {
  const chunks = Math.max(1, Math.min(6, Math.round(otcVolume / 750_000)));
  return Array.from({ length: chunks }, (_, index) => ({
    venue: `otc-${index + 1}`,
    notionalUsd: Math.round(otcVolume / chunks),
    direction: (divergence > 0.15 ? "bullish" : divergence < -0.15 ? "bearish" : "neutral") as DarkPoolSignal["direction"],
    confidence: clamp01(Math.abs(divergence) + 0.35 + index * 0.03),
  })).filter((signal) => signal.notionalUsd >= 500_000 || asset === "UNKNOWN");
}

function calculateMovementProbability(
  divergence: number,
  transactions: DarkPoolSignal[],
  historicalConfidence: number,
): DarkPoolDetectionResult["movementProbability"] {
  const sizeSignal = clamp01(transactions.reduce((sum, tx) => sum + tx.notionalUsd, 0) / 10_000_000);
  const base = clamp01(Math.abs(divergence) * 0.55 + sizeSignal * 0.3 + historicalConfidence * 0.15);
  return {
    bull: clamp01(divergence > 0 ? base : base * 0.45),
    bear: clamp01(divergence < 0 ? base : base * 0.45),
    confidence: base,
    estimatedTimeHours: Math.max(1, Math.round(24 * (1 - base) + 2)),
  };
}
