import type { ReactNode } from "react";
import { Playfair_Display } from "next/font/google";
import type {
  PublicPropertyDetail,
  PublicPropertyFeature,
} from "@repo/shared-types";
import {
  AreaIcon,
  BathIcon,
  BedIcon,
  BuildingIcon,
  GarageIcon,
  HouseIcon,
  Icon,
} from "@/components/icons";
import { formatArea } from "@/lib/format/area";
import { FEATURE_CATEGORY_ORDER } from "@/lib/format/labels";
import {
  buildTechnicalSheetItems,
  PROPERTY_METRICS_GRID_KEYS,
} from "./property-technical-sheet";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

type PropertyCharacteristicsProps = {
  property: PublicPropertyDetail;
};

type CharacteristicItem = {
  key: string;
  title: string;
  value: string;
  icon: ReactNode;
};

function getFeatureIcon(slug: string): ReactNode {
  const className = "text-text-secondary";
  const size = 22;

  switch (slug) {
    case "pileta":
      return (
        <Icon size={size} className={className}>
          <path d="M2 12h20" />
          <path d="M6 12v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </Icon>
      );
    case "gimnasio":
      return (
        <Icon size={size} className={className}>
          <path d="M6 9h12" />
          <path d="M6 15h12" />
          <path d="M4 9v6" />
          <path d="M20 9v6" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </Icon>
      );
    case "sum":
      return <BuildingIcon size={size} className={className} />;
    case "seguridad-24h":
    case "portero":
      return (
        <Icon size={size} className={className}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </Icon>
      );
    case "cochera":
    case "cocheras":
      return <GarageIcon size={size} className={className} />;
    case "lavadero":
    case "laundry":
      return (
        <Icon size={size} className={className}>
          <path d="M3 6h3" />
          <path d="M17 6h4" />
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <circle cx="12" cy="13" r="4" />
        </Icon>
      );
    case "apto-profesional":
    case "apto-credito":
      return <HouseIcon size={size} className={className} />;
    default:
      return (
        <Icon size={size} className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 12 2 2 4-4" />
        </Icon>
      );
  }
}

function buildMetricItems(property: PublicPropertyDetail): CharacteristicItem[] {
  const iconClass = "text-text-secondary";

  const items: Array<CharacteristicItem | null> = [
    property.bedrooms != null
      ? {
          key: "bedrooms",
          title: "Dormitorios",
          value: String(property.bedrooms),
          icon: <BedIcon size={22} className={iconClass} />,
        }
      : null,
    property.bathrooms != null
      ? {
          key: "bathrooms",
          title: "Baños",
          value: String(property.bathrooms),
          icon: <BathIcon size={22} className={iconClass} />,
        }
      : null,
    property.rooms != null
      ? {
          key: "rooms",
          title: "Ambientes",
          value: String(property.rooms),
          icon: <HouseIcon size={22} className={iconClass} />,
        }
      : null,
    formatArea(property.totalArea)
      ? {
          key: "totalArea",
          title: "Superficie",
          value: formatArea(property.totalArea)!,
          icon: <AreaIcon size={22} className={iconClass} />,
        }
      : null,
    property.parkingSpaces != null
      ? {
          key: "parkingSpaces",
          title: "Cocheras",
          value: String(property.parkingSpaces),
          icon: <GarageIcon size={22} className={iconClass} />,
        }
      : null,
  ];

  return items.filter((item): item is CharacteristicItem => item !== null);
}

function buildFeatureItems(
  features: PublicPropertyFeature[],
): CharacteristicItem[] {
  const sorted = FEATURE_CATEGORY_ORDER.flatMap((category) =>
    features.filter((feature) => feature.category === category),
  );

  return sorted.map((feature) => ({
    key: `feature-${feature.id}`,
    title: feature.name,
    value: feature.value?.trim() || "Disponible",
    icon: getFeatureIcon(feature.slug),
  }));
}

function buildTechnicalItems(
  property: PublicPropertyDetail,
): CharacteristicItem[] {
  const iconClass = "text-text-secondary";

  return buildTechnicalSheetItems(property)
    .filter((item) => !PROPERTY_METRICS_GRID_KEYS.has(item.key))
    .map((item) => ({
      key: item.key,
      title: item.label,
      value: item.value,
      icon: (
        <Icon size={22} className={iconClass}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
          <path d="M7 21h10" />
          <path d="M9 3h6" />
        </Icon>
      ),
    }));
}

function buildCharacteristicItems(
  property: PublicPropertyDetail,
): CharacteristicItem[] {
  return [
    ...buildMetricItems(property),
    ...buildFeatureItems(property.features),
    ...buildTechnicalItems(property),
  ];
}

export function hasPropertyCharacteristics(
  property: PublicPropertyDetail,
): boolean {
  return buildCharacteristicItems(property).length > 0;
}

export function PropertyCharacteristics({
  property,
}: PropertyCharacteristicsProps) {
  const items = buildCharacteristicItems(property);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8">
        <h2
          className={`${playfair.className} text-2xl font-medium tracking-tight text-text-primary md:text-3xl`}
        >
          Características
        </h2>

        <dl className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-text-primary">
                  {item.title}
                </dt>
                <dd className="mt-0.5 text-sm leading-snug text-text-secondary">
                  {item.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
