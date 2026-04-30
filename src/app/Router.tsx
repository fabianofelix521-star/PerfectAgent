import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  BrainCircuit,
  Code2,
  FileText,
  GitBranch,
  Image,
  LayoutDashboard,
  Music,
  Plug,
  Plus,
  Settings,
  Video,
  Wrench,
} from "lucide-react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useConfig } from "@/stores/config";
import { cn } from "@/utils/cn";

type ModuleName =
  | "Dashboard"
  | "ChatHub"
  | "CodeStudio"
  | "Agents"
  | "AgentDetail"
  | "Workflow"
  | "WorkflowDetail"
  | "ImageStudio"
  | "VideoStudio"
  | "AudioStudio"
  | "Documents"
  | "Settings"
  | "SettingsProfile"
  | "SettingsAPIKeys"
  | "SettingsModels"
  | "SettingsBilling"
  | "NotFound";

export const ROUTES: Array<{ path: string; module: ModuleName }> = [
  { path: "/", module: "Dashboard" },
  { path: "/chat", module: "ChatHub" },
  { path: "/chat/:sessionId", module: "ChatHub" },
  { path: "/code-studio", module: "CodeStudio" },
  { path: "/code-studio/:id", module: "CodeStudio" },
  { path: "/agents", module: "Agents" },
  { path: "/agents/:id", module: "AgentDetail" },
  { path: "/workflow", module: "Workflow" },
  { path: "/workflow/:id", module: "WorkflowDetail" },
  { path: "/image-studio", module: "ImageStudio" },
  { path: "/video-studio", module: "VideoStudio" },
  { path: "/audio-studio", module: "AudioStudio" },
  { path: "/documents", module: "Documents" },
  { path: "/settings", module: "Settings" },
  { path: "/settings/profile", module: "SettingsProfile" },
  { path: "/settings/api-keys", module: "SettingsAPIKeys" },
  { path: "/settings/models", module: "SettingsModels" },
  { path: "/settings/billing", module: "SettingsBilling" },
  { path: "*", module: "NotFound" },
];

const Dashboard = lazyNamed(() => import("@/pages/DashboardPage"), "DashboardPage");
const ChatHub = lazyNamed(() => import("@/pages/ChatHubPage"), "ChatHubPage");
const CodeStudio = lazyNamed(
  () => import("@/pages/CodeStudioPage"),
  "CodeStudioPage",
);
const Agents = lazyNamed(() => import("@/pages/AgentsPage"), "AgentsPage");
const WorkflowPage = lazyNamed(
  () => import("@/pages/WorkflowPage"),
  "WorkflowPage",
);
const DocumentsPage = lazyNamed(
  () => import("@/pages/DocumentsPage"),
  "DocumentsPage",
);
const ImageStudioPage = lazyNamed(
  () => import("@/pages/MediaStudioPage"),
  "ImageStudioPage",
);
const VideoStudioPage = lazyNamed(
  () => import("@/pages/MediaStudioPage"),
  "VideoStudioPage",
);
const AudioStudioPage = lazyNamed(
  () => import("@/pages/MediaStudioPage"),
  "AudioStudioPage",
);
const SettingsPage = lazyNamed<{
  initialTab?: "models" | "general" | "security" | "appearance";
}>(
  () => import("@/pages/SettingsPage"),
  "SettingsPage",
);
const SkillsPage = lazyNamed(() => import("@/pages/SkillsPage"), "SkillsPage");
const ToolsPage = lazyNamed(() => import("@/pages/ToolsPage"), "ToolsPage");
const IntegrationsPage = lazyNamed(
  () => import("@/pages/IntegrationsPage"),
  "IntegrationsPage",
);
const ExtensionsPage = lazyNamed(
  () => import("@/pages/ExtensionsPage"),
  "ExtensionsPage",
);
const NotFoundPage = lazyNamed(
  () => import("@/pages/NotFoundPage"),
  "NotFoundPage",
);

function lazyNamed<Props = Record<string, never>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<Props> };
  });
}

