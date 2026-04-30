/**
 * Project + template types.
 */

export type Framework = "react" | "nextjs" | "vue" | "svelte" | "vanilla";

export type ProjectTemplate =
  | "blank"
  | "react-app"
  | "nextjs-app"
  | "ecommerce"
  | "saas-dashboard"
  | "landing-page"
  | "game-3d"
  | "portfolio"
  | "blog";

export interface Project {
  id: string;
  name: string;
  description?: string;
  framework: Framework;
  template: ProjectTemplate;
  createdAt: number;
  updatedAt: number;
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

export interface ProjectMeta {
  id: string;
  name: string;
  framework: Framework;
  template: ProjectTemplate;
  createdAt: number;
  updatedAt: number;
  preview?: string;
}

export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateDefinition {
  id: ProjectTemplate;
  name: string;
  description: string;
  framework: Framework;
  tags: string[];
  files: TemplateFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  commands: string[];
}
