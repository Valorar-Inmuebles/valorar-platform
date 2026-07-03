import { DevelopmentFormSkeleton } from "@/components/development/development-form-skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { developmentCreateBreadcrumbs } from "@/lib/development/breadcrumbs";

export default function EmprendimientoCrearLoading() {
  return (
    <PageShell
      title="Nuevo emprendimiento"
      breadcrumbs={developmentCreateBreadcrumbs()}
    >
      <DevelopmentFormSkeleton />
    </PageShell>
  );
}
