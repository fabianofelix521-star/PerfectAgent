export interface HephaestusPrimeSubSwarm {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  focus: string;
  members: string[];
}

export const HephaestusPrimeSubSwarms: HephaestusPrimeSubSwarm[] = [
  { id: "hephaestus-prime:strategic", level: 1, focus: "Grand strategy and arbitration", members: ["FullStackOmniscientAgent", "SystemDesignArchmageAgent"] },
  { id: "hephaestus-prime:tactical", level: 2, focus: "Domain tactical synthesis", members: ["DatabaseEngineeringWizardAgent", "CloudInfrastructureArchitectAgent", "DevOpsAutomationDeityAgent"] },
  { id: "hephaestus-prime:execution", level: 3, focus: "Execution and optimization", members: ["KubernetesGrandmasterAgent", "CodeGenerationFactoryAgent"] },
  { id: "hephaestus-prime:validation", level: 4, focus: "Adversarial validation", members: ["RefactoringSurgeonAgent", "DebuggingClairvoyantAgent"] },
  { id: "hephaestus-prime:dream", level: 5, focus: "Dream mode consolidation", members: ["PerformanceOptimizationGodAgent"] },
];
