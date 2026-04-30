import type { TemplateDefinition } from "../../types";
import {
  REACT_BASE_DEPS,
  REACT_BASE_DEV_DEPS,
  buildReactBaseFiles,
} from "./_reactBase";

const data = `export const FEATURES = [\n  { title: 'IA generativa', desc: 'Crie aplicações inteiras a partir de uma frase, com preview ao vivo.', icon: 'Sparkles' },\n  { title: 'Preview instantâneo', desc: 'Editor + preview lado a lado, com hot reload em milissegundos.', icon: 'Zap' },\n  { title: 'Deploy 1-clique', desc: 'Publique para produção sem configurar servidor algum.', icon: 'Rocket' },\n  { title: 'Open by design', desc: 'Você é dono do código. Exporte como ZIP a qualquer momento.', icon: 'Code2' },\n  { title: 'Times globais', desc: 'Edição colaborativa em tempo real, com presença e comentários.', icon: 'Users' },\n  { title: 'Privacidade primeiro', desc: 'Sandbox por projeto, dados criptografados em trânsito e em repouso.', icon: 'ShieldCheck' },\n] as const;\n\nexport const TESTIMONIALS = [\n  { name: 'Marina Costa', role: 'CTO, Lumini Health', quote: 'Substituímos 3 ferramentas pelo NEXUS. O time de produto entrega features em horas.' },\n  { name: 'Rafael Pinheiro', role: 'Solo founder, Vela Books', quote: 'Lancei meu MVP num fim de semana. Sem isso, levaria meses.' },\n  { name: 'Beatriz Andrade', role: 'Head of Eng., FluxoPay', quote: 'O preview ao vivo virou o coração do nosso processo de design.' },\n];\n\nexport const PLANS = [\n  { name: 'Free', price: 0, popular: false, features: ['1 projeto ativo', 'Preview público', 'Templates básicos'], cta: 'Começar grátis' },\n  { name: 'Pro', price: 49, popular: true, features: ['Projetos ilimitados', 'Domínio próprio', 'Templates premium', 'Histórico 30 dias'], cta: 'Assinar Pro' },\n  { name: 'Team', price: 199, popular: false, features: ['Tudo do Pro', 'Colaboração em tempo real', 'SSO + auditoria', 'Suporte dedicado'], cta: 'Falar com vendas' },\n];\n`;

const navbar = `import { Sparkles } from 'lucide-react';\nexport function Navbar() {\n  return (\n    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">\n      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">\n        <a href="#" className="flex items-center gap-2 font-bold text-lg tracking-tight">\n          <Sparkles className="w-5 h-5 text-brand-500" /> nexus<span className="text-brand-500">.ai</span>\n        </a>\n        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">\n          <a href="#features" className="hover:text-slate-900">Features</a>\n          <a href="#pricing" className="hover:text-slate-900">Preços</a>\n          <a href="#testimonials" className="hover:text-slate-900">Clientes</a>\n          <a href="#" className="hover:text-slate-900">Docs</a>\n        </nav>\n        <div className="flex items-center gap-3">\n          <a href="#" className="hidden md:inline-block text-sm text-slate-600 hover:text-slate-900">Entrar</a>\n          <a href="#cta" className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-brand-500 transition-colors">Começar grátis</a>\n        </div>\n      </div>\n    </header>\n  );\n}\n`;

const hero = `import { ArrowRight, Sparkles } from 'lucide-react';\nexport function Hero() {\n  return (\n    <section className="relative overflow-hidden">\n      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-white" />\n      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">\n        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-xs font-medium"><Sparkles className="w-3.5 h-3.5" /> Nova versão 2.0</span>\n        <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight text-slate-900">Construa apps completos<br /><span className="bg-gradient-to-r from-brand-500 to-violet-500 text-transparent bg-clip-text">conversando com a IA.</span></h1>\n        <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600">Do prompt ao deploy em minutos. Editor, preview ao vivo, terminal, e exportação — tudo no navegador.</p>\n        <div className="mt-8 flex items-center justify-center gap-3">\n          <a href="#cta" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white font-medium px-5 py-3 hover:bg-brand-500 transition-colors">Começar grátis <ArrowRight className="w-4 h-4" /></a>\n          <a href="#features" className="rounded-lg border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">Ver demo</a>\n        </div>\n        <div className="mt-12 mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">\n          <div className="h-9 bg-slate-100 flex items-center gap-1.5 px-4">\n            <span className="w-3 h-3 rounded-full bg-rose-400"/><span className="w-3 h-3 rounded-full bg-amber-400"/><span className="w-3 h-3 rounded-full bg-emerald-400"/>\n          </div>\n          <div className="aspect-[16/9] bg-slate-900 grid place-items-center text-slate-500 font-mono text-xs">$ nexus generate "landing page para SaaS"</div>\n        </div>\n      </div>\n    </section>\n  );\n}\n`;

