import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class GitHubMCP extends BaseMCPServer {
  readonly id = "github";
  readonly name = "GitHub";
}
