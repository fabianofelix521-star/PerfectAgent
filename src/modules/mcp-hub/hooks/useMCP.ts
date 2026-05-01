import { useMemo } from "react";
import { useConfig, getMcpServerDecoded } from "@/stores/config";
import { useMcpStore } from "@/modules/mcp-hub/store/mcpStore";
import { mcpClient } from "@/core/mcp/MCPClient";
import { mcpToolExecutor } from "@/core/mcp/MCPToolExecutor";
import type { MCPServerDefinition } from "@/core/mcp/types";

export function useMCP() {
  const mcpServers = useConfig((s) => s.mcpServers);
  const upsert = useConfig((s) => s.upsertMcpServer);
  const setTools = useConfig((s) => s.setMcpServerTools);
  const setTest = useConfig((s) => s.setMcpServerTest);
  const catalog = useMcpStore((s) => s.availableCatalog);

  const installedServers = useMemo(
    () => mcpServers.map((item) => ({ ...item, status: item.lastTest?.ok ? "connected" : "disconnected" })),
    [mcpServers],
  );

  const availableTools = useMemo(() => mcpClient.getAllTools(), [mcpServers]);

  async function connectServer(server: MCPServerDefinition, config: Record<string, unknown>) {
    const existing = mcpServers.find((item) => item.id === server.id);
    const merged = {
      id: existing?.id ?? `mcp-${server.id}`,
      name: server.name,
      transport: "http" as const,
      url: typeof config.url === "string" ? config.url : existing?.url,
      apiKey: typeof config.apiKey === "string" ? config.apiKey : existing?.apiKey,
      enabled: true,
      tools: existing?.tools,
      lastTest: existing?.lastTest,
    };

    upsert(merged);
    const decoded = getMcpServerDecoded(merged.id);
    if (!decoded?.url) return;

    await mcpClient.connect({
      id: decoded.id,
      name: decoded.name,
      transport: decoded.transport,
      url: decoded.url,
      apiKey: decoded.apiKey,
    });
    const tools = await mcpClient.getAllTools().filter((tool) => tool.serverId === decoded.id);
    setTools(decoded.id, tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })));
  }

  async function disconnectServer(serverId: string) {
    await mcpClient.disconnect(serverId);
    setTest(serverId, { ok: false, error: "disconnected", at: Date.now() });
  }

  async function testServer(serverId: string) {
    const result = await mcpClient.testConnection(serverId);
    setTest(serverId, {
      ok: result.success,
      latencyMs: result.latency,
      error: result.error,
      at: Date.now(),
    });
    return result;
  }

  async function callTool(name: string, params: Record<string, unknown>) {
    return mcpToolExecutor.execute(name, params);
  }

  return {
    catalog,
    installedServers,
    availableTools,
    connectServer,
    disconnectServer,
    testServer,
    callTool,
  };
}
