"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableSearch,
  TableBulkActions,
  TableSurface,
  TableToolbar,
  TableFooter,
  useTableSearch,
  useTableSelection,
  type SortDirection,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconChevronDown } from "@/components/ui/icons";
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Shared data ───────────────────────────────────────────────────────────────

type Row = {
  id: string;
  name: string;
  role: string;
  joined: string;
  joinedTs: number;
};

const ROWS: Row[] = [
  { id: "1", name: "Alice Martin", role: "Admin",  joined: "Jan 2024", joinedTs: 20240101 },
  { id: "2", name: "Bob Chen",     role: "Editor", joined: "Mar 2024", joinedTs: 20240301 },
  { id: "3", name: "Carol James",  role: "Viewer", joined: "Jun 2024", joinedTs: 20240601 },
  { id: "4", name: "David Park",   role: "Editor", joined: "Aug 2024", joinedTs: 20240801 },
  { id: "5", name: "Eva Torres",   role: "Admin",  joined: "Nov 2024", joinedTs: 20241101 },
];

type SortKey = "name" | "role" | "joined";

function sortRows(rows: Row[], key: SortKey | null, dir: SortDirection): Row[] {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = key === "joined" ? a.joinedTs : a[key].toLowerCase();
    const bv = key === "joined" ? b.joinedTs : b[key].toLowerCase();
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ── Status filter types shared across showcases ────────────────────────────────

type FilterRow = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending";
  joined: string;
  joinedDate: string;
};

type StatusFilter = "all" | FilterRow["status"];

const FILTER_DATA: FilterRow[] = [
  { id:  "1", name: "Alice Martin",  email: "alice@example.com",  status: "active",   joined: "Jan 15, 2024", joinedDate: "2024-01-15" },
  { id:  "2", name: "Bob Chen",      email: "bob@example.com",    status: "pending",  joined: "Mar 3, 2024",  joinedDate: "2024-03-03" },
  { id:  "3", name: "Carol James",   email: "carol@example.com",  status: "inactive", joined: "Jun 22, 2024", joinedDate: "2024-06-22" },
  { id:  "4", name: "David Park",    email: "david@example.com",  status: "active",   joined: "Aug 7, 2024",  joinedDate: "2024-08-07" },
  { id:  "5", name: "Eva Torres",    email: "eva@example.com",    status: "active",   joined: "Nov 14, 2024", joinedDate: "2024-11-14" },
  { id:  "6", name: "Frank Liu",     email: "frank@example.com",  status: "pending",  joined: "Dec 1, 2023",  joinedDate: "2023-12-01" },
  { id:  "7", name: "Grace Kim",     email: "grace@example.com",  status: "inactive", joined: "Feb 28, 2024", joinedDate: "2024-02-28" },
  { id:  "8", name: "Henry Osei",    email: "henry@example.com",  status: "active",   joined: "Apr 10, 2024", joinedDate: "2024-04-10" },
  { id:  "9", name: "Iris Novak",    email: "iris@example.com",   status: "pending",  joined: "May 5, 2024",  joinedDate: "2024-05-05" },
  { id: "10", name: "James Wright",  email: "james@example.com",  status: "active",   joined: "Jul 19, 2024", joinedDate: "2024-07-19" },
  { id: "11", name: "Kara Singh",    email: "kara@example.com",   status: "inactive", joined: "Sep 30, 2024", joinedDate: "2024-09-30" },
  { id: "12", name: "Leo Fernandez", email: "leo@example.com",    status: "active",   joined: "Oct 11, 2024", joinedDate: "2024-10-11" },
];

const STATUS_DOT: Record<FilterRow["status"], string> = {
  active:   "bg-emerald-400",
  inactive: "bg-zinc-400",
  pending:  "bg-amber-400",
};

const STATUS_BADGE: Record<FilterRow["status"], "success" | "neutral" | "warning"> = {
  active:   "success",
  inactive: "neutral",
  pending:  "warning",
};

const STATUS_LABEL: Record<FilterRow["status"], string> = {
  active:   "Activo",
  inactive: "Inactivo",
  pending:  "Pendiente",
};

// ── RowActionsMenu ─────────────────────────────────────────────────────────────

