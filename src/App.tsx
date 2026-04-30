import { BrowserRouter } from "react-router-dom";
import { ToastViewport } from "@/components/Toast";
import { BackendStatusBanner } from "@/components/BackendStatus";
import { TimingHUD } from "@/components/TimingHUD";
import { AppRouter } from "@/app/Router";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-ambient h-screen overflow-hidden text-slate-950">
        <div className="orbit-line orbit-line-one" />
        <div className="orbit-line orbit-line-two" />
        <AppRouter />
        <ToastViewport />
        <BackendStatusBanner />
        <TimingHUD />
      </div>
    </BrowserRouter>
  );
}
