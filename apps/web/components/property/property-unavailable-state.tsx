type PropertyUnavailableStateProps = {
  title?: string;
  description?: string;
};

export function PropertyUnavailableState({
  title = "Contenido temporalmente no disponible",
  description = "No pudimos cargar las propiedades en este momento. Intentá de nuevo en unos minutos.",
}: PropertyUnavailableStateProps) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
