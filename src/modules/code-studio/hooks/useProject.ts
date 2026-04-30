import { useCallback, useEffect, useState } from "react";
import { buildPipeline, type BuildProgress } from "../engine/BuildPipeline";
import { fileSystemManager } from "../engine/FileSystemManager";
import { templateRegistry } from "../ai/templates/TemplateRegistry";
import { useProjectStore } from "../store/project.store";
import type { Framework, Project, ProjectTemplate } from "../types";

let pidCounter = 0;
const newProjectId = () =>
  `proj_${Date.now().toString(36)}_${(++pidCounter).toString(36)}`;

export interface CreateProjectArgs {
  name: string;
  template: ProjectTemplate;
  description?: string;
  framework?: Framework;
}

export interface UseProjectResult {
  currentProject: Project | null;
  buildProgress: BuildProgress | null;
  createProject: (args: CreateProjectArgs) => Promise<Project>;
  openProject: (project: Project) => Promise<string>;
  saveCurrentFiles: () => void;
  closeProject: () => Promise<void>;
}

function projectFromTemplate(args: CreateProjectArgs): Project {
  const template = templateRegistry.get(args.template);
  if (!template) {
    throw new Error(`Unknown template: ${args.template}`);
  }
  const files: Record<string, string> = {};
  for (const f of template.files) files[f.path] = f.content;

  return {
    id: newProjectId(),
    name: args.name,
    description: args.description,
    framework: args.framework ?? template.framework,
    template: args.template,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    files,
    dependencies: { ...template.dependencies, ...template.devDependencies },
  };
}

export function useProject(): UseProjectResult {
  const currentProject = useProjectStore((s) => s.currentProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const updateCurrentProjectFiles = useProjectStore(
    (s) => s.updateCurrentProjectFiles,
  );
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(
    null,
  );

  useEffect(() => {
    return buildPipeline.onProgress((p) => setBuildProgress(p));
  }, []);

  const openProject = useCallback(
    async (project: Project): Promise<string> => {
      setCurrentProject(project);
      const url = await buildPipeline.run(project);
      return url;
    },
    [setCurrentProject],
  );

  const createProject = useCallback(
    async (args: CreateProjectArgs): Promise<Project> => {
      const project = projectFromTemplate(args);
      setCurrentProject(project);
      return project;
    },
    [setCurrentProject],
  );

  const saveCurrentFiles = useCallback(() => {
    const files = fileSystemManager
      .getAllFiles()
      .reduce<Record<string, string>>((acc, f) => {
        acc[f.path] = f.content;
        return acc;
      }, {});
    updateCurrentProjectFiles(files);
  }, [updateCurrentProjectFiles]);

  const closeProject = useCallback(async () => {
    await buildPipeline.stop();
    setCurrentProject(null);
  }, [setCurrentProject]);

  return {
    currentProject,
    buildProgress,
    createProject,
    openProject,
    saveCurrentFiles,
    closeProject,
  };
}