function RowActionsMenu() {
  return (
    <DropdownMenu align="end">
      <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
          <circle cx="3" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="13" cy="8" r="1.25" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Ver detalle</DropdownMenuItem>
        <DropdownMenuItem>Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700">
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── ColumnsIcon ────────────────────────────────────────────────────────────────

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

// ── ColSortDropdown ────────────────────────────────────────────────────────────
// Column header with sort dropdown (Asc / Desc / Pin). Visual pattern only.

type ColSortState = SortDirection | null;

function ColSortDropdown({
  label,
  sortState,
  onAsc,
  onDesc,
}: {
  label: string;
  sortState: ColSortState;
  onAsc: () => void;
  onDesc: () => void;
}) {
  const iconClass = "size-3 shrink-0";
  return (
    <DropdownMenu align="start">
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 select-none text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
        {label}
        {sortState === "asc" ? (
          <svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`${iconClass} text-indigo-500`} aria-hidden>
            <path d="M5 10V2M2 5l3-3 3 3" />
          </svg>
        ) : sortState === "desc" ? (
          <svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`${iconClass} text-indigo-500`} aria-hidden>
            <path d="M5 2v8M2 7l3 3 3-3" />
          </svg>
        ) : (
          <svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`${iconClass} text-zinc-300`} aria-hidden>
            <path d="M2.5 4.5 5 2l2.5 2.5" />
            <path d="M2.5 7.5 5 10l2.5-2.5" />
          </svg>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[11rem]">
        <DropdownMenuItem onClick={onAsc} className="gap-2">
          <svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-zinc-400" aria-hidden>
            <path d="M5 10V2M2 5l3-3 3 3" />
          </svg>
          Ordenar A → Z
          {sortState === "asc" && (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3 text-indigo-500" aria-hidden>
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDesc} className="gap-2">
          <svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-zinc-400" aria-hidden>
            <path d="M5 2v8M2 7l3 3 3-3" />
          </svg>
          Ordenar Z → A
          {sortState === "desc" && (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3 text-indigo-500" aria-hidden>
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-zinc-500">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-zinc-400" aria-hidden>
            <path d="M2 7h10M2 3h4M2 11h4" />
          </svg>
          Fijar izquierda
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-zinc-500">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-zinc-400" aria-hidden>
            <path d="M2 7h10M8 3h4M8 11h4" />
          </svg>
          Fijar derecha
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── FullDataSurfaceShowcase ────────────────────────────────────────────────────
// Flagship showcase: unified toolbar + sortable table with selection + integrated footer.

type ColKey = "email" | "status" | "joined";

const COL_LABELS: Record<ColKey, string> = {
  email:  "Email",
  status: "Estado",
  joined: "Fecha",
};

export function FullDataSurfaceShowcase() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "joined" | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [colVisible, setColVisible] = useState<Record<ColKey, boolean>>({
    email: true, status: true, joined: true,
  });

  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Filter
  const filtered = useMemo(
    () =>
      FILTER_DATA.filter((row) => {
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!row.name.toLowerCase().includes(q) && !row.email.toLowerCase().includes(q))
            return false;
        }
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        return true;
      }),
    [query, statusFilter],
  );

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sortKey === "joined" ? a.joinedDate : a.name.toLowerCase();
      const bv = sortKey === "joined" ? b.joinedDate : b.name.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const total = sorted.length;
  const pageStart = (page - 1) * pageSize;
  const paginated = sorted.slice(pageStart, pageStart + pageSize);
  const pageIds = paginated.map((r) => r.id);

  // Selection (scoped to current page)
  const { selected, isSelected, toggle, toggleAll, clearSelection, isAllSelected, isIndeterminate } =
    useTableSelection(pageIds);

  const handleSort = (key: "name" | "joined") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
    clearSelection();
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
    clearSelection();
  };

  const handleStatus = (s: StatusFilter) => {
    setStatusFilter(s);
    setPage(1);
    clearSelection();
  };

  const toggleCol = (key: ColKey) =>
    setColVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const visibleColCount = Object.values(colVisible).filter(Boolean).length;

  function handleDeleteConfirm() {
    const count = selected.size;
    setConfirmOpen(false);
    clearSelection();
    toast.success(
      `${count} ${count === 1 ? "miembro eliminado" : "miembros eliminados"}`,
      { title: "Eliminado" },
    );
  }

  const totalCols = 2 + visibleColCount + 1; // checkbox + name + visible + actions

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar ${selected.size} ${selected.size === 1 ? "miembro" : "miembros"}?`}
        description={
          <>
            Esta acción es permanente y revocará todos los accesos.{" "}
            <strong className="font-medium text-zinc-900">No se puede deshacer.</strong>
          </>
        }
        confirmLabel={`Eliminar ${selected.size === 1 ? "miembro" : "miembros"}`}
      />

      <TableSurface>

        {/* Toolbar */}
        <TableToolbar>
          {selected.size > 0 ? (
            <>
              <TableBulkActions
                selected={selected.size}
                total={total}
                onClear={clearSelection}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
                    <path d="M7 1v7M4 5.5 7 9l3-3.5" />
                    <path d="M2 10.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" />
                  </svg>
                  Exportar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
                    <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M11 3.5l-.6 8a.5.5 0 0 1-.5.5H4.1a.5.5 0 0 1-.5-.5L3 3.5" />
                  </svg>
                  Eliminar
                </button>
              </TableBulkActions>
            </>
          ) : (
            <>
              {/* Search */}
              <TableSearch
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar nombre o email…"
                aria-label="Buscar miembros"
                className="w-52"
              />

              {/* Status filter */}
              <Dropdown align="end">
                <DropdownTrigger>
                  <Button
                    variant={statusFilter !== "all" ? "outline-primary" : "secondary"}
                    rightIcon={<IconChevronDown className="size-3.5" />}
                  >
                    {statusFilter === "all" ? (
                      "Estado"
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${STATUS_DOT[statusFilter]}`} />
                        {STATUS_LABEL[statusFilter]}
                      </span>
                    )}
                  </Button>
                </DropdownTrigger>
                <DropdownContent className="min-w-[9rem]">
                  <DropdownItem onClick={() => handleStatus("all")}>
                    Todos los estados
                  </DropdownItem>
                  {(["active", "inactive", "pending"] as const).map((s) => (
                    <DropdownItem key={s} onClick={() => handleStatus(s)}>
                      <span className={`size-1.5 rounded-full ${STATUS_DOT[s]}`} />
                      {STATUS_LABEL[s]}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>

              {/* Column visibility */}
              <Dropdown align="end">
                <DropdownTrigger>
                  <Button
                    variant="secondary"
                    leftIcon={<ColumnsIcon />}
                    rightIcon={<IconChevronDown className="size-3.5" />}
                  >
                    Columnas
                    {visibleColCount < 3 && (
                      <span className="ml-0.5 rounded bg-indigo-100 px-1 py-px text-[10px] font-semibold text-indigo-600">
                        {visibleColCount}/3
                      </span>
                    )}
                  </Button>
                </DropdownTrigger>
                <DropdownContent className="min-w-[10rem] py-1.5">
                  {(["email", "status", "joined"] as ColKey[]).map((col) => (
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

              <Button>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Agregar miembro
              </Button>
            </>
          )}
        </TableToolbar>

        {/* Table */}
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
              {/* Nombre: uses sort dropdown (Asc/Desc/Pin) */}
              <TableCell isHeader>
                <ColSortDropdown
                  label="Nombre"
                  sortState={sortKey === "name" ? sortDir : null}
                  onAsc={() => { setSortKey("name"); setSortDir("asc"); setPage(1); clearSelection(); }}
                  onDesc={() => { setSortKey("name"); setSortDir("desc"); setPage(1); clearSelection(); }}
                />
              </TableCell>
              {colVisible.email  && <TableCell isHeader>Email</TableCell>}
              {colVisible.status && <TableCell isHeader>Estado</TableCell>}
              {colVisible.joined && (
                <TableCell
                  isHeader
                  sortable
                  sortDirection={sortKey === "joined" ? sortDir : null}
                  onSort={() => handleSort("joined")}
                >
                  Fecha
                </TableCell>
              )}
              {/* Actions: w-px + whitespace-nowrap keeps it auto-width */}
              <TableCell isHeader sticky className="w-px whitespace-nowrap pr-3">
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
                  Sin resultados para los filtros actuales
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
                      aria-label={`Seleccionar ${row.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-zinc-900">{row.name}</span>
                  </TableCell>
                  {colVisible.email && (
                    <TableCell className="text-zinc-500">{row.email}</TableCell>
                  )}
                  {colVisible.status && (
                    <TableCell>
                      <Badge variant={STATUS_BADGE[row.status]}>
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </TableCell>
                  )}
                  {colVisible.joined && <TableCell>{row.joined}</TableCell>}
                  <TableCell sticky className="w-px whitespace-nowrap pr-3">
                    <RowActionsMenu />
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        {/* Footer */}
        <TableFooter
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); clearSelection(); }}
        />
      </TableSurface>
    </>
  );
}

// ── PaginatedTableShowcase ────────────────────────────────────────────────────

const PAGINATED_ROWS: Row[] = [
  { id:  "1", name: "Alice Martin",   role: "Admin",   joined: "Jan 2024", joinedTs: 20240101 },
  { id:  "2", name: "Bob Chen",       role: "Editor",  joined: "Mar 2024", joinedTs: 20240301 },
  { id:  "3", name: "Carol James",    role: "Viewer",  joined: "Jun 2024", joinedTs: 20240601 },
  { id:  "4", name: "David Park",     role: "Editor",  joined: "Aug 2024", joinedTs: 20240801 },
  { id:  "5", name: "Eva Torres",     role: "Admin",   joined: "Nov 2024", joinedTs: 20241101 },
  { id:  "6", name: "Frank Liu",      role: "Viewer",  joined: "Dec 2023", joinedTs: 20231201 },
  { id:  "7", name: "Grace Kim",      role: "Editor",  joined: "Feb 2024", joinedTs: 20240201 },
  { id:  "8", name: "Henry Osei",     role: "Viewer",  joined: "Apr 2024", joinedTs: 20240401 },
  { id:  "9", name: "Iris Novak",     role: "Admin",   joined: "May 2024", joinedTs: 20240501 },
  { id: "10", name: "James Wright",   role: "Editor",  joined: "Jul 2024", joinedTs: 20240701 },
  { id: "11", name: "Kara Singh",     role: "Viewer",  joined: "Sep 2024", joinedTs: 20240901 },
  { id: "12", name: "Leo Fernandez",  role: "Editor",  joined: "Oct 2024", joinedTs: 20241001 },
  { id: "13", name: "Maya Patel",     role: "Admin",   joined: "Dec 2024", joinedTs: 20241201 },
  { id: "14", name: "Nate Brooks",    role: "Viewer",  joined: "Jan 2025", joinedTs: 20250101 },
  { id: "15", name: "Olivia Tan",     role: "Editor",  joined: "Feb 2025", joinedTs: 20250201 },
  { id: "16", name: "Pablo Ruiz",     role: "Viewer",  joined: "Mar 2025", joinedTs: 20250301 },
  { id: "17", name: "Quinn Adams",    role: "Admin",   joined: "Apr 2025", joinedTs: 20250401 },
  { id: "18", name: "Rosa Lindqvist", role: "Editor",  joined: "May 2025", joinedTs: 20250501 },
  { id: "19", name: "Sam Okoro",      role: "Viewer",  joined: "Jun 2025", joinedTs: 20250601 },
  { id: "20", name: "Tina Zhao",      role: "Admin",   joined: "Jul 2025", joinedTs: 20250701 },
];

export function PaginatedTableShowcase() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const start = (page - 1) * pageSize;
  const visibleRows = PAGINATED_ROWS.slice(start, start + pageSize);

  return (
    <TableSurface>
      <Table noBorder>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Nombre</TableCell>
            <TableCell isHeader>Rol</TableCell>
            <TableCell isHeader>Fecha</TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {visibleRows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
              <TableCell>{r.role}</TableCell>
              <TableCell>{r.joined}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <TableFooter
        page={page}
        pageSize={pageSize}
        total={PAGINATED_ROWS.length}
        pageSizeOptions={[5, 10, 20]}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </TableSurface>
  );
}

// ── GlobalSearchShowcase ──────────────────────────────────────────────────────

const SEARCH_KEYS = ["name", "role", "joined"] as const satisfies ReadonlyArray<keyof (typeof PAGINATED_ROWS)[number]>;

export function GlobalSearchShowcase() {
  const { query, setQuery, filtered } = useTableSearch(PAGINATED_ROWS, SEARCH_KEYS);

  return (
    <TableSurface>
      <TableToolbar>
        <TableSearch
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nombre, rol o fecha…"
          aria-label="Buscar tabla"
          className="w-56"
        />
        <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-400">
          {filtered.length} / {PAGINATED_ROWS.length}
        </span>
      </TableToolbar>
      <Table noBorder>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Nombre</TableCell>
            <TableCell isHeader>Rol</TableCell>
            <TableCell isHeader>Fecha</TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-400">
                Sin resultados para &ldquo;{query}&rdquo;
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{r.joined}</TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </TableSurface>
  );
}

// ── ColumnVisibilityShowcase ──────────────────────────────────────────────────

type ColVisRow = { id: string; name: string; email: string; role: string; joined: string };
type ColVisKey = "name" | "email" | "role" | "joined";

type ColDef = { key: ColVisKey; label: string; render: (r: ColVisRow) => ReactNode };

const COL_DEFS: ColDef[] = [
  { key: "name",   label: "Nombre", render: (r) => <span className="font-medium text-zinc-900">{r.name}</span> },
  { key: "email",  label: "Email",  render: (r) => r.email },
  { key: "role",   label: "Rol",    render: (r) => r.role },
  { key: "joined", label: "Fecha",  render: (r) => r.joined },
];

const COL_VIS_ROWS: ColVisRow[] = [
  { id: "1", name: "Alice Martin", email: "alice@example.com", role: "Admin",  joined: "Jan 2024" },
  { id: "2", name: "Bob Chen",     email: "bob@example.com",   role: "Editor", joined: "Mar 2024" },
  { id: "3", name: "Carol James",  email: "carol@example.com", role: "Viewer", joined: "Jun 2024" },
  { id: "4", name: "David Park",   email: "david@example.com", role: "Editor", joined: "Aug 2024" },
];

export function ColumnVisibilityShowcase() {
  const [visible, setVisible] = useState<Record<ColVisKey, boolean>>({
    name: true, email: true, role: true, joined: true,
  });

  const toggle = (key: ColVisKey) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const cols = COL_DEFS.filter((c) => visible[c.key]);
  const visibleCount = cols.length;

  return (
    <TableSurface>
      <TableToolbar>
        <div className="ml-auto" />
        <Dropdown align="end">
          <DropdownTrigger>
            <Button
              variant="secondary"
              leftIcon={<ColumnsIcon />}
              rightIcon={<IconChevronDown className="size-3.5" />}
            >
              Columnas
              {visibleCount < COL_DEFS.length && (
                <span className="ml-0.5 rounded bg-indigo-100 px-1 py-px text-[10px] font-semibold text-indigo-600">
                  {visibleCount}/{COL_DEFS.length}
                </span>
              )}
            </Button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[10rem] py-1.5">
            {COL_DEFS.map((col) => (
              <label
                key={col.key}
                className="mx-1 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <Checkbox size="sm" checked={visible[col.key]} onChange={() => toggle(col.key)} />
                {col.label}
              </label>
            ))}
          </DropdownContent>
        </Dropdown>
      </TableToolbar>

      <Table noBorder>
        <TableHeader>
          <TableRow>
            {cols.map((col) => (
              <TableCell key={col.key} isHeader>{col.label}</TableCell>
            ))}
            {cols.length === 0 && <TableCell isHeader>&nbsp;</TableCell>}
          </TableRow>
        </TableHeader>
        <tbody>
          {cols.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-zinc-400">
                Sin columnas seleccionadas
              </td>
            </tr>
          ) : (
            COL_VIS_ROWS.map((row) => (
              <TableRow key={row.id}>
                {cols.map((col) => (
                  <TableCell key={col.key}>{col.render(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </TableSurface>
  );
}

// ── SortableTableShowcase ─────────────────────────────────────────────────────

export function SortableTableShowcase() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const rows = sortRows(ROWS, sortKey, sortDir);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell isHeader sortable sortDirection={sortKey === "name" ? sortDir : null} onSort={() => handleSort("name")}>
            Nombre
          </TableCell>
          <TableCell isHeader sortable sortDirection={sortKey === "role" ? sortDir : null} onSort={() => handleSort("role")}>
            Rol
          </TableCell>
          <TableCell isHeader sortable sortDirection={sortKey === "joined" ? sortDir : null} onSort={() => handleSort("joined")}>
            Fecha
          </TableCell>
        </TableRow>
      </TableHeader>
      <tbody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
            <TableCell>{r.role}</TableCell>
            <TableCell>{r.joined}</TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}

// ── FilteredTableShowcase ─────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function FilteredTableShowcase() {
  const [query,    setQuery]    = useState("");
  const [status,   setStatus]   = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo,   setDateTo]   = useState<Date | undefined>(undefined);

  const hasFilters = query !== "" || status !== "all" || dateFrom !== undefined || dateTo !== undefined;

  const clearAll = () => {
    setQuery(""); setStatus("all"); setDateFrom(undefined); setDateTo(undefined);
  };

  const filtered = useMemo(
    () =>
      FILTER_DATA.filter((row) => {
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!row.name.toLowerCase().includes(q) && !row.email.toLowerCase().includes(q)) return false;
        }
        if (status !== "all" && row.status !== status) return false;
        if (dateFrom && row.joinedDate < toYMD(dateFrom)) return false;
        if (dateTo   && row.joinedDate > toYMD(dateTo))   return false;
        return true;
      }),
    [query, status, dateFrom, dateTo],
  );

  return (
    <TableSurface>
      <TableToolbar>
        <TableSearch
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nombre o email…"
          aria-label="Buscar"
          className="w-52"
        />

        <Dropdown align="end">
          <DropdownTrigger>
            <Button
              variant={status !== "all" ? "outline-primary" : "secondary"}
              rightIcon={<IconChevronDown className="size-3.5" />}
            >
              {status === "all" ? (
                "Estado"
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
                  {STATUS_LABEL[status]}
                </span>
              )}
            </Button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[9rem]">
            <DropdownItem onClick={() => setStatus("all")}>Todos</DropdownItem>
            {(["active", "inactive", "pending"] as const).map((s) => (
              <DropdownItem key={s} onClick={() => setStatus(s)}>
                <span className={`size-1.5 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

        <div className="flex items-center gap-1.5">
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Desde" className="w-[8rem]" />
          <span className="text-xs text-zinc-400">–</span>
          <DatePicker value={dateTo}   onChange={setDateTo}   placeholder="Hasta" className="w-[8rem]" />
        </div>

        {hasFilters && (
          <Button variant="ghost" onClick={clearAll}>Limpiar</Button>
        )}

        <span className="ml-auto text-xs tabular-nums text-zinc-400">
          {filtered.length} / {FILTER_DATA.length}
        </span>
      </TableToolbar>

      <Table noBorder>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Nombre</TableCell>
            <TableCell isHeader>Email</TableCell>
            <TableCell isHeader>Estado</TableCell>
            <TableCell isHeader>Fecha</TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                Sin resultados para los filtros actuales
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
                <TableCell className="text-zinc-500">{r.email}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </TableCell>
                <TableCell>{r.joined}</TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </TableSurface>
  );
}

// ── TableFilterShowcase ───────────────────────────────────────────────────────
// Simple search-only showcase.

export function TableFilterShowcase() {
  const [query, setQuery] = useState("");

  const filtered = ROWS.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.joined.toLowerCase().includes(q)
    );
  });

  return (
    <TableSurface>
      <TableToolbar>
        <TableSearch
          placeholder="Buscar miembros…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar miembros"
          className="w-52"
        />
        <span className="ml-auto text-xs tabular-nums text-zinc-400">
          {filtered.length} / {ROWS.length}
        </span>
      </TableToolbar>
      <Table noBorder>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Nombre</TableCell>
            <TableCell isHeader>Rol</TableCell>
            <TableCell isHeader>Fecha</TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-400">
                Sin resultados para &ldquo;{query}&rdquo;
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{r.joined}</TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </TableSurface>
  );
}

