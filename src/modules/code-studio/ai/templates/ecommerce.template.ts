import type { TemplateDefinition } from "../../types";
import {
  REACT_BASE_DEPS,
  REACT_BASE_DEV_DEPS,
  buildReactBaseFiles,
} from "./_reactBase";

const products = `export interface Product {\n  id: string;\n  name: string;\n  price: number;\n  category: string;\n  image: string;\n  rating: number;\n  description: string;\n}\n\nexport const PRODUCTS: Product[] = [\n  { id: 'p1', name: 'Tênis Aurora Run', price: 459.9, category: 'Calçados', image: 'https://picsum.photos/seed/p1/600/600', rating: 4.6, description: 'Conforto premium com amortecimento responsivo para corridas longas.' },\n  { id: 'p2', name: 'Jaqueta Nimbus Wind', price: 689.0, category: 'Vestuário', image: 'https://picsum.photos/seed/p2/600/600', rating: 4.8, description: 'Proteção térmica leve com tecido reciclado e impermeável.' },\n  { id: 'p3', name: 'Mochila Orbit 24L', price: 329.5, category: 'Acessórios', image: 'https://picsum.photos/seed/p3/600/600', rating: 4.4, description: 'Compartimento dedicado para notebook 16\" e bolsos térmicos.' },\n  { id: 'p4', name: 'Fone Pulse Pro', price: 1199.0, category: 'Eletrônicos', image: 'https://picsum.photos/seed/p4/600/600', rating: 4.9, description: 'Cancelamento ativo de ruído e 40h de bateria com case.' },\n  { id: 'p5', name: 'Smartwatch Helix', price: 1599.9, category: 'Eletrônicos', image: 'https://picsum.photos/seed/p5/600/600', rating: 4.5, description: 'Monitor de saúde 24/7, GPS dual-band e tela AMOLED.' },\n  { id: 'p6', name: 'Cafeteira Aurum', price: 899.0, category: 'Casa', image: 'https://picsum.photos/seed/p6/600/600', rating: 4.7, description: 'Espresso de barista com moedor cônico integrado.' },\n  { id: 'p7', name: 'Garrafa Térmica Arctic', price: 149.9, category: 'Acessórios', image: 'https://picsum.photos/seed/p7/600/600', rating: 4.3, description: '24h gelado, 12h quente, aço inox de parede dupla.' },\n  { id: 'p8', name: 'Camiseta Linen Air', price: 189.0, category: 'Vestuário', image: 'https://picsum.photos/seed/p8/600/600', rating: 4.2, description: '100% linho premium com acabamento pré-lavado.' },\n];\n\nexport const CATEGORIES = ['Todos', 'Calçados', 'Vestuário', 'Acessórios', 'Eletrônicos', 'Casa'] as const;\n`;

const cartStore = `import { create } from 'zustand';\nimport type { Product } from '../data/products';\n\nexport interface CartItem {\n  product: Product;\n  quantity: number;\n}\n\ninterface CartState {\n  items: CartItem[];\n  isOpen: boolean;\n  add: (product: Product) => void;\n  remove: (id: string) => void;\n  setQuantity: (id: string, quantity: number) => void;\n  clear: () => void;\n  toggle: (open?: boolean) => void;\n  total: () => number;\n  count: () => number;\n}\n\nexport const useCart = create<CartState>((set, get) => ({\n  items: [],\n  isOpen: false,\n  add: (product) => set((state) => {\n    const existing = state.items.find((i) => i.product.id === product.id);\n    if (existing) {\n      return {\n        items: state.items.map((i) =>\n          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,\n        ),\n        isOpen: true,\n      };\n    }\n    return { items: [...state.items, { product, quantity: 1 }], isOpen: true };\n  }),\n  remove: (id) => set((state) => ({ items: state.items.filter((i) => i.product.id !== id) })),\n  setQuantity: (id, quantity) => set((state) => ({\n    items: quantity <= 0\n      ? state.items.filter((i) => i.product.id !== id)\n      : state.items.map((i) => (i.product.id === id ? { ...i, quantity } : i)),\n  })),\n  clear: () => set({ items: [] }),\n  toggle: (open) => set((state) => ({ isOpen: typeof open === 'boolean' ? open : !state.isOpen })),\n  total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),\n  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),\n}));\n`;

const formatBRL = `export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });\n`;

