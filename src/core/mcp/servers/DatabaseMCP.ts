import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class DatabaseMCP extends BaseMCPServer {
  readonly id = "database";
  readonly name = "Database";
}
