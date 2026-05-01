export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverId?: string;
}

export interface MCPToolResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  latencyMs?: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: "http" | "command";
  url?: string;
  command?: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface MCPServerDefinition {
  id: string;
  name: string;
  description: string;
  category:
    | "productivity"
    | "ai"
    | "search"
    | "web"
    | "development"
    | "database"
    | "communication"
    | "location"
    | "media"
    | "custom";
  icon: string;
  package: string;
  requiresApiKey?: boolean;
  requiresConfig?: boolean;
  apiKeyName?: string;
  configSchema?: Record<string, unknown>;
  tools: string[];
  docsUrl: string;
}

export interface AITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}
