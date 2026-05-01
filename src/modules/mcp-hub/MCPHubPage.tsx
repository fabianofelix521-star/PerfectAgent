import { useEffect } from "react";
import { ExtensionsPage } from "@/pages/ExtensionsPage";
import { useMcpStore } from "@/modules/mcp-hub/store/mcpStore";

export function MCPHubPage() {
  const refreshInstalled = useMcpStore((s) => s.refreshInstalled);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  return <ExtensionsPage />;
}
