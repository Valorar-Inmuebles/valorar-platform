import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyTable } from "@/components/property/property-table";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { ApiError } from "@/lib/api/client";
import { listProperties } from "@/lib/api/property";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";

export default async function PropiedadesPage() {
  let properties;
  let errorMessage: string | null = null;

  try {
    properties = await listProperties();
  } catch (error) {
    errorMessage =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Error desconocido al cargar propiedades.";
  }

  return (
    <PageShell
      title="Propiedades"
      breadcrumbs={propertyListBreadcrumbs()}
      actions={
        <Link href="/propiedades/crear">
          <Button>Nueva propiedad</Button>
        </Link>
      }
    >
      {errorMessage ? (
        <ApiErrorPanel message={errorMessage} />
      ) : properties && properties.length === 0 ? (
        <PropertyEmptyState
          title="Sin propiedades todavía"
          description="Creá la primera propiedad del tenant para comenzar a gestionar publicaciones e imágenes."
          action={
            <Link href="/propiedades/crear">
              <Button>Nueva propiedad</Button>
            </Link>
          }
        />
      ) : properties ? (
        <PropertyTable properties={properties} />
      ) : null}

      {!errorMessage && properties && properties.length > 0 ? (
        <Card className="mt-4">
          <CardContent className="py-4">
            <p className="text-xs text-muted">
              {properties.length}{" "}
              {properties.length === 1 ? "propiedad" : "propiedades"} en total.
              Archivar desactiva la propiedad (`isActive = false`).
            </p>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
