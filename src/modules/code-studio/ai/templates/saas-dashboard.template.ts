import type { TemplateDefinition } from "../../types";
import {
  REACT_BASE_DEPS,
  REACT_BASE_DEV_DEPS,
  buildReactBaseFiles,
} from "./_reactBase";

const metricsData = `export const REVENUE = [\n  { month: 'Jan', value: 41200 }, { month: 'Fev', value: 48750 }, { month: 'Mar', value: 52100 },\n  { month: 'Abr', value: 47890 }, { month: 'Mai', value: 61200 }, { month: 'Jun', value: 68450 },\n  { month: 'Jul', value: 72980 }, { month: 'Ago', value: 79100 }, { month: 'Set', value: 85420 },\n  { month: 'Out', value: 91200 }, { month: 'Nov', value: 98700 }, { month: 'Dez', value: 112400 },\n];\nexport const KPIS = [\n  { label: 'Receita (mês)', value: 'R$ 112.400', delta: 12.4, trend: 'up' as const },\n  { label: 'Usuários ativos', value: '8.249', delta: 4.1, trend: 'up' as const },\n  { label: 'Taxa de churn', value: '2.1%', delta: -0.6, trend: 'down' as const },\n  { label: 'Tickets abertos', value: '47', delta: -18, trend: 'down' as const },\n];\nexport const RECENT_USERS = [\n  { id: 'u1', name: 'Ana Beatriz', email: 'ana@nexus.io', plan: 'Pro', mrr: 199, status: 'ativo' as const },\n  { id: 'u2', name: 'Carlos Mendes', email: 'carlos@nexus.io', plan: 'Team', mrr: 499, status: 'ativo' as const },\n  { id: 'u3', name: 'Daniela Torres', email: 'dani@nexus.io', plan: 'Pro', mrr: 199, status: 'trial' as const },\n  { id: 'u4', name: 'Eduardo Lima', email: 'edu@nexus.io', plan: 'Free', mrr: 0, status: 'ativo' as const },\n  { id: 'u5', name: 'Fernanda Souza', email: 'fer@nexus.io', plan: 'Team', mrr: 499, status: 'cancelado' as const },\n  { id: 'u6', name: 'Gustavo Reis', email: 'gus@nexus.io', plan: 'Pro', mrr: 199, status: 'ativo' as const },\n];\n`;

const sidebar = `import { LayoutDashboard, Users, BarChart3, Settings, CreditCard } from 'lucide-react';\n\ntype Page = 'dashboard' | 'users' | 'billing' | 'settings';\nconst items: Array<{ id: Page; icon: typeof LayoutDashboard; label: string }> = [\n  { id: 'dashboard', icon: LayoutDashboard, label: 'Visão geral' },\n  { id: 'users', icon: Users, label: 'Usuários' },\n  { id: 'billing', icon: CreditCard, label: 'Cobrança' },\n  { id: 'settings', icon: Settings, label: 'Configurações' },\n];\nexport function Sidebar({ active, onNavigate }: { active: Page; onNavigate: (p: Page) => void }) {\n  return (\n    <aside className="hidden md:flex w-60 shrink-0 bg-slate-900 text-slate-100 flex-col">\n      <div className="h-16 px-6 flex items-center font-bold text-lg tracking-tight">nexus<span className="text-brand-500">/admin</span></div>\n      <nav className="flex-1 px-3 py-4 space-y-1">\n        {items.map(({ id, icon: Icon, label }) => (\n          <button key={id} type="button" onClick={() => onNavigate(id)} className={'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ' + (active === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>\n            <Icon className="w-4 h-4" /> {label}\n          </button>\n        ))}\n        <a href="#" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white"><BarChart3 className="w-4 h-4" /> Analytics</a>\n      </nav>\n      <div className="p-4 text-xs text-slate-500 border-t border-slate-800">v1.0 · NEXUS</div>\n    </aside>\n  );\n}\n`;

const kpiCard = `import { TrendingUp, TrendingDown } from 'lucide-react';\nexport function KpiCard({ label, value, delta, trend }: { label: string; value: string; delta: number; trend: 'up' | 'down' }) {\n  const positive = (trend === 'up' && delta >= 0) || (trend === 'down' && delta <= 0);\n  const Arrow = delta >= 0 ? TrendingUp : TrendingDown;\n  return (\n    <div className="bg-white rounded-2xl border border-slate-200 p-5">\n      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>\n      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>\n      <div className={\`mt-3 inline-flex items-center gap-1 text-xs font-medium \${positive ? 'text-emerald-600' : 'text-rose-600'}\`}>\n        <Arrow className="w-3.5 h-3.5" /> {delta > 0 ? '+' : ''}{delta}%\n      </div>\n    </div>\n  );\n}\n`;

