"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import {
  deletePropertyImageAction,
  markPropertyImageCoverAction,
  reorderPropertyImagesAction,
} from "@/lib/api/property-image-actions";
import type { AdminPropertyImage } from "@/lib/api/types/property-image";
import {
  buildReorderItems,
  sortImagesByOrder,
} from "@/lib/property/image-upload";

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
  const [orderedImages, setOrderedImages] = useState(() =>
    sortImagesByOrder(images),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    setOrderedImages(sortImagesByOrder(images));
  }, [images]);

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

  const persistReorder = (nextImages: AdminPropertyImage[]) => {
    setPendingActionId("reorder");
    startTransition(async () => {
      const result = await reorderPropertyImagesAction(
        propertyId,
        buildReorderItems(nextImages),
      );
      setPendingActionId(null);

      if (!result.ok) {
        toast.error(result.error);
        setOrderedImages(sortImagesByOrder(images));
        return;
      }

      toast.success("Orden de la galería actualizado.");
      router.refresh();
    });
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const current = [...orderedImages];
    const draggedIndex = current.findIndex((image) => image.id === draggedId);
    const targetIndex = current.findIndex((image) => image.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) {
      setDraggedId(null);
      return;
    }

    const [moved] = current.splice(draggedIndex, 1);
    if (!moved) {
      setDraggedId(null);
      return;
    }

    current.splice(targetIndex, 0, moved);

    setOrderedImages(current);
    setDraggedId(null);
    persistReorder(current);
  };

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Arrastrá las tarjetas para reordenar la galería.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderedImages.map((image) => {
          const rowPending =
            isPending &&
            (pendingActionId === image.id || pendingActionId === "reorder");

          return (
            <Card
              key={image.id}
              draggable={!rowPending}
              onDragStart={() => setDraggedId(image.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(image.id);
              }}
              className={[
                "overflow-hidden transition-opacity",
                draggedId === image.id ? "opacity-50" : "",
                rowPending ? "pointer-events-none opacity-70" : "cursor-grab active:cursor-grabbing",
              ].join(" ")}
            >
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
                  {image.altText ? (
                    <p className="truncate text-sm font-medium text-foreground">
                      {image.altText}
                    </p>
                  ) : (
                    <p className="truncate text-sm text-muted">
                      Sin texto alternativo
                    </p>
                  )}
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
                        willPromoteOther: image.isCover && orderedImages.length > 1,
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
              ¿Eliminar esta imagen de la galería?
              {deleteTarget.willPromoteOther ? (
                <> Se promoverá automáticamente otra imagen como portada.</>
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
