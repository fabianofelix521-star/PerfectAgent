import {
  clamp01,
  keywordScore,
  now,
  PersistentCognitiveMemory,
  qualityFromSignals,
  stableId,
  uniqueMerge,
} from "@/runtimes/shared/cognitiveCore";

export type EvidenceType = "symptom" | "sign" | "lab" | "imaging" | "history" | "genetic";
export type UrgencyLevel = "routine" | "soon" | "urgent" | "emergent";

export interface Evidence {
  type: EvidenceType;
  finding: string;
  value?: number;
  unit?: string;
  likelihood_ratio_positive: number;
  likelihood_ratio_negative: number;
  present: boolean;
}

export interface MedicalHypothesis {
  condition: string;
  icdCode: string;
  priorProbability: number;
  posteriorProbability: number;
  supportingEvidence: Evidence[];
  contradictingEvidence: Evidence[];
  missingEvidence: string[];
  agentId: string;
  confidence: number;
}

export interface ClinicalCase {
  demographics: {
    age: number;
    sex: "M" | "F" | "other";
    ethnicity?: string;
    bmi?: number;
  };
  chiefComplaint: string;
  history: string;
  symptoms: string[];
  signs: Record<string, unknown>;
  labs: Record<string, number>;
  imaging?: string[];
  medications: string[];
  allergies: string[];
  familyHistory?: string[];
  socialHistory?: string;
}

export interface EvidenceRequest {
  id: string;
  agentId: string;
  hypothesis: string;
  requestedFinding: string;
  rationale: string;
  expectedImpact: number;
}

export interface DebateArgument {
  speakerAgentId: string;
  targetCondition: string;
  argument: string;
  evidenceWeight: number;
  concession?: string;
}

export interface TreatmentPlan {
  immediateActions: string[];
  diagnosticNextSteps: string[];
  therapeuticOptions: string[];
  safetyNet: string[];
}

export interface DiagnosticReport {
  differentialDiagnosis: MedicalHypothesis[];
  primaryDiagnosis?: MedicalHypothesis;
  treatmentPlan: TreatmentPlan;
  missingInformation: string[];
  urgencyLevel: UrgencyLevel;
  debate: DebateArgument[];
  quality: ReturnType<typeof qualityFromSignals>;
  disclaimer: string;
}

export interface ApolloMemoryState {
  priorAdjustments: Record<string, number>;
  resolvedCases: Array<{ at: number; primary: string; confidence: number }>;
}

export interface ApolloAgent {
  id: string;
  specialty: string;
  formHypotheses(clinicalCase: ClinicalCase): Promise<MedicalHypothesis[]>;
  updateWithEvidence(
    hypotheses: MedicalHypothesis[],
    newEvidence: Evidence,
  ): MedicalHypothesis[];
  requestEvidence(hypothesis: MedicalHypothesis): Promise<EvidenceRequest[]>;
  debate(
    myHypothesis: MedicalHypothesis,
    opponentHypothesis: MedicalHypothesis,
  ): Promise<DebateArgument>;
}

export class BayesianDiagnosticEngine {
  updateProbability(prior: number, evidence: Evidence): number {
    const safePrior = Math.min(0.999, Math.max(0.001, prior));
    const lr = evidence.present
      ? evidence.likelihood_ratio_positive
      : evidence.likelihood_ratio_negative;
    const priorOdds = safePrior / (1 - safePrior);
    const posteriorOdds = priorOdds * Math.max(0.01, lr);
    return posteriorOdds / (1 + posteriorOdds);
  }

  rankHypotheses(hypotheses: MedicalHypothesis[]): MedicalHypothesis[] {
    return [...hypotheses].sort((a, b) => b.posteriorProbability - a.posteriorProbability);
  }
}

abstract class BaseApolloAgent implements ApolloAgent {
  protected readonly bayes = new BayesianDiagnosticEngine();

  constructor(
    public readonly id: string,
    public readonly specialty: string,
    private readonly hypothesisTemplates: Array<{
      condition: string;
      icdCode: string;
      prior: number;
      keywords: string[];
      missing: string[];
    }>,
  ) {}

