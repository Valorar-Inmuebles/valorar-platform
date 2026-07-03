"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { deleteDevelopmentTypologyAction } from "@/lib/api/development-typology-actions";
import type { AdminDevelopmentTypology } from "@/lib/api/types/development-typology";
import { formatTypologyPrice, formatTypologySurface, formatTypologyUnits } from "@/lib/development/typology-display";

type DevelopmentTypologyTableProps = {
  developmentId: string;
  typologies: AdminDevelopmentTypology[];
  onEdit: (typology: AdminDevelopmentTypology) => void;
  pendingActionId: string | null;
  setPendingActionId: (id: string | null) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
};

export function DevelopmentTypologyTable({
  developmentId,
  typologies,
  onEdit,
  pendingActionId,
  setPendingActionId,
  isPending,
  startTransition,
}: DevelopmentTypologyTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] =
    useState<AdminDevelopmentTypology | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;

    setPendingActionId(deleteTarget.id);
    startTransition(async () => {
      const result = await deleteDevelopmentTypologyAction(
        developmentId,
        deleteTarget.id,
      );
      setPendingActionId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Unidad eliminada correctamente.");
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 font-medium">Unidades</th>
                  <th className="px-4 py-3 font-medium">Superficie</th>
                  <th className="px-4 py-3 font-medium">Precio desde</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {typologies.map((typology) => {
                  const rowPending =
                    isPending && pendingActionId === typology.id;
                  const units = formatTypologyUnits(typology);
                  const surface = formatTypologySurface(typology);
                  const price = formatTypologyPrice(typology);

                  return (
                    <tr
                      key={typology.id}
                      className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {typology.name}
                          </p>
                          {typology.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                              {typology.description}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{units}</td>
                      <td className="px-4 py-3 text-muted">{surface}</td>
                      <td className="px-4 py-3 text-muted">{price}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={rowPending}
                            onClick={() => onEdit(typology)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={rowPending}
                            onClick={() => setDeleteTarget(typology)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar unidad"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar la unidad <strong>{deleteTarget.name}</strong>?
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={isPending && pendingActionId === deleteTarget?.id}
      />
    </>
  );
}
