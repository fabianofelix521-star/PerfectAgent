import { Link } from "react-router-dom";
import { WorkspaceShell, Surface } from "@/components/ui";

export function NotFoundPage() {
  return (
    <WorkspaceShell
      eyebrow="404"
      title="Rota não encontrada"
      description="O módulo solicitado não existe nesta instalação."
    >
      <Surface>
        <Link
          to="/"
          className="inline-flex rounded-full bg-[#17172d] px-5 py-2.5 text-sm font-bold text-white"
        >
          Voltar ao dashboard
        </Link>
      </Surface>
    </WorkspaceShell>
  );
}
