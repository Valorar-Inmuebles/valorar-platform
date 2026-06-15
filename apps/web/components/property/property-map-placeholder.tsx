type PropertyMapPlaceholderProps = {
  city: string;
  neighborhood: string | null;
};

export function PropertyMapPlaceholder({
  city,
  neighborhood,
}: PropertyMapPlaceholderProps) {
  const location = [neighborhood, city].filter(Boolean).join(", ");

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Ubicación
      </h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-border bg-slate-50">
        <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>
          <p className="mt-4 text-base font-medium text-foreground">{location}</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            El mapa interactivo estará disponible cuando la API pública exponga
            coordenadas y dirección completa.
          </p>
        </div>
      </div>
    </section>
  );
}