const header = `import { ShoppingBag, Search } from 'lucide-react';\nimport { useCart } from '../store/cartStore';\n\nexport function Header({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {\n  const count = useCart((s) => s.count());\n  const toggle = useCart((s) => s.toggle);\n  return (\n    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">\n      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">\n        <div className="font-bold text-lg tracking-tight">nexus<span className="text-brand-500">store</span></div>\n        <div className="flex-1 hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">\n          <Search className="w-4 h-4 text-slate-500" />\n          <input value={query} onChange={(e) => onQueryChange(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" placeholder="Buscar produtos…" />\n        </div>\n        <button type="button" onClick={() => toggle(true)} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">\n          <ShoppingBag className="w-5 h-5" />\n          {count > 0 && (\n            <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs font-semibold rounded-full w-5 h-5 grid place-items-center">{count}</span>\n          )}\n        </button>\n      </div>\n    </header>\n  );\n}\n`;

const productCard = `import type { Product } from '../data/products';\nimport { brl } from '../lib/format';\nimport { useCart } from '../store/cartStore';\nimport { Star } from 'lucide-react';\n\nexport function ProductCard({ product }: { product: Product }) {\n  const add = useCart((s) => s.add);\n  return (\n    <article className="group bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">\n      <div className="aspect-square overflow-hidden bg-slate-100">\n        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />\n      </div>\n      <div className="p-4 flex flex-col flex-1">\n        <p className="text-xs text-slate-500 uppercase tracking-wide">{product.category}</p>\n        <h3 className="mt-1 font-semibold text-slate-900 line-clamp-2">{product.name}</h3>\n        <div className="mt-2 flex items-center gap-1 text-amber-500 text-sm">\n          <Star className="w-4 h-4 fill-current" /> {product.rating.toFixed(1)}\n        </div>\n        <div className="mt-auto pt-4 flex items-center justify-between">\n          <span className="text-lg font-bold">{brl(product.price)}</span>\n          <button type="button" onClick={() => add(product)} className="rounded-lg bg-slate-900 text-white text-sm px-3 py-2 hover:bg-brand-500 transition-colors">Adicionar</button>\n        </div>\n      </div>\n    </article>\n  );\n}\n`;

const cartDrawer = `import { X, Trash2 } from 'lucide-react';\nimport { useCart } from '../store/cartStore';\nimport { brl } from '../lib/format';\n\nexport function CartDrawer() {\n  const { items, isOpen, toggle, setQuantity, remove, total, clear } = useCart();\n  return (\n    <div className={\`fixed inset-0 z-40 \${isOpen ? '' : 'pointer-events-none'}\`}>\n      <div onClick={() => toggle(false)} className={\`absolute inset-0 bg-slate-900/40 transition-opacity \${isOpen ? 'opacity-100' : 'opacity-0'}\`} />\n      <aside className={\`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 \${isOpen ? 'translate-x-0' : 'translate-x-full'}\`}>\n        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">\n          <h2 className="font-semibold">Seu carrinho</h2>\n          <button type="button" onClick={() => toggle(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>\n        </div>\n        <div className="flex-1 overflow-y-auto p-6 space-y-4">\n          {items.length === 0 && <p className="text-slate-500 text-sm">Seu carrinho está vazio.</p>}\n          {items.map((i) => (\n            <div key={i.product.id} className="flex gap-3">\n              <img src={i.product.image} alt="" className="w-16 h-16 rounded-lg object-cover" />\n              <div className="flex-1">\n                <p className="font-medium text-sm line-clamp-2">{i.product.name}</p>\n                <p className="text-xs text-slate-500">{brl(i.product.price)}</p>\n                <div className="mt-1 flex items-center gap-2 text-sm">\n                  <button type="button" onClick={() => setQuantity(i.product.id, i.quantity - 1)} className="w-6 h-6 grid place-items-center rounded bg-slate-100">−</button>\n                  <span className="w-6 text-center">{i.quantity}</span>\n                  <button type="button" onClick={() => setQuantity(i.product.id, i.quantity + 1)} className="w-6 h-6 grid place-items-center rounded bg-slate-100">+</button>\n                </div>\n              </div>\n              <button type="button" onClick={() => remove(i.product.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>\n            </div>\n          ))}\n        </div>\n        <div className="border-t border-slate-200 p-6 space-y-3">\n          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{brl(total())}</span></div>\n          <button type="button" disabled={items.length === 0} className="w-full rounded-lg bg-brand-500 text-white font-medium py-3 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-brand-700 transition-colors">Finalizar compra</button>\n          {items.length > 0 && (\n            <button type="button" onClick={clear} className="w-full text-sm text-slate-500 hover:text-rose-500">Esvaziar carrinho</button>\n          )}\n        </div>\n      </aside>\n    </div>\n  );\n}\n`;

