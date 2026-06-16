"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyImageForm } from "@/components/property/property-image-form";
import { PropertyImageGrid } from "@/components/property/property-image-grid";
import { PropertyImageUploader } from "@/components/property/property-image-uploader";
import {
  createPropertyImageAction,
  getPropertyImageUploadUrlAction,
} from "@/lib/api/property-image-actions";
import type { AdminPropertyImage } from "@/lib/api/types/property-image";
import { putFileToSignedUrl } from "@/lib/property/image-upload";

type PropertyImageManagerProps = {
  propertyId: string;
  propertyIsActive: boolean;
  images: AdminPropertyImage[];
};

export function PropertyImageManager({
  propertyId,
  propertyIsActive,
  images,
}: PropertyImageManagerProps) {
  const router = useRouter();
  const [editingImage, setEditingImage] = useState<AdminPropertyImage | null>(
    null,
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const canCreate = propertyIsActive;

  const closePanel = () => {
    setEditingImage(null);
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!canCreate) {
      throw new Error("No podés subir imágenes en una propiedad archivada.");
    }

    setIsUploading(true);

    try {
      let nextSortOrder = images.length;

      for (const file of files) {
        const uploadUrlResult = await getPropertyImageUploadUrlAction(
          propertyId,
          {
            mimeType: file.type,
            filename: file.name,
          },
        );

        if (!uploadUrlResult.ok) {
          throw new Error(uploadUrlResult.error);
        }

        await putFileToSignedUrl(uploadUrlResult.data.uploadUrl, file);

        const createResult = await createPropertyImageAction(propertyId, {
          storageKey: uploadUrlResult.data.storageKey,
          url: uploadUrlResult.data.publicUrl,
          mimeType: file.type,
          fileSize: file.size,
          sortOrder: nextSortOrder,
        });

        if (!createResult.ok) {
          throw new Error(createResult.error);
        }

        nextSortOrder += 1;
      }

      router.refresh();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {!propertyIsActive ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La propiedad está archivada. Restaurala para agregar nuevas imágenes.
        </p>
      ) : null}

      {canCreate ? (
        <div className="mb-6">
          <PropertyImageUploader
            disabled={!canCreate}
            isUploading={isUploading}
            onUploadFiles={handleUploadFiles}
          />
        </div>
      ) : null}

      {images.length === 0 ? (
        <PropertyEmptyState
          title="Sin imágenes"
          description={
            canCreate
              ? "Subí imágenes para definir la portada y la galería de la propiedad."
              : "Esta propiedad archivada no tiene imágenes registradas."
          }
        />
      ) : (
        <PropertyImageGrid
          propertyId={propertyId}
          images={images}
          onEdit={setEditingImage}
          pendingActionId={pendingActionId}
          setPendingActionId={setPendingActionId}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      <SidePanel open={editingImage != null} onClose={closePanel} width="md">
        <SidePanelHeader>
          <SidePanelTitle>Editar imagen</SidePanelTitle>
          <SidePanelDescription>
            Actualizá el texto alternativo de la imagen seleccionada.
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {editingImage ? (
            <PropertyImageForm
              propertyId={propertyId}
              image={editingImage}
              onSuccess={() => {
                closePanel();
                router.refresh();
              }}
              onCancel={closePanel}
            />
          ) : null}
        </SidePanelContent>
      </SidePanel>
    </>
  );
}
