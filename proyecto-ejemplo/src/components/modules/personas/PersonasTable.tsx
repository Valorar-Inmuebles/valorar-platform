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

import { deletePersona } from "@/lib/api/personas";
import { formatPersonaDisplayName } from "@/lib/persona-display";
import { TIPO_LABELS, type TipoPersona } from "@/lib/validation/schemas/persona.schema";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type Persona = {
  id: string;
  tipo: string;
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  cuil: string | null;
  cuit: string | null;
  email_principal: string | null;
  telefono_principal: string | null;
};

type SortKey = "nombre" | "documento";

function comparePersonasByNombre(
  a: Persona,
  b: Persona,
  dir: SortDirection,
): number {
  const factor = dir === "asc" ? 1 : -1;

  if (a.tipo === "juridica" && b.tipo === "juridica") {
    return (
      factor *
      (a.nombre ?? "")
        .toLowerCase()
        .localeCompare((b.nombre ?? "").toLowerCase(), "es")
    );
  }

  const byApellido = (a.apellido ?? "")
    .toLowerCase()
    .localeCompare((b.apellido ?? "").toLowerCase(), "es");
  if (byApellido !== 0) return factor * byApellido;

  return (
    factor *
    (a.nombre ?? "")
      .toLowerCase()
      .localeCompare((b.nombre ?? "").toLowerCase(), "es")
  );
}

export type EntityTableConfig = {
  basePath: string;
  createLabel: string;
  emptyLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteSuccessMessage: string;
  onDelete: (id: string) => Promise<void>;
  /** Column header for persona/client display name. */
  displayNameColumnLabel?: string;
  defaultSortKey?: SortKey | null;
  defaultSortDir?: SortDirection;
  /** Muestra la columna Tipo (persona física / jurídica). Default: true. */
  showTipoColumn?: boolean;
  /** Ver → basePath/id; Editar → basePath/id?edit=1 */
  showViewAction?: boolean;
};

const DEFAULT_CONFIG: EntityTableConfig = {
  basePath: "/personas",
  createLabel: "Nueva Persona",
  emptyLabel: "No hay personas registradas",
  deleteTitle: "Eliminar persona",
  deleteDescription: "¿Estás seguro que querés eliminar esta persona?",
  deleteSuccessMessage: "Persona eliminada",
  onDelete: deletePersona,
  displayNameColumnLabel: "Apellido y nombre",
};

type ColKey = "documento" | "cuil" | "cuit" | "email_principal" | "telefono_principal";

const COL_LABELS: Record<ColKey, string> = {
  documento: "Documento",
  cuil: "CUIL",
  cuit: "CUIT",
  email_principal: "Email",
  telefono_principal: "Teléfono",
};

const ALL_COLS = ["email_principal", "telefono_principal", "documento", "cuil", "cuit"] as ColKey[];

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

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


// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

type Props = {
  personas: Persona[];
  config?: EntityTableConfig;
};

