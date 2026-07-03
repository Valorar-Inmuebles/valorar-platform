import { notFound } from "next/navigation";
import { DevelopmentCommercializationForm } from "@/components/development/development-commercialization-form";
import { DevelopmentPageShell } from "@/components/development/development-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { getDevelopment } from "@/lib/api/development";

type EmprendimientoComercializacionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmprendimientoComercializacionPage({
  params,
}: EmprendimientoComercializacionPageProps) {
  const { id } = await params;

  try {
    const development = await getDevelopment(id);

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Comercialización
            </h2>
            <p className="text-sm text-muted">
              Precio desde y opciones de financiación del emprendimiento.
            </p>
          </div>
          <DevelopmentCommercializationForm development={development} />
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
          : "No se pudo cargar la comercialización.";

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <ApiErrorPanel message={message} />
      </DevelopmentPageShell>
    );
  }
}
