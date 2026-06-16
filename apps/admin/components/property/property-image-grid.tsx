"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import {
  deletePropertyImageAction,
  markPropertyImageCoverAction,
} from "@/lib/api/property-image-actions";
import type { AdminPropertyImage } from "@/lib/api/types/property-image";

type PropertyImageGridProps = {
  propertyId: string;
  images: AdminPropertyImage[];
  onEdit: (image: AdminPropertyImage) => void;
  pendingActionId: string | null;
  setPendingActionId: (id: string | null) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
};

type DeleteTarget = {
  image: AdminPropertyImage;
  willPromoteOther: boolean;
};

function truncateStorageKey(key: string, max = 40): string {
  if (key.length <= max) return key;
  return `${key.slice(0, max)}…`;
}

function ImagePreview({ image }: { image: AdminPropertyImage }) {
  if (image.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt={image.altText ?? image.storageKey}
        className="size-full object-cover"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-zinc-100 text-xs text-muted">
      Sin preview
    </div>
  );
}

export function PropertyImageGrid({
  propertyId,
  images,
  onEdit,
  pendingActionId,
  setPendingActionId,
  isPending,
  startTransition,
}: PropertyImageGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleMarkCover = (image: AdminPropertyImage) => {
    if (image.isCover) return;

    setPendingActionId(image.id);
    startTransition(async () => {
      const result = await markPropertyImageCoverAction(propertyId, image.id);
      setPendingActionId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Imagen marcada como portada.");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    setPendingActionId(deleteTarget.image.id);
    startTransition(async () => {
      const result = await deletePropertyImageAction(
        propertyId,
        deleteTarget.image.id,
      );
      setPendingActionId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Imagen eliminada correctamente.");
      router.refresh();
    });
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => {
          const rowPending = isPending && pendingActionId === image.id;

          return (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-50">
                <ImagePreview image={image} />
                {image.isCover ? (
                  <div className="absolute left-2 top-2">
                    <Badge variant="info">Portada</Badge>
                  </div>
                ) : null}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium text-foreground"
                    title={image.storageKey}
                  >
                    {truncateStorageKey(image.storageKey)}
                  </p>
                  {image.altText ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {image.altText}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    Orden: {image.sortOrder}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={rowPending}
                    onClick={() => onEdit(image)}
                  >
                    Editar
                  </Button>
                  {!image.isCover ? (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={rowPending}
                      onClick={() => handleMarkCover(image)}
                    >
                      Usar como portada
                    </Button>
                  ) : null}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={rowPending}
                    onClick={() =>
                      setDeleteTarget({
                        image,
                        willPromoteOther: image.isCover && images.length > 1,
                      })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar imagen"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar la imagen{" "}
              <strong>
                {truncateStorageKey(deleteTarget.image.storageKey, 32)}
              </strong>
              ?
              {deleteTarget.willPromoteOther ? (
                <>
                  {" "}
                  Se promoverá automáticamente otra imagen como portada.
                </>
              ) : null}
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={isPending && pendingActionId === deleteTarget?.image.id}
      />
    </>
  );
}
