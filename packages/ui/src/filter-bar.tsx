import type { ReactNode } from "react";
import { cn } from "./lib/cn";

export type ActiveFilter = {
  id: string;
  label: string;
  onRemove: () => void;
  disabled?: boolean;
};

export type FilterBarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  moreFilters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
  clearLabel?: string;
  className?: string;
};

export function FilterBar({
  search,
  filters,
  moreFilters,
  actions,
  activeFilters = [],
  onClearAll,
  clearLabel = "Limpiar filtros",
  className,
}: FilterBarProps) {
  return (
    <section
      aria-label="Filtros"
      className={cn(
        "rounded-xl border border-border bg-surface p-3",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {search ? <div className="min-w-0 flex-1">{search}</div> : null}
        {filters ? (
          <div className="flex flex-wrap items-center gap-2">{filters}</div>
        ) : null}
        {moreFilters}
        {actions ? (
          <div className="flex items-center gap-2 lg:ml-auto">{actions}</div>
        ) : null}
      </div>
      {activeFilters.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted">
            Filtros activos:
          </span>
          {activeFilters.map((filter) => (
            <FilterChip key={filter.id} {...filter} />
          ))}
          {onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded px-1.5 py-1 text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function FilterChip({
  label,
  onRemove,
  disabled = false,
}: ActiveFilter) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-foreground">
      <span>{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Quitar filtro: ${label}`}
        onClick={onRemove}
        className="flex size-4 items-center justify-center rounded-full text-muted outline-none hover:bg-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>
    </span>
  );
}