const chart = `import { REVENUE } from '../data/metrics';\nexport function RevenueChart() {\n  const max = Math.max(...REVENUE.map((r) => r.value));\n  const points = REVENUE.map((r, i) => {\n    const x = (i / (REVENUE.length - 1)) * 100;\n    const y = 100 - (r.value / max) * 90;\n    return \`\${x},\${y}\`;\n  }).join(' ');\n  const area = \`0,100 \${points} 100,100\`;\n  return (\n    <div className="bg-white rounded-2xl border border-slate-200 p-6">\n      <div className="flex items-baseline justify-between">\n        <div>\n          <h3 className="font-semibold">Receita mensal</h3>\n          <p className="text-xs text-slate-500">Últimos 12 meses</p>\n        </div>\n        <p className="text-sm font-medium text-emerald-600">+172% YoY</p>\n      </div>\n      <svg viewBox="0 0 100 100" className="mt-4 w-full h-48" preserveAspectRatio="none">\n        <defs>\n          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient>\n        </defs>\n        <polygon fill="url(#g1)" points={area} />\n        <polyline fill="none" stroke="#6366f1" strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />\n      </svg>\n      <div className="mt-2 flex justify-between text-xs text-slate-400">\n        {REVENUE.map((r) => <span key={r.month}>{r.month}</span>)}\n      </div>\n    </div>\n  );\n}\n`;

const usersTable = `import { RECENT_USERS } from '../data/metrics';\nconst statusStyles: Record<string, string> = {\n  ativo: 'bg-emerald-50 text-emerald-700',\n  trial: 'bg-amber-50 text-amber-700',\n  cancelado: 'bg-rose-50 text-rose-700',\n};\nexport function UsersTable() {\n  return (\n    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">\n      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">\n        <h3 className="font-semibold">Usuários recentes</h3>\n        <button type="button" className="text-sm text-brand-700 hover:underline">Ver todos</button>\n      </div>\n      <table className="w-full text-sm">\n        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">\n          <tr>\n            <th className="text-left px-6 py-3 font-medium">Usuário</th>\n            <th className="text-left px-6 py-3 font-medium">Plano</th>\n            <th className="text-left px-6 py-3 font-medium">MRR</th>\n            <th className="text-left px-6 py-3 font-medium">Status</th>\n          </tr>\n        </thead>\n        <tbody className="divide-y divide-slate-100">\n          {RECENT_USERS.map((u) => (\n            <tr key={u.id} className="hover:bg-slate-50">\n              <td className="px-6 py-3">\n                <div className="font-medium">{u.name}</div>\n                <div className="text-xs text-slate-500">{u.email}</div>\n              </td>\n              <td className="px-6 py-3">{u.plan}</td>\n              <td className="px-6 py-3">R$ {u.mrr.toFixed(2)}</td>\n              <td className="px-6 py-3"><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusStyles[u.status]}\`}>{u.status}</span></td>\n            </tr>\n          ))}\n        </tbody>\n      </table>\n    </div>\n  );\n}\n`;

const topBar = `import { Bell, Search } from 'lucide-react';
export function TopBar({ title }: { title: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-500" />
          <input className="bg-transparent outline-none text-sm w-48" placeholder="Buscar…" />
        </div>
        <button type="button" className="p-2 rounded-lg hover:bg-slate-100 relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Ana</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-semibold">A</div>
        </div>
      </div>
    </header>
  );
}
`;

