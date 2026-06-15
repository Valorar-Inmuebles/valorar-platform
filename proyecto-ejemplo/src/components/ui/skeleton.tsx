import type { HTMLAttributes } from "react";

// ── Base ──────────────────────────────────────────────────────────────────────

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-zinc-100 ${className}`}
      {...props}
    />
  );
}

// ── Card preset ───────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
      <Skeleton className="h-2.5 w-2/3" />
    </div>
  );
}

// ── Table preset ──────────────────────────────────────────────────────────────

export type SkeletonTableProps = {
  rows?: number;
  columns?: number;
};

export function SkeletonTable({ rows = 4, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <div className="flex gap-6 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3 flex-1 ${i === 0 ? "max-w-[6rem]" : ""}`}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-6 border-b border-zinc-100 px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-2.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