const features = `import * as Icons from 'lucide-react';\nimport { FEATURES } from '../data/content';\nexport function Features() {\n  return (\n    <section id="features" className="max-w-6xl mx-auto px-6 py-20">\n      <div className="max-w-2xl">\n        <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Por que NEXUS</p>\n        <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Tudo que você precisa,<br />nada que você não precisa.</h2>\n      </div>\n      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">\n        {FEATURES.map((f) => {\n          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[f.icon] ?? Icons.Sparkles;\n          return (\n            <div key={f.title} className="rounded-2xl border border-slate-200 p-6 bg-white hover:shadow-lg transition-shadow">\n              <div className="w-10 h-10 grid place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon className="w-5 h-5" /></div>\n              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>\n              <p className="mt-1 text-slate-600 text-sm leading-relaxed">{f.desc}</p>\n            </div>\n          );\n        })}\n      </div>\n    </section>\n  );\n}\n`;

const testimonials = `import { TESTIMONIALS } from '../data/content';\nexport function Testimonials() {\n  return (\n    <section id="testimonials" className="bg-slate-50 border-y border-slate-200">\n      <div className="max-w-6xl mx-auto px-6 py-20">\n        <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">Times do mundo todo<br />já estão entregando mais rápido.</h2>\n        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">\n          {TESTIMONIALS.map((t) => (\n            <figure key={t.name} className="rounded-2xl bg-white border border-slate-200 p-6">\n              <blockquote className="text-slate-700 leading-relaxed">"{t.quote}"</blockquote>\n              <figcaption className="mt-5 text-sm">\n                <div className="font-semibold">{t.name}</div>\n                <div className="text-slate-500">{t.role}</div>\n              </figcaption>\n            </figure>\n          ))}\n        </div>\n      </div>\n    </section>\n  );\n}\n`;

const pricing = `import { Check } from 'lucide-react';\nimport { PLANS } from '../data/content';\nexport function Pricing() {\n  return (\n    <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">\n      <div className="text-center max-w-2xl mx-auto">\n        <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Preços</p>\n        <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Comece grátis. Cresça quando quiser.</h2>\n      </div>\n      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">\n        {PLANS.map((p) => (\n          <div key={p.name} className={\`rounded-2xl border p-7 bg-white relative \${p.popular ? 'border-brand-500 shadow-xl shadow-brand-500/10 scale-[1.02]' : 'border-slate-200'}\`}>\n            {p.popular && <span className="absolute -top-3 left-7 bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Mais popular</span>}\n            <h3 className="font-semibold text-lg">{p.name}</h3>\n            <p className="mt-3"><span className="text-4xl font-bold">R$ {p.price}</span><span className="text-slate-500">/mês</span></p>\n            <ul className="mt-6 space-y-3 text-sm">\n              {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /> {f}</li>)}\n            </ul>\n            <button type="button" className={\`mt-7 w-full rounded-lg font-medium py-2.5 transition-colors \${p.popular ? 'bg-brand-500 text-white hover:bg-brand-700' : 'bg-slate-900 text-white hover:bg-slate-700'}\`}>{p.cta}</button>\n          </div>\n        ))}\n      </div>\n    </section>\n  );\n}\n`;

const cta = `export function CtaFooter() {\n  return (\n    <section id="cta" className="bg-slate-900 text-white">\n      <div className="max-w-4xl mx-auto px-6 py-20 text-center">\n        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pronto para construir mais rápido?</h2>\n        <p className="mt-3 text-slate-300">Comece de graça. Sem cartão. Sem instalação.</p>\n        <form onSubmit={(e) => e.preventDefault()} className="mt-8 max-w-md mx-auto flex gap-2">\n          <input type="email" required placeholder="seu@email.com" className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500" />\n          <button type="submit" className="rounded-lg bg-brand-500 px-5 py-3 font-medium hover:bg-brand-700 transition-colors">Entrar</button>\n        </form>\n      </div>\n      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">© 2026 NEXUS · Todos os direitos reservados</footer>\n    </section>\n  );\n}\n`;

