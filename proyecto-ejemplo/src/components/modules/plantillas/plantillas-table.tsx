"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableSearch,
  TableSurface,
  TableToolbar,
  TableFooter,
  type SortDirection,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { setPlantillaActiva } from "@/lib/api/plantillas-admin";
import type { PlantillaAdminListItem } from "@/lib/server/services/plantillas-admin.service";
import { PLANTILLA_CONTEXTO_LABELS } from "@/lib/validation/schemas/plantilla-admin.schema";

const BASE_PATH = "/configuracion/plantillas";

type SortKey = "nombre" | "contexto" | "updated_at";

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

type Props = {
  plantillas: PlantillaAdminListItem[];
};

export function PlantillasTable({ plantillas }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    activo: boolean;
    nombre: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return plantillas;
    const q = query.toLowerCase();
    return plantillas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.regla_resumen.toLowerCase().includes(q) ||
        (PLANTILLA_CONTEXTO_LABELS[p.contexto] ?? p.contexto)
          .toLowerCase()
          .includes(q),
    );
  }, [plantillas, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = "";
      let bv = "";

      if (sortKey === "updated_at") {
        av = a.updated_at;
        bv = b.updated_at;
      } else {
        av = (a[sortKey] ?? "").toLowerCase();
        bv = (b[sortKey] ?? "").toLowerCase();
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pageStart = (page - 1) * pageSize;
  const paginated = sorted.slice(pageStart, pageStart + pageSize);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "updated_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  function handleSearch(q: string) {
    setQuery(q);
    setPage(1);
  }

  function handleToggleClick(row: PlantillaAdminListItem) {
    setPendingAction({
      id: row.id,
      activo: row.activo,
      nombre: row.nombre,
    });
  }

  function handleConfirmToggle() {
    if (!pendingAction) return;

    startTransition(async () => {
      try {
        await setPlantillaActiva(pendingAction.id, !pendingAction.activo);
        toast.success(
          pendingAction.activo ? "Plantilla desactivada" : "Plantilla reactivada",
        );
        setPendingAction(null);
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al actualizar estado",
        );
      }
    });
  }

  const totalCols = 7;

  return (
    <>
      <ConfirmModal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmToggle}
        loading={isPending}
        title={
          pendingAction?.activo ? "Desactivar plantilla" : "Reactivar plantilla"
        }
        description={
          pendingAction?.activo
            ? `¿Desactivar "${pendingAction.nombre}"? No aparecerá en selectores operativos.`
            : `¿Reactivar "${pendingAction?.nombre}"?`
        }
        confirmLabel={pendingAction?.activo ? "Desactivar" : "Reactivar"}
        cancelLabel="Cancelar"
      />

      <TableSurface>
        <TableToolbar>
          <TableSearch
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre o regla…"
            aria-label="Buscar plantillas"
            className="w-56"
          />
          <div className="ml-auto" />
          <Link href={`${BASE_PATH}/crear`}>
            <Button>Nueva plantilla</Button>
          </Link>
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "nombre" ? sortDir : null}
                onSort={() => handleSort("nombre")}
              >
                Nombre
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "contexto" ? sortDir : null}
                onSort={() => handleSort("contexto")}
              >
                Contexto
              </TableCell>
              <TableCell isHeader>Regla</TableCell>
              <TableCell isHeader align="center">
                Campos
              </TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "updated_at" ? sortDir : null}
                onSort={() => handleSort("updated_at")}
              >
                Actualizado
              </TableCell>
              <TableCell
                isHeader
                sticky
                className="w-px whitespace-nowrap pr-3 text-right"
              >
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  {query
                    ? `Sin resultados para "${query}"`
                    : "No hay plantillas registradas"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`${BASE_PATH}/${row.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600"
                    >
                      {row.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {PLANTILLA_CONTEXTO_LABELS[row.contexto] ?? row.contexto}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-zinc-500">
                    {row.regla_resumen}
                  </TableCell>
                  <TableCell align="center" className="tabular-nums text-zinc-500">
                    {row.campos_count}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.activo ? "success" : "neutral"}>
                      {row.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-zinc-500">
                    {formatUpdatedAt(row.updated_at)}
                  </TableCell>
                  <TableCell
                    sticky
                    className="w-px whitespace-nowrap pr-3 text-right"
                  >
                    <div className="flex items-center justify-end gap-0.5">
                      <Link href={`${BASE_PATH}/${row.id}`}>
                        <ActionIconButton type="button" aria-label="Editar">
                          <Icon.Edit className="size-3.5" />
                        </ActionIconButton>
                      </Link>
                      <ActionIconButton
                        type="button"
                        variant={row.activo ? "destructive" : "default"}
                        aria-label={row.activo ? "Desactivar" : "Reactivar"}
                        onClick={() => handleToggleClick(row)}
                      >
                        {row.activo ? (
                          <Icon.Trash className="size-3.5" />
                        ) : (
                          <Icon.Refresh className="size-3.5" />
                        )}
                      </ActionIconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        <TableFooter
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </TableSurface>
    </>
  );
}