  async formHypotheses(clinicalCase: ClinicalCase): Promise<MedicalHypothesis[]> {
    const text = caseText(clinicalCase);
    return this.hypothesisTemplates
      .map((template) => {
        const match = keywordScore(text, template.keywords);
        const evidence = this.extractEvidence(clinicalCase, template.keywords);
        const posterior = evidence.reduce(
          (probability, item) => this.bayes.updateProbability(probability, item),
          clamp01(template.prior + match * 0.22),
        );
        return {
          condition: template.condition,
          icdCode: template.icdCode,
          priorProbability: template.prior,
          posteriorProbability: posterior,
          supportingEvidence: evidence.filter((item) => item.present),
          contradictingEvidence: evidence.filter((item) => !item.present),
          missingEvidence: template.missing,
          agentId: this.id,
          confidence: clamp01(posterior * 0.8 + evidence.length / 20),
        };
      })
      .filter((hypothesis) => hypothesis.posteriorProbability > 0.025);
  }

  updateWithEvidence(
    hypotheses: MedicalHypothesis[],
    newEvidence: Evidence,
  ): MedicalHypothesis[] {
    return hypotheses.map((hypothesis) => {
      const posteriorProbability = this.bayes.updateProbability(
        hypothesis.posteriorProbability,
        newEvidence,
      );
      return {
        ...hypothesis,
        posteriorProbability,
        supportingEvidence: newEvidence.present
          ? uniqueMerge(hypothesis.supportingEvidence, [newEvidence], 12)
          : hypothesis.supportingEvidence,
        contradictingEvidence: newEvidence.present
          ? hypothesis.contradictingEvidence
          : uniqueMerge(hypothesis.contradictingEvidence, [newEvidence], 12),
        confidence: clamp01(posteriorProbability * 0.82 + hypothesis.supportingEvidence.length / 14),
      };
    });
  }

  async requestEvidence(hypothesis: MedicalHypothesis): Promise<EvidenceRequest[]> {
    return hypothesis.missingEvidence.slice(0, 3).map((finding) => ({
      id: stableId(`${this.id}:${hypothesis.condition}:${finding}`),
      agentId: this.id,
      hypothesis: hypothesis.condition,
      requestedFinding: finding,
      rationale: `${this.specialty} precisa confirmar/refutar ${hypothesis.condition}`,
      expectedImpact: clamp01(hypothesis.posteriorProbability + 0.2),
    }));
  }

  async debate(
    myHypothesis: MedicalHypothesis,
    opponentHypothesis: MedicalHypothesis,
  ): Promise<DebateArgument> {
    const evidenceWeight =
      myHypothesis.supportingEvidence.length /
      Math.max(1, myHypothesis.supportingEvidence.length + opponentHypothesis.supportingEvidence.length);
    return {
      speakerAgentId: this.id,
      targetCondition: myHypothesis.condition,
      argument: `${this.specialty}: ${myHypothesis.condition} tem posterior ${(
        myHypothesis.posteriorProbability * 100
      ).toFixed(1)}% contra ${opponentHypothesis.condition}; peso por evidencias=${evidenceWeight.toFixed(2)}.`,
      evidenceWeight: clamp01(evidenceWeight),
      concession:
        opponentHypothesis.posteriorProbability > myHypothesis.posteriorProbability * 0.8
          ? `hipotese concorrente ${opponentHypothesis.condition} permanece plausivel`
          : undefined,
    };
  }

  private extractEvidence(clinicalCase: ClinicalCase, keywords: string[]): Evidence[] {
    const symptomEvidence = clinicalCase.symptoms.map((symptom) => ({
      type: "symptom" as const,
      finding: symptom,
      likelihood_ratio_positive: 1.2 + keywordScore(symptom, keywords) * 3,
      likelihood_ratio_negative: 0.75,
      present: true,
    }));
    const historyEvidence: Evidence = {
      type: "history",
      finding: clinicalCase.history,
      likelihood_ratio_positive: 1.1 + keywordScore(clinicalCase.history, keywords) * 2.5,
      likelihood_ratio_negative: 0.85,
      present: keywordScore(clinicalCase.history, keywords) > 0,
    };
    const labEvidence = Object.entries(clinicalCase.labs).map(([name, value]) => ({
      type: "lab" as const,
      finding: name,
      value,
      likelihood_ratio_positive: 1.15 + keywordScore(name, keywords) * 2,
      likelihood_ratio_negative: 0.8,
      present: Math.abs(value) > 0,
    }));
    return [...symptomEvidence, historyEvidence, ...labEvidence].filter(
      (item) => item.present || keywordScore(item.finding, keywords) > 0.15,
    );
  }
}