const logosCloud = `const logos = ['Lumini Health', 'Vela Books', 'FluxoPay', 'Orbit Labs', 'Helia Studio', 'Praxis Inc'];
export function LogosCloud() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-12 border-y border-slate-100">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-500">Confiado por times em produção</p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {logos.map((l) => (
          <div key={l} className="text-slate-400 font-semibold tracking-tight text-sm">{l}</div>
        ))}
      </div>
    </section>
  );
}
`;

const stats = `const items = [
  { value: '120k+', label: 'projetos gerados' },
  { value: '32 ms', label: 'latência média do preview' },
  { value: '4.9/5', label: 'NPS dos times Pro' },
  { value: '99.99%', label: 'uptime SLA' },
];
export function Stats() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{it.value}</p>
            <p className="mt-1 text-sm text-slate-500">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
`;

const comparison = `import { Check, X } from 'lucide-react';
const rows = [
  { feature: 'Editor + Preview lado a lado', nexus: true, alt: false },
  { feature: 'IA generativa nativa', nexus: true, alt: false },
  { feature: 'Exportação do código', nexus: true, alt: true },
  { feature: 'Colaboração em tempo real', nexus: true, alt: false },
  { feature: 'Setup em 0 minutos', nexus: true, alt: false },
];
export function ComparisonTable() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Por que NEXUS é diferente</h2>
      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr><th className="text-left px-6 py-3 font-medium">Feature</th><th className="px-6 py-3 font-medium">NEXUS</th><th className="px-6 py-3 font-medium">Outros</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.feature}><td className="px-6 py-3 font-medium text-slate-700">{r.feature}</td><td className="px-6 py-3 text-center">{r.nexus ? <Check className="w-5 h-5 text-emerald-500 inline" /> : <X className="w-5 h-5 text-slate-300 inline" />}</td><td className="px-6 py-3 text-center">{r.alt ? <Check className="w-5 h-5 text-slate-400 inline" /> : <X className="w-5 h-5 text-slate-300 inline" />}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
`;

const faq = `import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
const faqs = [
  { q: 'Preciso instalar algo?', a: 'Não. Tudo roda no navegador, com sandbox isolado por projeto.' },
  { q: 'Posso exportar o código?', a: 'Sim, exportação em ZIP a qualquer momento, sem lock-in.' },
  { q: 'Como funciona a faturação?', a: 'Mensal ou anual, com 30 dias de garantia incondicional.' },
  { q: 'Vocês usam meus dados para treinar IA?', a: 'Não. Seu código nunca é usado para treinar modelos.' },
  { q: 'Tem plano free?', a: 'Sim, com 1 projeto ativo e preview público para sempre.' },
];
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Perguntas frequentes</h2>
      <ul className="mt-10 space-y-3">
        {faqs.map((f, i) => (
          <li key={f.q} className="rounded-xl border border-slate-200 bg-white">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left font-medium">
              {f.q}
              <ChevronDown className={'w-4 h-4 text-slate-400 transition-transform ' + (open === i ? 'rotate-180' : '')} />
            </button>
            {open === i && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
`;

const blogTeaser = `const posts = [
  { title: 'Por dentro da nova engine de preview', date: '12 mar', read: '4 min' },
  { title: 'Como times distribuídos usam NEXUS', date: '02 mar', read: '6 min' },
  { title: 'Padrões de prompt para gerar UI', date: '21 fev', read: '8 min' },
];
export function BlogTeaser() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-end justify-between">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Direto do blog</h2>
        <a href="#" className="text-sm font-medium text-brand-700 hover:underline">Ver todos →</a>
      </div>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {posts.map((p) => (
          <a key={p.title} href="#" className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[16/9] bg-gradient-to-br from-brand-100 to-brand-50" />
            <div className="p-5">
              <p className="text-xs text-slate-500">{p.date} · {p.read} de leitura</p>
              <h3 className="mt-2 font-semibold text-slate-900 group-hover:text-brand-700">{p.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
`;

