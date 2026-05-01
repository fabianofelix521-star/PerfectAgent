import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class GitMCP extends BaseMCPServer {
  readonly id = "git";
  readonly name = "Git Local";
}
