export type DeployTargetCategory =
  | "frontend"
  | "fullstack"
  | "database"
  | "container"
  | "game"
  | "custom";

export interface DeployConfigField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  required?: boolean;
}

export interface DeployTargetDefinition {
  id: string;
  label: string;
  category: DeployTargetCategory;
  description: string;
  fullstackReady: boolean;
  docsUrl: string;
  mcp: {
    label: string;
    command: string;
    notes: string[];
  };
  requiredFields: DeployConfigField[];
  optionalFields: DeployConfigField[];
  envVars: string[];
  commands: string[];
  requirements: string[];
}

export interface DeployPlatformConfig {
  enabled?: boolean;
  values: Record<string, string>;
  notes?: string;
  updatedAt?: number;
}

export type DeployConfigMap = Record<string, DeployPlatformConfig>;

export const DEPLOY_CONFIG_STORAGE_KEY = "pa:code-studio:deploy-configs";

export const DEPLOY_TARGETS: DeployTargetDefinition[] = [
  {
    id: "vercel",
    label: "Vercel",
    category: "fullstack",
    fullstackReady: true,
    description: "Frontend, serverless functions, edge functions and managed env vars for Next/Vite/fullstack apps.",
    docsUrl: "https://vercel.com/docs",
    mcp: {
      label: "Vercel MCP / API bridge",
      command: "npx -y mcp-remote <VERCEL_MCP_ENDPOINT> --header Authorization:Bearer:$VERCEL_TOKEN",
      notes: ["Use token scoped to the target team", "Map org/project IDs before deploy", "Sync env vars before production deploy"],
    },
    requiredFields: [
      { key: "VERCEL_TOKEN", label: "Vercel token", secret: true, required: true },
      { key: "VERCEL_ORG_ID", label: "Org/team ID", required: true },
      { key: "VERCEL_PROJECT_ID", label: "Project ID", required: true },
    ],
    optionalFields: [
      { key: "VERCEL_SCOPE", label: "Team scope" },
      { key: "VERCEL_ENV", label: "Environment", placeholder: "preview | production" },
    ],
    envVars: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    commands: ["vercel pull", "vercel build", "vercel deploy --prebuilt --prod"],
    requirements: ["API token", "team/project link", "build command", "output directory", "runtime env vars"],
  },
  {
    id: "netlify",
    label: "Netlify",
    category: "fullstack",
    fullstackReady: true,
    description: "Static apps, serverless functions, edge functions, forms and deploy previews.",
    docsUrl: "https://docs.netlify.com",
    mcp: {
      label: "Netlify MCP / API bridge",
      command: "npx -y mcp-remote <NETLIFY_MCP_ENDPOINT> --header Authorization:Bearer:$NETLIFY_AUTH_TOKEN",
      notes: ["Use a personal access token", "Site ID is required for existing sites", "Functions need netlify.toml or framework detection"],
    },
    requiredFields: [
      { key: "NETLIFY_AUTH_TOKEN", label: "Netlify auth token", secret: true, required: true },
      { key: "NETLIFY_SITE_ID", label: "Site ID", required: true },
    ],
    optionalFields: [{ key: "NETLIFY_TEAM_SLUG", label: "Team slug" }],
    envVars: ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"],
    commands: ["netlify link", "netlify build", "netlify deploy --prod --dir=dist"],
    requirements: ["personal access token", "site ID", "build command", "publish directory", "functions directory"],
  },
  {
    id: "github-pages",
    label: "GitHub Pages",
    category: "frontend",
    fullstackReady: false,
    description: "Static publishing from GitHub Actions or a Pages branch. Pair with APIs/db providers for fullstack apps.",
    docsUrl: "https://docs.github.com/pages",
    mcp: {
      label: "GitHub MCP",
      command: "npx -y @modelcontextprotocol/server-github",
      notes: ["Requires a GitHub token with repo/workflow scopes", "Use Actions for builds", "No backend runtime on Pages itself"],
    },
    requiredFields: [
      { key: "GITHUB_TOKEN", label: "GitHub token", secret: true, required: true },
      { key: "GITHUB_REPOSITORY", label: "owner/repo", placeholder: "owner/repo", required: true },
    ],
    optionalFields: [
      { key: "GITHUB_PAGES_BRANCH", label: "Pages branch", placeholder: "gh-pages" },
      { key: "GITHUB_PAGES_CNAME", label: "Custom domain" },
    ],
    envVars: ["GITHUB_TOKEN", "GITHUB_REPOSITORY"],
    commands: ["npm run build", "gh workflow run deploy.yml", "git push origin gh-pages"],
    requirements: ["repository", "workflow permissions", "static output", "Pages source branch or GitHub Actions"],
  },
  {
    id: "docker",
    label: "Docker",
    category: "container",
    fullstackReady: true,
    description: "Container image build/push for any fullstack runtime, deployable to VPS, Kubernetes, Fly, Railway, Render or custom hosts.",
    docsUrl: "https://docs.docker.com",
    mcp: {
      label: "Docker MCP / local daemon",
      command: "npx -y @modelcontextprotocol/server-docker",
      notes: ["Docker daemon must be available", "Registry token should be scoped", "Add healthcheck and rollback tags"],
    },
    requiredFields: [
      { key: "DOCKER_REGISTRY", label: "Registry", placeholder: "ghcr.io/org/app", required: true },
      { key: "DOCKER_USERNAME", label: "Registry username", required: true },
      { key: "DOCKER_TOKEN", label: "Registry token", secret: true, required: true },
    ],
    optionalFields: [{ key: "DOCKER_CONTEXT", label: "Remote context" }],
    envVars: ["DOCKER_REGISTRY", "DOCKER_USERNAME", "DOCKER_TOKEN"],
    commands: ["docker build -t $DOCKER_REGISTRY:latest .", "docker push $DOCKER_REGISTRY:latest"],
    requirements: ["Dockerfile", "registry credentials", "runtime port", "healthcheck", "secrets injection strategy"],
  },
  {
    id: "supabase",
    label: "Supabase",
    category: "database",
    fullstackReady: true,
    description: "Postgres, auth, storage, realtime and edge functions for fullstack apps.",
    docsUrl: "https://supabase.com/docs",
    mcp: {
      label: "Supabase MCP",
      command: "npx -y @supabase/mcp-server-supabase@latest --access-token $SUPABASE_ACCESS_TOKEN",
      notes: ["Use access token, not service role, for MCP control", "Project ref ties migrations/functions to the correct project", "Keep service role server-only"],
    },
    requiredFields: [
      { key: "SUPABASE_ACCESS_TOKEN", label: "Supabase access token", secret: true, required: true },
      { key: "SUPABASE_PROJECT_REF", label: "Project ref", required: true },
      { key: "SUPABASE_URL", label: "Project URL", required: true },
      { key: "SUPABASE_ANON_KEY", label: "Anon key", secret: true, required: true },
    ],
    optionalFields: [
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key", secret: true },
      { key: "SUPABASE_DB_PASSWORD", label: "DB password", secret: true },
      { key: "DATABASE_URL", label: "Postgres connection string", secret: true },
    ],
    envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"],
    commands: ["supabase link --project-ref $SUPABASE_PROJECT_REF", "supabase db push", "supabase functions deploy"],
    requirements: ["access token", "project ref", "anon key", "server-only service role", "migration policy"],
  },
  {
    id: "firebase",
    label: "Firebase",
    category: "fullstack",
    fullstackReady: true,
    description: "Hosting, App Hosting, Functions, Firestore, Auth, Storage and Cloud Run-backed deployments.",
    docsUrl: "https://firebase.google.com/docs",
    mcp: {
      label: "Firebase MCP / firebase-tools",
      command: "npx -y firebase-tools@latest experimental:mcp",
      notes: ["CI should use service account credentials", "Hosting targets need firebase.json", "Functions require billing on many projects"],
    },
    requiredFields: [
      { key: "FIREBASE_PROJECT_ID", label: "Firebase project ID", required: true },
      { key: "GOOGLE_APPLICATION_CREDENTIALS_JSON", label: "Service account JSON", secret: true, required: true },
    ],
    optionalFields: [
      { key: "FIREBASE_SITE", label: "Hosting site" },
      { key: "FIREBASE_TOKEN", label: "Legacy CI token", secret: true },
    ],
    envVars: ["FIREBASE_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON", "FIREBASE_SITE"],
    commands: ["firebase use $FIREBASE_PROJECT_ID", "firebase deploy --only hosting,functions"],
    requirements: ["Firebase project", "service account", "firebase.json", "hosting target", "rules/indexes for Firestore"],
  },
  {
    id: "railway",
    label: "Railway",
    category: "fullstack",
    fullstackReady: true,
    description: "Fullstack services, workers, Postgres/Redis and environment-based deploys.",
    docsUrl: "https://docs.railway.com",
    mcp: {
      label: "Railway API MCP bridge",
      command: "npx -y mcp-remote <RAILWAY_MCP_ENDPOINT> --header Authorization:Bearer:$RAILWAY_TOKEN",
      notes: ["Project/service/environment IDs prevent accidental deploys", "Use variables per environment", "Attach managed Postgres if needed"],
    },
    requiredFields: [
      { key: "RAILWAY_TOKEN", label: "Railway token", secret: true, required: true },
      { key: "RAILWAY_PROJECT_ID", label: "Project ID", required: true },
      { key: "RAILWAY_SERVICE_ID", label: "Service ID", required: true },
    ],
    optionalFields: [{ key: "RAILWAY_ENVIRONMENT_ID", label: "Environment ID" }],
    envVars: ["RAILWAY_TOKEN", "RAILWAY_PROJECT_ID", "RAILWAY_SERVICE_ID"],
    commands: ["railway link", "railway variables", "railway up"],
    requirements: ["token", "project/service", "start command", "runtime env vars", "database attachment if fullstack"],
  },
  {
    id: "render",
    label: "Render",
    category: "fullstack",
    fullstackReady: true,
    description: "Web services, static sites, workers, cron jobs and managed Postgres/Redis.",
    docsUrl: "https://render.com/docs",
    mcp: {
      label: "Render API MCP bridge",
      command: "npx -y mcp-remote <RENDER_MCP_ENDPOINT> --header Authorization:Bearer:$RENDER_API_KEY",
      notes: ["Service ID targets deploys", "Use blueprint/render.yaml for repeatability", "Set region and plan deliberately"],
    },
    requiredFields: [
      { key: "RENDER_API_KEY", label: "Render API key", secret: true, required: true },
      { key: "RENDER_SERVICE_ID", label: "Service ID", required: true },
    ],
    optionalFields: [{ key: "RENDER_OWNER_ID", label: "Owner ID" }],
    envVars: ["RENDER_API_KEY", "RENDER_SERVICE_ID"],
    commands: ["render deploys create", "render services list"],
    requirements: ["service ID", "build/start commands", "environment variables", "database connection"],
  },
  {
    id: "cloudflare",
    label: "Cloudflare Pages/Workers",
    category: "fullstack",
    fullstackReady: true,
    description: "Pages, Workers, D1, R2, KV, Queues and edge APIs.",
    docsUrl: "https://developers.cloudflare.com",
    mcp: {
      label: "Cloudflare API MCP bridge",
      command: "npx -y mcp-remote <CLOUDFLARE_MCP_ENDPOINT> --header Authorization:Bearer:$CLOUDFLARE_API_TOKEN",
      notes: ["Token must include account/resource permissions", "D1/KV/R2 bindings must match wrangler config", "Use per-env secrets"],
    },
    requiredFields: [
      { key: "CLOUDFLARE_API_TOKEN", label: "API token", secret: true, required: true },
      { key: "CLOUDFLARE_ACCOUNT_ID", label: "Account ID", required: true },
    ],
    optionalFields: [{ key: "CLOUDFLARE_PROJECT_NAME", label: "Pages/Worker name" }],
    envVars: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
    commands: ["wrangler pages deploy dist", "wrangler deploy"],
    requirements: ["account token", "wrangler.toml", "bindings for D1/KV/R2", "compatibility date"],
  },
  {
    id: "fly",
    label: "Fly.io",
    category: "container",
    fullstackReady: true,
    description: "Dockerized fullstack apps, machines, volumes and Postgres near users.",
    docsUrl: "https://fly.io/docs",
    mcp: {
      label: "Fly API MCP bridge",
      command: "npx -y mcp-remote <FLY_MCP_ENDPOINT> --header Authorization:Bearer:$FLY_API_TOKEN",
      notes: ["App name and org are required", "Secrets must be set before release", "Use volumes only for stateful services"],
    },
    requiredFields: [
      { key: "FLY_API_TOKEN", label: "Fly API token", secret: true, required: true },
      { key: "FLY_APP_NAME", label: "App name", required: true },
    ],
    optionalFields: [{ key: "FLY_ORG", label: "Organization" }],
    envVars: ["FLY_API_TOKEN", "FLY_APP_NAME"],
    commands: ["fly launch", "fly secrets set", "fly deploy"],
    requirements: ["fly.toml", "Dockerfile or buildpack", "app name", "region", "secrets"],
  },
  {
    id: "neon",
    label: "Neon Postgres",
    category: "database",
    fullstackReady: true,
    description: "Serverless Postgres with branching for preview and production databases.",
    docsUrl: "https://neon.com/docs",
    mcp: {
      label: "Postgres MCP + Neon API bridge",
      command: "npx -y @modelcontextprotocol/server-postgres $DATABASE_URL",
      notes: ["Use pooled URL for serverless runtimes", "Use direct URL for migrations", "Branch previews map well to deploy previews"],
    },
    requiredFields: [
      { key: "DATABASE_URL", label: "Pooled database URL", secret: true, required: true },
      { key: "DIRECT_URL", label: "Direct migration URL", secret: true, required: true },
    ],
    optionalFields: [
      { key: "NEON_API_KEY", label: "Neon API key", secret: true },
      { key: "NEON_PROJECT_ID", label: "Project ID" },
    ],
    envVars: ["DATABASE_URL", "DIRECT_URL", "NEON_API_KEY"],
    commands: ["prisma migrate deploy", "psql $DIRECT_URL -f migrations.sql"],
    requirements: ["connection string", "migration URL", "SSL", "migration workflow"],
  },
  {
    id: "planetscale",
    label: "PlanetScale",
    category: "database",
    fullstackReady: true,
    description: "Managed MySQL/Vitess with deploy requests and branching workflows.",
    docsUrl: "https://planetscale.com/docs",
    mcp: {
      label: "MySQL MCP / PlanetScale API bridge",
      command: "npx -y mcp-remote <PLANETSCALE_MCP_ENDPOINT> --header Authorization:Bearer:$PLANETSCALE_SERVICE_TOKEN",
      notes: ["Use service tokens for automation", "Branch and deploy request workflow matters", "Connection string should stay server-only"],
    },
    requiredFields: [
      { key: "DATABASE_URL", label: "MySQL connection string", secret: true, required: true },
      { key: "PLANETSCALE_SERVICE_TOKEN_ID", label: "Service token ID", secret: true, required: true },
      { key: "PLANETSCALE_SERVICE_TOKEN", label: "Service token", secret: true, required: true },
    ],
    optionalFields: [{ key: "PLANETSCALE_ORG", label: "Organization" }],
    envVars: ["DATABASE_URL", "PLANETSCALE_SERVICE_TOKEN_ID", "PLANETSCALE_SERVICE_TOKEN"],
    commands: ["pscale branch create", "pscale deploy-request create", "prisma migrate deploy"],
    requirements: ["service token", "database/branch", "connection string", "migration strategy"],
  },
  {
    id: "mongodb-atlas",
    label: "MongoDB Atlas",
    category: "database",
    fullstackReady: true,
    description: "Managed MongoDB clusters, App Services, triggers and vector search.",
    docsUrl: "https://www.mongodb.com/docs/atlas",
    mcp: {
      label: "MongoDB MCP / Atlas API bridge",
      command: "npx -y mcp-remote <MONGODB_MCP_ENDPOINT> --header Authorization:Bearer:$MONGODB_ATLAS_API_TOKEN",
      notes: ["Atlas API uses public/private key credentials", "IP access and users must be provisioned", "Keep connection URI server-only"],
    },
    requiredFields: [
      { key: "MONGODB_URI", label: "MongoDB URI", secret: true, required: true },
      { key: "MONGODB_ATLAS_PROJECT_ID", label: "Atlas project ID", required: true },
    ],
    optionalFields: [
      { key: "MONGODB_ATLAS_PUBLIC_KEY", label: "Atlas public key", secret: true },
      { key: "MONGODB_ATLAS_PRIVATE_KEY", label: "Atlas private key", secret: true },
    ],
    envVars: ["MONGODB_URI", "MONGODB_ATLAS_PROJECT_ID"],
    commands: ["atlas clusters list", "atlas deployments connect", "npm run migrate"],
    requirements: ["cluster", "DB user", "network access", "connection URI", "schema/index migration"],
  },
  {
    id: "turso",
    label: "Turso / LibSQL",
    category: "database",
    fullstackReady: true,
    description: "Edge SQLite/libSQL database for lightweight fullstack apps.",
    docsUrl: "https://docs.turso.tech",
    mcp: {
      label: "SQLite MCP + Turso API bridge",
      command: "npx -y @modelcontextprotocol/server-sqlite <LOCAL_DB_PATH>",
      notes: ["Use Turso auth token for remote DB", "Sync schema with migrations", "Good fit for edge/lightweight apps"],
    },
    requiredFields: [
      { key: "TURSO_DATABASE_URL", label: "Database URL", required: true },
      { key: "TURSO_AUTH_TOKEN", label: "DB auth token", secret: true, required: true },
    ],
    optionalFields: [{ key: "TURSO_API_TOKEN", label: "Turso API token", secret: true }],
    envVars: ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"],
    commands: ["turso db create", "turso db shell", "npm run migrate"],
    requirements: ["database URL", "auth token", "migration command", "edge runtime compatibility"],
  },
  {
    id: "roblox",
    label: "Roblox Studio / Open Cloud",
    category: "game",
    fullstackReady: false,
    description: "Roblox experience publishing through Open Cloud plus Rojo/Aftman/Wally-style project workflows.",
    docsUrl: "https://create.roblox.com/docs/cloud/open-cloud",
    mcp: {
      label: "Roblox Open Cloud custom MCP",
      command: "npx -y mcp-remote <ROBLOX_OPEN_CLOUD_MCP_ENDPOINT> --header x-api-key:$ROBLOX_API_KEY",
      notes: ["No generic official Roblox Studio MCP is assumed here", "Open Cloud can publish/manage experiences when API key scopes allow it", "Use Rojo for file-to-Studio sync workflows"],
    },
    requiredFields: [
      { key: "ROBLOX_API_KEY", label: "Open Cloud API key", secret: true, required: true },
      { key: "ROBLOX_UNIVERSE_ID", label: "Universe ID", required: true },
      { key: "ROBLOX_PLACE_ID", label: "Place ID", required: true },
    ],
    optionalFields: [
      { key: "ROJO_PROJECT_FILE", label: "Rojo project file", placeholder: "default.project.json" },
      { key: "ROBLOX_GROUP_ID", label: "Group ID" },
    ],
    envVars: ["ROBLOX_API_KEY", "ROBLOX_UNIVERSE_ID", "ROBLOX_PLACE_ID"],
    commands: ["rojo build -o place.rbxlx", "roblox-open-cloud publish-place place.rbxlx"],
    requirements: ["Open Cloud API key with experience scopes", "universe/place IDs", "Rojo project", "publish permissions"],
  },
  {
    id: "custom",
    label: "Custom",
    category: "custom",
    fullstackReady: true,
    description: "Any HTTP, webhook, SSH, CI/CD or MCP-compatible deployment endpoint.",
    docsUrl: "https://modelcontextprotocol.io",
    mcp: {
      label: "Custom MCP server",
      command: "npx -y mcp-remote $CUSTOM_MCP_URL --header Authorization:Bearer:$CUSTOM_MCP_TOKEN",
      notes: ["Define exact tools and permissions", "Prefer scoped tokens", "Document rollback and healthcheck commands"],
    },
    requiredFields: [
      { key: "CUSTOM_MCP_URL", label: "MCP endpoint URL", required: true },
      { key: "CUSTOM_MCP_TOKEN", label: "MCP token", secret: true, required: true },
    ],
    optionalFields: [
      { key: "DEPLOY_WEBHOOK_URL", label: "Deploy webhook URL" },
      { key: "DEPLOY_WEBHOOK_TOKEN", label: "Webhook token", secret: true },
    ],
    envVars: ["CUSTOM_MCP_URL", "CUSTOM_MCP_TOKEN", "DEPLOY_WEBHOOK_URL"],
    commands: ["curl -X POST $DEPLOY_WEBHOOK_URL", "npm run build"],
    requirements: ["endpoint", "token", "payload schema", "rollback route", "audit log"],
  },
];

