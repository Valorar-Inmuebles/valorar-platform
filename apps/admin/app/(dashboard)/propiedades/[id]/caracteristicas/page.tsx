import { notFound } from "next/navigation";
import { PropertyFeatureManager } from "@/components/property/property-feature-manager";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listPropertyFeatureAssignments } from "@/lib/api/property-feature-assignment";
import { listPropertyFeatures } from "@/lib/api/property-feature";
import { getProperty } from "@/lib/api/property";

type PropiedadCaracteristicasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadCaracteristicasPage({
  params,
}: PropiedadCaracteristicasPageProps) {
  const { id } = await params;

  try {
    const [property, catalog, assignments] = await Promise.all([
      getProperty(id),
      listPropertyFeatures({ isActive: true }),
      listPropertyFeatureAssignments(id),
    ]);

    return (
      <PropertyPageShell propertyId={id} embedded>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Características
            </h2>
            <p className="text-sm text-muted">
              Características y amenities del inmueble.
            </p>
          </div>
          <PropertyFeatureManager
            propertyId={id}
            catalog={catalog}
            assignments={assignments}
          />
        </div>
      </PropertyPageShell>
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
      <PropertyPageShell propertyId={id} embedded>
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
