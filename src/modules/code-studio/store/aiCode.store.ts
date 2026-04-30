import { create } from "zustand";
import type { AIMessage, GenerationState } from "../types";

interface AICodeStoreState {
  messages: AIMessage[];
  generationState: GenerationState;
  generatedFiles: Set<string>;

  addMessage: (message: AIMessage) => void;
  updateMessage: (id: string, partial: Partial<AIMessage>) => void;
  clearMessages: () => void;
  setGenerationState: (state: GenerationState) => void;
  markFileGenerated: (path: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialGeneration: GenerationState = {
  status: "idle",
  thinking: "",
  plan: [],
  filesTotal: 0,
  filesComplete: 0,
  currentFile: null,
  error: null,
};

export const useAICodeStore = create<AICodeStoreState>((set) => ({
  messages: [],
  generationState: { ...initialGeneration },
  generatedFiles: new Set<string>(),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateMessage: (id, partial) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...partial } : m,
      ),
    })),
  clearMessages: () => set({ messages: [] }),
  setGenerationState: (gen) => set({ generationState: gen }),
  markFileGenerated: (path) =>
    set((state) => {
      const next = new Set(state.generatedFiles);
      next.add(path);
      return { generatedFiles: next };
    }),
  setError: (error) =>
    set((state) => ({
      generationState: { ...state.generationState, error },
    })),
  reset: () =>
    set({
      messages: [],
      generationState: { ...initialGeneration },
      generatedFiles: new Set<string>(),
    }),
}));
