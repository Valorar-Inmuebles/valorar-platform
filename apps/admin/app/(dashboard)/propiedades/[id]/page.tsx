import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { PropertyPublishabilityPanel } from "@/components/property/property-publishability-panel";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listUsers } from "@/lib/api/users";
import type { AssignableUserOption } from "@/lib/api/types/organization";
import { mapUnknownError } from "@/lib/api/error-map";
import { loadPropertyExecutiveContext } from "@/lib/property/load-property-executive-context";

function toAssignableUsers(
  users: Awaited<ReturnType<typeof listUsers>>,
): AssignableUserOption[] {
  return users
    .filter((user) => user.isActive)
    .map((user) => ({ id: user.id, name: user.name }));
}

type PropiedadDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadDetallePage({
  params,
}: PropiedadDetallePageProps) {
  const { id } = await params;

  try {
    const [{ property, publishability }, users] = await Promise.all([
      loadPropertyExecutiveContext(id),
      listUsers(),
    ]);
    const assignableUsers = toAssignableUsers(users);

    return (
      <PropertyPageShell propertyId={id} embedded>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Datos</h2>
              <p className="text-sm text-muted">
                Información general del inmueble.
              </p>
            </div>
            <Link href="/propiedades">
              <Button variant="secondary" size="sm">
                Volver al listado
              </Button>
            </Link>
          </div>

          <PropertyForm
            mode="edit"
            property={property}
            assignableUsers={assignableUsers}
          />

          <PropertyPublishabilityPanel summary={publishability} />
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
          : "No se pudo cargar la propiedad.";

    return (
      <PropertyPageShell propertyId={id} embedded>
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