const activityFeed = `interface Activity { id: string; user: string; action: string; time: string; tone: 'success' | 'info' | 'warn' }
const feed: Activity[] = [
  { id: 'a1', user: 'Ana Beatriz', action: 'fez upgrade para Pro', time: '2 min', tone: 'success' },
  { id: 'a2', user: 'Carlos Mendes', action: 'criou novo workspace', time: '14 min', tone: 'info' },
  { id: 'a3', user: 'Daniela Torres', action: 'ativou o trial', time: '1 h', tone: 'info' },
  { id: 'a4', user: 'Sistema', action: 'detectou pico de latência em /api/v1', time: '2 h', tone: 'warn' },
  { id: 'a5', user: 'Eduardo Lima', action: 'convidou 3 membros', time: '4 h', tone: 'success' },
];
const dot: Record<Activity['tone'], string> = { success: 'bg-emerald-500', info: 'bg-sky-500', warn: 'bg-amber-500' };
export function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold">Atividade recente</h3>
      <ul className="mt-4 space-y-3">
        {feed.map((a) => (
          <li key={a.id} className="flex items-start gap-3 text-sm">
            <span className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + dot[a.tone]} />
            <div className="flex-1"><span className="font-medium">{a.user}</span> <span className="text-slate-600">{a.action}</span></div>
            <span className="text-xs text-slate-400 shrink-0">{a.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const usersPage = `import { useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { RECENT_USERS } from '../data/metrics';
const statusStyles: Record<string, string> = { ativo: 'bg-emerald-50 text-emerald-700', trial: 'bg-amber-50 text-amber-700', cancelado: 'bg-rose-50 text-rose-700' };
export function UsersPage() {
  const [filter, setFilter] = useState('');
  const list = useMemo(() => RECENT_USERS.filter((u) => !filter || u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase())), [filter]);
  return (
    <>
      <TopBar title="Usuários" />
      <div className="flex-1 p-8 space-y-4 overflow-auto">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar usuários…" className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr><th className="text-left px-6 py-3 font-medium">Usuário</th><th className="text-left px-6 py-3 font-medium">Plano</th><th className="text-left px-6 py-3 font-medium">MRR</th><th className="text-left px-6 py-3 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((u) => (<tr key={u.id} className="hover:bg-slate-50"><td className="px-6 py-3"><div className="font-medium">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td><td className="px-6 py-3">{u.plan}</td><td className="px-6 py-3">R$ {u.mrr.toFixed(2)}</td><td className="px-6 py-3"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + statusStyles[u.status]}>{u.status}</span></td></tr>))}
              {list.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 py-10">Nenhum usuário encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
`;

const billingPage = `import { TopBar } from '../components/TopBar';
import { CreditCard, Download } from 'lucide-react';
const invoices = [
  { id: 'INV-2026-014', date: '01/abr/2026', amount: 499, status: 'Pago' },
  { id: 'INV-2026-013', date: '01/mar/2026', amount: 499, status: 'Pago' },
  { id: 'INV-2026-012', date: '01/fev/2026', amount: 499, status: 'Pago' },
  { id: 'INV-2026-011', date: '01/jan/2026', amount: 199, status: 'Pago' },
];
export function BillingPage() {
  return (
    <>
      <TopBar title="Cobrança" />
      <div className="flex-1 p-8 space-y-6 overflow-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4"><CreditCard className="w-8 h-8 text-brand-700" /><div><p className="font-semibold">Visa terminando em 4242</p><p className="text-xs text-slate-500">Vence 12/2028</p></div></div>
          <button type="button" className="text-sm text-brand-700 font-medium hover:underline">Atualizar</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200"><h3 className="font-semibold">Faturas</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr><th className="text-left px-6 py-3 font-medium">Fatura</th><th className="text-left px-6 py-3 font-medium">Data</th><th className="text-left px-6 py-3 font-medium">Valor</th><th className="text-right px-6 py-3 font-medium">PDF</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((i) => (<tr key={i.id}><td className="px-6 py-3 font-mono">{i.id}</td><td className="px-6 py-3">{i.date}</td><td className="px-6 py-3">R$ {i.amount.toFixed(2)}</td><td className="px-6 py-3 text-right"><button type="button" className="p-1.5 rounded hover:bg-slate-100"><Download className="w-4 h-4" /></button></td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
`;

const settingsPage = `import { TopBar } from '../components/TopBar';
export function SettingsPage() {
  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex-1 p-8 max-w-2xl overflow-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div><label className="text-sm font-medium">Nome do workspace</label><input defaultValue="NEXUS Inc." className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
          <div><label className="text-sm font-medium">Email administrativo</label><input defaultValue="admin@nexus.io" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
          <div><label className="text-sm font-medium">Notificações</label>
            <div className="mt-2 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-500" /> Resumo semanal por email</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-500" /> Alertas de incidente</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded border-slate-300 text-brand-500" /> Novidades do produto</label>
            </div>
          </div>
          <button type="button" className="w-full md:w-auto rounded-lg bg-brand-500 text-white font-medium px-5 py-2 hover:bg-brand-700">Salvar alterações</button>
        </div>
      </div>
    </>
  );
}
`;

const mockApi = `const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const api = {
  async fetchKPIs() { await delay(80); return [
    { label: 'Receita (mês)', value: 'R$ 112.400', delta: 12.4 },
    { label: 'Usuários ativos', value: '8.249', delta: 4.1 },
  ]; },
  async invite(email: string) { await delay(120); return { ok: true, email }; },
};
`;

const readme = `# Nexus SaaS Dashboard

Painel administrativo com KPIs, gráfico de receita SVG, tabela de usuários, páginas de cobrança, configurações e feed de atividade.

## Estrutura
- \`src/data/metrics.ts\` — fixtures
- \`src/api/mockApi.ts\` — mock API assíncrona
- \`src/components/\` — Sidebar, TopBar, KpiCard, RevenueChart, UsersTable, ActivityFeed
- \`src/pages/\` — Dashboard, Users, Billing, Settings
`;

const gitignore = `node_modules\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

const app = `import { useState } from 'react';\nimport { Sidebar } from './components/Sidebar';\nimport { TopBar } from './components/TopBar';\nimport { KpiCard } from './components/KpiCard';\nimport { RevenueChart } from './components/RevenueChart';\nimport { UsersTable } from './components/UsersTable';\nimport { ActivityFeed } from './components/ActivityFeed';\nimport { UsersPage } from './pages/UsersPage';\nimport { BillingPage } from './pages/BillingPage';\nimport { SettingsPage } from './pages/SettingsPage';\nimport { KPIS } from './data/metrics';\n\ntype Page = 'dashboard' | 'users' | 'billing' | 'settings';\n\nexport default function App() {\n  const [page, setPage] = useState<Page>('dashboard');\n  return (\n    <div className="min-h-full flex bg-slate-50">\n      <Sidebar active={page} onNavigate={setPage} />\n      <main className="flex-1 flex flex-col">\n        {page === 'dashboard' && (\n          <>\n            <TopBar title="Visão geral" />\n            <div className="flex-1 p-8 space-y-6 overflow-auto">\n              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{KPIS.map((k) => <KpiCard key={k.label} {...k} />)}</section>\n              <div className="grid lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><RevenueChart /></div><ActivityFeed /></div>\n              <UsersTable />\n            </div>\n          </>\n        )}\n        {page === 'users' && <UsersPage />}\n        {page === 'billing' && <BillingPage />}\n        {page === 'settings' && <SettingsPage />}\n      </main>\n    </div>\n  );\n}\n`;

export const saasDashboardTemplate: TemplateDefinition = {
  id: "saas-dashboard",
  name: "SaaS Dashboard",
  description:
    "Painel administrativo com KPIs, gráfico de receita e tabela de usuários.",
  framework: "react",
  tags: ["dashboard", "saas", "admin", "analytics"],
  dependencies: { ...REACT_BASE_DEPS, "lucide-react": "^0.400.0" },
  devDependencies: { ...REACT_BASE_DEV_DEPS },
  commands: ["npm install", "npm run dev"],
  files: [
    ...buildReactBaseFiles({
      packageName: "nexus-saas-dashboard",
      extraDeps: { "lucide-react": "^0.400.0" },
      tailwindThemeExtensions:
        'colors: { brand: { 50: "#eef2ff", 500: "#6366f1", 700: "#4338ca" } }',
    }),
    { path: "src/data/metrics.ts", content: metricsData },
    { path: "src/components/Sidebar.tsx", content: sidebar },
    { path: "src/components/TopBar.tsx", content: topBar },
    { path: "src/components/KpiCard.tsx", content: kpiCard },
    { path: "src/components/RevenueChart.tsx", content: chart },
    { path: "src/components/UsersTable.tsx", content: usersTable },
    { path: "src/components/ActivityFeed.tsx", content: activityFeed },
    { path: "src/pages/UsersPage.tsx", content: usersPage },
    { path: "src/pages/BillingPage.tsx", content: billingPage },
    { path: "src/pages/SettingsPage.tsx", content: settingsPage },
    { path: "src/api/mockApi.ts", content: mockApi },
    { path: "src/App.tsx", content: app },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: gitignore },
  ],
};