const contactForm = `import { useState } from 'react';
export function ContactForm() {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="max-w-3xl mx-auto px-6 py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-bold tracking-tight">Fale com vendas</h2>
        <p className="mt-1 text-slate-600 text-sm">Respondemos em até 1 dia útil.</p>
        {sent ? (
          <p className="mt-6 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">✓ Recebemos sua mensagem!</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-6 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <input required placeholder="Nome" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
              <input required type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
            </div>
            <input placeholder="Empresa" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
            <textarea required rows={4} placeholder="Conte sobre seu time…" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500" />
            <button type="submit" className="rounded-lg bg-brand-500 text-white font-medium py-2.5 hover:bg-brand-700">Enviar mensagem</button>
          </form>
        )}
      </div>
    </section>
  );
}
`;

const useScrollSpy = `import { useEffect, useState } from 'react';
export function useScrollSpy(ids: string[], rootMargin = '-40% 0px -55% 0px'): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids, rootMargin]);
  return active;
}
`;

const readme = `# Nexus Landing Page

Landing page completa com hero, logos cloud, stats, features, comparativo, depoimentos, preços, FAQ, blog, contato e CTA.

## Componentes
- Navbar, Hero, LogosCloud, Features, Stats, ComparisonTable, Testimonials, Pricing, Faq, BlogTeaser, ContactForm, CtaFooter

## Hooks
- useScrollSpy: destaca seção ativa baseado em viewport.
`;

const gitignore = `node_modules\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

const app = `import { Navbar } from './components/Navbar';\nimport { Hero } from './components/Hero';\nimport { LogosCloud } from './components/LogosCloud';\nimport { Features } from './components/Features';\nimport { Stats } from './components/Stats';\nimport { ComparisonTable } from './components/ComparisonTable';\nimport { Testimonials } from './components/Testimonials';\nimport { Pricing } from './components/Pricing';\nimport { Faq } from './components/Faq';\nimport { BlogTeaser } from './components/BlogTeaser';\nimport { ContactForm } from './components/ContactForm';\nimport { CtaFooter } from './components/CtaFooter';\n\nexport default function App() {\n  return (\n    <div className="min-h-full bg-white">\n      <Navbar />\n      <main>\n        <Hero />\n        <LogosCloud />\n        <Features />\n        <Stats />\n        <ComparisonTable />\n        <Testimonials />\n        <Pricing />\n        <Faq />\n        <BlogTeaser />\n        <ContactForm />\n        <CtaFooter />\n      </main>\n    </div>\n  );\n}\n`;

export const landingPageTemplate: TemplateDefinition = {
  id: "landing-page",
  name: "Landing Page",
  description:
    "Landing page de SaaS com hero, features, depoimentos, preços e CTA.",
  framework: "react",
  tags: ["landing", "marketing", "saas"],
  dependencies: { ...REACT_BASE_DEPS, "lucide-react": "^0.400.0" },
  devDependencies: { ...REACT_BASE_DEV_DEPS },
  commands: ["npm install", "npm run dev"],
  files: [
    ...buildReactBaseFiles({
      packageName: "nexus-landing-page",
      extraDeps: { "lucide-react": "^0.400.0" },
      tailwindThemeExtensions:
        'colors: { brand: { 50: "#eef2ff", 500: "#6366f1", 700: "#4338ca" } }',
    }),
    { path: "src/data/content.ts", content: data },
    { path: "src/components/Navbar.tsx", content: navbar },
    { path: "src/components/Hero.tsx", content: hero },
    { path: "src/components/LogosCloud.tsx", content: logosCloud },
    { path: "src/components/Features.tsx", content: features },
    { path: "src/components/Stats.tsx", content: stats },
    { path: "src/components/ComparisonTable.tsx", content: comparison },
    { path: "src/components/Testimonials.tsx", content: testimonials },
    { path: "src/components/Pricing.tsx", content: pricing },
    { path: "src/components/Faq.tsx", content: faq },
    { path: "src/components/BlogTeaser.tsx", content: blogTeaser },
    { path: "src/components/ContactForm.tsx", content: contactForm },
    { path: "src/components/CtaFooter.tsx", content: cta },
    { path: "src/hooks/useScrollSpy.ts", content: useScrollSpy },
    { path: "src/App.tsx", content: app },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: gitignore },
  ],
};
