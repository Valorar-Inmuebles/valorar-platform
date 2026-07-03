import { notFound } from "next/navigation";
import { DevelopmentTypologyManager } from "@/components/development/development-typology-manager";
import { DevelopmentPageShell } from "@/components/development/development-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listPropertyFeatures } from "@/lib/api/property-feature";
import { listDevelopmentTypologies } from "@/lib/api/development-typology";
import { getDevelopment } from "@/lib/api/development";

type EmprendimientoTipologiasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmprendimientoTipologiasPage({
  params,
}: EmprendimientoTipologiasPageProps) {
  const { id } = await params;

  try {
    const [development, typologies, featureCatalog] = await Promise.all([
      getDevelopment(id),
      listDevelopmentTypologies(id),
      listPropertyFeatures(),
    ]);

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Unidades
            </h2>
            <p className="text-sm text-muted">
              Unidades y variantes comerciales del emprendimiento{" "}
              <span className="font-medium text-foreground">
                {development.title}
              </span>
              .
            </p>
          </div>
          <DevelopmentTypologyManager
            developmentId={id}
            typologies={typologies}
            featureCatalog={featureCatalog}
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
          : "No se pudieron cargar las unidades.";

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <ApiErrorPanel message={message} />
      </DevelopmentPageShell>
    );
  }
}
