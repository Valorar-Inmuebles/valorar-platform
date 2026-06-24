import type { PublicPropertyDetail } from "@repo/shared-types";
import {
  formatLinearMeters,
  formatPropertyAge,
  formatSquareMeters,
} from "@/lib/format/area";
import {
  getOrientationLabel,
  getPropertyBrightnessLabel,
  getPropertyConditionLabel,
  getPropertyLayoutLabel,
} from "@/lib/format/labels";
export const PROPERTY_METRICS_GRID_KEYS = new Set([
  "bedrooms",
  "bathrooms",
  "totalArea",
  "parkingSpaces",
  "rooms",
]);

type PropertyTechnicalSheetProps = {
  property: PublicPropertyDetail;
};

type TechnicalSheetItem = {
  key: string;
  label: string;
  value: string;
};

export function buildTechnicalSheetItems(
  property: PublicPropertyDetail,
): TechnicalSheetItem[] {
  const items: Array<TechnicalSheetItem | null> = [
    property.condition
      ? {
          key: "condition",
          label: "Estado",
          value: getPropertyConditionLabel(property.condition),
        }
      : null,
    formatPropertyAge(property.yearBuilt)
      ? {
          key: "age",
          label: "Antigüedad",
          value: formatPropertyAge(property.yearBuilt)!,
        }
      : null,
    formatSquareMeters(property.totalArea)
      ? {
          key: "totalArea",
          label: "Superficie total",
          value: formatSquareMeters(property.totalArea)!,
        }
      : null,
    formatSquareMeters(property.coveredArea)
      ? {
          key: "coveredArea",
          label: "Superficie cubierta",
          value: formatSquareMeters(property.coveredArea)!,
        }
      : null,
    formatSquareMeters(property.uncoveredArea)
      ? {
          key: "uncoveredArea",
          label: "Superficie descubierta",
          value: formatSquareMeters(property.uncoveredArea)!,
        }
      : null,
    property.rooms != null
      ? {
          key: "rooms",
          label: "Ambientes",
          value: String(property.rooms),
        }
      : null,
    property.bedrooms != null
      ? {
          key: "bedrooms",
          label: "Dormitorios",
          value: String(property.bedrooms),
        }
      : null,
    property.bathrooms != null
      ? {
          key: "bathrooms",
          label: "Baños",
          value: String(property.bathrooms),
        }
      : null,
    property.halfBathrooms != null
      ? {
          key: "halfBathrooms",
          label: "Toilettes",
          value: String(property.halfBathrooms),
        }
      : null,
    property.parkingSpaces != null
      ? {
          key: "parkingSpaces",
          label: "Cocheras",
          value: String(property.parkingSpaces),
        }
      : null,
    property.orientation
      ? {
          key: "orientation",
          label: "Orientación",
          value: getOrientationLabel(property.orientation),
        }
      : null,
    property.layout
      ? {
          key: "layout",
          label: "Disposición",
          value: getPropertyLayoutLabel(property.layout),
        }
      : null,
    property.brightness
      ? {
          key: "brightness",
          label: "Luminosidad",
          value: getPropertyBrightnessLabel(property.brightness),
        }
      : null,
    formatLinearMeters(property.lotFront)
      ? {
          key: "lotFront",
          label: "Frente",
          value: formatLinearMeters(property.lotFront)!,
        }
      : null,
    formatLinearMeters(property.lotDepth)
      ? {
          key: "lotDepth",
          label: "Fondo",
          value: formatLinearMeters(property.lotDepth)!,
        }
      : null,
  ];

  return items.filter((item): item is TechnicalSheetItem => item !== null);
}

export function PropertyTechnicalSheet({ property }: PropertyTechnicalSheetProps) {
  const items = buildTechnicalSheetItems(property).filter(
    (item) => !PROPERTY_METRICS_GRID_KEYS.has(item.key),
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
        Detalles técnicos
      </h3>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-border-default bg-surface-card px-4 py-3"
          >
            <dt className="text-sm text-text-secondary">{item.label}</dt>
            <dd className="text-sm font-medium text-text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
