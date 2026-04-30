import type { TemplateDefinition } from "../../types";
import {
  REACT_BASE_DEPS,
  REACT_BASE_DEV_DEPS,
  buildReactBaseFiles,
} from "./_reactBase";

/* react-app — Multi-page SPA com router, persistência local, todos */

const cnTs = `export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
`;

const routerTsx = `import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Ctx = { path: string; navigate: (to: string) => void };
const RouterCtx = createContext<Ctx>({ path: '/', navigate: () => {} });

function readPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readPath);
  useEffect(() => {
    const update = () => setPath(readPath());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const navigate = (to: string) => { window.location.hash = to; };
  return <RouterCtx.Provider value={{ path, navigate }}>{children}</RouterCtx.Provider>;
}

export function useRouter() { return useContext(RouterCtx); }

export function Route({ path, children }: { path: string; children: ReactNode }) {
  const { path: current } = useRouter();
  return current === path ? <>{children}</> : null;
}

export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const { navigate, path } = useRouter();
  const active = path === to;
  return (
    <a href={'#' + to} onClick={(e) => { e.preventDefault(); navigate(to); }}
      className={(className ?? '') + (active ? ' text-brand-700 font-semibold' : '')}>
      {children}
    </a>
  );
}
`;

const useLocalStorageTs = `import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue] as const;
}
`;

const useTodosTs = `import { useLocalStorage } from './useLocalStorage';

export interface Todo { id: string; text: string; done: boolean; createdAt: number; }

export function useTodos() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('nexus-todos', []);
  const add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([
      { id: crypto.randomUUID?.() ?? String(Date.now()), text: trimmed, done: false, createdAt: Date.now() },
      ...todos,
    ]);
  };
  const toggle = (id: string) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => setTodos(todos.filter((t) => t.id !== id));
  const clearDone = () => setTodos(todos.filter((t) => !t.done));
  const remaining = todos.filter((t) => !t.done).length;
  return { todos, add, toggle, remove, clearDone, remaining };
}
`;

const navbarTsx = `import { Link } from '../lib/router';

const items = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'Sobre' },
  { to: '/counter', label: 'Counter' },
  { to: '/todos', label: 'Todos' },
];

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
          Nexus<span className="text-brand-500">App</span>
        </Link>
        <ul className="flex items-center gap-6 text-sm text-slate-600">
          {items.map((it) => (
            <li key={it.to}><Link to={it.to} className="hover:text-slate-900 transition-colors">{it.label}</Link></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
`;

const pageHeaderTsx = `import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-slate-600 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
`;

const homePageTsx = `import { PageHeader } from '../components/PageHeader';
import { Link } from '../lib/router';

const features = [
  { title: 'Vite', desc: 'Build instantâneo com HMR.' },
  { title: 'Tailwind', desc: 'Estilização utilitária pronta.' },
  { title: 'TypeScript', desc: 'Strict mode habilitado.' },
  { title: 'Router', desc: 'Hash routing leve, sem dependências.' },
];

export function HomePage() {
  return (
    <div>
      <PageHeader eyebrow="Bem-vindo" title="Nexus React App"
        description="Stack moderna pronta para construir SPAs profissionais. Edite as páginas em src/pages para começar."
        action={<Link to="/todos" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-700 transition-colors">Ver Todos →</Link>} />
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

const aboutPageTsx = `import { PageHeader } from '../components/PageHeader';

export function AboutPage() {
  return (
    <div>
      <PageHeader eyebrow="Sobre" title="Sobre este projeto"
        description="Template gerado pelo Nexus AI Code Studio. Customize tudo livremente." />
      <div className="prose prose-slate max-w-none">
        <p>Este é um starter React com router minimalista, persistência local e múltiplas páginas. Use como base para apps reais.</p>
        <h2>Estrutura</h2>
        <ul>
          <li><code>src/pages/</code> — telas da aplicação</li>
          <li><code>src/components/</code> — UI compartilhada</li>
          <li><code>src/hooks/</code> — hooks reutilizáveis</li>
          <li><code>src/lib/</code> — helpers e router</li>
        </ul>
      </div>
    </div>
  );
}
`;

const counterPageTsx = `import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function CounterPage() {
  const [count, setCount] = useState(0);
  const [persisted, setPersisted] = useLocalStorage<number>('nexus-counter', 0);
  return (
    <div>
      <PageHeader eyebrow="Demo" title="Contadores"
        description="Compare estado em memória x estado persistido em localStorage." />
      <div className="grid sm:grid-cols-2 gap-4">
        <CounterCard label="Em memória (reseta no reload)" value={count} onChange={setCount} />
        <CounterCard label="Persistido em localStorage" value={persisted} onChange={setPersisted} />
      </div>
    </div>
  );
}

