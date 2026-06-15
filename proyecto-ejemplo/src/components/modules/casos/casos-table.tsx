"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  TableBulkActions,
  useTableSelection,
  type SortDirection,
} from "@/components/ui/table";

import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
} from "@/components/ui/dropdown";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { IconChevronDown } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { deleteCaso, type CasoListItem } from "@/lib/api/casos";

function formatCreatedAt(iso: string | null): string {
  if (!iso) return "—";
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

function ColumnsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <rect x="1" y="2" width="4" height="12" rx="0.5" />
      <rect x="6" y="2" width="4" height="12" rx="0.5" />
      <rect x="11" y="2" width="4" height="12" rx="0.5" />
    </svg>
  );
}

type ColKey = "cliente" | "practica" | "estado" | "fecha";

const COL_LABELS: Record<ColKey, string> = {
  cliente: "Cliente",
  practica: "Práctica",
  estado: "Estado",
  fecha: "Fecha creación",
};

const ALL_COLS = ["cliente", "practica", "estado", "fecha"] as ColKey[];

type SortKey = "numero" | "nombre" | "fecha";

const DEFAULT_SORT_KEY: SortKey = "numero";
const DEFAULT_SORT_DIR: SortDirection = "asc";

function compareNumero(
  a: string | null,
  b: string | null,
  dir: SortDirection,
): number {
  const av = (a ?? "").trim();
  const bv = (b ?? "").trim();
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  const factor = dir === "asc" ? 1 : -1;
  return factor * av.localeCompare(bv, "es", { numeric: true, sensitivity: "base" });
}

const CASOS_CONFIG = {
  basePath: "/casos",
  createLabel: "Nuevo Caso",
  emptyLabel: "No hay casos registrados",
  deleteTitle: "Eliminar caso",
  deleteDescription: "¿Estás seguro que querés eliminar este caso?",
  deleteSuccessMessage: "Caso eliminado",
};

type Props = {
  casos: CasoListItem[];
};

