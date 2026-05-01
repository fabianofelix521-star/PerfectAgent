import { BaseMCPServer } from "@/core/mcp/servers/BaseMCPServer";

export class BrowserMCP extends BaseMCPServer {
  readonly id = "puppeteer";
  readonly name = "Puppeteer Browser";
}
