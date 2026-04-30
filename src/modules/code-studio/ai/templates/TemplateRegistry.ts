import type { ProjectTemplate, TemplateDefinition } from "../../types";
import { reactAppTemplate } from "./react-app.template";
import { nextjsAppTemplate } from "./nextjs-app.template";
import { ecommerceTemplate } from "./ecommerce.template";
import { saasDashboardTemplate } from "./saas-dashboard.template";
import { landingPageTemplate } from "./landing-page.template";
import { game3dTemplate } from "./game-3d.template";

const TEMPLATES: Partial<Record<ProjectTemplate, TemplateDefinition>> = {
  "react-app": reactAppTemplate,
  "nextjs-app": nextjsAppTemplate,
  ecommerce: ecommerceTemplate,
  "saas-dashboard": saasDashboardTemplate,
  "landing-page": landingPageTemplate,
  "game-3d": game3dTemplate,
};

class TemplateRegistry {
  list(): TemplateDefinition[] {
    return Object.values(TEMPLATES).filter((t): t is TemplateDefinition =>
      Boolean(t),
    );
  }

  get(id: ProjectTemplate): TemplateDefinition | undefined {
    return TEMPLATES[id];
  }

  byTag(tag: string): TemplateDefinition[] {
    return this.list().filter((t) => t.tags.includes(tag));
  }
}

export const templateRegistry = new TemplateRegistry();
export type { TemplateRegistry };
