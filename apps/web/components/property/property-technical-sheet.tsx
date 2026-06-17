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

type PropertyTechnicalSheetProps = {
  property: PublicPropertyDetail;
};

type TechnicalSheetItem = {
  key: string;
  label: string;
  value: string;
};

function buildTechnicalSheetItems(
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
  const items = buildTechnicalSheetItems(property);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Ficha técnica
      </h2>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-border bg-slate-50 px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </dt>
            <dd className="mt-1 text-base font-medium text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