export function CasosTable({ casos }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDirection>(DEFAULT_SORT_DIR);
  const activeSortKey = sortKey ?? DEFAULT_SORT_KEY;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [colVisible, setColVisible] = useState<Record<ColKey, boolean>>({
    cliente: true,
    practica: true,
    estado: true,
    fecha: true,
  });

  const toggleCol = (key: ColKey) =>
    setColVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const visibleColCount = ALL_COLS.filter((k) => colVisible[k]).length;

  const filtered = useMemo(() => {
    if (!query.trim()) return casos;
    const q = query.toLowerCase();
    return casos.filter((row) => {
      const numDisplay = (row.numero?.trim() || "").toLowerCase();
      return [
        row.nombre,
        row.cliente?.nombre,
        row.practica?.nombre,
        row.estado,
        numDisplay,
      ].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [casos, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (activeSortKey === "numero") {
        return compareNumero(a.numero, b.numero, sortDir);
      }

      if (activeSortKey === "nombre") {
        const av = (a.nombre ?? "").toLowerCase();
        const bv = (b.nombre ?? "").toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      }

      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta < tb) return sortDir === "asc" ? -1 : 1;
      if (ta > tb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, activeSortKey, sortDir]);

  const total = sorted.length;
  const pageStart = (page - 1) * pageSize;
  const paginated = sorted.slice(pageStart, pageStart + pageSize);
  const pageIds = paginated.map((p) => p.id);

  const {
    selected,
    isSelected,
    toggle,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  } = useTableSelection(pageIds);

  function handleSort(key: SortKey) {
    if (activeSortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "fecha" ? "desc" : "asc");
    }
    setPage(1);
    clearSelection();
  }

  function handleSearch(q: string) {
    setQuery(q);
    setPage(1);
    clearSelection();
  }

  function handleDeleteClick(id: string) {
    setPendingId(id);
  }

  function handleCancel() {
    setPendingId(null);
  }

  function handleConfirm() {
    if (!pendingId) return;
    startTransition(async () => {
      try {
        await deleteCaso(pendingId);
        toast.success(CASOS_CONFIG.deleteSuccessMessage);
        setPendingId(null);
        clearSelection();
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al eliminar",
        );
      }
    });
  }

  const totalCols = 1 + 1 + 1 + visibleColCount + 1;

  return (
    <>
      <ConfirmModal
        open={pendingId !== null}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        loading={isPending}
        title={CASOS_CONFIG.deleteTitle}
        description={CASOS_CONFIG.deleteDescription}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <TableSurface>
        <TableToolbar>
          {selected.size > 0 ? (
            <TableBulkActions
              selected={selected.size}
              total={total}
              onClear={clearSelection}
            >
              <button
                type="button"
                onClick={() => {
                  if (selected.size === 1) {
                    const onlyId = [...selected][0];
                    if (onlyId) handleDeleteClick(onlyId);
                  }
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
              >
                Eliminar
              </button>
            </TableBulkActions>
          ) : (
            <>
              <TableSearch
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar caso, cliente, jurisdicción…"
                aria-label="Buscar casos"
                className="w-56"
              />

              <Dropdown align="end">
                <DropdownTrigger>
                  <Button
                    variant="secondary"
                    leftIcon={<ColumnsIcon />}
                    rightIcon={
                      <IconChevronDown className="size-3.5" />
                    }
                  >
                    Columnas
                  </Button>
                </DropdownTrigger>

                <DropdownContent className="min-w-[10rem] py-1.5">
                  {ALL_COLS.map((col) => (
                    <label
                      key={col}
                      className="mx-1 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      <Checkbox
                        size="sm"
                        checked={colVisible[col]}
                        onChange={() => toggleCol(col)}
                      />
                      {COL_LABELS[col]}
                    </label>
                  ))}
                </DropdownContent>
              </Dropdown>

              <div className="ml-auto" />

              <Link href={`${CASOS_CONFIG.basePath}/crear`}>
                <Button>{CASOS_CONFIG.createLabel}</Button>
              </Link>
            </>
          )}
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="w-9 pl-3 pr-0">
                <Checkbox
                  size="sm"
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </TableCell>

              <TableCell
                isHeader
                sortable
                className="w-px whitespace-nowrap tabular-nums"
                sortDirection={activeSortKey === "numero" ? sortDir : null}
                onSort={() => handleSort("numero")}
              >
                N.º
              </TableCell>

              <TableCell
                isHeader
                sortable
                sortDirection={activeSortKey === "nombre" ? sortDir : null}
                onSort={() => handleSort("nombre")}
              >
                Nombre
              </TableCell>

              {colVisible.cliente && (
                <TableCell isHeader>Cliente</TableCell>
              )}
              {colVisible.practica && (
                <TableCell isHeader>Práctica</TableCell>
              )}
              {colVisible.estado && <TableCell isHeader>Estado</TableCell>}
              {colVisible.fecha && (
                <TableCell
                  isHeader
                  sortable
                  sortDirection={activeSortKey === "fecha" ? sortDir : null}
                  onSort={() => handleSort("fecha")}
                >
                  Fecha creación
                </TableCell>
              )}

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
                    : CASOS_CONFIG.emptyLabel}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.id} selected={isSelected(row.id)}>
                  <TableCell className="w-9 pl-3 pr-0">
                    <Checkbox
                      size="sm"
                      checked={isSelected(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Seleccionar ${row.nombre ?? "caso"}`}
                    />
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap text-xs font-medium tabular-nums text-zinc-500">
                    {row.numero?.trim() || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-zinc-900 sm:whitespace-nowrap">
                      {row.nombre?.trim() || "—"}
                    </span>
                  </TableCell>
                  {colVisible.cliente && (
                    <TableCell className="text-zinc-500">
                      {row.cliente.nombre}
                    </TableCell>
                  )}
                  {colVisible.practica && (
                    <TableCell className="text-zinc-500">
                      {row.practica.nombre}
                    </TableCell>
                  )}
                  {colVisible.estado && (
                    <TableCell className="text-zinc-500">
                      {row.estado?.trim() || "—"}
                    </TableCell>
                  )}
                  {colVisible.fecha && (
                    <TableCell className="text-zinc-500 tabular-nums">
                      {formatCreatedAt(row.created_at)}
                    </TableCell>
                  )}
                  <TableCell
                    sticky
                    className="w-px whitespace-nowrap pr-3 text-right"
                  >
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`${CASOS_CONFIG.basePath}/${row.id}`}
                        aria-label="Ver"
                        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Icon.Eye className="size-4" />
                      </Link>

                      <DropdownMenu align="end">
                        <DropdownMenuTrigger
                          className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                          aria-label="Más acciones"
                        >
                          <Icon.DotsVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`${CASOS_CONFIG.basePath}/${row.id}?edit=1`)
                            }
                          >
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteClick(row.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            clearSelection();
          }}
        />
      </TableSurface>
    </>
  );
}
