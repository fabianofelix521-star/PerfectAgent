import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, ProjectMeta } from "../types";

interface ProjectStoreState {
  currentProject: Project | null;
  recentProjects: ProjectMeta[];

  setCurrentProject: (project: Project | null) => void;
  updateCurrentProjectFiles: (files: Record<string, string>) => void;
  addRecentProject: (meta: ProjectMeta) => void;
  removeRecentProject: (id: string) => void;
  clearRecent: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set) => ({
      currentProject: null,
      recentProjects: [],

      setCurrentProject: (project) =>
        set((state) => {
          if (!project) return { currentProject: null };
          const meta: ProjectMeta = {
            id: project.id,
            name: project.name,
            framework: project.framework,
            template: project.template,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          };
          const recents = [
            meta,
            ...state.recentProjects.filter((p) => p.id !== project.id),
          ].slice(0, 10);
          return { currentProject: project, recentProjects: recents };
        }),
      updateCurrentProjectFiles: (files) =>
        set((state) => {
          if (!state.currentProject) return {};
          return {
            currentProject: {
              ...state.currentProject,
              files,
              updatedAt: Date.now(),
            },
          };
        }),
      addRecentProject: (meta) =>
        set((state) => ({
          recentProjects: [
            meta,
            ...state.recentProjects.filter((p) => p.id !== meta.id),
          ].slice(0, 10),
        })),
      removeRecentProject: (id) =>
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.id !== id),
        })),
      clearRecent: () => set({ recentProjects: [] }),
      reset: () => set({ currentProject: null, recentProjects: [] }),
    }),
    {
      name: "nexus-code-studio-projects",
      partialize: (state) => ({ recentProjects: state.recentProjects }),
    },
  ),
);
