"use client";

import {
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  type ReactNode,
} from "react";

export type TableAlign = "left" | "right" | "center";
export type SortDirection = "asc" | "desc";

const alignClass: Record<TableAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

// ── TableSurface ───────────────────────────────────────────────────────────────
// Unified visual container — radius, border and dividers match the Card system.

export type TableSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableSurface({ className = "", children, ...props }: TableSurfaceProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ── TableToolbar ───────────────────────────────────────────────────────────────
// Horizontal strip matching CardHeader spacing (px-5 py-3).

export type TableToolbarProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableToolbar({ className = "", children, ...props }: TableToolbarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 bg-white px-5 py-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

export type TableProps = HTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  /** When true, omits the outer border/rounding — use inside TableSurface. */
  noBorder?: boolean;
};

export function Table({ className = "", noBorder = false, children, ...props }: TableProps) {
  return (
    <div
      className={
        noBorder
          ? "overflow-x-auto overflow-y-visible"
          : "overflow-x-auto overflow-y-visible rounded-xl border border-gray-200"
      }
    >
      <table className={`w-full border-collapse text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

// ── TableHeader ───────────────────────────────────────────────────────────────

export type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

export function TableHeader({ className = "", children, ...props }: TableHeaderProps) {
  return (
    <thead className={`border-b border-gray-200 bg-gray-50/70 ${className}`} {...props}>
      {children}
    </thead>
  );
}

// ── TableRow ──────────────────────────────────────────────────────────────────

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function TableRow({ className = "", selected = false, children, ...props }: TableRowProps) {
  return (
    <tr
      className={`group border-b border-gray-100 transition-colors duration-100 last:border-0 ${
        selected
          ? "bg-gray-50 [box-shadow:inset_2px_0_0_#6366f1] hover:bg-gray-100/60"
          : "hover:bg-gray-50/50"
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
// Three-state: null = unsorted (chevrons), "asc" = arrow up, "desc" = arrow down

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") {
    return (
      <svg
        viewBox="0 0 10 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3 shrink-0 text-indigo-500"
        aria-hidden
      >
        <path d="M5 10V2M2 5l3-3 3 3" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg
        viewBox="0 0 10 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3 shrink-0 text-indigo-500"
        aria-hidden
      >
        <path d="M5 2v8M2 7l3 3 3-3" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 10 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0 text-gray-300"
      aria-hidden
    >
      <path d="M2.5 4.5 5 2l2.5 2.5" />
      <path d="M2.5 7.5 5 10l2.5-2.5" />
    </svg>
  );
}

// ── TableCell ─────────────────────────────────────────────────────────────────

export type TableCellProps = (TdHTMLAttributes<HTMLTableCellElement> &
  ThHTMLAttributes<HTMLTableCellElement>) & {
  isHeader?: boolean;
  align?: TableAlign;
  sortable?: boolean;
  sortDirection?: SortDirection | null;
  onSort?: () => void;
  sticky?: boolean;
  children?: ReactNode;
};

export function TableCell({
  isHeader = false,
  align = "left",
  sortable = false,
  sortDirection = null,
  onSort,
  sticky = false,
  className = "",
  children,
  ...props
}: TableCellProps) {
  const base = alignClass[align];

  if (isHeader) {
    const stickyClass = sticky
      ? "sticky right-0 z-20 border-l border-gray-200 bg-gray-50/70 text-right"
      : "";
    return (
      <th
        className={`px-3 py-2 text-xs font-medium text-gray-500 ${base} ${stickyClass} ${className}`}
        {...props}
      >
        {sortable ? (
          <button
            type="button"
            onClick={onSort}
            className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 select-none transition-colors duration-100 hover:bg-gray-100 hover:text-gray-800"
          >
            {children}
            <SortIcon direction={sortDirection ?? null} />
          </button>
        ) : (
          children
        )}
      </th>
    );
  }

  const stickyClass = sticky
    ? "sticky right-0 z-10 border-l border-gray-200 bg-white group-hover:bg-gray-50/50"
    : "";

  return (
    <td
      className={`px-3 py-2 align-middle text-gray-700 ${base} ${stickyClass} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

// ── useTableSearch ─────────────────────────────────────────────────────────────

export function useTableSearch<T extends object>(
  rows: T[],
  keys: ReadonlyArray<keyof T>,
): { query: string; setQuery: (q: string) => void; filtered: T[] } {
  const [query, setQuery] = useState("");

  const keysKey = (keys as unknown as string[]).join("\0");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const ks = keysKey.split("\0");
    return rows.filter((row) =>
      ks.some((k) =>
        String((row as Record<string, unknown>)[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, query, keysKey]);

  return { query, setQuery, filtered };
}

// ── TableSearch ────────────────────────────────────────────────────────────────

export type TableSearchProps = InputHTMLAttributes<HTMLInputElement>;

export function TableSearch({ className = "", ...props }: TableSearchProps) {
  return (
    <div className="relative flex items-center">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-2.5 size-3.5 text-gray-400"
        aria-hidden
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m11 11 2.5 2.5" />
      </svg>
      <input
        type="search"
        className={`h-8 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 transition-colors duration-150 hover:border-gray-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/[0.12] ${className}`}
        {...props}
      />
    </div>
  );
}

// ── useTableSelection ──────────────────────────────────────────────────────────

export type TableSelectionResult = {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
};

export function useTableSelection(ids: string[]): TableSelectionResult {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAllSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const isIndeterminate = !isAllSelected && ids.some((id) => selected.has(id));

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(isAllSelected ? new Set() : new Set(ids));
  }, [ids, isAllSelected]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return { selected, isSelected, toggle, toggleAll, clearSelection, isAllSelected, isIndeterminate };
}

// ── TableBulkActions ───────────────────────────────────────────────────────────

export type TableBulkActionsProps = {
  selected: number;
  total: number;
  onClear: () => void;
  children?: ReactNode;
};

export function TableBulkActions({ selected, total, onClear, children }: TableBulkActionsProps) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50/60 px-3 text-sm">
      <span className="font-medium tabular-nums text-indigo-700">
        {selected} de {total}
      </span>
      <span className="h-3.5 w-px bg-indigo-200" aria-hidden />
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="Deseleccionar todo"
        className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
      >
        <svg
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
          className="size-2.5"
        >
          <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" />
        </svg>
      </button>
    </div>
  );
}

// ── TableFooter ────────────────────────────────────────────────────────────────
// Integrated footer matching CardFooter spacing (px-5 py-3).

export type TableFooterProps = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function TableFooter({
  page,
  pageSize,
  total,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
}: TableFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageRange(page, totalPages);

  return (
    <div className={`flex items-center justify-between gap-4 bg-white px-5 py-3 ${className}`}>
      {/* Left: rows per page — styled button wrapper over native select */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-gray-500">Filas por página</span>
        <div className="relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white pl-2.5 pr-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50">
          <span className="tabular-nums">{pageSize}</span>
          <svg
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 text-gray-400"
            aria-hidden
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            aria-label="Filas por página"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: range label + page navigation */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs tabular-nums text-gray-400">
          {from}–{to} de {total}
        </span>

        <FooterNavBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <svg
            viewBox="0 0 6 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-2.5"
            aria-hidden
          >
            <path d="M5 1 1 5l4 4" />
          </svg>
        </FooterNavBtn>

        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-7 items-center justify-center text-xs text-gray-400"
            >
              …
            </span>
          ) : (
            <FooterNavBtn
              key={p}
              onClick={() => onPageChange(p as number)}
              active={p === page}
              aria-label={`Página ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </FooterNavBtn>
          ),
        )}

        <FooterNavBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <svg
            viewBox="0 0 6 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-2.5"
            aria-hidden
          >
            <path d="M1 1l4 4-4 4" />
          </svg>
        </FooterNavBtn>
      </div>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

type FooterNavBtnProps = {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
};

function FooterNavBtn({ onClick, disabled, active, children, ...rest }: FooterNavBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-7 items-center justify-center rounded-md text-xs font-medium transition-colors duration-100 ${
        active
          ? "bg-gray-100 font-semibold text-gray-900"
          : disabled
            ? "cursor-not-allowed text-gray-300"
            : "text-gray-500 hover:bg-gray-100/60 hover:text-gray-700"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
