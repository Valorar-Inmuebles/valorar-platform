export default function RentalLoading() {
  return (
    <div role="status" aria-label="Cargando alquileres" className="space-y-6">
      <span className="sr-only">Cargando alquileres…</span>
      <div className="space-y-2">
        <div className="h-4 w-56 animate-pulse rounded bg-surface-alt" />
        <div className="h-8 w-72 animate-pulse rounded bg-surface-alt" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-alt" />
      </div>
      <div className="h-10 animate-pulse rounded bg-surface-alt" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
    </div>
  );
}
