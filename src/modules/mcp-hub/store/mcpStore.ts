import { create } from "zustand";
import { useConfig } from "@/stores/config";
import { mcpClient } from "@/core/mcp/MCPClient";
import { MCP_CATALOG } from "@/core/mcp/MCPServerRegistry";
import type { MCPServerDefinition } from "@/core/mcp/types";

interface MCPState {
  installedServerIds: string[];
  availableCatalog: MCPServerDefinition[];
  refreshInstalled: () => void;
}

export const useMcpStore = create<MCPState>((set) => ({
  installedServerIds: [],
  availableCatalog: MCP_CATALOG,
  refreshInstalled: () => {
    const servers = useConfig.getState().mcpServers.filter((item) => item.enabled);
    set({ installedServerIds: servers.map((item) => item.id) });

    for (const server of servers) {
      const decoded = useConfig.getState().mcpServers.find((item) => item.id === server.id);
      if (!decoded?.url) continue;
      void mcpClient.connect({
        id: decoded.id,
        name: decoded.name,
        transport: decoded.transport,
        url: decoded.url,
      });
    }
  },
}));