export function AppRouter() {
  return (
    <main className="absolute inset-0 flex min-h-0 items-center justify-center p-2 sm:p-3">
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <RouteFrame>
                <Dashboard />
              </RouteFrame>
            }
          />
          <Route
            path="chat"
            element={
              <RouteFrame>
                <ChatHub />
              </RouteFrame>
            }
          />
          <Route
            path="chat/:sessionId"
            element={
              <RouteFrame>
                <ChatHub />
              </RouteFrame>
            }
          />
          <Route
            path="code-studio"
            element={
              <RouteFrame>
                <CodeStudio />
              </RouteFrame>
            }
          />
          <Route
            path="code-studio/:id"
            element={
              <RouteFrame>
                <CodeStudio />
              </RouteFrame>
            }
          />
          <Route
            path="agents"
            element={
              <RouteFrame>
                <Agents />
              </RouteFrame>
            }
          />
          <Route
            path="agents/:id"
            element={
              <RouteFrame>
                <Agents />
              </RouteFrame>
            }
          />
          <Route
            path="workflow"
            element={
              <RouteFrame>
                <WorkflowPage />
              </RouteFrame>
            }
          />
          <Route
            path="workflow/:id"
            element={
              <RouteFrame>
                <WorkflowPage />
              </RouteFrame>
            }
          />
          <Route
            path="image-studio"
            element={
              <RouteFrame>
                <ImageStudioPage />
              </RouteFrame>
            }
          />
          <Route
            path="video-studio"
            element={
              <RouteFrame>
                <VideoStudioPage />
              </RouteFrame>
            }
          />
          <Route
            path="audio-studio"
            element={
              <RouteFrame>
                <AudioStudioPage />
              </RouteFrame>
            }
          />
          <Route
            path="documents"
            element={
              <RouteFrame>
                <DocumentsPage />
              </RouteFrame>
            }
          />
          <Route
            path="settings"
            element={
              <RouteFrame>
                <SettingsPage />
              </RouteFrame>
            }
          />
          <Route path="settings/profile" element={<Navigate to="/settings" replace />} />
          <Route
            path="settings/api-keys"
            element={
              <RouteFrame>
                <SettingsPage initialTab="models" />
              </RouteFrame>
            }
          />
          <Route
            path="settings/models"
            element={
              <RouteFrame>
                <SettingsPage initialTab="models" />
              </RouteFrame>
            }
          />
          <Route
            path="settings/preferences"
            element={
              <RouteFrame>
                <SettingsPage initialTab="appearance" />
              </RouteFrame>
            }
          />
          <Route
            path="settings/code-studio"
            element={
              <RouteFrame>
                <SettingsPage initialTab="appearance" />
              </RouteFrame>
            }
          />
          <Route
            path="settings/agents"
            element={
              <RouteFrame>
                <Agents />
              </RouteFrame>
            }
          />
          <Route
            path="settings/billing"
            element={
              <RouteFrame>
                <SettingsPage initialTab="general" />
              </RouteFrame>
            }
          />
          <Route
            path="settings/import-export"
            element={
              <RouteFrame>
                <SettingsPage initialTab="general" />
              </RouteFrame>
            }
          />
          <Route
            path="skills"
            element={
              <RouteFrame>
                <SkillsPage />
              </RouteFrame>
            }
          />
          <Route
            path="tools"
            element={
              <RouteFrame>
                <ToolsPage />
              </RouteFrame>
            }
          />
          <Route
            path="integrations"
            element={
              <RouteFrame>
                <IntegrationsPage />
              </RouteFrame>
            }
          />
          <Route
            path="extensions"
            element={
              <RouteFrame>
                <ExtensionsPage />
              </RouteFrame>
            }
          />
          <Route
            path="*"
            element={
              <RouteFrame>
                <NotFoundPage />
              </RouteFrame>
            }
          />
        </Route>
      </Routes>
    </main>
  );
}

function RouteFrame({ children }: { children: ReactNode }) {
  return (
    <ModuleErrorBoundary>
      <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
    </ModuleErrorBoundary>
  );
}

function AppShell() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="glass-shell flex h-[97vh] w-full max-w-[98vw] overflow-hidden rounded-[28px] border border-white/60 bg-white/45 shadow-[0_42px_130px_rgba(69,78,133,0.34)] backdrop-blur-3xl lg:h-[98vh] lg:rounded-[40px]"
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 overflow-hidden p-2 sm:p-3 lg:p-5">
        <div className="h-full min-h-0 w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </motion.div>
  );
}