export const DEPLOY_TARGET_OPTIONS = DEPLOY_TARGETS.map((target) => ({
  value: target.id,
  label: target.label,
}));

export function getDeployTarget(id: string): DeployTargetDefinition {
  return DEPLOY_TARGETS.find((target) => target.id === id) ?? DEPLOY_TARGETS[0];
}

export function loadDeployConfigs(): DeployConfigMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEPLOY_CONFIG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DeployConfigMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDeployConfigs(configs: DeployConfigMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEPLOY_CONFIG_STORAGE_KEY, JSON.stringify(configs));
}

export function getDeployConfigStatus(
  target: DeployTargetDefinition,
  config: DeployPlatformConfig | undefined,
): { configured: boolean; missing: string[] } {
  const values = config?.values ?? {};
  const missing = target.requiredFields
    .filter((field) => field.required !== false)
    .filter((field) => !values[field.key]?.trim())
    .map((field) => field.key);
  return { configured: missing.length === 0, missing };
}

export function deployEnvExample(
  target: DeployTargetDefinition,
  config: DeployPlatformConfig | undefined,
): string {
  const values = config?.values ?? {};
  const fields = [...target.requiredFields, ...target.optionalFields];
  return fields
    .filter((field) => target.envVars.includes(field.key) || values[field.key])
    .map((field) => `${field.key}=${values[field.key] ? maskSecret(values[field.key], field.secret) : ""}`)
    .join("\n");
}

export function maskSecret(value: string, secret?: boolean): string {
  if (!secret || !value) return value;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}