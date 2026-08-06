import { LocationIcon } from "@/components/icons";
import { Map } from "@/components/map";
import { PropertyDetailSection } from "./property-detail-section";

type PropertyMapPlaceholderProps = {
  city: string;
  neighborhood: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationMapEmbedProps = {
  latitude: number;
  longitude: number;
  title: string;
  className?: string;
  heightClassName?: string;
  footerNote?: string;
};

/**
 * Shared map shell for property/development detail.
 * Uses the project Map (Leaflet + Carto Positron) — no iframes.
 */
export function LocationMapEmbed({
  latitude,
  longitude,
  title,
  className = "",
  heightClassName = "h-80 w-full md:h-96",
  footerNote,
}: LocationMapEmbedProps) {
  return (
    <div className={className}>
      <Map
        center={[latitude, longitude]}
        zoom={15}
        marker={{ position: [latitude, longitude], title }}
        className={heightClassName}
        ariaLabel={title}
      />
      {footerNote ? (
        <p className="mt-3 text-xs text-text-secondary">{footerNote}</p>
      ) : null}
    </div>
  );
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
        <LocationMapEmbed
          latitude={latitude}
          longitude={longitude}
          title={`Mapa aproximado de ${location || city}`}
          footerNote="Ubicación aproximada. La dirección exacta no se publica por privacidad."
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl bg-surface-alt ring-1 ring-border-default/80"
          data-map-slot="interactive-map-future"
        >
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center md:min-h-72">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <LocationIcon size={24} />
            </div>
            <p className="mt-4 text-base font-medium text-text-primary">
              {location || city}
            </p>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Mapa interactivo próximamente. Por ahora mostramos la ubicación a
              nivel barrio o ciudad.
            </p>
          </div>
        </div>
      )}
    </PropertyDetailSection>
  );
}