function CounterCard({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-5xl font-bold tabular-nums">{value}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => onChange(value - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">−</button>
        <button onClick={() => onChange(value + 1)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">+</button>
        <button onClick={() => onChange(0)} className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Reset</button>
      </div>
    </div>
  );
}
`;

const todosPageTsx = `import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useTodos } from '../hooks/useTodos';
import { cn } from '../lib/cn';

export function TodosPage() {
  const { todos, add, toggle, remove, clearDone, remaining } = useTodos();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const visible = todos.filter((t) => filter === 'all' ? true : filter === 'open' ? !t.done : t.done);

  function onSubmit(e: FormEvent) { e.preventDefault(); add(draft); setDraft(''); }

  return (
    <div>
      <PageHeader eyebrow="Demo" title="To-do List" description="Estado persistido com hook reutilizável. Tudo client-side." />
      <form onSubmit={onSubmit} className="flex gap-2 mb-4">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="O que precisa ser feito?"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
        <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Adicionar</button>
      </form>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-slate-500">{remaining} restante(s)</span>
        <div className="flex gap-1">
          {(['all','open','done'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-md px-2.5 py-1 text-xs font-medium', filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
              {f === 'all' ? 'Todos' : f === 'open' ? 'Abertos' : 'Concluídos'}
            </button>
          ))}
          <button onClick={clearDone} className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Limpar concluídos</button>
        </div>
      </div>
      <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">Nada por aqui ainda.</li>}
        {visible.map((t) => (
          <li key={t.id} className="px-4 py-3 flex items-center gap-3">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} className="h-4 w-4 rounded border-slate-300 text-brand-500" />
            <span className={cn('flex-1 text-sm', t.done && 'line-through text-slate-400')}>{t.text}</span>
            <button onClick={() => remove(t.id)} className="text-xs text-slate-400 hover:text-rose-600">remover</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const appTsx = `import { Router, Route } from './lib/router';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { CounterPage } from './pages/CounterPage';
import { TodosPage } from './pages/TodosPage';

export default function App() {
  return (
    <Router>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Route path="/"><HomePage /></Route>
        <Route path="/about"><AboutPage /></Route>
        <Route path="/counter"><CounterPage /></Route>
        <Route path="/todos"><TodosPage /></Route>
      </main>
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500">
          Generated by Nexus AI Code Studio · React + Vite + Tailwind
        </div>
      </footer>
    </Router>
  );
}
`;

const readme = `# Nexus React App

Multi-page React SPA com hash router, persistência local e Tailwind CSS.

## Scripts
- \`npm run dev\` — dev server (Vite)
- \`npm run build\` — build production
- \`npm run preview\` — preview do build

## Estrutura
- \`src/pages/\` — Home, Sobre, Counter, Todos
- \`src/components/\` — Navbar, PageHeader
- \`src/hooks/\` — useLocalStorage, useTodos
- \`src/lib/\` — router, cn helper

Gerado pelo **Nexus AI Code Studio**.
`;

const gitignore = `node_modules\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

export const reactAppTemplate: TemplateDefinition = {
  id: "react-app",
  name: "React App",
  description:
    "React + Vite + Tailwind multi-page SPA com router, todos persistidos, hooks e múltiplas páginas.",
  framework: "react",
  tags: ["react", "vite", "tailwind", "router", "starter", "spa"],
  dependencies: { ...REACT_BASE_DEPS },
  devDependencies: { ...REACT_BASE_DEV_DEPS },
  commands: ["npm install", "npm run dev"],
  files: [
    ...buildReactBaseFiles({ packageName: "nexus-react-app" }),
    { path: "src/lib/cn.ts", content: cnTs },
    { path: "src/lib/router.tsx", content: routerTsx },
    { path: "src/hooks/useLocalStorage.ts", content: useLocalStorageTs },
    { path: "src/hooks/useTodos.ts", content: useTodosTs },
    { path: "src/components/Navbar.tsx", content: navbarTsx },
    { path: "src/components/PageHeader.tsx", content: pageHeaderTsx },
    { path: "src/pages/HomePage.tsx", content: homePageTsx },
    { path: "src/pages/AboutPage.tsx", content: aboutPageTsx },
    { path: "src/pages/CounterPage.tsx", content: counterPageTsx },
    { path: "src/pages/TodosPage.tsx", content: todosPageTsx },
    { path: "src/App.tsx", content: appTsx },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: gitignore },
  ],
};