export class InternistAgent extends BaseApolloAgent {
  constructor() {
    super("internist", "internal-medicine", [
      {
        condition: "Systemic inflammatory or metabolic syndrome",
        icdCode: "R69",
        prior: 0.08,
        keywords: ["fever", "fatigue", "weight", "metabolic", "inflammation", "dor", "febre"],
        missing: ["vital signs", "CBC with differential", "CMP", "CRP/ESR"],
      },
    ]);
  }
}

export class CardioVascularAgent extends BaseApolloAgent {
  constructor() {
    super("cardiovascular", "cardiology", [
      {
        condition: "Acute coronary syndrome or myocardial injury",
        icdCode: "I24.9",
        prior: 0.04,
        keywords: ["chest", "dor toracica", "troponin", "dyspnea", "ecg", "syncope"],
        missing: ["ECG", "troponin trend", "BNP", "echocardiogram"],
      },
    ]);
  }
}

export class NeurologyAgent extends BaseApolloAgent {
  constructor() {
    super("neurology", "neurology", [
      {
        condition: "Focal neurologic process",
        icdCode: "G98.8",
        prior: 0.035,
        keywords: ["weakness", "seizure", "headache", "confusion", "avc", "convulsao", "deficit"],
        missing: ["focused neurologic exam", "MRI/CT", "glucose", "EEG if seizure suspected"],
      },
    ]);
  }
}

export class InfectiologyAgent extends BaseApolloAgent {
  constructor() {
    super("infectiology", "infectious-disease", [
      {
        condition: "Infectious syndrome requiring source identification",
        icdCode: "B99.9",
        prior: 0.09,
        keywords: ["fever", "cough", "travel", "culture", "immunosuppression", "febre", "tosse"],
        missing: ["cultures", "exposure history", "CXR/CT by symptom", "local resistance pattern"],
      },
    ]);
  }
}

export class OncologyAgent extends BaseApolloAgent {
  constructor() {
    super("oncology", "oncology", [
      {
        condition: "Neoplastic or paraneoplastic process",
        icdCode: "C80.1",
        prior: 0.025,
        keywords: ["weight loss", "night sweats", "mass", "cancer", "tumor", "perda peso"],
        missing: ["age-appropriate cancer screening", "imaging", "biopsy if lesion", "tumor markers when indicated"],
      },
    ]);
  }
}

export class PharmacogenomicsAgent extends BaseApolloAgent {
  constructor() {
    super("pharmacogenomics", "pharmacogenomics", [
      {
        condition: "Medication response or adverse effect risk",
        icdCode: "T88.7",
        prior: 0.06,
        keywords: ["medication", "side effect", "cyp", "dose", "rash", "efeito", "remedio"],
        missing: ["medication timeline", "CYP2D6/CYP2C19 where relevant", "renal/hepatic function"],
      },
    ]);
  }
}

export class DrugDiscoveryAgent extends BaseApolloAgent {
  constructor() {
    super("drug-discovery", "drug-discovery", [
      {
        condition: "Targetable molecular pathway hypothesis",
        icdCode: "Z13.79",
        prior: 0.015,
        keywords: ["genetic", "mutation", "pathway", "target", "biomarker", "mutacao"],
        missing: ["molecular testing", "target expression", "known pathway inhibitors", "trial eligibility"],
      },
    ]);
  }
}

export class ApolloRuntime {
  private readonly agents: Map<string, ApolloAgent>;
  private readonly bayesEngine = new BayesianDiagnosticEngine();
  private readonly memory = new PersistentCognitiveMemory<ApolloMemoryState>(
    "runtime:apollo:medical-swarm",
    () => ({ priorAdjustments: {}, resolvedCases: [] }),
  );

