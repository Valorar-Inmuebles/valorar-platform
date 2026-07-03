"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { DevelopmentArchiveModalContent } from "@/components/development/development-archive-modal-content";
import { DevelopmentEmptyState } from "@/components/development/development-empty-state";
import { DevelopmentLifecycleBadge } from "@/components/development/development-lifecycle-badge";
import { DevelopmentStatusBadge } from "@/components/development/development-status-badge";
import {
  archiveDevelopmentAction,
  restoreDevelopmentAction,
} from "@/lib/api/development-actions";
import type { AdminDevelopment } from "@/lib/api/types/development";

type DevelopmentListViewProps = {
  developments: AdminDevelopment[];
};

type LifecycleFilter = "all" | "active" | "archived";

function formatLocation(development: AdminDevelopment): string {
  return [development.neighborhoodName ?? development.neighborhood, development.city]
    .filter(Boolean)
    .join(", ");
}

function matchesSearch(development: AdminDevelopment, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    development.title,
    development.internalCode,
    development.city,
    development.neighborhoodName,
    development.neighborhood,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function DevelopmentListView({ developments }: DevelopmentListViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [archiveTarget, setArchiveTarget] = useState<AdminDevelopment | null>(
    null,
  );
  const [restoreTarget, setRestoreTarget] = useState<AdminDevelopment | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredDevelopments = useMemo(() => {
    return developments.filter((development) => {
      if (lifecycleFilter === "active" && !development.isActive) return false;
      if (lifecycleFilter === "archived" && development.isActive) return false;
      return matchesSearch(development, searchQuery);
    });
  }, [developments, lifecycleFilter, searchQuery]);

  const handleArchive = () => {
    if (!archiveTarget) return;

    startTransition(async () => {
      const result = await archiveDevelopmentAction(archiveTarget.id);
      setArchiveTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Emprendimiento archivado correctamente.");
      router.refresh();
    });
  };

  const handleRestore = () => {
    if (!restoreTarget) return;

    startTransition(async () => {
      const result = await restoreDevelopmentAction(restoreTarget.id);
      setRestoreTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Emprendimiento restaurado correctamente.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por título, código o ubicación"
          className="max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "active", label: "Activos" },
              { id: "archived", label: "Archivados" },
            ] as const
          ).map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={lifecycleFilter === filter.id ? "primary" : "secondary"}
              onClick={() => setLifecycleFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredDevelopments.length === 0 ? (
        <DevelopmentEmptyState
          title={searchQuery.trim() ? "Sin resultados" : "Sin emprendimientos"}
          description={
            searchQuery.trim()
              ? "No hay emprendimientos que coincidan con la búsqueda."
              : "Creá el primer emprendimiento del tenant para comenzar a gestionar unidades e imágenes."
          }
        />
      ) : (
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
                    <th className="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevelopments.map((development) => (
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
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/emprendimientos/${development.id}`}>
                            <Button variant="secondary" size="sm">
                              Editar
                            </Button>
                          </Link>
                          {development.isActive ? (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setArchiveTarget(development)}
                            >
                              Archivar
                            </Button>
                          ) : (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setRestoreTarget(development)}
                            >
                              Restaurar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted">
            Mostrando {filteredDevelopments.length} de {developments.length}{" "}
            {developments.length === 1 ? "emprendimiento" : "emprendimientos"}.
          </p>
        </CardContent>
      </Card>

      <ConfirmModal
        open={archiveTarget != null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archivar emprendimiento"
        description={
          archiveTarget ? (
            <DevelopmentArchiveModalContent
              developmentTitle={archiveTarget.title}
            />
          ) : null
        }
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
        loading={isPending}
      />

      <ConfirmModal
        open={restoreTarget != null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restaurar emprendimiento"
        description={
          restoreTarget ? (
            <>
              ¿Restaurar <strong>{restoreTarget.title}</strong>? Volverá a estar
              activo y podrá gestionarse normalmente.
            </>
          ) : null
        }
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        loading={isPending}
      />
    </div>
  );
}
