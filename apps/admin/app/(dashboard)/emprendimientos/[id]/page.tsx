import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { DevelopmentForm } from "@/components/development/development-form";
import { DevelopmentPageShell } from "@/components/development/development-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { loadDevelopmentExecutiveContext } from "@/lib/development/load-development-executive-context";

type EmprendimientoDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmprendimientoDetallePage({
  params,
}: EmprendimientoDetallePageProps) {
  const { id } = await params;

  try {
    const { development } = await loadDevelopmentExecutiveContext(id);

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Datos</h2>
              <p className="text-sm text-muted">
                Información general del emprendimiento.
              </p>
            </div>
            <Link href="/emprendimientos">
              <Button variant="secondary" size="sm">
                Volver al listado
              </Button>
            </Link>
          </div>

          <DevelopmentForm mode="edit" development={development} />
        </div>
      </DevelopmentPageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No se pudo cargar el emprendimiento.";

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <ApiErrorPanel message={message} />
      </DevelopmentPageShell>
    );
  }
}
