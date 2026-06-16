import type { HTMLAttributes } from "react";

export type PaginationProps = HTMLAttributes<HTMLDivElement> & {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="m10 12-4-4 4-4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

const navBtn =
  "flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-100 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40";

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className = "",
  ...props
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex items-center justify-between gap-4 text-xs text-zinc-500 ${className}`}
      {...props}
    >
      {/* Record range */}
      <p>
        {total === 0
          ? "No results"
          : `${start}–${end} of ${total} result${total === 1 ? "" : "s"}`}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3">

        {/* Rows per page */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            aria-label="Rows per page"
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-1.5 text-xs font-medium text-zinc-700 outline-none transition-colors hover:border-zinc-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-200" aria-hidden />

        {/* Prev / page indicator / Next */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={navBtn}
          >
            <ChevronLeft />
          </button>

          <span className="min-w-[4.5rem] text-center font-medium tabular-nums text-zinc-700">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={navBtn}
          >
            <ChevronRight />
          </button>
        </div>

      </div>
    </div>
  );
}
