type PropertyEmptyStateProps = {
  title?: string;
  description?: string;
};

export function PropertyEmptyState({
  title = "No hay propiedades disponibles",
  description = "Volvé a consultar más tarde para ver nuevas publicaciones.",
}: PropertyEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
