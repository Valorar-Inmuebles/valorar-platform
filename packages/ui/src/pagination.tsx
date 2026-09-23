"use client";

import { cn } from "./lib/cn";
import { getPaginationItems } from "./lib/pagination";

export type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  siblingCount?: number;
  showSummary?: boolean;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  disabled = false,
  siblingCount = 1,
  showSummary = true,
  className,
}: PaginationProps) {
  if (totalPages <= 0) return null;
  const current = Math.min(Math.max(page, 1), totalPages);
  const items = getPaginationItems(current, totalPages, siblingCount);
  const from =
    total !== undefined && total > 0 && pageSize
      ? (current - 1) * pageSize + 1
      : null;
  const to =
    from !== null && total !== undefined && pageSize
      ? Math.min(current * pageSize, total)
      : null;

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {showSummary ? (
        <p className="text-sm text-muted" aria-live="polite">
          {from !== null && to !== null && total !== undefined
            ? `Mostrando ${from}–${to} de ${total}`
            : `Página ${current} de ${totalPages}`}
        </p>
      ) : null}
      <div className="flex items-center gap-1">
        <PageButton
          label="Anterior"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(current - 1)}
        />
        <div className="hidden items-center gap-1 sm:flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <PageButton
                key={item}
                label={String(item)}
                current={item === current}
                disabled={disabled}
                onClick={() => onPageChange(item)}
              />
            ) : (
              <span
                key={item}
                aria-hidden="true"
                className="flex size-8 items-center justify-center text-sm text-muted"
              >
                …
              </span>
            ),
          )}
        </div>
        <PageButton
          label="Siguiente"
          disabled={disabled || current >= totalPages}
          onClick={() => onPageChange(current + 1)}
        />
      </div>
    </nav>
  );
}

function PageButton({
  label,
  current = false,
  disabled,
  onClick,
}: {
  label: string;
  current?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={current ? "page" : undefined}
      aria-label={/^\d+$/.test(label) ? `Ir a la página ${label}` : label}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 text-sm font-medium text-foreground outline-none hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40",
        current && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {label}
    </button>
  );
}

export { getPaginationItems } from "./lib/pagination";
export type { PaginationItem } from "./lib/pagination";
