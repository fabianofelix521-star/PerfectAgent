import { create } from "zustand";

export interface EditorTab {
  path: string;
  isDirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  unsavedChanges: Map<string, string>;

  openTab: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string | null) => void;
  markDirty: (path: string, content: string) => void;
  markClean: (path: string) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTab: null,
  unsavedChanges: new Map<string, string>(),

  openTab: (path) =>
    set((state) => {
      if (state.tabs.some((t) => t.path === path)) {
        return { activeTab: path };
      }
      return {
        tabs: [...state.tabs, { path, isDirty: false }],
        activeTab: path,
      };
    }),
  closeTab: (path) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path);
      const unsaved = new Map(state.unsavedChanges);
      unsaved.delete(path);
      let active = state.activeTab;
      if (active === path) {
        active = tabs.length > 0 ? tabs[tabs.length - 1].path : null;
      }
      return { tabs, activeTab: active, unsavedChanges: unsaved };
    }),
  setActiveTab: (path) => set({ activeTab: path }),
  markDirty: (path, content) =>
    set((state) => {
      const unsaved = new Map(state.unsavedChanges);
      unsaved.set(path, content);
      const tabs = state.tabs.map((t) =>
        t.path === path ? { ...t, isDirty: true } : t,
      );
      return { tabs, unsavedChanges: unsaved };
    }),
  markClean: (path) =>
    set((state) => {
      const unsaved = new Map(state.unsavedChanges);
      unsaved.delete(path);
      const tabs = state.tabs.map((t) =>
        t.path === path ? { ...t, isDirty: false } : t,
      );
      return { tabs, unsavedChanges: unsaved };
    }),
  reset: () =>
    set({
      tabs: [],
      activeTab: null,
      unsavedChanges: new Map<string, string>(),
    }),
}));
