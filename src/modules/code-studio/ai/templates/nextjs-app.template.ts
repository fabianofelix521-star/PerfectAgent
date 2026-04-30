import type { TemplateDefinition, TemplateFile } from "../../types";

const pkg = {
  name: "nexus-nextjs-app",
  private: true,
  version: "1.0.0",
  scripts: {
    dev: "next dev -H 0.0.0.0 -p 3000",
    build: "next build",
    start: "next start -H 0.0.0.0 -p 3000",
  },
  dependencies: {
    next: "^14.2.4",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  devDependencies: {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    autoprefixer: "^10.4.19",
    postcss: "^8.4.38",
    tailwindcss: "^3.4.4",
    typescript: "^5.5.0",
  },
};

const tsconfig = {
  compilerOptions: {
    target: "ES2020",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./src/*"] },
  },
  include: [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts",
  ],
  exclude: ["node_modules"],
};

const nextEnvDts = `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`;

const nextConfig = `/** @type {import('next').NextConfig} */\nconst nextConfig = { reactStrictMode: true };\nexport default nextConfig;\n`;

const tailwindConfig = `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],\n  theme: { extend: { colors: { brand: { 50: '#eef2ff', 500: '#6366f1', 700: '#4338ca' } } } },\n  plugins: [],\n};\n`;

const postcss = `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`;

const globalsCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody { @apply bg-slate-50 text-slate-900 antialiased; font-family: ui-sans-serif, system-ui, sans-serif; }\n`;

const layout = `import './globals.css';\nimport type { Metadata, ReactNode } from 'next';\nimport { Navbar } from '@/components/Navbar';\nimport { Footer } from '@/components/Footer';\n\nexport const metadata: Metadata = {\n  title: 'NEXUS Next App',\n  description: 'App Router + Tailwind CSS, gerado pelo Nexus.',\n};\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="pt-BR">\n      <body>\n        <div className="min-h-screen flex flex-col">\n          <Navbar />\n          <main className="flex-1">{children}</main>\n          <Footer />\n        </div>\n      </body>\n    </html>\n  );\n}\n`;

const homePage = `export default function HomePage() {\n  return (\n    <section className="max-w-3xl mx-auto px-6 py-20 text-center">\n      <p className="text-xs uppercase tracking-widest text-brand-700">App Router</p>\n      <h1 className="mt-2 text-5xl font-bold tracking-tight">Next.js + Tailwind</h1>\n      <p className="mt-4 text-slate-600 text-lg">Edite <code className="px-1.5 rounded bg-slate-100">src/app/page.tsx</code> para começar.</p>\n      <a href="/about" className="inline-block mt-8 rounded-lg bg-slate-900 text-white font-medium px-5 py-2.5 hover:bg-brand-500 transition-colors">Saiba mais</a>\n    </section>\n  );\n}\n`;

const aboutPage = `export default function AboutPage() {\n  return (\n    <section className="max-w-3xl mx-auto px-6 py-20">\n      <h1 className="text-4xl font-bold tracking-tight">Sobre</h1>\n      <p className="mt-4 text-slate-600 leading-relaxed">Este projeto foi criado com o NEXUS Code Studio. Tudo roda no navegador, com hot reload e preview ao vivo. Edite arquivos e veja o resultado em tempo real.</p>\n    </section>\n  );\n}\n`;

const libData = `export interface Post { slug: string; title: string; excerpt: string; date: string; readMin: number; body: string }
export const POSTS: Post[] = [
  { slug: 'introducing-nexus', title: 'Introducing NEXUS', excerpt: 'A nova forma de construir apps conversando com a IA.', date: '2026-03-12', readMin: 4, body: 'NEXUS é a plataforma all-in-one para construir apps com IA. Editor, preview e deploy num lugar só.' },
  { slug: 'app-router-deep-dive', title: 'App Router em profundidade', excerpt: 'Tudo que você precisa saber sobre o roteador do Next 14.', date: '2026-03-04', readMin: 8, body: 'Server components, layouts aninhados, streaming, suspense, parallel routes. O App Router muda tudo.' },
  { slug: 'edge-runtime-guide', title: 'Guia prático de Edge Runtime', excerpt: 'Quando vale a pena migrar suas rotas para o edge.', date: '2026-02-22', readMin: 6, body: 'Edge é incrível para baixa latência, mas tem limitações. Veja nosso guia.' },
];
export interface Product { id: string; name: string; price: number; stock: number }
export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Plano Pro mensal', price: 49, stock: 9999 },
  { id: 'p2', name: 'Plano Team mensal', price: 199, stock: 9999 },
  { id: 'p3', name: 'Créditos extras (1k)', price: 29, stock: 9999 },
];
`;

const navbar = `import Link from 'next/link';
const items = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'Sobre' },
  { href: '/blog', label: 'Blog' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contact', label: 'Contato' },
];
export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold tracking-tight">nexus<span className="text-brand-500">/next</span></Link>
        <nav className="flex items-center gap-6 text-sm text-slate-600">
          {items.map((it) => (<Link key={it.href} href={it.href} className="hover:text-slate-900">{it.label}</Link>))}
        </nav>
      </div>
    </header>
  );
}
`;

const footer = `export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
      © 2026 NEXUS · Construído com Next.js + Tailwind
    </footer>
  );
}
`;

const card = `import type { ReactNode } from 'react';
export function Card({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
`;

const blogIndex = `import Link from 'next/link';
import { POSTS } from '@/lib/data';
export default function BlogPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-slate-600">Notas, animações e atualizações do produto.</p>
      <ul className="mt-10 space-y-5">
        {POSTS.map((p) => (
          <li key={p.slug} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-500">{p.date} · {p.readMin} min de leitura</p>
            <h2 className="mt-1 text-xl font-semibold"><Link href={'/blog/' + p.slug} className="hover:text-brand-700">{p.title}</Link></h2>
            <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
`;

const blogSlug = `import { notFound } from 'next/navigation';
import Link from 'next/link';
import { POSTS } from '@/lib/data';
export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })); }
export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POSTS.find((p) => p.slug === params.slug);
  if (!post) return notFound();
  return (
    <article className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/blog" className="text-sm text-slate-500 hover:text-slate-900">← Voltar para o blog</Link>
      <p className="mt-6 text-xs text-slate-500">{post.date} · {post.readMin} min de leitura</p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">{post.title}</h1>
      <p className="mt-2 text-lg text-slate-600">{post.excerpt}</p>
      <div className="mt-10 prose prose-slate max-w-none"><p>{post.body}</p></div>
    </article>
  );
}
`;

const contactPage = `'use client';
import { useState } from 'react';
export default function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <section className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Fale conosco</h1>
      <p className="mt-2 text-slate-600">Resposta garantida em até 1 dia útil.</p>
      {sent ? (
        <p className="mt-8 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">✓ Mensagem enviada!</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-8 grid gap-4">
          <input required placeholder="Nome" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
          <input required type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
          <textarea required rows={5} placeholder="Mensagem" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
          <button type="submit" className="rounded-lg bg-brand-500 text-white font-medium py-2.5 hover:bg-brand-700">Enviar</button>
        </form>
      )}
    </section>
  );
}
`;

const dashboardLayout = `import type { ReactNode } from 'react';
import Link from 'next/link';
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[200px_1fr] gap-8">
      <aside className="text-sm">
        <p className="text-xs uppercase tracking-wider text-slate-500">Workspace</p>
        <ul className="mt-3 space-y-1">
          <li><Link href="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-slate-100">Visão geral</Link></li>
          <li><Link href="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-slate-100">Projetos</Link></li>
          <li><Link href="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-slate-100">Faturas</Link></li>
        </ul>
      </aside>
      <section>{children}</section>
    </div>
  );
}
`;

const dashboardPage = `import { Card } from '@/components/Card';
import { POSTS, PRODUCTS } from '@/lib/data';
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Card title="Posts publicados" description={POSTS.length + ' artigos'} />
        <Card title="Produtos ativos" description={PRODUCTS.length + ' itens'} />
        <Card title="MRR" description="R$ 12.450" />
      </div>
      <Card title="Últimos posts">
        <ul className="divide-y divide-slate-100 text-sm">
          {POSTS.map((p) => (<li key={p.slug} className="py-2 flex justify-between"><span>{p.title}</span><span className="text-slate-400">{p.date}</span></li>))}
        </ul>
      </Card>
    </div>
  );
}
`;

const apiHello = `import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({ message: 'hello from nexus', ts: Date.now() }); }
`;

const apiProducts = `import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/data';
export function GET() { return NextResponse.json({ items: PRODUCTS }); }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; quantity?: number };
  const product = PRODUCTS.find((p) => p.id === body.id);
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, product, quantity: body.quantity ?? 1 });
}
`;

const middleware = `import { NextResponse, type NextRequest } from 'next/server';
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('x-powered-by', 'nexus');
  return res;
}
export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
`;

const readme = `# Nexus Next.js App

Next.js 14 com App Router, páginas estáticas, rotas dinâmicas, dashboard com layout aninhado, API routes e middleware.

## Rotas
- \`/\` Home
- \`/about\` Sobre
- \`/blog\` lista de posts
- \`/blog/[slug]\` post (generateStaticParams)
- \`/contact\` formulário (client component)
- \`/dashboard\` layout aninhado
- \`/api/hello\` JSON
- \`/api/products\` GET + POST

## Scripts
- \`npm run dev\` — servidor Next em :3000
- \`npm run build\` — build production
- \`npm start\` — servidor production
`;

const gitignore = `node_modules\n.next\nout\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

const files: TemplateFile[] = [
  { path: "package.json", content: `${JSON.stringify(pkg, null, 2)}\n` },
  { path: "tsconfig.json", content: `${JSON.stringify(tsconfig, null, 2)}\n` },
  { path: "next-env.d.ts", content: nextEnvDts },
  { path: "next.config.mjs", content: nextConfig },
  { path: "tailwind.config.js", content: tailwindConfig },
  { path: "postcss.config.js", content: postcss },
  { path: "src/app/globals.css", content: globalsCss },
  { path: "src/app/layout.tsx", content: layout },
  { path: "src/app/page.tsx", content: homePage },
  { path: "src/app/about/page.tsx", content: aboutPage },
  { path: "src/app/blog/page.tsx", content: blogIndex },
  { path: "src/app/blog/[slug]/page.tsx", content: blogSlug },
  { path: "src/app/contact/page.tsx", content: contactPage },
  { path: "src/app/dashboard/layout.tsx", content: dashboardLayout },
  { path: "src/app/dashboard/page.tsx", content: dashboardPage },
  { path: "src/app/api/hello/route.ts", content: apiHello },
  { path: "src/app/api/products/route.ts", content: apiProducts },
  { path: "src/components/Navbar.tsx", content: navbar },
  { path: "src/components/Footer.tsx", content: footer },
  { path: "src/components/Card.tsx", content: card },
  { path: "src/lib/data.ts", content: libData },
  { path: "src/middleware.ts", content: middleware },
  { path: "README.md", content: readme },
  { path: ".gitignore", content: gitignore },
];

export const nextjsAppTemplate: TemplateDefinition = {
  id: "nextjs-app",
  name: "Next.js App",
  description: "Next.js 14 App Router + Tailwind CSS.",
  framework: "nextjs",
  tags: ["nextjs", "react", "tailwind", "app-router"],
  dependencies: pkg.dependencies,
  devDependencies: pkg.devDependencies,
  commands: ["npm install", "npm run dev"],
  files,
};