  constructor(agents: ApolloAgent[] = defaultApolloAgents()) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
  }

  async diagnose(clinicalCase: ClinicalCase): Promise<DiagnosticReport> {
    const allHypotheses = (
      await Promise.all([...this.agents.values()].map((agent) => agent.formHypotheses(clinicalCase)))
    ).flat();
    const evidenceRequests = await this.collectEvidenceRequests(allHypotheses);
    const gatheredEvidence = this.gatherEvidence(evidenceRequests, clinicalCase);
    const updatedHypotheses = this.updateAllHypotheses(allHypotheses, gatheredEvidence);
    const consensusHypotheses = await this.grandRoundDebate(updatedHypotheses);
    const debate = await this.buildDebate(consensusHypotheses);
    const treatmentPlan = this.generateTreatmentPlan(consensusHypotheses, clinicalCase);
    const report: DiagnosticReport = {
      differentialDiagnosis: consensusHypotheses,
      primaryDiagnosis: consensusHypotheses[0],
      treatmentPlan,
      missingInformation: this.identifyMissingInfo(consensusHypotheses),
      urgencyLevel: this.assessUrgency(consensusHypotheses, clinicalCase),
      debate,
      quality: qualityFromSignals({
        evidenceCount: consensusHypotheses.reduce((sum, item) => sum + item.supportingEvidence.length, 0),
        contradictionCount: consensusHypotheses.reduce((sum, item) => sum + item.contradictingEvidence.length, 0),
        confidence: consensusHypotheses[0]?.confidence ?? 0,
        uncertaintyCount: this.identifyMissingInfo(consensusHypotheses).length,
      }),
      disclaimer: "Uso educacional. Requer avaliação médica presencial.",
    };
    this.learnFromReport(report);
    return report;
  }

  private async collectEvidenceRequests(
    hypotheses: MedicalHypothesis[],
  ): Promise<EvidenceRequest[]> {
    const requests = await Promise.all(
      hypotheses.flatMap((hypothesis) =>
        [...this.agents.values()]
          .filter((agent) => agent.id === hypothesis.agentId)
          .map((agent) => agent.requestEvidence(hypothesis)),
      ),
    );
    return requests.flat().sort((a, b) => b.expectedImpact - a.expectedImpact).slice(0, 12);
  }

  private gatherEvidence(requests: EvidenceRequest[], clinicalCase: ClinicalCase): Evidence[] {
    const text = caseText(clinicalCase);
    return requests.map((request) => {
      const present = keywordScore(text, request.requestedFinding.split(/\s+/)) > 0.12;
      return {
        type: inferEvidenceType(request.requestedFinding),
        finding: request.requestedFinding,
        likelihood_ratio_positive: 1.4 + request.expectedImpact * 2.2,
        likelihood_ratio_negative: 0.55,
        present,
      };
    });
  }

  private updateAllHypotheses(
    hypotheses: MedicalHypothesis[],
    evidence: Evidence[],
  ): MedicalHypothesis[] {
    return evidence.reduce(
      (current, item) =>
        current.map((hypothesis) => ({
          ...hypothesis,
          posteriorProbability: this.bayesEngine.updateProbability(
            hypothesis.posteriorProbability,
            item,
          ),
          supportingEvidence: item.present
            ? uniqueMerge(hypothesis.supportingEvidence, [item], 12)
            : hypothesis.supportingEvidence,
          contradictingEvidence: item.present
            ? hypothesis.contradictingEvidence
            : uniqueMerge(hypothesis.contradictingEvidence, [item], 12),
        })),
      hypotheses,
    );
  }

  private async grandRoundDebate(
    hypotheses: MedicalHypothesis[],
  ): Promise<MedicalHypothesis[]> {
    const ranked = this.bayesEngine.rankHypotheses(hypotheses);
    const topProbability = ranked[0]?.posteriorProbability ?? 0;
    return ranked
      .map((hypothesis) => ({
        ...hypothesis,
        confidence: clamp01(
          hypothesis.posteriorProbability * 0.75 +
            (hypothesis.posteriorProbability / Math.max(0.01, topProbability)) * 0.2 +
            hypothesis.supportingEvidence.length / 40,
        ),
      }))
      .slice(0, 8);
  }

  private async buildDebate(hypotheses: MedicalHypothesis[]): Promise<DebateArgument[]> {
    const top = hypotheses[0];
    const second = hypotheses[1] ?? top;
    if (!top) return [];
    const agents = [...this.agents.values()].filter((agent) =>
      hypotheses.some((hypothesis) => hypothesis.agentId === agent.id),
    );
    return Promise.all(agents.map((agent) => agent.debate(top, second)));
  }

  private generateTreatmentPlan(
    hypotheses: MedicalHypothesis[],
    clinicalCase: ClinicalCase,
  ): TreatmentPlan {
    const primary = hypotheses[0];
    const redFlags = hasRedFlags(clinicalCase);
    return {
      immediateActions: redFlags
        ? ["avaliar sinais vitais imediatamente", "encaminhar para serviço de urgência se instável"]
        : ["confirmar historia, exame fisico e sinais vitais antes de qualquer decisao"],
      diagnosticNextSteps: uniqueMerge(
        primary?.missingEvidence ?? [],
        hypotheses.flatMap((hypothesis) => hypothesis.missingEvidence).slice(0, 8),
        8,
      ),
      therapeuticOptions: primary
        ? [
            `conduta guiada por avaliacao presencial para ${primary.condition}`,
            "evitar tratamento definitivo sem confirmar diagnostico e contraindicações",
          ]
        : ["dados insuficientes para propor terapêutica"],
      safetyNet: [
        "piora rapida, dor toracica, dispneia, deficit neurologico ou confusao exigem urgencia",
        "validar alergias, gestacao, comorbidades e interacoes medicamentosas",
      ],
    };
  }

  private identifyMissingInfo(hypotheses: MedicalHypothesis[]): string[] {
    return uniqueMerge([], hypotheses.flatMap((hypothesis) => hypothesis.missingEvidence), 12);
  }

  private assessUrgency(hypotheses: MedicalHypothesis[], clinicalCase: ClinicalCase): UrgencyLevel {
    if (hasRedFlags(clinicalCase)) return "emergent";
    const primary = hypotheses[0];
    if (!primary) return "routine";
    if (primary.posteriorProbability > 0.55 || primary.condition.includes("Acute")) return "urgent";
    if (primary.posteriorProbability > 0.25) return "soon";
    return "routine";
  }

  private learnFromReport(report: DiagnosticReport): void {
    const primary = report.primaryDiagnosis;
    if (!primary) return;
    const previous = this.memory.load();
    this.memory.save({
      ...previous,
      updatedAt: now(),
      state: {
        priorAdjustments: {
          ...previous.state.priorAdjustments,
          [primary.condition]: clamp01(primary.posteriorProbability * 0.15),
        },
        resolvedCases: [
          { at: now(), primary: primary.condition, confidence: primary.confidence },
          ...previous.state.resolvedCases,
        ].slice(0, 100),
      },
    });
    this.memory.recordQuality(report.quality);
  }
}

