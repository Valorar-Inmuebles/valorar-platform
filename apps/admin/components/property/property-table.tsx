"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { archivePropertyAction } from "@/lib/api/property-actions";
import type { AdminProperty } from "@/lib/api/types/property";
import { getPropertyTypeLabel } from "@/lib/format/property-labels";
import { cn } from "@/lib/cn";

type PropertyTableProps = {
  properties: AdminProperty[];
};

function formatLocation(property: AdminProperty): string {
  return [property.neighborhood, property.city].filter(Boolean).join(", ");
}

export function PropertyTable({ properties }: PropertyTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProperty | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    if (!deleteTarget) return;

    setPendingId(deleteTarget.id);
    startTransition(async () => {
      const result = await archivePropertyAction(deleteTarget.id);
      setPendingId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Propiedad archivada correctamente.");
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
                  <th className="px-4 py-3 font-medium">Propiedad</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/propiedades/${property.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {property.title}
                        </Link>
                        {property.internalCode ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {property.internalCode}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {getPropertyTypeLabel(property.propertyType)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatLocation(property) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PropertyStatusBadge
                        status={property.isActive ? "active" : "archived"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/propiedades/${property.id}`}>
                          <Button variant="secondary" size="sm">
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={!property.isActive || isPending}
                          onClick={() => setDeleteTarget(property)}
                          className={cn(
                            !property.isActive && "opacity-50",
                          )}
                        >
                          Archivar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleArchive}
        title="Archivar propiedad"
        description={
          deleteTarget ? (
            <>
              ¿Archivar <strong>{deleteTarget.title}</strong>? Dejará de estar
              activa y no podrá publicarse en la web.
            </>
          ) : null
        }
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
        loading={isPending && pendingId === deleteTarget?.id}
      />
    </>
  );
}
