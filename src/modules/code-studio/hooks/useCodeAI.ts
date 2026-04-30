import { useCallback } from "react";
import { codeAIOrchestrator } from "../ai/CodeAIOrchestrator";
import { useAICodeStore } from "../store/aiCode.store";
import { useProjectStore } from "../store/project.store";
import type { AIMessage, GenerationState } from "../types";

let messageCounter = 0;
const newId = () =>
  `msg_${Date.now().toString(36)}_${(++messageCounter).toString(36)}`;

export interface UseCodeAIResult {
  messages: AIMessage[];
  generationState: GenerationState;
  isGenerating: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  cancel: () => void;
  clearMessages: () => void;
}

export function useCodeAI(): UseCodeAIResult {
  const store = useAICodeStore();
  const currentProject = useProjectStore((s) => s.currentProject);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentProject) {
        throw new Error("No active project. Open or create a project first.");
      }
      const userMessage: AIMessage = {
        id: newId(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      store.addMessage(userMessage);

      await codeAIOrchestrator.process(
        message,
        currentProject,
        [...store.messages, userMessage],
        {
          autoFix: true,
          onStateChange: (state) => store.setGenerationState(state),
          onFileGenerated: (file) => store.markFileGenerated(file.path),
          onComplete: (summary) => {
            store.addMessage({
              id: newId(),
              role: "assistant",
              content: summary || "Geração concluída.",
              timestamp: Date.now(),
            });
          },
          onError: (err) => store.setError(err.message),
        },
      );
    },
    [currentProject, store],
  );

  const cancel = useCallback(() => {
    codeAIOrchestrator.cancel();
  }, []);

  return {
    messages: store.messages,
    generationState: store.generationState,
    isGenerating:
      store.generationState.status !== "idle" &&
      store.generationState.status !== "complete" &&
      store.generationState.status !== "error",
    error: store.generationState.error,
    sendMessage,
    cancel,
    clearMessages: store.clearMessages,
  };
}
