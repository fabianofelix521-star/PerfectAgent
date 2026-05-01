import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class DockerMCP extends BaseMCPServer {
  readonly id = "docker";
  readonly name = "Docker";
}
