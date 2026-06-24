import { LocationIcon } from "@/components/icons";
import { PropertyDetailSection } from "./property-detail-section";

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
    <PropertyDetailSection title="Ubicación">
      {location ? (
        <p className="mb-4 inline-flex items-center gap-2 text-base text-text-primary">
          <LocationIcon size={18} className="shrink-0 text-brand-green" />
          {location}
        </p>
      ) : null}

      {hasCoordinates ? (
        <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-card">
          <iframe
            title={`Mapa aproximado de ${location || city}`}
            src={buildOpenStreetMapEmbedUrl(latitude, longitude)}
            className="h-80 w-full border-0 md:h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="border-t border-border-default px-4 py-3">
            <p className="text-xs text-text-secondary">
              Ubicación aproximada. La dirección exacta no se publica por
              privacidad.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-dashed border-border-default bg-surface-alt">
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center md:min-h-72">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <LocationIcon size={24} />
            </div>
            <p className="mt-4 text-base font-medium text-text-primary">
              {location || city}
            </p>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Mapa no disponible. La ubicación se muestra a nivel barrio o ciudad.
            </p>
          </div>
        </div>
      )}
    </PropertyDetailSection>
  );
}
