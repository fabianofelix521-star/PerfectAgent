export interface SchemaField {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  default?: unknown;
  enum?: string[];
}

export type SkillCategory =
  | "research"
  | "writing"
  | "coding"
  | "data"
  | "media"
  | "business"
  | "automation"
  | "communication"
  | "custom";

export interface WorkflowDefinition {
  nodes: Array<{ id: string; action: string; args?: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string }>;
}

export interface SkillContext {
  requestId: string;
  agentId?: string;
  tools?: Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  version: string;
  author: string;
  inputSchema: Record<string, SchemaField>;
  outputSchema: Record<string, SchemaField>;
  type: "prompt" | "code" | "workflow" | "composite";
  promptTemplate?: string;
  executor?: (input: unknown, context: SkillContext) => Promise<unknown>;
  workflowDefinition?: WorkflowDefinition;
  composedSkills?: string[];
  tags: string[];
  usageCount: number;
  rating: number;
  isPublic: boolean;
  createdAt: Date;
}
