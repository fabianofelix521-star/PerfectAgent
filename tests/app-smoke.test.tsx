import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { ensurePresetsRegistered, useConfig } from "@/stores/config";

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

    expect(await screen.findByText("Conversa agêntica")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Code Studio"));
    expect(
      await screen.findByText("Code Studio"),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Agentes"));
    expect(
      await screen.findByText("Runtime real com LangGraph"),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Configuracoes"));
    expect(
      await screen.findByText("Centro de controle do SaaS agêntico"),
    ).toBeInTheDocument();
  });

  it("answers a basic greeting cleanly when no model is configured", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      await screen.findByPlaceholderText("Type your message..."),
      "oi",
    );
    await user.click(screen.getByLabelText("Send message"));

    expect(await screen.findByText(/Oi! Estou aqui/i)).toBeInTheDocument();
    expect(screen.queryByText(/plan\s*\{/i)).not.toBeInTheDocument();
  });
});
