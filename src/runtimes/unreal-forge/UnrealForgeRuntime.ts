import { SupremeRuntime, type SupremeAgentSpec } from "@/runtimes/shared/supremeRuntime";

function agent(id: string, name: string, tier: SupremeAgentSpec["tier"], tags: string[], focus: string[]): SupremeAgentSpec {
  return {
    id,
    name,
    description: `${name} inside the AAA game development studio swarm.`,
    tier,
    tags,
    systemPrompt: `${name}: produce AAA-grade game-development direction with engine-aware implementation notes for Unreal Engine 5, Unity, Godot or Roblox when relevant.`,
    toolName: `${id}_studio_tool`,
    toolDescription: `${name} studio production tool`,
    outputFocus: focus,
    evidenceBasis: ["game production practice", "engine documentation patterns", "playtestable design artifacts"],
    riskControls: ["Scope the MVP before full production", "Keep performance budgets explicit", "Validate with playtests"],
  };
}

const UNREAL_FORGE_AGENTS: SupremeAgentSpec[] = [
  agent("game-director", "Game Director Agent", "HOT", ["direction", "vision"], ["creative pillars", "target experience", "core fantasy", "differentiation"]),
  agent("technical-director", "Technical Director Agent", "HOT", ["technical", "pipeline"], ["technical feasibility", "performance targets", "pipeline", "risk mitigation"]),
  agent("game-designer", "Game Designer Agent", "HOT", ["mechanics", "balance"], ["mechanics", "core loop", "progression", "balance"]),
  agent("level-designer", "Level Designer Agent", "WARM", ["level", "pacing"], ["layout", "flow", "pacing", "encounters"]),
  agent("narrative-designer", "Narrative Designer Agent", "WARM", ["story", "dialogue"], ["story arc", "dialogue", "worldbuilding", "quest structure"]),
  agent("ux-designer", "UX Designer Agent", "WARM", ["hud", "menus", "tutorial"], ["HUD", "menus", "tutorials", "accessibility UX"]),
  agent("art-director", "Art Director Agent", "HOT", ["art", "style"], ["style guide", "mood board", "visual pillars", "reference prompts"]),
  agent("environment-artist", "Environment Artist Agent", "WARM", ["environment", "lighting"], ["biomes", "lighting mood", "set dressing", "modularity"]),
  agent("character-designer", "Character Designer Agent", "WARM", ["character", "rigging"], ["character silhouette", "anatomy", "rigging notes", "animation needs"]),
  agent("vfx-artist", "VFX Artist Agent", "WARM", ["vfx", "shader"], ["particles", "shaders", "post-process", "feedback clarity"]),
  agent("gameplay-programmer", "Gameplay Programmer Agent", "HOT", ["gameplay", "input", "camera"], ["gameplay systems", "input", "camera", "state machines"]),
  agent("ai-programmer", "AI Programmer Agent", "WARM", ["ai", "behavior-tree", "goap"], ["behavior tree", "GOAP/utility AI", "navigation", "combat AI"]),
  agent("network-programmer", "Network Programmer Agent", "WARM", ["netcode", "rollback"], ["authority model", "replication", "rollback", "latency hiding"]),
  agent("graphics-programmer", "Graphics Programmer Agent", "WARM", ["graphics", "rendering"], ["render pipeline", "shader optimization", "Lumen/Nanite fit", "GPU budget"]),
  agent("tools-programmer", "Tools Programmer Agent", "COLD", ["tools", "automation"], ["editor tools", "asset pipeline", "automation", "validation"]),
  agent("audio-director", "Audio Director Agent", "COLD", ["audio", "music"], ["adaptive music", "SFX", "ambience", "mix states"]),
  agent("unreal-blueprint", "Unreal Blueprint Agent", "HOT", ["ue5", "blueprint", "niagara"], ["Blueprint architecture", "C++ class layout", "Niagara", "World Partition"]),
  agent("roblox-luau", "Roblox Luau Agent", "WARM", ["roblox", "luau"], ["Luau scripts", "Roblox APIs", "DataStores", "monetization"]),
  agent("producer", "Producer Agent", "HOT", ["production", "timeline"], ["milestones", "scope control", "team plan", "budget"]),
  agent("qa-game", "QA Game Agent", "WARM", ["qa", "playtest"], ["test cases", "playtest plan", "bug taxonomy", "release criteria"]),
];

export class UnrealForgeRuntime extends SupremeRuntime {
  constructor() {
    super({
      id: "unreal-forge",
      name: "Unreal Forge",
      domain: "AAA game development studio",
      mission: "Coordinate game direction, design, art, engineering, audio, production and QA for Unreal, Roblox, Unity and Godot projects.",
      agents: UNREAL_FORGE_AGENTS,
    });
  }
}

export { UNREAL_FORGE_AGENTS };
