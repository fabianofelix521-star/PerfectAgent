import { useMemo } from "react";
import {
  Bot,
  Code2,
  FileText,
  GitBranch,
  MessageSquare,
  Settings,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { WorkspaceShell, Surface, SectionTitle, StatusBadge } from "@/components/ui";
import { useConfig } from "@/stores/config";
import { cn } from "@/utils/cn";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function DashboardPage() {
  const chatThreads = useConfig((s) => s.chatThreads);
  const studioThreads = useConfig((s) => s.studioThreads);
  const projects = useConfig((s) => s.projects);
  const runtimes = useConfig((s) => s.runtimes);
  const tools = useConfig((s) => s.tools);
  const integrations = useConfig((s) => s.integrations);
  const deploys = useConfig((s) => s.deploys);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = todayStart.getTime();
    const chatMessages = chatThreads.flatMap((thread) => thread.messages);
    const chatsToday = chatThreads.filter(
      (thread) => (thread.updatedAt ?? thread.createdAt) >= today,
    ).length;
    const usageByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - index));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const messages = chatMessages.filter(
        (message) =>
          message.createdAt >= date.getTime() &&
          message.createdAt < next.getTime(),
      ).length;
      return {
        day: date.toLocaleDateString("pt-BR", { weekday: "short" }),
        mensagens: messages,
      };
    });
    const recentActivity = [
      ...chatThreads.map((thread) => ({
        id: `chat:${thread.id}`,
        title: thread.title,
        subtitle: `${thread.messages.length} mensagens`,
        at: thread.updatedAt ?? thread.createdAt,
        href: `/chat/${thread.id}`,
        icon: MessageSquare,
      })),
      ...projects.map((project) => ({
        id: `project:${project.id}`,
        title: project.name,
        subtitle: `${project.files.length} arquivos`,
        at: project.updatedAt,
        href: `/code-studio/${project.id}`,
        icon: Code2,
      })),
      ...deploys.map((deploy) => ({
        id: `deploy:${deploy.id}`,
        title: `Deploy ${deploy.target}`,
        subtitle: deploy.status,
        at: deploy.at,
        href: "/code-studio",
        icon: Zap,
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 8);
    return {
      chatsToday,
      totalMessages: chatMessages.length + studioThreads.flatMap((t) => t.messages).length,
      projectsCreated: projects.length,
      activeAgents: runtimes.filter((runtime) =>
        ["running", "ready", "connected"].includes(runtime.status),
      ).length,
      enabledTools: tools.filter((tool) => tool.enabled).length,
      connectedIntegrations: integrations.filter((item) => item.connected).length,
      usageByDay,
      recentActivity,
      runningAgents: runtimes.filter((runtime) => runtime.status === "running"),
    };
  }, [chatThreads, deploys, integrations, projects, runtimes, studioThreads, tools]);

  return (
    <WorkspaceShell
      eyebrow="Dashboard"
      title="Operação PerfectAgent"
      description="Métricas reais lidas dos stores locais: conversas, projetos, runtimes, ferramentas e integrações."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Conversas Hoje" value={formatNumber(stats.chatsToday)} icon={MessageSquare} />
        <MetricCard title="Código Gerado" value={`${formatNumber(stats.projectsCreated)} projetos`} icon={Code2} />
        <MetricCard title="Agentes Ativos" value={formatNumber(stats.activeAgents)} icon={Bot} />
        <MetricCard title="Mensagens" value={formatNumber(stats.totalMessages)} icon={Zap} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Surface>
          <SectionTitle icon={Zap} title="Uso dos últimos 7 dias" desc="Contagem de mensagens criada a partir do histórico local." />
          <div className="mt-5 h-64">
            {stats.usageByDay.some((item) => item.mensagens > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.usageByDay}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="mensagens"
                    stroke="#17172d"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem mensagens registradas nesta semana." />
            )}
          </div>
        </Surface>

        <Surface>
          <SectionTitle icon={Bot} title="Agentes em execução" desc="Status real dos runtimes." />
          <div className="mt-4 space-y-2">
            {stats.runningAgents.length ? (
              stats.runningAgents.map((agent) => (
                <div key={agent.id} className="rounded-2xl bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">
                      {agent.name}
                    </span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
                    {agent.description ?? `${agent.nodes.length} nós`}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState message="Nenhum agente executando agora." />
            )}
          </div>
        </Surface>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <Surface>
          <SectionTitle icon={Wrench} title="Capacidades" desc="Ferramentas e integrações configuradas." />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Capability label="Tools" value={stats.enabledTools} />
            <Capability label="Integrações" value={stats.connectedIntegrations} />
          </div>
        </Surface>

        <Surface>
          <SectionTitle icon={FileText} title="Atividade recente" desc="Eventos reais de conversas, projetos e deploys." />
          <div className="mt-4 space-y-2">
            {stats.recentActivity.length ? (
              stats.recentActivity.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 transition hover:bg-white"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17172d] text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {item.title}
                      </span>
                      <span className="block text-xs font-medium text-slate-500">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(item.at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                );
              })
            ) : (
              <EmptyState message="Nenhuma atividade registrada." />
            )}
          </div>
        </Surface>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAccess to="/chat" icon={MessageSquare} label="Chat" />
        <QuickAccess to="/code-studio" icon={Code2} label="Code Studio" />
        <QuickAccess to="/agents" icon={Bot} label="Agentes" />
        <QuickAccess to="/workflow" icon={GitBranch} label="Workflow" />
        <QuickAccess to="/documents" icon={FileText} label="Documentos" />
        <QuickAccess to="/tools" icon={Wrench} label="Ferramentas" />
        <QuickAccess to="/integrations" icon={Zap} label="Integrações" />
        <QuickAccess to="/settings" icon={Settings} label="Configurações" />
      </div>
    </WorkspaceShell>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof MessageSquare;
}) {
  return (
    <Surface className="min-h-32">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Surface>
  );
}

function Capability({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 text-center">
      <p className="text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function QuickAccess({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/55 p-4 text-sm font-bold text-slate-800 shadow-[0_12px_34px_rgba(90,105,150,0.10)] transition hover:bg-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-28 items-center justify-center rounded-2xl bg-white/45 p-4 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}