// ── RowSelectionShowcase ──────────────────────────────────────────────────────

const SELECTION_IDS = ROWS.map((r) => r.id);

export function RowSelectionShowcase() {
  const { selected, isSelected, toggle, toggleAll, clearSelection, isAllSelected, isIndeterminate } =
    useTableSelection(SELECTION_IDS);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDeleteConfirm() {
    const count = selected.size;
    setConfirmOpen(false);
    clearSelection();
    toast.success(
      `${count} ${count === 1 ? "miembro eliminado" : "miembros eliminados"}`,
      { title: "Eliminado" },
    );
  }

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar ${selected.size} ${selected.size === 1 ? "miembro" : "miembros"}?`}
        description={
          <>
            Esta acción es permanente.{" "}
            <strong className="font-medium text-zinc-900">No se puede deshacer.</strong>
          </>
        }
        confirmLabel={`Eliminar ${selected.size === 1 ? "miembro" : "miembros"}`}
      />

      <TableSurface>
        <TableToolbar>
          {selected.size > 0 ? (
            <TableBulkActions selected={selected.size} total={ROWS.length} onClear={clearSelection}>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
              >
                Eliminar
              </button>
            </TableBulkActions>
          ) : (
            <span className="text-xs tabular-nums text-zinc-400">{ROWS.length} filas</span>
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
              <TableCell isHeader>Nombre</TableCell>
              <TableCell isHeader>Rol</TableCell>
              <TableCell isHeader>Fecha</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {ROWS.map((r) => (
              <TableRow key={r.id} selected={isSelected(r.id)}>
                <TableCell className="w-9 pl-3 pr-0">
                  <Checkbox
                    size="sm"
                    checked={isSelected(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Seleccionar ${r.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-zinc-900">{r.name}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{r.joined}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </TableSurface>
    </>
  );
}