const filters = `import { CATEGORIES } from '../data/products';\n\nexport function FilterPanel({ active, onChange }: { active: string; onChange: (c: string) => void }) {\n  return (\n    <div className="flex gap-2 overflow-x-auto pb-2">\n      {CATEGORIES.map((c) => (\n        <button\n          key={c}\n          type="button"\n          onClick={() => onChange(c)}\n          className={\`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors \${active === c ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}\`}\n        >\n          {c}\n        </button>\n      ))}\n    </div>\n  );\n}\n`;

const productPage = `import { useState } from 'react';
import { ArrowLeft, Star, Truck, ShieldCheck } from 'lucide-react';
import type { Product } from '../data/products';
import { brl } from '../lib/format';
import { useCart } from '../store/cartStore';

export function ProductPage({ product, onBack }: { product: Product; onBack: () => void }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"><ArrowLeft className="w-4 h-4"/>Voltar</button>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden"><img src={product.image} alt={product.name} className="w-full h-full object-cover" /></div>
        <div>
          <p className="text-xs uppercase text-slate-500 tracking-wide">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="mt-2 flex items-center gap-1 text-amber-500"><Star className="w-4 h-4 fill-current"/>{product.rating.toFixed(1)}<span className="text-slate-400 text-sm ml-1">(128 avaliações)</span></div>
          <p className="mt-6 text-3xl font-bold">{brl(product.price)}</p>
          <p className="mt-4 text-slate-600 leading-relaxed">{product.description}</p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-lg">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-10 grid place-items-center hover:bg-slate-50">−</button>
              <span className="w-9 text-center font-medium">{qty}</span>
              <button type="button" onClick={() => setQty(qty + 1)} className="w-9 h-10 grid place-items-center hover:bg-slate-50">+</button>
            </div>
            <button type="button" onClick={() => { for (let i = 0; i < qty; i++) add(product); }}
              className="flex-1 rounded-lg bg-brand-500 text-white font-medium py-3 hover:bg-brand-700 transition-colors">Adicionar ao carrinho</button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2"><Truck className="w-4 h-4 mt-0.5 text-slate-500"/><div><p className="font-medium">Frete grátis</p><p className="text-slate-500">Acima de R$ 199</p></div></div>
            <div className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 mt-0.5 text-slate-500"/><div><p className="font-medium">Garantia 1 ano</p><p className="text-slate-500">Direto da marca</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const footer = `export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <p className="font-bold tracking-tight">nexus<span className="text-brand-500">store</span></p>
          <p className="mt-2 text-slate-500">Curadoria premium para seu dia a dia.</p>
        </div>
        <div><p className="font-semibold mb-2">Loja</p><ul className="space-y-1 text-slate-600"><li>Novidades</li><li>Promoções</li><li>Catálogo</li></ul></div>
        <div><p className="font-semibold mb-2">Suporte</p><ul className="space-y-1 text-slate-600"><li>Trocas</li><li>Frete</li><li>Contato</li></ul></div>
        <div><p className="font-semibold mb-2">Legal</p><ul className="space-y-1 text-slate-600"><li>Privacidade</li><li>Termos</li></ul></div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">© 2026 NEXUS Store</div>
    </footer>
  );
}
`;

const mockApi = `import { PRODUCTS, type Product } from '../data/products';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async listProducts(query?: string, category?: string): Promise<Product[]> {
    await delay(120);
    return PRODUCTS.filter((p) => {
      if (category && category !== 'Todos' && p.category !== category) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  },
  async getProduct(id: string): Promise<Product | null> {
    await delay(80);
    return PRODUCTS.find((p) => p.id === id) ?? null;
  },
  async checkout(items: Array<{ productId: string; quantity: number }>): Promise<{ orderId: string; total: number }> {
    await delay(400);
    const total = items.reduce((sum, i) => {
      const p = PRODUCTS.find((x) => x.id === i.productId);
      return sum + (p?.price ?? 0) * i.quantity;
    }, 0);
    return { orderId: 'ord_' + Math.random().toString(36).slice(2, 10), total };
  },
};
`;

const useDebounce = `import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
`;

const toast = `import { useEffect, useState } from 'react';
import { useCart } from '../store/cartStore';

export function CartToast() {
  const count = useCart((s) => s.count());
  const [pulse, setPulse] = useState(false);
  const [last, setLast] = useState(count);
  useEffect(() => {
    if (count !== last && count > last) {
      setPulse(true);
      const id = setTimeout(() => setPulse(false), 1400);
      return () => clearTimeout(id);
    }
    setLast(count);
  }, [count, last]);
  if (!pulse) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      ✓ Adicionado ao carrinho
    </div>
  );
}
`;

const readme = `# Nexus E-commerce

Loja online com catálogo, busca, filtros, carrinho persistido em store global, mock API e página de produto.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS
- Zustand (cart store)
- lucide-react (ícones)

