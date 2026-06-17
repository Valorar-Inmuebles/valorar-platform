type PropertyMapPlaceholderProps = {
  city: string;
  neighborhood: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function buildOpenStreetMapEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.012;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join("%2C");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function PropertyMapPlaceholder({
  city,
  neighborhood,
  latitude,
  longitude,
}: PropertyMapPlaceholderProps) {
  const location = [neighborhood, city].filter(Boolean).join(", ");
  const hasCoordinates = latitude != null && longitude != null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Ubicación
      </h2>

      {hasCoordinates ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-slate-50">
          <iframe
            title={`Mapa aproximado de ${location || city}`}
            src={buildOpenStreetMapEmbedUrl(latitude, longitude)}
            className="h-72 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="border-t border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{location}</p>
            <p className="mt-1 text-xs text-muted">
              Ubicación aproximada. La dirección exacta no se publica por
              privacidad.
            </p>
          </div>
        </div>
      ) : (
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
              Mapa no disponible. La ubicación se muestra a nivel barrio o ciudad.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
