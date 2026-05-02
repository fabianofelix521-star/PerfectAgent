export interface SkillMarketplace {
  id: string;
  name: string;
  description: string;
  url?: string;
  localPath?: string;
  installHint: string;
  tags: string[];
}

export const SKILL_MARKETPLACES: SkillMarketplace[] = [
  {
    id: "clawhub-local",
    name: "ClawHub Local",
    description:
      "Banco local OpenClaw/FelixSuperClaw detectado com skills, plugins e docs.",
    localPath:
      "/Users/felix/felixsuperclaw | /DATA/AppData/openclaw | /DATA/AppData/OpenClaw",
    installHint:
      "Use a tool Local ClawHub Index para localizar o root disponivel e listar .agents/skills e extensions/openclaw.plugin.json.",
    tags: ["clawhub", "openclaw", "local"],
  },
  {
    id: "skillsmp",
    name: "SkillsMP",
    description:
      "Marketplace publico de skills para Claude, Codex e ChatGPT.",
    url: "https://skillsmp.com",
    installHint:
      "Pesquise no marketplace, abra a skill e instale via repositorio/CLI indicada.",
    tags: ["marketplace", "skillsmp", "skills"],
  },
  {
    id: "ui-ux-pro-max",
    name: "UI/UX Pro Max",
    description:
      "Skill instalada com inteligencia de UI/UX, 67 estilos, paletas, tipografia, UX e design systems.",
    url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    localPath: ".codex/skills/ui-ux-pro-max",
    installHint:
      "Instalada via npx uipro-cli init --ai codex --force. Execute python3 .codex/skills/ui-ux-pro-max/scripts/search.py.",
    tags: ["ui", "ux", "design-system"],
  },
];

export function buildSkillMarketplaceContext(): string {
  return [
    "## Lojas e bancos de skills disponiveis",
    "O sistema atual e Nexus Ultra AGI. Instalar skill significa executar a instalacao real no filesystem e registrar/persistir a skill no catalogo do app, nao apenas imprimir instrucoes ou pseudo-tool-calls.",
    ...SKILL_MARKETPLACES.map((marketplace) => {
      const where = [
        marketplace.url ? `url=${marketplace.url}` : "",
        marketplace.localPath ? `local=${marketplace.localPath}` : "",
      ].filter(Boolean).join(" ");
      return `- ${marketplace.name}: ${marketplace.description} ${where}. Instalacao/uso: ${marketplace.installHint}`;
    }),
  ].join("\n");
}
