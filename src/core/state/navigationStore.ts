import { create } from "zustand";

interface NavigationStore {
  isCollapsed: boolean;
  isOpen: boolean;
  toggleCollapse: () => void;
  setCollapsed: (value: boolean) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSidebarStore = create<NavigationStore>((set) => ({
  isCollapsed: false,
  isOpen: false,
  toggleCollapse: () =>
    set((state) => ({
      isCollapsed: !state.isCollapsed,
    })),
  setCollapsed: (value) => set({ isCollapsed: value }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
