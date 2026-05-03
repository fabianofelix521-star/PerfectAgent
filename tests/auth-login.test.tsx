import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { CLIENT_AUTH_STORAGE_KEY } from "@/services/api";
import { ensurePresetsRegistered, useConfig } from "@/stores/config";

const LAZY_ROUTE_TIMEOUT = 12000;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

function resetStore() {
  const current = useConfig.getState();
  useConfig.setState({
    settings: { ...current.settings, masterKey: "" },
    chatThreads: [],
    activeChatThreadId: undefined,
    studioThreads: [],
    activeStudioThreadId: undefined,
    projects: [],
    activeProjectId: undefined,
    chatSelection: { skillIds: [] },
    studioSelection: { skillIds: [], agentMode: false },
  } as never);
  ensurePresetsRegistered();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
}

function installProtectedBackendMock() {
  let sessionAuthenticated = false;

  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.endsWith("/api/health")) {
      return jsonResponse({ ok: true, authRequired: true, ts: Date.now() });
    }

    if (url.endsWith("/api/auth/login")) {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as { key?: string } : {};
      if (body.key === "secret-key") {
        sessionAuthenticated = true;
        return jsonResponse({ ok: true, authenticated: true });
      }
      return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (url.endsWith("/api/auth/logout")) {
      sessionAuthenticated = false;
      return jsonResponse({ ok: true, authenticated: false });
    }

    if (url.endsWith("/api/auth/session")) {
      if (sessionAuthenticated) {
        return jsonResponse({ ok: true, authenticated: true });
      }
      return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return jsonResponse({ ok: true });
  });
}

describe("auth login flow", () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(fetch).mockReset();
  });

  it("redirects protected routes to the login page when no key is saved", async () => {
    installProtectedBackendMock();
    window.history.replaceState({}, "", "/chat");

    render(<App />);

    expect(
      await screen.findByText("Entre com a chave do servidor", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  }, 20000);

  it("accepts a valid key and returns to the requested route", async () => {
    installProtectedBackendMock();
    window.history.replaceState({}, "", "/chat");
    const user = userEvent.setup();

    render(<App />);

    await user.type(
      await screen.findByPlaceholderText("Cole a key configurada no servidor", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
      "secret-key",
    );
    await user.click(screen.getByRole("button", { name: /Entrar no workspace/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/chat"), {
      timeout: LAZY_ROUTE_TIMEOUT,
    });
    expect(window.localStorage.getItem(CLIENT_AUTH_STORAGE_KEY)).toBeNull();
    expect(
      await screen.findByText("Conversa agêntica", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
  }, 20000);
});