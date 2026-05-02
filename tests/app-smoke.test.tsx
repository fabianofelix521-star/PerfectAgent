import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { ensurePresetsRegistered, useConfig } from "@/stores/config";

const LAZY_ROUTE_TIMEOUT = 12000;

vi.mock("@monaco-editor/react", () => ({
  default: () => <textarea aria-label="monaco-editor" />,
}));

function resetStore() {
  window.history.pushState({}, "", "/");
  useConfig.setState({
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
}

async function waitForWorkspace() {
  expect(
    await screen.findByLabelText("Novo chat", undefined, {
      timeout: LAZY_ROUTE_TIMEOUT,
    }),
  ).toBeInTheDocument();
}

describe("app route smoke", () => {
  beforeEach(() => resetStore());

  it("renders normal chat and navigates to main sections", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitForWorkspace();

    await user.click(screen.getByLabelText("Novo chat"));
    expect(
      await screen.findByText("Conversa agêntica", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Code Studio"));
    expect(
      await screen.findByText("Code Studio", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Este módulo falhou ao renderizar.")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Skills Bank"));
    expect(
      await screen.findByText("Capacidades reutilizáveis", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Web Scraping")).toBeInTheDocument();

    await user.click(screen.getByLabelText("MCP Hub"));
    expect(
      await screen.findByText("Servidores Model Context Protocol", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Banco MCP")).toBeInTheDocument();
    expect(await screen.findByText("File System")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Integrações"));
    expect(
      await screen.findByText("Conexões com serviços externos", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Banco de integrações")).toBeInTheDocument();
    expect(await screen.findByText("Slack (Incoming Webhook)")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Agentes"));
    expect(
      await screen.findByText("Runtime real com LangGraph", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Configuracoes" }));
    await waitFor(() => expect(window.location.pathname).toBe("/settings/profile"), {
      timeout: LAZY_ROUTE_TIMEOUT,
    });
  }, 20000);

  it("renders the Supreme Coordinator panel inside the agent runtime", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitForWorkspace();
    await user.click(screen.getByLabelText("Agentes"));
    expect(
      await screen.findByText("Runtime real com LangGraph", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", {
        name: /Supreme Coordinator · Swarm/i,
      }),
    );
    expect(await screen.findByText("Runtime Supreme Coordinator")).toBeInTheDocument();
    expect(await screen.findByText("Domain Supervisors (15)")).toBeInTheDocument();
  }, 20000);

  it("answers a basic greeting cleanly when no model is configured", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitForWorkspace();
    await user.click(screen.getByLabelText("Novo chat"));
    await user.type(
      await screen.findByPlaceholderText("Type your message...", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
      "oi",
    );
    await user.click(screen.getByLabelText("Send message"));

    expect(await screen.findByText(/Oi! Estou aqui/i)).toBeInTheDocument();
    expect(screen.queryByText(/plan\s*\{/i)).not.toBeInTheDocument();
  }, 20000);
});
