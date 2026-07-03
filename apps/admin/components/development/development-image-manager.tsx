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
import { DevelopmentEmptyState } from "@/components/development/development-empty-state";
import { DevelopmentImageForm } from "@/components/development/development-image-form";
import { DevelopmentImageGrid } from "@/components/development/development-image-grid";
import { DevelopmentImageUploader } from "@/components/development/development-image-uploader";
import {
  createDevelopmentImageAction,
  getDevelopmentImageUploadUrlAction,
} from "@/lib/api/development-image-actions";
import type { AdminDevelopmentImage } from "@/lib/api/types/development-image";
import { putFileToSignedUrl } from "@/lib/development/image-upload";

type DevelopmentImageManagerProps = {
  developmentId: string;
  developmentIsActive: boolean;
  images: AdminDevelopmentImage[];
};

export function DevelopmentImageManager({
  developmentId,
  developmentIsActive,
  images,
}: DevelopmentImageManagerProps) {
  const router = useRouter();
  const [editingImage, setEditingImage] = useState<AdminDevelopmentImage | null>(
    null,
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const canCreate = developmentIsActive;

  const closePanel = () => {
    setEditingImage(null);
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!canCreate) {
      throw new Error(
        "No podés subir imágenes en un emprendimiento archivado.",
      );
    }

    setIsUploading(true);

    try {
      let nextSortOrder = images.length;

      for (const file of files) {
        const uploadUrlResult = await getDevelopmentImageUploadUrlAction(
          developmentId,
          {
            mimeType: file.type,
            filename: file.name,
          },
        );

        if (!uploadUrlResult.ok) {
          throw new Error(uploadUrlResult.error);
        }

        await putFileToSignedUrl(uploadUrlResult.data.uploadUrl, file);

        const createResult = await createDevelopmentImageAction(developmentId, {
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
      {!developmentIsActive ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El emprendimiento está archivado. Restauralo para agregar nuevas
          imágenes.
        </p>
      ) : null}

      {canCreate ? (
        <div className="mb-6">
          <DevelopmentImageUploader
            disabled={!canCreate}
            isUploading={isUploading}
            onUploadFiles={handleUploadFiles}
          />
        </div>
      ) : null}

      {images.length === 0 ? (
        <DevelopmentEmptyState
          title="Sin imágenes"
          description={
            canCreate
              ? "Subí imágenes para definir la portada y la galería del emprendimiento."
              : "Este emprendimiento archivado no tiene imágenes registradas."
          }
        />
      ) : (
        <DevelopmentImageGrid
          developmentId={developmentId}
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
            <DevelopmentImageForm
              developmentId={developmentId}
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
