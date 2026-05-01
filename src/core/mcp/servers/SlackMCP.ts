import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class SlackMCP extends BaseMCPServer {
  readonly id = "slack";
  readonly name = "Slack";
}
