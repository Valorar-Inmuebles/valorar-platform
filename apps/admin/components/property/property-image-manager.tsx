"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
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
import type { AdminPropertyImage } from "@/lib/api/types/property-image";

type PanelMode = "create" | "edit" | null;

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
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingImage, setEditingImage] = useState<AdminPropertyImage | null>(
    null,
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = propertyIsActive;

  const closePanel = () => {
    setPanelMode(null);
    setEditingImage(null);
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingImage(null);
    setPanelMode("create");
  };

  const openEdit = (image: AdminPropertyImage) => {
    setEditingImage(image);
    setPanelMode("edit");
  };

  const handleFormSuccess = () => {
    closePanel();
    router.refresh();
  };

  return (
    <>
      {!propertyIsActive ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La propiedad está archivada. Restaurala para agregar nuevas imágenes.
        </p>
      ) : null}

      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate} disabled={!canCreate}>
          Agregar imagen
        </Button>
      </div>

      {images.length === 0 ? (
        <PropertyEmptyState
          title="Sin imágenes"
          description={
            canCreate
              ? "Agregá metadata de imágenes para definir la portada y la galería de la propiedad."
              : "Esta propiedad archivada no tiene imágenes registradas."
          }
          action={
            canCreate ? (
              <Button onClick={openCreate}>Agregar imagen</Button>
            ) : undefined
          }
        />
      ) : (
        <PropertyImageGrid
          propertyId={propertyId}
          images={images}
          onEdit={openEdit}
          pendingActionId={pendingActionId}
          setPendingActionId={setPendingActionId}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      <SidePanel open={panelMode != null} onClose={closePanel} width="md">
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Nueva imagen" : "Editar imagen"}
          </SidePanelTitle>
          <SidePanelDescription>
            {panelMode === "create"
              ? "Ingresá la metadata de la imagen. El upload físico se implementará en una fase posterior."
              : "Modificá la metadata de la imagen seleccionada."}
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {panelMode ? (
            <PropertyImageForm
              propertyId={propertyId}
              mode={panelMode}
              image={editingImage ?? undefined}
              isFirstImage={images.length === 0}
              onSuccess={handleFormSuccess}
              onCancel={closePanel}
            />
          ) : null}
        </SidePanelContent>
      </SidePanel>
    </>
  );
}
