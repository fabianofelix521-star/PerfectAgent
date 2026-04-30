import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom missing APIs used by zustand persist + framer-motion + monaco
class LocalStorageMock {
  private store = new Map<string, string>();
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? (this.store.get(k) as string) : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}
Object.defineProperty(globalThis, "localStorage", { value: new LocalStorageMock(), writable: true });

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// Avoid hitting the real backend during tests
vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } })));
