"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { DevelopmentEmptyState } from "@/components/development/development-empty-state";
import { DevelopmentTypologyForm } from "@/components/development/development-typology-form";
import { DevelopmentTypologyTable } from "@/components/development/development-typology-table";
import { listDevelopmentTypologyFeatureAssignmentsAction } from "@/lib/api/development-typology-feature-actions";
import type { AdminDevelopmentTypology } from "@/lib/api/types/development-typology";
import type { AdminDevelopmentTypologyFeatureAssignment } from "@/lib/api/types/development-typology-feature";
import type { AdminPropertyFeature } from "@/lib/api/types/property-feature";

type PanelMode = "create" | "edit" | null;

type DevelopmentTypologyManagerProps = {
  developmentId: string;
  typologies: AdminDevelopmentTypology[];
  featureCatalog: AdminPropertyFeature[];
};

export function DevelopmentTypologyManager({
  developmentId,
  typologies,
  featureCatalog,
}: DevelopmentTypologyManagerProps) {
  const router = useRouter();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingTypology, setEditingTypology] =
    useState<AdminDevelopmentTypology | null>(null);
  const [featureAssignments, setFeatureAssignments] = useState<
    AdminDevelopmentTypologyFeatureAssignment[]
  >([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closePanel = () => {
    setPanelMode(null);
    setEditingTypology(null);
    setFeatureAssignments([]);
  };

  const openCreate = () => {
    setEditingTypology(null);
    setFeatureAssignments([]);
    setPanelMode("create");
  };

  const openEdit = (typology: AdminDevelopmentTypology) => {
    setEditingTypology(typology);
    setPanelMode("edit");
  };

  useEffect(() => {
    if (panelMode !== "edit" || !editingTypology) {
      return;
    }

    let cancelled = false;
    setLoadingFeatures(true);

    listDevelopmentTypologyFeatureAssignmentsAction(editingTypology.id)
      .then((assignments) => {
        if (!cancelled) {
          setFeatureAssignments(assignments);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeatureAssignments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingFeatures(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [panelMode, editingTypology?.id]);

  const handleFormSuccess = () => {
    closePanel();
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>Nueva unidad</Button>
      </div>

      {typologies.length === 0 ? (
        <DevelopmentEmptyState
          title="Sin unidades"
          description="Agregá unidades para describir las variantes comerciales del emprendimiento."
          action={<Button onClick={openCreate}>Nueva unidad</Button>}
        />
      ) : (
        <DevelopmentTypologyTable
          developmentId={developmentId}
          typologies={typologies}
          onEdit={openEdit}
          pendingActionId={pendingActionId}
          setPendingActionId={setPendingActionId}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      <SidePanel open={panelMode != null} onClose={closePanel} width="lg">
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Nueva unidad" : "Editar unidad"}
          </SidePanelTitle>
          <SidePanelDescription>
            {panelMode === "create"
              ? "Solo el nombre y la descripción son obligatorios. Podés completar el resto más adelante."
              : "Modificá los datos y las características de la unidad."}
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {panelMode ? (
            <DevelopmentTypologyForm
              developmentId={developmentId}
              mode={panelMode}
              typology={editingTypology ?? undefined}
              sortOrder={typologies.length}
              featureCatalog={featureCatalog}
              featureAssignments={
                loadingFeatures ? [] : featureAssignments
              }
              onSuccess={handleFormSuccess}
              onCancel={closePanel}
            />
          ) : null}
        </SidePanelContent>
      </SidePanel>
    </>
  );
}
