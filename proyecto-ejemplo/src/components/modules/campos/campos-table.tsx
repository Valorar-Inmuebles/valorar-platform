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
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  deactivateCampoDinamico,
  setCampoDinamicoActivo,
} from "@/lib/api/campos-dinamicos";
import type { CampoDinamicoAdminListItem } from "@/lib/server/services/campos-dinamicos.service";
import {
  CAMPO_DINAMICO_TIPO_LABELS,
  isCampoDinamicoOptionTipo,
  type CampoDinamicoTipo,
} from "@/lib/validation/schemas/campo-dinamico.schema";

const BASE_PATH = "/configuracion/campos";

type SortKey = "etiqueta" | "clave" | "tipo" | "updated_at";

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

function tipoLabel(tipo: string): string {
  const key = tipo as CampoDinamicoTipo;
  return CAMPO_DINAMICO_TIPO_LABELS[key] ?? tipo;
}

type Props = {
  campos: CampoDinamicoAdminListItem[];
};

export function CamposTable({ campos }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("etiqueta");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    activo: boolean;
    etiqueta: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return campos;
    const q = query.toLowerCase();
    return campos.filter(
      (c) =>
        c.etiqueta.toLowerCase().includes(q) ||
        c.clave.toLowerCase().includes(q) ||
        tipoLabel(c.tipo).toLowerCase().includes(q),
    );
  }, [campos, query]);

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

  function handleToggleClick(row: CampoDinamicoAdminListItem) {
    setPendingAction({
      id: row.id,
      activo: row.activo,
      etiqueta: row.etiqueta,
    });
  }

  function handleConfirmToggle() {
    if (!pendingAction) return;

    startTransition(async () => {
      try {
        if (pendingAction.activo) {
          await deactivateCampoDinamico(pendingAction.id);
          toast.success("Campo desactivado");
        } else {
          await setCampoDinamicoActivo(pendingAction.id, true);
          toast.success("Campo reactivado");
        }
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
          pendingAction?.activo ? "Desactivar campo" : "Reactivar campo"
        }
        description={
          pendingAction?.activo
            ? `¿Desactivar "${pendingAction.etiqueta}"? No aparecerá al armar plantillas.`
            : `¿Reactivar "${pendingAction?.etiqueta}"?`
        }
        confirmLabel={pendingAction?.activo ? "Desactivar" : "Reactivar"}
        cancelLabel="Cancelar"
      />

      <TableSurface>
        <TableToolbar>
          <TableSearch
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por etiqueta o clave…"
            aria-label="Buscar campos"
            className="w-56"
          />
          <div className="ml-auto" />
          <Link href={`${BASE_PATH}/crear`}>
            <Button>Nuevo campo</Button>
          </Link>
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "etiqueta" ? sortDir : null}
                onSort={() => handleSort("etiqueta")}
              >
                Etiqueta
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "clave" ? sortDir : null}
                onSort={() => handleSort("clave")}
              >
                Clave
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "tipo" ? sortDir : null}
                onSort={() => handleSort("tipo")}
              >
                Tipo
              </TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader align="center">
                Opciones
              </TableCell>
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
                    : "No hay campos registrados"}
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
                      {row.etiqueta}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-600">
                      {row.clave}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-700">
                      {tipoLabel(row.tipo)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        row.activo
                          ? "inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800"
                          : "inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-500"
                      }
                    >
                      {row.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <span className="tabular-nums text-sm text-zinc-600">
                      {isCampoDinamicoOptionTipo(row.tipo)
                        ? row.opciones_count
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                    {formatUpdatedAt(row.updated_at)}
                  </TableCell>
                  <TableCell sticky align="right" className="pr-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`${BASE_PATH}/${row.id}`}
                        aria-label={`Editar ${row.etiqueta}`}
                        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Icon.Edit className="size-3.5" />
                      </Link>
                      <ActionIconButton
                        type="button"
                        variant={row.activo ? "destructive" : "default"}
                        onClick={() => handleToggleClick(row)}
                        aria-label={
                          row.activo
                            ? `Desactivar ${row.etiqueta}`
                            : `Reactivar ${row.etiqueta}`
                        }
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

        {total > 0 && (
          <TableFooter
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </TableSurface>
    </>
  );
}
