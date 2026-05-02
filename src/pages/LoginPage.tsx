import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  KeyRound,
  RotateCcw,
  ServerCrash,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrandLockup } from "@/components/Brand";
import { toast } from "@/components/Toast";
import {
  API_BASE,
  api,
  clearClientApiAuthKey,
  getClientApiAuthKey,
} from "@/services/api";
import { cn } from "@/utils/cn";

type BackendState = "checking" | "online" | "offline";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authKey, setAuthKey] = useState(() => getClientApiAuthKey());
  const [busy, setBusy] = useState(false);
  const [backendState, setBackendState] = useState<BackendState>("checking");
  const [error, setError] = useState("");

  const nextPath = useMemo(() => {
    const requested = searchParams.get("next")?.trim();
    if (
      !requested ||
      !requested.startsWith("/") ||
      requested.startsWith("//") ||
      requested === "/login"
    ) {
      return "/";
    }
    return requested;
  }, [searchParams]);

  const reason = searchParams.get("reason");

  useEffect(() => {
    let active = true;

    const probe = async () => {
      const health = await api.health();
      if (!active) return;
      setBackendState(health.ok ? "online" : "offline");
    };

    void probe();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reason === "invalid") {
      setError(
        "A key salva foi rejeitada pela API. Digite a chave atual do servidor para continuar.",
      );
      return;
    }
    if (reason === "missing") {
      setError(
        "A API está protegida e este navegador ainda não tem uma key válida salva.",
      );
    }
  }, [reason]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextKey = authKey.trim();
    if (!nextKey) {
      setError("Digite a key configurada no servidor.");
      return;
    }

    setBusy(true);
    setError("");

    const session = await api.authLogin(nextKey);
    if (!session.ok) {
      setBusy(false);
      setError(
        session.status === 401
          ? "Key inválida. Confira o valor de NEXUS_AUTH_KEY no servidor e tente de novo."
          : session.error ?? "Não foi possível validar a key agora.",
      );
      return;
    }

    clearClientApiAuthKey();
    toast.success("Key validada. Sessão liberada.");
    navigate(nextPath, { replace: true });
  }

  async function handleClear() {
    await api.authLogout();
    clearClientApiAuthKey();
    setAuthKey("");
    setError("");
    toast.info("Sessão removida deste navegador.");
  }

  return (
    <div className="glass-shell relative flex h-[97vh] w-full max-w-[98vw] items-center justify-center overflow-hidden rounded-[28px] border border-white/60 bg-white/45 p-3 shadow-[0_42px_130px_rgba(69,78,133,0.34)] backdrop-blur-3xl lg:h-[98vh] lg:rounded-[40px] lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(23,23,45,0.12),transparent_38%)]" />
      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fx-card relative grid w-full max-w-5xl gap-4 rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-[0_24px_80px_rgba(69,78,133,0.2)] backdrop-blur-2xl lg:grid-cols-[1.2fr_0.9fr] lg:p-6"
      >
        <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(234,239,251,0.82))] p-5 lg:p-7">
          <BrandLockup compact iconSize={48} caption="Protected control surface" className="w-fit" />
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Login por chave
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Entre com a key do servidor para destravar o app.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
            Quando a API estiver protegida por <span className="font-semibold text-slate-950">NEXUS_AUTH_KEY</span>,
            este navegador precisa validar a chave uma vez para abrir uma sessão segura. Depois disso, o acesso volta sozinho mesmo se o serviço reiniciar.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block rounded-[20px] border border-white/80 bg-white/88 px-4 py-3 shadow-sm transition focus-within:border-[#17172d]/35 focus-within:bg-white">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <KeyRound className="h-4 w-4" />
                Access key
              </span>
              <input
                autoFocus
                type="password"
                value={authKey}
                onChange={(event) => setAuthKey(event.target.value)}
                placeholder="Cole a key configurada no servidor"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none sm:text-base"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#17172d] px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_38px_rgba(23,23,45,0.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              >
                <ShieldCheck className="h-4 w-4" />
                {busy ? "Validando..." : "Entrar no workspace"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                Encerrar sessão
              </button>
            </div>

            {error ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
                {error}
              </div>
            ) : null}
          </form>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Backend</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-900">{API_BASE}</p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                  backendState === "online"
                    ? "bg-emerald-100 text-emerald-700"
                    : backendState === "offline"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-200 text-slate-600",
                )}
              >
                {backendState === "online"
                  ? "online"
                  : backendState === "offline"
                    ? "offline"
                    : "checando"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {backendState === "offline"
                ? "A API não respondeu agora. A chave só será validada quando o serviço estiver de pé."
                : "A validação acontece no backend e cria uma sessão segura por cookie HttpOnly, sem deixar a key exposta no app."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(23,23,45,0.96),rgba(36,40,54,0.94))] p-5 text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-200/75">Como funciona</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200/90">
              <li>1. Digite a mesma key definida no servidor remoto.</li>
              <li>2. O servidor valida a chave em <span className="font-mono text-cyan-100">/api/auth/login</span> e grava uma sessão segura.</li>
              <li>3. Se estiver correta, o app volta sozinho para {nextPath} sem depender da key no frontend.</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-amber-200/80 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <ServerCrash className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Se o servidor cair e voltar, você não precisa me chamar de novo. A sessão continua neste navegador até você encerrar manualmente.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}