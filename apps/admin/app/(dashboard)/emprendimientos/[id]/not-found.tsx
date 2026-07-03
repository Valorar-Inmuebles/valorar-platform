import Link from "next/link";
import { Button } from "@repo/ui/button";
import { DevelopmentEmptyState } from "@/components/development/development-empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { developmentListBreadcrumbs } from "@/lib/development/breadcrumbs";

export default function DevelopmentNotFound() {
  return (
    <PageShell
      title="Emprendimiento no encontrado"
      breadcrumbs={[
        ...developmentListBreadcrumbs(),
        { label: "No encontrado" },
      ]}
    >
      <DevelopmentEmptyState
        title="Emprendimiento no encontrado"
        description="El emprendimiento no existe o no pertenece a la inmobiliaria seleccionada."
        action={
          <Link href="/emprendimientos">
            <Button variant="secondary">Volver al listado</Button>
          </Link>
        }
      />
    </PageShell>
  );
}
