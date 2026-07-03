"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { DevelopmentArchiveModalContent } from "@/components/development/development-archive-modal-content";
import { DevelopmentLifecycleBadge } from "@/components/development/development-lifecycle-badge";
import { DevelopmentStatusBadge } from "@/components/development/development-status-badge";
import { archiveDevelopmentAction } from "@/lib/api/development-actions";
import type { AdminDevelopment } from "@/lib/api/types/development";
import { cn } from "@/lib/cn";

type DevelopmentTableProps = {
  developments: AdminDevelopment[];
};

function formatLocation(development: AdminDevelopment): string {
  return [development.neighborhoodName ?? development.neighborhood, development.city]
    .filter(Boolean)
    .join(", ");
}

export function DevelopmentTable({ developments }: DevelopmentTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDevelopment | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    if (!deleteTarget) return;

    setPendingId(deleteTarget.id);
    startTransition(async () => {
      const result = await archiveDevelopmentAction(deleteTarget.id);
      setPendingId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Emprendimiento archivado correctamente.");
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
                  <th className="px-4 py-3 font-medium">Emprendimiento</th>
                  <th className="px-4 py-3 font-medium">Estado obra</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {developments.map((development) => (
                  <tr
                    key={development.id}
                    className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/emprendimientos/${development.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {development.title}
                        </Link>
                        {development.internalCode ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {development.internalCode}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {development.status ? (
                        <DevelopmentStatusBadge status={development.status} />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatLocation(development) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DevelopmentLifecycleBadge
                        status={development.isActive ? "active" : "archived"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/emprendimientos/${development.id}`}>
                          <Button variant="secondary" size="sm">
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={!development.isActive || isPending}
                          onClick={() => setDeleteTarget(development)}
                          className={cn(!development.isActive && "opacity-50")}
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
        title="Archivar emprendimiento"
        description={
          deleteTarget ? (
            <DevelopmentArchiveModalContent
              developmentTitle={deleteTarget.title}
            />
          ) : null
        }
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
        loading={isPending && pendingId === deleteTarget?.id}
      />
    </>
  );
}
