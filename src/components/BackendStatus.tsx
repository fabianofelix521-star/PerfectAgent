import { useEffect, useState } from "react";
import { ServerCrash, ServerCog } from "lucide-react";
import { api, API_BASE } from "@/services/api";

export function BackendStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    const probe = async () => {
      const t0 = performance.now();
      const r = await api.health();
      if (stop) return;
      setOnline(r.ok);
      setLatency(Math.round(performance.now() - t0));
    };
    probe();
    const id = setInterval(probe, 5000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  if (online !== false) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-100 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <ServerCrash className="mt-0.5 h-5 w-5" />
        <div className="text-xs">
          <div className="font-semibold">Backend offline</div>
          <div className="text-rose-200/80">
            Não foi possível conectar em <code className="rounded bg-black/30 px-1">{API_BASE}</code>.
            Rode <code className="rounded bg-black/30 px-1">npm run server</code> em outro terminal,
            ou <code className="rounded bg-black/30 px-1">npm run dev</code> para subir tudo junto.
          </div>
          {latency !== null && <div className="mt-1 text-rose-200/60">Última tentativa: {latency}ms</div>}
        </div>
      </div>
    </div>
  );
}

export function BackendStatusBadge() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let stop = false;
    const probe = async () => {
      const r = await api.health();
      if (!stop) setOnline(r.ok);
    };
    probe();
    const id = setInterval(probe, 7000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  const color =
    online === null ? "bg-white/10 text-white/60" :
    online ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300";
  const label = online === null ? "Verificando..." : online ? "API online" : "API offline";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${color}`}>
      <ServerCog className="h-3 w-3" /> {label}
    </span>
  );
}
