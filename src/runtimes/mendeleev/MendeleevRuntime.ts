import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(
  id: string,
  name: string,
  description: string,
  tier: SupremeAgentSpec["tier"],
  tags: string[],
  systemPrompt: string,
  toolName: string,
  outputFocus: string[],
  evidenceBasis: string[],
  riskControls: string[],
): SupremeAgentSpec {
  return { id, name, description, tier, tags, systemPrompt, toolName, toolDescription: `${name} analyzer`, outputFocus, evidenceBasis, riskControls };
}

const MENDELEEV_AGENTS: SupremeAgentSpec[] = [
  agent("organic-synthesis-architect", "Organic Synthesis Architect Agent", "Plans retrosynthesis, mechanisms and purification.", "HOT", ["organic", "retrosynthesis", "mechanism"], "Design retrosynthetic routes, reaction mechanisms, reagents, purification and scale-up safety.", "plan_retrosynthesis", ["retrosynthetic disconnections", "reaction mechanism", "reagents and conditions", "purification", "scale-up hazards"], ["named reaction precedent", "NMR/IR/MS structural confirmation", "green chemistry metrics"], ["Flag hazardous reagents", "Require lab safety review", "Do not provide illicit synthesis"]),
  agent("computational-chemistry", "Computational Chemistry Agent", "Frames DFT, MD, docking and QSAR workflows.", "WARM", ["dft", "md", "docking", "qsar"], "Recommend computational chemistry workflows: DFT, molecular dynamics, docking, QSAR/QSPR and uncertainty checks.", "design_computational_workflow", ["DFT method", "MD setup", "docking strategy", "property prediction", "uncertainty"], ["DFT benchmark literature", "force-field validation", "QSAR train/test split"], ["Avoid overclaiming simulation output", "Require experimental validation", "Expose model assumptions"]),
  agent("materials-science", "Materials Science Agent", "Designs polymers, ceramics, composites and functional materials.", "HOT", ["materials", "polymer", "ceramic", "composite"], "Analyze materials structure-property relationships, processing routes and durability constraints.", "design_material_system", ["structure-property map", "processing route", "failure mode", "characterization", "application fit"], ["phase diagram", "mechanical testing", "thermal analysis"], ["Check toxicity and recyclability", "Flag brittle failure", "Validate under service conditions"]),
  agent("electrochemistry", "Electrochemistry Agent", "Covers batteries, fuel cells, corrosion and catalysts.", "WARM", ["battery", "fuel-cell", "corrosion", "catalysis"], "Analyze electrochemical systems, redox windows, electrolyte compatibility, corrosion and cycle-life risks.", "analyze_electrochemical_system", ["redox couple", "electrolyte", "electrode interface", "degradation", "testing protocol"], ["cyclic voltammetry", "EIS", "cycle-life data"], ["Flag thermal runaway", "Control moisture/oxygen", "Require containment"]),
  agent("nanochemistry", "Nanochemistry Agent", "Designs nanoparticles, quantum dots and drug-delivery systems.", "WARM", ["nano", "quantum-dot", "delivery"], "Design nanochemical systems with size, surface chemistry, stability, targeting and toxicity constraints.", "design_nano_system", ["particle size", "surface chemistry", "stability", "delivery route", "toxicity"], ["DLS/TEM characterization", "zeta potential", "in vitro toxicity"], ["Flag environmental release", "Avoid unsupported human claims", "Require sterility where biomedical"]),
  agent("green-chemistry", "Green Chemistry Agent", "Optimizes sustainable, safer and catalytic processes.", "WARM", ["green", "sustainability", "catalysis"], "Apply the 12 principles of green chemistry, solvent selection, atom economy and catalytic route redesign.", "optimize_green_process", ["atom economy", "solvent choice", "catalyst", "waste reduction", "energy use"], ["12 green chemistry principles", "E-factor", "life-cycle assessment"], ["Avoid toxic solvent substitution traps", "Check catalyst sourcing", "Preserve yield and safety"]),
  agent("food-chemistry", "Food Chemistry Agent", "Analyzes nutrition molecules, additives, flavor and fermentation.", "COLD", ["food", "nutrition", "fermentation"], "Analyze food chemistry, additives, fermentation, flavor compounds, shelf stability and regulatory constraints.", "analyze_food_chemistry", ["nutrient chemistry", "additive function", "fermentation pathway", "shelf stability", "regulatory notes"], ["food safety standards", "HACCP logic", "sensory chemistry"], ["Flag allergens", "Control microbial risk", "Respect labeling rules"]),
  agent("forensic-chemistry", "Forensic Chemistry Agent", "Frames toxicology, trace analysis and chain of custody.", "COLD", ["forensic", "toxicology", "trace"], "Analyze forensic chemistry with analytical method selection, toxicology interpretation and chain-of-custody controls.", "analyze_forensic_sample", ["sample matrix", "analytical method", "toxicology interpretation", "chain of custody", "confidence limits"], ["GC-MS/LC-MS methods", "toxicology reference ranges", "QA/QC controls"], ["Do not infer guilt", "Preserve chain of custody", "Report uncertainty"]),
];

export class MendeleevRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "mendeleev",
      name: "Mendeleev",
      domain: "Advanced chemistry and materials science",
      mission: "Coordinate synthesis, computation, materials, electrochemistry, nanochemistry, green chemistry, food chemistry and forensic chemistry.",
      safetyNotice: "Chemistry outputs are for lawful research, education and professional review only. Hazardous or illicit synthesis must be refused or redirected to safety and compliance.",
      agents: MENDELEEV_AGENTS,
    });
  }
}

export { MENDELEEV_AGENTS };