type NavItem = {
  path: string;
  label: string;
  helper: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    path: "/",
    label: "Dashboard",
    helper: "Sistema",
    icon: LayoutDashboard,
    match: (path) => path === "/",
  },
  {
    path: "/code-studio",
    label: "Code Studio",
    helper: "Criar apps",
    icon: Code2,
    match: (path) => path.startsWith("/code-studio"),
  },
  {
    path: "/agents",
    label: "Agentes",
    helper: "Runtimes",
    icon: Bot,
    match: (path) => path.startsWith("/agents"),
  },
  {
    path: "/workflow",
    label: "Workflow",
    helper: "Fluxos",
    icon: GitBranch,
    match: (path) => path.startsWith("/workflow"),
  },
  {
    path: "/image-studio",
    label: "Imagem",
    helper: "Mídia",
    icon: Image,
    match: (path) => path.startsWith("/image-studio"),
  },
  {
    path: "/video-studio",
    label: "Vídeo",
    helper: "Mídia",
    icon: Video,
    match: (path) => path.startsWith("/video-studio"),
  },
  {
    path: "/audio-studio",
    label: "Áudio",
    helper: "Mídia",
    icon: Music,
    match: (path) => path.startsWith("/audio-studio"),
  },
  {
    path: "/documents",
    label: "Documentos",
    helper: "Arquivos",
    icon: FileText,
    match: (path) => path.startsWith("/documents"),
  },
  { path: "/skills", label: "Skills", helper: "Capacidades", icon: BrainCircuit, match: (path) => path.startsWith("/skills") },
  { path: "/tools", label: "Ferramentas", helper: "Acoes", icon: Wrench, match: (path) => path.startsWith("/tools") },
  { path: "/integrations", label: "Integracoes", helper: "Conexoes", icon: Plug, match: (path) => path.startsWith("/integrations") },
  { path: "/extensions", label: "MCP", helper: "Extensoes", icon: Blocks, match: (path) => path.startsWith("/extensions") },
  { path: "/settings", label: "Configuracoes", helper: "Sistema", icon: Settings, match: (path) => path.startsWith("/settings") },
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const addChatThread = useConfig((s) => s.addChatThread);

  function createNewChat() {
    const thread = {
      id: `chat-${Date.now().toString(36)}`,
      title: "Novo chat",
      skillIds: [],
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addChatThread(thread);
    navigate(`/chat/${thread.id}`);
  }

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center justify-between py-4 sm:w-[76px] lg:w-[88px] lg:py-5">
      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={createNewChat}
          className="group relative"
          aria-label="Novo chat"
        >
          <IconVisual
            icon={Plus}
            label="Novo chat"
            active={location.pathname.startsWith("/chat")}
            primary
          />
        </button>
        <div className="mt-0.5 flex flex-col items-center gap-2.5">
          {navItems.map((item) => (
            <IconLink
              key={item.path}
              item={item}
              active={item.match(location.pathname)}
            />
          ))}
        </div>
      </div>
      <Link
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.2)]"
        aria-label="PerfectAgent"
        to="/"
      >
        <span className="absolute h-4 w-4 -rotate-45 rounded-[3px] border-l-[5px] border-t-[5px] border-white" />
        <span className="absolute h-4 w-4 translate-x-1 translate-y-1 rounded-[3px] border-r-[5px] border-b-[5px] border-white" />
      </Link>
    </aside>
  );
}

function IconLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link to={item.path} className="group relative" aria-label={item.label}>
      <IconVisual
        icon={item.icon}
        label={item.label}
        helper={item.helper}
        active={active}
      />
    </Link>
  );
}

function IconVisual({
  icon: Icon,
  label,
  helper,
  active,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  helper?: string;
  active?: boolean;
  primary?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
          primary || active
            ? "border-slate-900 bg-[#17172d] text-white shadow-[0_12px_26px_rgba(23,23,45,0.28)]"
            : "border-white/80 bg-white/80 text-slate-700 shadow-[0_8px_22px_rgba(96,107,157,0.12)] hover:bg-white",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="pointer-events-none absolute left-[50px] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/70 bg-white/95 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-800 opacity-0 shadow-xl shadow-slate-300/30 transition-all group-hover:translate-x-1 group-hover:opacity-100 lg:block">
        {label}
        {helper ? (
          <small className="block font-medium text-slate-500">{helper}</small>
        ) : null}
      </span>
    </>
  );
}

function RouteSkeleton() {
  return (
    <div className="chat-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 p-6">
      <div className="h-4 w-28 animate-pulse rounded-full bg-white/70" />
      <div className="mt-4 h-8 w-72 animate-pulse rounded-full bg-white/70" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-[22px] bg-white/55"
          />
        ))}
      </div>
    </div>
  );
}

class ModuleErrorBoundary extends Component<
  { children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="chat-surface flex h-full flex-col items-center justify-center rounded-[28px] border border-white/70 p-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">
          Erro no módulo
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Este módulo falhou ao renderizar.
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-600">
          {this.state.error.message}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: undefined })}
          className="mt-5 rounded-full bg-[#17172d] px-5 py-2 text-sm font-bold text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
