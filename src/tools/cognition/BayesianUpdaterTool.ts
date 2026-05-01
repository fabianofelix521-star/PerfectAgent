import {
  type ExecutionApproach,
  NexusToolBase,
  type NexusToolInput,
  type QualityAssessment,
} from "@/tools/core/NexusToolBase";
import { asNumber, clamp01 } from "@/tools/core/toolUtils";

export interface BayesianUpdateResult {
  prior: number;
  posterior: number;
  beliefChange: number;
  likelihoodRatio: number;
  evidenceWeight: number;
  isExtremeEvidence: boolean;
  warning: string | null;
  evpi: number;
  interpretation: string;
}

export class BayesianUpdaterTool extends NexusToolBase {
  id = "bayesian-updater";
  name = "Real-Time Bayesian Belief Updater";
  description =
    "Atualiza crenças probabilísticas com likelihood ratios, audita evidência extrema e calcula valor esperado de informação.";
  category = "cognition";

  protected async reason(input: NexusToolInput): Promise<ExecutionApproach> {
    const prior = asNumber(input.params.priorProbability, -1);
    const validPrior = prior > 0 && prior < 1;
    return {
      shouldProceed: validPrior,
      reason: validPrior ? "" : "priorProbability precisa estar entre 0 e 1",
      strategy: "sequential-bayes",
      reasoning: "Atualização odds-based preserva auditabilidade e evita confundir probabilidade com score.",
      alternativesConsidered: ["joint-probability", "log-odds-update"],
      estimatedQuality: validPrior ? 0.95 : 0,
      estimatedLatencyMs: 5,
    };
  }

  protected async executeCore(input: NexusToolInput): Promise<BayesianUpdateResult> {
    const priorProbability = clamp01(asNumber(input.params.priorProbability, 0.5));
    const lrPositive = Math.max(0.001, asNumber(input.params.likelihoodRatioPositive, 1));
    const lrNegative = Math.max(0.001, asNumber(input.params.likelihoodRatioNegative, 1));
    const evidencePresent = input.params.evidencePresent !== false;
    const lr = evidencePresent ? lrPositive : lrNegative;
    const priorOdds = priorProbability / (1 - priorProbability);
    const posteriorOdds = priorOdds * lr;
    const posteriorProbability = posteriorOdds / (1 + posteriorOdds);
    const evidenceStrength = Math.abs(Math.log(lr));
    const isExtremeEvidence = evidenceStrength > 4;
    return {
      prior: priorProbability,
      posterior: posteriorProbability,
      beliefChange: posteriorProbability - priorProbability,
      likelihoodRatio: lr,
      evidenceWeight: evidenceStrength,
      isExtremeEvidence,
      warning: isExtremeEvidence ? "Evidência extremamente forte; verificar fonte e calibração do LR." : null,
      evpi: this.calculateEVPI(priorProbability, posteriorProbability),
      interpretation: this.interpret(priorProbability, posteriorProbability),
    };
  }

  protected async evaluate(result: unknown): Promise<QualityAssessment> {
    const update = result as BayesianUpdateResult | null;
    return {
      score: update ? (update.isExtremeEvidence ? 0.68 : 0.95) : 0,
      confidence: update ? 0.94 : 0,
      limitations: update?.isExtremeEvidence ? ["LR extremo requer validação externa"] : [],
      improvements: update?.isExtremeEvidence ? ["coletar evidência independente antes de agir"] : [],
    };
  }

  private calculateEVPI(prior: number, posterior: number): number {
    const maxPrior = Math.max(prior, 1 - prior);
    const maxPosterior = Math.max(posterior, 1 - posterior);
    return Math.max(0, maxPosterior - maxPrior);
  }

  private interpret(prior: number, posterior: number): string {
    const change = Math.abs(posterior - prior);
    if (change < 0.05) return "Evidência fraca; crença pouco alterada.";
    if (change < 0.15) return "Evidência moderada; atualização significativa.";
    if (change < 0.3) return "Evidência forte; grande atualização.";
    return "Evidência muito forte; atualização dramática.";
  }
}
