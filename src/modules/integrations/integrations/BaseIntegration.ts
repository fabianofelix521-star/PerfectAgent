import { api } from "@/services/api";

export interface IntegrationConnection {
  id: string;
  name: string;
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
}

export abstract class BaseIntegration {
  abstract readonly id: string;
  abstract readonly name: string;

  async test(connection: IntegrationConnection): Promise<{
    ok: boolean;
    status?: number;
    latencyMs?: number;
    error?: string;
  }> {
    const result = await api.testIntegration({
      url: connection.url,
      method: connection.method ?? "GET",
      headers: connection.headers,
    });
    return result;
  }
}
