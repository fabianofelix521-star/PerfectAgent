import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class FilesystemMCP extends BaseMCPServer {
  readonly id = "filesystem";
  readonly name = "File System";
}
