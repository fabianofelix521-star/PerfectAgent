import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ToastViewport } from "@/components/Toast";
import { BackendStatusBanner } from "@/components/BackendStatus";
import { TimingHUD } from "@/components/TimingHUD";
import { AppRouter } from "@/app/Router";
import { APP_BRAND_NAME, useConfig } from "@/stores/config";
import { PermissionConfirmationHost } from "@/shared/components/PermissionConfirmationHost";

function ThemeApplicator() {
  const theme = useConfig((s) => s.settings.theme);
  const appName = useConfig((s) => s.settings.appName);

  useEffect(() => {
    document.title = appName?.trim() || APP_BRAND_NAME;
  }, [appName]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => root.classList.toggle("dark", mq.matches);
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplicator />
      <div className="app-ambient h-screen overflow-hidden text-slate-950">
        <div className="orbit-line orbit-line-one" />
        <div className="orbit-line orbit-line-two" />
        <AppRouter />
        <ToastViewport />
        <BackendStatusBanner />
        <TimingHUD />
        <PermissionConfirmationHost />
      </div>
    </BrowserRouter>
  );
}