## Estrutura
- \`src/data/\` — fixtures de produto
- \`src/store/\` — cart store (Zustand)
- \`src/api/\` — mock API (delay simulado)
- \`src/components/\` — Header, ProductCard, CartDrawer, FilterPanel, Footer, CartToast
- \`src/pages/ProductPage.tsx\` — detalhe de produto
- \`src/hooks/useDebounce.ts\` — debounce de busca
`;

const gitignore = `node_modules\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

const app = `import { useMemo, useState } from 'react';\nimport { Header } from './components/Header';\nimport { ProductCard } from './components/ProductCard';\nimport { FilterPanel } from './components/FilterPanel';\nimport { CartDrawer } from './components/CartDrawer';\nimport { Footer } from './components/Footer';\nimport { CartToast } from './components/CartToast';\nimport { ProductPage } from './pages/ProductPage';\nimport { useDebounce } from './hooks/useDebounce';\nimport { PRODUCTS, type Product } from './data/products';\n\nexport default function App() {\n  const [query, setQuery] = useState('');\n  const [category, setCategory] = useState<string>('Todos');\n  const [selected, setSelected] = useState<Product | null>(null);\n  const debouncedQuery = useDebounce(query, 200);\n\n  const filtered = useMemo(() => {\n    return PRODUCTS.filter((p) => {\n      if (category !== 'Todos' && p.category !== category) return false;\n      if (debouncedQuery.trim() && !p.name.toLowerCase().includes(debouncedQuery.toLowerCase())) return false;\n      return true;\n    });\n  }, [debouncedQuery, category]);\n\n  if (selected) {\n    return (\n      <div className="min-h-full">\n        <Header query={query} onQueryChange={setQuery} />\n        <ProductPage product={selected} onBack={() => setSelected(null)} />\n        <CartDrawer />\n        <CartToast />\n        <Footer />\n      </div>\n    );\n  }\n\n  return (\n    <div className="min-h-full">\n      <Header query={query} onQueryChange={setQuery} />\n      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">\n        <section className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white p-10 shadow-xl">\n          <p className="text-sm uppercase tracking-widest opacity-80">Coleção 2026</p>\n          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">Tudo que você precisa,<br />em um só lugar.</h1>\n          <p className="mt-3 max-w-xl opacity-90">Frete grátis acima de R$ 199 e parcelamento em até 12x sem juros.</p>\n        </section>\n        <FilterPanel active={category} onChange={setCategory} />\n        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">\n          {filtered.map((p) => <div key={p.id} onClick={() => setSelected(p)} className="cursor-pointer"><ProductCard product={p} /></div>)}\n          {filtered.length === 0 && <p className="col-span-full text-slate-500">Nenhum produto encontrado.</p>}\n        </section>\n      </main>\n      <CartDrawer />\n      <CartToast />\n      <Footer />\n    </div>\n  );\n}\n`;

export const ecommerceTemplate: TemplateDefinition = {
  id: "ecommerce",
  name: "E-commerce",
  description: "Loja online com catálogo, filtros, busca e carrinho.",
  framework: "react",
  tags: ["ecommerce", "shop", "react", "tailwind"],
  dependencies: {
    ...REACT_BASE_DEPS,
    zustand: "^4.5.0",
    "lucide-react": "^0.400.0",
  },
  devDependencies: { ...REACT_BASE_DEV_DEPS },
  commands: ["npm install", "npm run dev"],
  files: [
    ...buildReactBaseFiles({
      packageName: "nexus-ecommerce",
      extraDeps: { zustand: "^4.5.0", "lucide-react": "^0.400.0" },
      tailwindThemeExtensions:
        'colors: { brand: { 50: "#eef2ff", 500: "#6366f1", 700: "#4338ca" } }',
    }),
    { path: "src/data/products.ts", content: products },
    { path: "src/store/cartStore.ts", content: cartStore },
    { path: "src/lib/format.ts", content: formatBRL },
    { path: "src/components/Header.tsx", content: header },
    { path: "src/components/ProductCard.tsx", content: productCard },
    { path: "src/components/CartDrawer.tsx", content: cartDrawer },
    { path: "src/components/FilterPanel.tsx", content: filters },
    { path: "src/components/Footer.tsx", content: footer },
    { path: "src/components/CartToast.tsx", content: toast },
    { path: "src/pages/ProductPage.tsx", content: productPage },
    { path: "src/api/mockApi.ts", content: mockApi },
    { path: "src/hooks/useDebounce.ts", content: useDebounce },
    { path: "src/App.tsx", content: app },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: gitignore },
  ],
};
