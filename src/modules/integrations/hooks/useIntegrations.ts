import { useMemo } from "react";
import { useConfig, getIntegrationDecoded } from "@/stores/config";
import { api } from "@/services/api";

export function useIntegrations() {
  const integrations = useConfig((s) => s.integrations);
  const upsert = useConfig((s) => s.upsertIntegration);
  const remove = useConfig((s) => s.removeIntegration);
  const setTest = useConfig((s) => s.setIntegrationTest);

  const catalog = useMemo(() => integrations.map((item) => ({
    ...item,
    connected: item.lastTest?.ok ?? item.connected,
  })), [integrations]);

  async function testIntegration(id: string) {
    const decoded = getIntegrationDecoded(id);
    if (!decoded?.url) {
      return { ok: false, error: "URL de integracao nao configurada." };
    }

    const headers = {
      ...(decoded.headers ?? {}),
      ...(decoded.secrets?.token ? { authorization: `Bearer ${decoded.secrets.token}` } : {}),
    };

    const result = await api.testIntegration({
      url: decoded.url,
      method: decoded.method,
      headers,
      body: decoded.bodyTemplate,
    });

    setTest(id, {
      ok: result.ok,
      status: result.status,
      latencyMs: result.latencyMs,
      error: result.error,
      at: Date.now(),
    });

    return result;
  }

  return {
    integrations: catalog,
    createIntegration: upsert,
    updateIntegration: upsert,
    deleteIntegration: remove,
    testIntegration,
  };
}
