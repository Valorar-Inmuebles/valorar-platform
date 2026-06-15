import Link from "next/link";
import {
  buildPropertyListUrl,
  type PropertyListFilters,
} from "@/lib/url/search-params";

type PaginationProps = {
  page: number;
  totalPages: number;
  filters: PropertyListFilters;
};

function getVisiblePages(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);

  return Array.from(pages)
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
}

export function Pagination({ page, totalPages, filters }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label="Paginación de propiedades"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={buildPropertyListUrl({ ...filters, page: page - 1 })}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Anterior
        </Link>
      ) : (
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm text-muted opacity-50">
          Anterior
        </span>
      )}

      {visiblePages.map((pageNumber, index) => {
        const previous = visiblePages[index - 1];
        const showEllipsis = previous != null && pageNumber - previous > 1;

        return (
          <span key={pageNumber} className="flex items-center gap-2">
            {showEllipsis ? (
              <span aria-hidden className="px-1 text-muted">
                …
              </span>
            ) : null}
            <Link
              href={buildPropertyListUrl({ ...filters, page: pageNumber })}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                pageNumber === page
                  ? "border-primary bg-primary text-white"
                  : "border-border text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {pageNumber}
            </Link>
          </span>
        );
      })}

      {page < totalPages ? (
        <Link
          href={buildPropertyListUrl({ ...filters, page: page + 1 })}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Siguiente
        </Link>
      ) : (
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm text-muted opacity-50">
          Siguiente
        </span>
      )}
    </nav>
  );
}