export function defaultApolloAgents(): ApolloAgent[] {
  return [
    new InternistAgent(),
    new CardioVascularAgent(),
    new NeurologyAgent(),
    new InfectiologyAgent(),
    new OncologyAgent(),
    new PharmacogenomicsAgent(),
    new DrugDiscoveryAgent(),
  ];
}

export function clinicalCaseFromText(text: string): ClinicalCase {
  return {
    demographics: { age: /\bchild|crianca\b/i.test(text) ? 8 : 45, sex: "other" },
    chiefComplaint: text.slice(0, 120),
    history: text,
    symptoms: text
      .split(/[,.]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 8),
    signs: {},
    labs: {},
    imaging: [],
    medications: [],
    allergies: [],
  };
}

function caseText(clinicalCase: ClinicalCase): string {
  return [
    clinicalCase.chiefComplaint,
    clinicalCase.history,
    clinicalCase.symptoms.join(" "),
    Object.keys(clinicalCase.signs).join(" "),
    Object.keys(clinicalCase.labs).join(" "),
    clinicalCase.imaging?.join(" "),
    clinicalCase.medications.join(" "),
    clinicalCase.familyHistory?.join(" "),
    clinicalCase.socialHistory,
  ]
    .filter(Boolean)
    .join(" ");
}

function inferEvidenceType(finding: string): EvidenceType {
  if (/ecg|mri|ct|xray|imaging|ultrasound|eco/i.test(finding)) return "imaging";
  if (/cbc|cmp|troponin|crp|esr|lab|glucose|bnp/i.test(finding)) return "lab";
  if (/genetic|cyp|mutation|molecular/i.test(finding)) return "genetic";
  if (/history|exposure|timeline/i.test(finding)) return "history";
  return "sign";
}

function hasRedFlags(clinicalCase: ClinicalCase): boolean {
  const text = caseText(clinicalCase).toLowerCase();
  return /chest pain|dor toracica|shortness of breath|dispneia|stroke|avc|syncope|desmaio|confusion|confusao|sepsis|sepse/.test(
    text,
  );
}