export function PersonasTable({ personas, config: configProp }: Props) {
  const config = configProp ?? DEFAULT_CONFIG;
  const showTipoColumn = config.showTipoColumn ?? true;
  const showViewAction = config.showViewAction ?? false;
  const defaultSortKey = config.defaultSortKey ?? null;
  const defaultSortDir = config.defaultSortDir ?? "asc";
  const { toast } = useToast();

  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [pendingId, setPendingId] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");

  // Sort (mismo patrón que campos-table: columna activa desde el inicio)
  const [sortKey, setSortKey] = useState<SortKey | null>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);
  const activeSortKey = sortKey ?? defaultSortKey;

  // Pagination
  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  // Column visibility
  const [colVisible, setColVisible] = useState<
    Record<ColKey, boolean>
  >({
    email_principal: true,
    telefono_principal: true,
    documento: true,
    cuil: false,
    cuit: false,
  });

  const toggleCol = (key: ColKey) =>
    setColVisible((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  const visibleColCount = ALL_COLS.filter(
    (k) => colVisible[k],
  ).length;

  // ───────────────────────────────────────────────────────────
  // Filter
  // ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!query.trim()) return personas;

    const q = query.toLowerCase();

    return personas.filter((p) =>
      [p.nombre, p.apellido, p.documento, p.cuil, p.cuit, p.email_principal, p.telefono_principal].some(
        (v) => v?.toLowerCase().includes(q),
      ),
    );
  }, [personas, query]);

  // ───────────────────────────────────────────────────────────
  // Sort
  // ───────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    if (!activeSortKey) return filtered;

    return [...filtered].sort((a, b) => {
      if (activeSortKey === "nombre") {
        return comparePersonasByNombre(a, b, sortDir);
      }

      const av = (a[activeSortKey] ?? "").toLowerCase();
      const bv = (b[activeSortKey] ?? "").toLowerCase();

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, activeSortKey, sortDir]);

  // ───────────────────────────────────────────────────────────
  // Pagination
  // ───────────────────────────────────────────────────────────

  const total = sorted.length;

  const pageStart = (page - 1) * pageSize;

  const paginated = sorted.slice(
    pageStart,
    pageStart + pageSize,
  );

  const pageIds = paginated.map((p) => p.id);

  // ───────────────────────────────────────────────────────────
  // Selection
  // ───────────────────────────────────────────────────────────

  const {
    selected,
    isSelected,
    toggle,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  } = useTableSelection(pageIds);

  // ───────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (activeSortKey === key) {
      setSortDir((d) =>
        d === "asc" ? "desc" : "asc",
      );
    } else {
      setSortKey(key);

      setSortDir("asc");
    }

    setPage(1);

    clearSelection();
  }

  function handleSearch(q: string) {
    setQuery(q);

    setPage(1);

    clearSelection();
  }

  // ───────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────

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
        await config.onDelete(pendingId);

        toast.success(config.deleteSuccessMessage);

        setPendingId(null);

        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Error al eliminar",
        );
      }
    });
  }

  // checkbox + nombre + [tipo] + visible cols + acciones
  const totalCols = 1 + 1 + (showTipoColumn ? 1 : 0) + visibleColCount + 1;

  return (
    <>
      <ConfirmModal
        open={pendingId !== null}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        loading={isPending}
        title={config.deleteTitle}
        description={config.deleteDescription}
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
                    handleDeleteClick(
                      [...selected][0],
                    );
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
                onChange={(e) =>
                  handleSearch(e.target.value)
                }
                placeholder="Buscar nombre o documento…"
                aria-label="Buscar personas"
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
                        onChange={() =>
                          toggleCol(col)
                        }
                      />

                      {COL_LABELS[col]}
                    </label>
                  ))}
                </DropdownContent>
              </Dropdown>

              <div className="ml-auto" />

              <Link href={`${config.basePath}/crear`}>
                <Button>
                  {config.createLabel}
                </Button>
              </Link>
            </>
          )}
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                className="w-9 pl-3 pr-0"
              >
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
                sortDirection={
                  activeSortKey === "nombre"
                    ? sortDir
                    : null
                }
                onSort={() =>
                  handleSort("nombre")
                }
              >
                {config.displayNameColumnLabel ?? "Apellido y nombre"}
              </TableCell>

              {showTipoColumn && (
                <TableCell isHeader>
                  Tipo
                </TableCell>
              )}

              {colVisible.email_principal && (
                <TableCell isHeader>
                  Email
                </TableCell>
              )}

              {colVisible.telefono_principal && (
                <TableCell isHeader>
                  Teléfono
                </TableCell>
              )}

              {colVisible.documento && (
                <TableCell
                  isHeader
                  sortable
                  sortDirection={
                    activeSortKey === "documento"
                      ? sortDir
                      : null
                  }
                  onSort={() =>
                    handleSort("documento")
                  }
                >
                  Documento
                </TableCell>
              )}

              {colVisible.cuil && (
                <TableCell isHeader>
                  CUIL
                </TableCell>
              )}

              {colVisible.cuit && (
                <TableCell isHeader>
                  CUIT
                </TableCell>
              )}

              <TableCell
                isHeader
                sticky
                className="w-px whitespace-nowrap pr-3"
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
                    : config.emptyLabel}
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <TableRow
                  key={p.id}
                  selected={isSelected(p.id)}
                >
                  <TableCell className="w-9 pl-3 pr-0">
                    <Checkbox
                      size="sm"
                      checked={isSelected(p.id)}
                      onChange={() =>
                        toggle(p.id)
                      }
                      aria-label={`Seleccionar ${formatPersonaDisplayName(p)}`}
                    />
                  </TableCell>

                  <TableCell>
                    <span className="font-medium text-zinc-900 sm:whitespace-nowrap">
                      {formatPersonaDisplayName(p)}
                    </span>
                  </TableCell>

                  {showTipoColumn && (
                    <TableCell className="text-zinc-500">
                      {TIPO_LABELS[p.tipo as TipoPersona] ?? p.tipo}
                    </TableCell>
                  )}

                  {colVisible.email_principal && (
                    <TableCell className="text-zinc-500">
                      {p.email_principal ?? "—"}
                    </TableCell>
                  )}

                  {colVisible.telefono_principal && (
                    <TableCell className="text-zinc-500">
                      {p.telefono_principal ?? "—"}
                    </TableCell>
                  )}

                  {colVisible.documento && (
                    <TableCell className="text-zinc-500">
                      {p.documento ?? "—"}
                    </TableCell>
                  )}

                  {colVisible.cuil && (
                    <TableCell className="text-zinc-500">
                      {p.cuil ?? "—"}
                    </TableCell>
                  )}

                  {colVisible.cuit && (
                    <TableCell className="text-zinc-500">
                      {p.cuit ?? "—"}
                    </TableCell>
                  )}

                  <TableCell
                    sticky
                    className="w-px whitespace-nowrap pr-3"
                  >
                    <div className="flex items-center justify-end gap-0.5">

                    {showViewAction && (
                      <Link
                        href={`${config.basePath}/${p.id}`}
                        aria-label="Ver"
                        className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Icon.Eye className="size-4" />
                      </Link>
                    )}

                    <Link
                      href={
                        showViewAction
                          ? `${config.basePath}/${p.id}?edit=1`
                          : `${config.basePath}/${p.id}`
                      }
                      aria-label="Editar"
                      className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Icon.Edit />
                    </Link>

                    <ActionIconButton
                      variant="destructive"
                      aria-label="Eliminar"
                      onClick={() => handleDeleteClick(p.id)}
                    >
                      <Icon.Trash />
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

            clearSelection();
          }}
        />
      </TableSurface>
    </>
  );
}