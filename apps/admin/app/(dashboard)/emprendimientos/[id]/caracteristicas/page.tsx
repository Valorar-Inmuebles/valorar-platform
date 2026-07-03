import { notFound } from "next/navigation";
import { DevelopmentFeatureManager } from "@/components/development/development-feature-manager";
import { DevelopmentPageShell } from "@/components/development/development-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listDevelopmentFeatureAssignments } from "@/lib/api/development-feature-assignment";
import { listPropertyFeatures } from "@/lib/api/property-feature";
import { getDevelopment } from "@/lib/api/development";

type EmprendimientoCaracteristicasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmprendimientoCaracteristicasPage({
  params,
}: EmprendimientoCaracteristicasPageProps) {
  const { id } = await params;

  try {
    const [development, catalog, assignments] = await Promise.all([
      getDevelopment(id),
      listPropertyFeatures({ isActive: true }),
      listDevelopmentFeatureAssignments(id),
    ]);

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Características
            </h2>
            <p className="text-sm text-muted">
              Características y amenities del emprendimiento.
            </p>
          </div>
          <DevelopmentFeatureManager
            developmentId={id}
            catalog={catalog}
            assignments={assignments}
          />
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
          : "No se pudieron cargar las características.";

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <ApiErrorPanel message={message} />
      </DevelopmentPageShell>
    );
  }
}
