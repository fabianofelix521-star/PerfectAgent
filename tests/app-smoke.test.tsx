import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { ensurePresetsRegistered, useConfig } from "@/stores/config";

const LAZY_ROUTE_TIMEOUT = 7000;

vi.mock("@monaco-editor/react", () => ({
  default: () => <textarea aria-label="monaco-editor" />,
}));

function resetStore() {
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

describe("app route smoke", () => {
  beforeEach(() => resetStore());

  it("renders normal chat and navigates to main sections", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Operação PerfectAgent")).toBeInTheDocument();

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

    await user.click(screen.getByLabelText("Agentes"));
    expect(
      await screen.findByText("Runtime real com LangGraph", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Configuracoes"));
    expect(
      await screen.findByText("Centro de controle do SaaS agêntico", undefined, {
        timeout: LAZY_ROUTE_TIMEOUT,
      }),
    ).toBeInTheDocument();
  }, 20000);

  it("renders the Supreme Coordinator panel inside the agent runtime", async () => {
    const user = userEvent.setup();
    render(<App />);

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

    await user.click(screen.getByLabelText("Novo chat"));
    await user.type(
      await screen.findByPlaceholderText("Type your message..."),
      "oi",
    );
    await user.click(screen.getByLabelText("Send message"));

    expect(await screen.findByText(/Oi! Estou aqui/i)).toBeInTheDocument();
    expect(screen.queryByText(/plan\s*\{/i)).not.toBeInTheDocument();
  });
});
