import { create } from "zustand";
import { useConfig } from "@/stores/config";

interface IntegrationsState {
  selectedId?: string;
  setSelectedId: (id?: string) => void;
  refresh: () => void;
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  selectedId: undefined,
  setSelectedId: (id) => set({ selectedId: id }),
  refresh: () => {
    const list = useConfig.getState().integrations;
    if (list.length === 0) set({ selectedId: undefined });
  },
}));
