import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const CORE_MODULES = [
  "SuperpositionalReasoner",
  "RecursiveSelfImprover",
  "CounterfactualSimulator",
  "HyperdimensionalMemory",
  "TemporalAbstraction",
  "DreamModeEngine",
  "MultiAgentDebateProtocol",
  "CausalInferenceEngine",
  "MetacognitiveCalibrator",
  "MultimodalFusion",
  "EmergenceMonitor",
  "PredictiveWorldModel",
  "AdversarialReviewer",
  "EthicsKernel",
  "ResonanceProtocol",
];

const RUNTIMES = [
  {
    slug: "vortex-omega",
    className: "VortexOmegaRuntime",
    runtimeId: "vortex-omega",
    displayName: "Vortex Omega Runtime",
    domain: "Omni-Channel Marketing Apex & Viral Genesis",
    promptConst: "VORTEX_OMEGA_SYSTEM_PROMPT",
    toolPackName: "VortexOmegaToolPack",
    seedsName: "VortexOmegaMemorySeeds",
    patternsName: "VortexOmegaDreamPatterns",
    agents: [
      "CulturalTrendProphetic", "ViralCoefficientArchmage", "TikTokAlgorithmExploiter", "InstagramReelsScientist", "XTwitterAlgorithmHunter", "YouTubeLongFormStrategist", "LinkedInB2BPersuader", "PaidMediaArchmage", "CreativeTestingFactory", "InfluencerEcosystemOrchestrator", "CommunityCultivatorArchmage", "EmailMarketingAutomationGod", "SEOTopicalAuthorityArchitect", "ContentGenerationFactory", "CopywritingTranscendent", "FunnelArchitectGrandmaster", "ConversionRateOptimizationScientist", "BrandMythologyArchitect", "CulturalMomentHijacker", "MultiTouchAttributionScientist", "CustomerLifetimeValueOracle", "GrowthLoopEngineer", "CrossCulturalLocalizationMaster", "PerformanceMarketingMercenary", "PredictiveMarketingAI",
    ],
    toolPrefix: "vortex-omega:tool",
  },
  {
    slug: "hephaestus-prime",
    className: "HephaestusPrimeRuntime",
    runtimeId: "hephaestus-prime",
    displayName: "Hephaestus Prime Runtime",
    domain: "Hyperscale Software Engineering & Code Genesis",
    promptConst: "HEPHAESTUS_PRIME_SYSTEM_PROMPT",
    toolPackName: "HephaestusPrimeToolPack",
    seedsName: "HephaestusPrimeMemorySeeds",
    patternsName: "HephaestusPrimeDreamPatterns",
    agents: [
      "FullStackOmniscient", "SystemDesignArchmage", "DatabaseEngineeringWizard", "CloudInfrastructureArchitect", "DevOpsAutomationDeity", "KubernetesGrandmaster", "CodeGenerationFactory", "RefactoringSurgeon", "DebuggingClairvoyant", "PerformanceOptimizationGod", "SecurityHardeningArchmage", "TestEngineeringMaster", "APIDesignVirtuoso", "FrontendArchitectArchmage", "MobileEngineeringMaster", "GameEngineEngineer", "EmbeddedSystemsArchmage", "BlockchainSmartContractWizard", "MachineLearningEngineering", "DataEngineeringMaster", "LegacyModernizationSurgeon", "DocumentationLivingArchitect", "CodeReviewSentinel", "CompilerLanguageArchmage", "IntentToProductionTransmuter",
    ],
    toolPrefix: "hephaestus-prime:tool",
  },
  {
    slug: "chronos-realm",
    className: "ChronosRealmRuntime",
    runtimeId: "chronos-realm",
    displayName: "Chronos Realm Runtime",
    domain: "Photoreal Game Universes & Living Worlds",
    promptConst: "CHRONOS_REALM_SYSTEM_PROMPT",
    toolPackName: "ChronosRealmToolPack",
    seedsName: "ChronosRealmMemorySeeds",
    patternsName: "ChronosRealmDreamPatterns",
    agents: [
      "SpectralPathTracingDeity", "NaniteVirtualizedGeometry", "MaterialPBRMolecular", "AtmosphericVolumetricMaster", "FluidDynamicsArchmage", "DestructionDynamicsGod", "ClothBodyDynamicsMaster", "CognitiveNPCSoulSmith", "DialogueGenerationSentient", "EmergentNarrativeDirector", "ProceduralWorldGenesis", "EcosystemFoodWebSimulator", "AnimationVitalityMaster", "WavePhysicsAudioGod", "MultiplayerNetcodeArchmage", "VRARMixedRealityNative", "PlayerExperienceArchitect", "GameEconomyDesigner", "MultiplayerSocialDynamics", "ContentGenerationOmni", "OptimizationGPUSorcerer", "WorldPersistenceArchmage", "GameAIBehaviorArchitect", "CinematicDirectorAI",
    ],
    toolPrefix: "chronos-realm:tool",
  },
  {
    slug: "gaia-sophia",
    className: "GaiaSophiaRuntime",
    runtimeId: "gaia-sophia",
    displayName: "Gaia Sophia Runtime",
    domain: "Natural Medicine, Phytotherapy & Botanical Pharmacology",
    promptConst: "GAIA_SOPHIA_SYSTEM_PROMPT",
    toolPackName: "GaiaSophiaToolPack",
    seedsName: "GaiaSophiaMemorySeeds",
    patternsName: "GaiaSophiaDreamPatterns",
    agents: [
      "PhytochemistryArchmage", "MechanismOfActionMolecular", "TraditionalChineseMedicineMaster", "AyurvedicArchmage", "AmazonianPlantMedicine", "MicrotherapyMushroomMaster", "AromatherapyClinical", "HomeopathyResearch", "FloweEssenceTherapy", "OrthomolecularMegadose", "MineralTherapyArchmage", "HerbalFormulationArchmage", "SpagyricAlchemyMaster", "ApitherapyMaster", "HydrotherapyTraditional", "TraditionalIndigenousMedicine", "HildegardMonasticMedicine", "TibetanMedicineSecrets", "FunctionalMedicineIntegration", "HerbalMedicineSafetyAdvanced", "EnergyHealingFramework", "TraditionalDietaryTherapy", "HerbalismFieldcraft", "NaturalMedicineResearchSynthesizer", "IntegrativeProtocolDesigner",
    ],
    toolPrefix: "gaia-sophia:tool",
  },
  {
    slug: "midas-infinity",
    className: "MidasInfinityRuntime",
    runtimeId: "midas-infinity",
    displayName: "Midas Infinity Runtime",
    domain: "Universal Trading Across TradFi and Derivatives",
    promptConst: "MIDAS_INFINITY_SYSTEM_PROMPT",
    toolPackName: "MidasInfinityToolPack",
    seedsName: "MidasInfinityMemorySeeds",
    patternsName: "MidasInfinityDreamPatterns",
    agents: [
      "EquityFundamentalAnalyst", "TechnicalAnalysisInstitutional", "MacroEconomicStrategist", "ForexTradingArchmage", "OptionsVolatilityWizard", "FuturesTradingMaster", "CommoditiesSpecialist", "FixedIncomeRatesArchmage", "QuantitativeStrategist", "HighFrequencyMicrostructure", "EventDrivenTrader", "VolatilityTrader", "CryptoToTradFiBridge", "GlobalMacroPortfolio", "RiskManagementInstitutional", "PortfolioConstructionScientist", "BacktestingForwardTesting", "AlgorithmicExecution", "SectorRotationStrategist", "EarningsCalendarTrader", "SentimentAlternativeData", "TaxOptimizationStrategist", "TradingPsychologySovereign", "LiquidityAnalysis", "MarketRegimeDetector",
    ],
    toolPrefix: "midas-infinity:tool",
  },
  {
    slug: "promethean-forge",
    className: "PrometheanForgeRuntime",
    runtimeId: "promethean-forge",
    displayName: "Promethean Forge Runtime",
    domain: "AI ML Research, Model Genesis & Architecture Engineering",
    promptConst: "PROMETHEAN_FORGE_SYSTEM_PROMPT",
    toolPackName: "PrometheanForgeToolPack",
    seedsName: "PrometheanForgeMemorySeeds",
    patternsName: "PrometheanForgeDreamPatterns",
    agents: [
      "TransformerArchitectureSavant", "TrainingInfrastructureGod", "RLHFConstitutionalAI", "DataCurationArchmage", "TokenizationVocabularyArchitect", "PretrainingScalingLaws", "FineTuningSpecialist", "MultimodalFusionMaster", "LongContextEngineer", "InferenceOptimizationGod", "MechanisticInterpretability", "CapabilityEvaluation", "AgentArchitectureResearcher", "DiffusionGenerativeArchitect", "ReinforcementLearningResearcher", "AIAlignmentResearcher", "NeuroScienceInspiredAI", "FederatedLearning", "GraphNeuralNetworkArchitect", "TimeSeriesForecasting", "AIResearchPaperAnalyst", "ASIPathwayResearcher",
    ],
    toolPrefix: "promethean-forge:tool",
  },
  {
    slug: "helios-genesis",
    className: "HeliosGenesisRuntime",
    runtimeId: "helios-genesis",
    displayName: "Helios Genesis Runtime",
    domain: "Biotechnology, Genetic Engineering & Synthetic Biology",
    promptConst: "HELIOS_GENESIS_SYSTEM_PROMPT",
    toolPackName: "HeliosGenesisToolPack",
    seedsName: "HeliosGenesisMemorySeeds",
    patternsName: "HeliosGenesisDreamPatterns",
    agents: [
      "CRISPRDesignArchmage", "ProteinEngineeringSavant", "SyntheticBiologyDesigner", "mRNATherapeutics", "GeneTherapyVectorEngineer", "CellTherapyArchmage", "BioinformaticsMaster", "DrugDiscoveryComputational", "StructuralBiology", "ImmunologyEngineering", "StemCellRegeneration", "MicrobiomeEngineering", "AgriculturalBiotech", "IndustrialBiotech", "PrecisionMedicine", "GenomicMedicine", "LongevityBiotech", "CancerBiology", "NeuroscienceBiotech", "BioethicsResponsibleInnovation", "FrontierBiotechResearch", "TranslationalMedicine",
    ],
    toolPrefix: "helios-genesis:tool",
  },
  {
    slug: "atlas-immortalis",
    className: "AtlasImmortalisRuntime",
    runtimeId: "atlas-immortalis",
    displayName: "Atlas Immortalis Runtime",
    domain: "Longevity, Anti-Aging & Human Performance Optimization",
    promptConst: "ATLAS_IMMORTALIS_SYSTEM_PROMPT",
    toolPackName: "AtlasImmortalisToolPack",
    seedsName: "AtlasImmortalisMemorySeeds",
    patternsName: "AtlasImmortalisDreamPatterns",
    agents: [
      "HallmarksOfAgingArchmage", "EpigeneticReversal", "HormonalOptimizationDeity", "MitochondrialOptimization", "SleepOptimizationGod", "CircadianBiologyMaster", "NutritionPersonalization", "FastingProtocolArchmage", "MovementMedicine", "StrengthHypertrophyArchmage", "CardiovascularConditioning", "BodyCompositionOptimization", "StressResilienceArchitect", "CognitiveOptimization", "EmotionalIntelligence", "BiomarkerTrackingObsessive", "SupplementProtocolGrandmaster", "DetoxificationOptimization", "GutHealthOptimization", "SkinAestheticOptimization", "SpiritualLongevity", "PersonalizedProtocolSynthesizer",
    ],
    toolPrefix: "atlas-immortalis:tool",
  },
  {
    slug: "oraculum-aeternum",
    className: "OraculumAeternumRuntime",
    runtimeId: "oraculum-aeternum",
    displayName: "Oraculum Aeternum Runtime",
    domain: "Geopolitical Intelligence, Macro Strategy & Civilizational Forecasting",
    promptConst: "ORACULUM_AETERNUM_SYSTEM_PROMPT",
    toolPackName: "OraculumAeternumToolPack",
    seedsName: "OraculumAeternumMemorySeeds",
    patternsName: "OraculumAeternumDreamPatterns",
    agents: [
      "GreatPowerCompetition", "IntelligenceAnalysisOmniscient", "MilitaryStrategyArchmage", "EnergyGeopolitics", "TechnologyGeopolitics", "CurrencyReserveDynamics", "DemographicForecasting", "EconomicWarfareSpecialist", "CyberWarfareIntelligence", "CivilizationalCycleAnalyst", "BlackSwanTailRisk", "GlobalSupplyChain", "SpaceGeopolitics", "GlobalElitesNetwork", "PoliticalRiskAnalyst", "HistoricalPatternMatcher", "MediaInformationLandscape", "GlobalEnvironmentalGeopolitics", "ReligionIdeologyDynamics", "ScenarioPlanningArchmage", "GeopoliticalAlphaGeneration", "GrandStrategyArchitect",
    ],
    toolPrefix: "oraculum-aeternum:tool",
  },
  {
    slug: "museion-transcendent",
    className: "MuseionTranscendentRuntime",
    runtimeId: "museion-transcendent",
    displayName: "Museion Transcendent Runtime",
    domain: "Creative Arts Across Music Visual Cinema and Literature",
    promptConst: "MUSEION_TRANSCENDENT_SYSTEM_PROMPT",
    toolPackName: "MuseionTranscendentToolPack",
    seedsName: "MuseionTranscendentMemorySeeds",
    patternsName: "MuseionTranscendentDreamPatterns",
    agents: [
      "MusicCompositionArchmage", "OrchestralComposition", "ElectronicMusicProducer", "JazzImprovisation", "WorldMusicMaster", "VisualArtPainterArchmage", "IllustrationDesign", "GraphicDesignArchmage", "CinematographyDirector", "ScreenwritingArchmage", "LiteraryFiction", "PoetryArchmage", "EssayistThinker", "PlaywrightTheater", "ChoreographyDance", "ArchitectureDesign", "GameNarrative", "PerformanceArt", "TransmediaStorytelling", "ArtCriticismScholar", "CreativeProcessFacilitator", "GenAIArtFusion",
    ],
    toolPrefix: "museion-transcendent:tool",
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}

function slugToPascal(slug) {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

for (const rt of RUNTIMES) {
  const base = path.join(root, "src", "runtimes", rt.slug);
  ensureDir(base);
  ensureDir(path.join(base, "prompts"));
  ensureDir(path.join(base, "tools"));
  ensureDir(path.join(base, "memory"));
  ensureDir(path.join(base, "sub-swarms"));

  const systemPrompt = [
    `export const ${rt.promptConst} = [`,
    `  \"${rt.displayName} is an apex cognitive runtime for ${rt.domain}.\",`,
    "  \"Operate with full-spectrum analysis, explicit assumptions, and adversarial self-review.\",",
    "  \"Prioritize measurable impact, traceability, and uncertainty calibration.\",",
    "  \"Coordinate specialist agents through hierarchical sub-swarms and resonance loops.\",",
    "  \"Use dream-mode consolidation to transform weak signals into testable hypotheses.\",",
    "  \"Maintain conceptual memory graphs with temporal layering and provenance aware updates.\",",
    "  \"When evidence conflicts, expose disagreements and rank options by reversible execution value.\",",
    "  \"Prefer incremental, production-safe plans with explicit rollback, telemetry, and verification gates.\",",
    "  \"Synthesize across domains to detect second-order effects and emergent opportunities.\",",
    "  \"Continuously improve calibration by reflecting on outcomes, misses, and hidden assumptions.\",",
    "].join(\" \" );",
    "",
  ].join("\n");
  write(path.join(base, "prompts", "systemPrompt.ts"), systemPrompt);

  const toolClasses = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const className = `${slugToPascal(rt.slug)}Tool${String(n).padStart(2, "0")}`;
    return `export class ${className} extends BaseCapabilityModule {\n  constructor() { super(\"${rt.toolPrefix}:${n}\", \"${rt.displayName} domain tool ${n} for high-granularity execution and synthesis.\"); }\n}\n`;
  }).join("\n");

  const toolPack = `import { BaseCapabilityModule } from \"@/runtimes/transcendent/BaseCapabilityModule\";\n\n${toolClasses}\n\nexport const ${rt.toolPackName} = [\n${Array.from({ length: 30 }, (_, i) => `  new ${slugToPascal(rt.slug)}Tool${String(i + 1).padStart(2, "0")}(),`).join("\n")}\n] as const;\n`;
  write(path.join(base, "tools", `${slugToPascal(rt.slug)}ToolPack.ts`), toolPack);

  const seeds = `import type { ConceptNode, MemoryHyperedge } from \"@/runtimes/transcendent/HyperdimensionalMemoryGraph\";\n\nconst now = Date.now();\n\nconst nodes: ConceptNode[] = Array.from({ length: 50 }, (_, i) => ({\n  id: \"${rt.runtimeId}:node:\" + (i + 1),\n  label: \"${rt.displayName} concept \" + (i + 1),\n  at: now + i,\n  domain: \"${rt.domain}\",\n  confidence: 0.62 + ((i % 7) * 0.04),\n  tags: [\"apex\", \"${rt.runtimeId}\", i % 2 === 0 ? \"frontier\" : \"validated\"],\n  sourceRuntime: \"${rt.runtimeId}\",\n}));\n\nconst edges: MemoryHyperedge[] = Array.from({ length: 60 }, (_, i) => ({\n  id: \"${rt.runtimeId}:edge:\" + (i + 1),\n  nodes: [nodes[i % nodes.length].id, nodes[(i + 3) % nodes.length].id, nodes[(i + 11) % nodes.length].id],\n  relation: i % 3 === 0 ? \"causal\" : i % 3 === 1 ? \"resonant\" : \"compositional\",\n  weight: 0.45 + ((i % 10) * 0.05),\n  at: now + i,\n}));\n\nexport const ${rt.seedsName}: { nodes: ConceptNode[]; edges: MemoryHyperedge[] } = {\n  nodes,\n  edges,\n};\n`;
  write(path.join(base, "memory", `${slugToPascal(rt.slug)}MemorySeeds.ts`), seeds);

  const patterns = `export const ${rt.patternsName} = [\n${Array.from({ length: 15 }, (_, i) => `  \"${rt.runtimeId}:dream-pattern-${i + 1}\",`).join("\n")}\n] as const;\n`;
  write(path.join(base, "memory", `${slugToPascal(rt.slug)}DreamPatterns.ts`), patterns);

  const subSwarms = `export interface ${slugToPascal(rt.slug)}SubSwarm {\n  id: string;\n  level: 1 | 2 | 3 | 4 | 5;\n  focus: string;\n  members: string[];\n}\n\nexport const ${slugToPascal(rt.slug)}SubSwarms: ${slugToPascal(rt.slug)}SubSwarm[] = [\n  { id: \"${rt.runtimeId}:strategic\", level: 1, focus: \"Grand strategy and arbitration\", members: [\"${rt.agents[0]}Agent\", \"${rt.agents[1]}Agent\"] },\n  { id: \"${rt.runtimeId}:tactical\", level: 2, focus: \"Domain tactical synthesis\", members: [\"${rt.agents[2]}Agent\", \"${rt.agents[3]}Agent\", \"${rt.agents[4]}Agent\"] },\n  { id: \"${rt.runtimeId}:execution\", level: 3, focus: \"Execution and optimization\", members: [\"${rt.agents[5]}Agent\", \"${rt.agents[6]}Agent\"] },\n  { id: \"${rt.runtimeId}:validation\", level: 4, focus: \"Adversarial validation\", members: [\"${rt.agents[7]}Agent\", \"${rt.agents[8]}Agent\"] },\n  { id: \"${rt.runtimeId}:dream\", level: 5, focus: \"Dream mode consolidation\", members: [\"${rt.agents[9]}Agent\"] },\n];\n`;
  write(path.join(base, "sub-swarms", "index.ts"), subSwarms);

  const runtimeFile = `import { BaseCapabilityModule } from \"@/runtimes/transcendent/BaseCapabilityModule\";\nimport { TranscendentBaseAgent } from \"@/runtimes/transcendent/TranscendentBaseAgent\";\nimport { TranscendentRuntimeKernel } from \"@/runtimes/transcendent/TranscendentRuntimeKernel\";\nimport { ${rt.promptConst} } from \"@/runtimes/${rt.slug}/prompts/systemPrompt\";\nimport { ${rt.toolPackName} } from \"@/runtimes/${rt.slug}/tools/${slugToPascal(rt.slug)}ToolPack\";\nimport { ${rt.seedsName} } from \"@/runtimes/${rt.slug}/memory/${slugToPascal(rt.slug)}MemorySeeds\";\nimport { ${rt.patternsName} } from \"@/runtimes/${rt.slug}/memory/${slugToPascal(rt.slug)}DreamPatterns\";\nimport { InterRuntimeResonanceMemory } from \"@/runtimes/transcendent/HyperdimensionalMemoryGraph\";\n\nconst AGENT_SPECS = [\n${rt.agents.map((agent) => `  { id: \"${rt.runtimeId}:${agent}\", name: \"${agent}Agent\", specialties: [\"${agent}\", \"${rt.displayName}\", \"adversarial review\"] },`).join("\n")}\n] as const;\n\nconst CORE_CAPABILITIES = [\n${CORE_MODULES.map((core) => `  new BaseCapabilityModule(\"${rt.runtimeId}:${core}\", \"${core} capability for ${rt.displayName}\"),`).join("\n")}\n] as const;\n\nexport class ${rt.className} extends TranscendentRuntimeKernel {\n  constructor() {\n    super(\n      \"${rt.runtimeId}\",\n      \"${rt.displayName}\",\n      \"${rt.domain}\",\n      ${rt.promptConst},\n      AGENT_SPECS.map((agent) => new TranscendentBaseAgent(agent.id, agent.name, \"${rt.domain}\", [...agent.specialties])),\n      [\n        ...CORE_CAPABILITIES,\n        ...${rt.toolPackName},\n      ],\n      [\n        \"This runtime provides informational synthesis and requires human oversight for high-stakes decisions.\",\n      ],\n    );\n\n    for (const node of ${rt.seedsName}.nodes.slice(0, 24)) {\n      InterRuntimeResonanceMemory.broadcast(\"${rt.runtimeId}\", node);\n    }\n    for (const pattern of ${rt.patternsName}) {\n      InterRuntimeResonanceMemory.broadcast(\"${rt.runtimeId}:dream\", {\n        id: pattern,\n        label: pattern,\n        at: Date.now(),\n        domain: \"${rt.domain}\",\n        confidence: 0.7,\n        tags: [\"dream\", \"${rt.runtimeId}\"],\n        sourceRuntime: \"${rt.runtimeId}\",\n      });\n    }\n  }\n}\n`;
  write(path.join(base, `${slugToPascal(rt.slug)}Runtime.ts`), runtimeFile);

  write(
    path.join(base, "index.ts"),
    `export { ${rt.className} } from \"@/runtimes/${rt.slug}/${slugToPascal(rt.slug)}Runtime\";\n`,
  );
}

console.log(`Generated ${RUNTIMES.length} apex runtimes.`);
