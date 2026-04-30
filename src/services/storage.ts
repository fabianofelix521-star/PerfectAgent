/**
 * Versioned localStorage abstraction. It is intentionally small, but every
 * persisted store goes through this module so migration/backends can be swapped
 * in one place.
 */
const PREFIX = "pa:";
const listeners = new Set<(key: string, value: unknown) => void>();

export const APP_STORAGE_VERSION = 2;

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try { return safeJsonParse(window.localStorage.getItem(PREFIX + key), fallback); }
    catch { return fallback; }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      listeners.forEach((fn) => fn(key, value));
    } catch { /* ignore */ }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(PREFIX + key);
      listeners.forEach((fn) => fn(key, undefined));
    } catch { /* ignore */ }
  },
  subscribe(fn: (key: string, value: unknown) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getItem(name: string): string | null {
    if (typeof window === "undefined") return null;
    try { return window.localStorage.getItem(PREFIX + name); }
    catch { return null; }
  },
  setItem(name: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFIX + name, value);
      listeners.forEach((fn) => fn(name, safeJsonParse(value, value)));
    } catch { /* ignore */ }
  },
  removeItem(name: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(PREFIX + name);
      listeners.forEach((fn) => fn(name, undefined));
    } catch { /* ignore */ }
  },
};

/** base64 obfuscation for API keys at rest. NOT real encryption — document for prod. */
export function obfuscate(s: string): string {
  if (!s) return "";
  try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; }
}
export function deobfuscate(s: string): string {
  if (!s) return "";
  try { return decodeURIComponent(escape(atob(s))); } catch { return s; }
}
