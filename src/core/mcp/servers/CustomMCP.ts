import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class CustomMCP extends BaseMCPServer {
  readonly id = "custom";
  readonly name = "Servidor Customizado";
}
