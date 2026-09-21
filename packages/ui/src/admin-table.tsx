import { SystemIcon } from "@repo/icons";
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "./lib/cn";

export type SortDirection = "asc" | "desc";

export function AdminTable({
  className,
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-surface">
      <table
        className={cn(
          "w-full min-w-[640px] border-collapse text-left text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-border bg-gray-50", className)}
      {...props}
    />
  );
}

export function AdminTableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function AdminTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-alt/70", className)}
      {...props}
    />
  );
}

export function AdminTableHeader({
  className,
  children,
  direction,
  onSort,
  disabled = false,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  direction?: SortDirection | null;
  onSort?: () => void;
  disabled?: boolean;
}) {
  const ariaSort =
    direction === "asc"
      ? "ascending"
      : direction === "desc"
        ? "descending"
        : onSort
          ? "none"
          : undefined;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    >
      {onSort ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onSort}
          className="inline-flex items-center gap-1.5 rounded-sm text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{children}</span>
          <SystemIcon
            name={
              direction === "asc"
                ? "sortAsc"
                : direction === "desc"
                  ? "sortDesc"
                  : "sort"
            }
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0",
              direction ? "text-foreground" : "text-muted/70",
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function AdminTableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-foreground", className)}
      {...props}
    />
  );
}

export function AdminTableActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-1.5", className)}
      {...props}
    />
  );
}

export type AdminTableStateProps = {
  colSpan: number;
  state: "loading" | "empty" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
};

export function AdminTableState({
  colSpan,
  state,
  title,
  description,
  action,
}: AdminTableStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div
          role={state === "error" ? "alert" : "status"}
          aria-busy={state === "loading" || undefined}
          className="mx-auto flex max-w-md flex-col items-center gap-2"
        >
          {state === "loading" ? (
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-2 border-border border-t-primary"
            />
          ) : null}
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </td>
    </tr>
  );
}
