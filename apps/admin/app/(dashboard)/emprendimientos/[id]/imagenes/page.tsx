import { notFound } from "next/navigation";
import { DevelopmentImageManager } from "@/components/development/development-image-manager";
import { DevelopmentPageShell } from "@/components/development/development-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listDevelopmentImages } from "@/lib/api/development-image";
import { getDevelopment } from "@/lib/api/development";

type EmprendimientoImagenesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmprendimientoImagenesPage({
  params,
}: EmprendimientoImagenesPageProps) {
  const { id } = await params;

  try {
    const [development, images] = await Promise.all([
      getDevelopment(id),
      listDevelopmentImages(id),
    ]);

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Imágenes</h2>
            <p className="text-sm text-muted">
              Galería e imágenes del emprendimiento.
            </p>
          </div>
          <DevelopmentImageManager
            developmentId={id}
            developmentIsActive={development.isActive}
            images={images}
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
          : "No se pudieron cargar las imágenes.";

    return (
      <DevelopmentPageShell developmentId={id} embedded>
        <ApiErrorPanel message={message} />
      </DevelopmentPageShell>
    );
  }
}
