import type { LucideProps } from "lucide-react";
import type { PropertyType } from "@repo/shared-types";
import {
  DEVELOPMENT_ICON,
  PROPERTY_TYPE_ICONS,
} from "./property-type-icons";

/** Short aliases used in product/docs (maps to PropertyType + development). */
export const PROPERTY_TYPE_ICON_ALIASES = {
  house: "HOUSE",
  apartment: "APARTMENT",
  ph: "PH",
  office: "OFFICE",
  commercial: "COMMERCIAL",
  land: "LAND",
  garage: "GARAGE",
  warehouse: "WAREHOUSE",
  field: "FIELD",
  country: "COUNTRY_HOUSE",
  industrial: "INDUSTRIAL",
  other: "OTHER",
  development: "DEVELOPMENT",
} as const;

export type PropertyTypeIconAlias = keyof typeof PROPERTY_TYPE_ICON_ALIASES;

export type PropertyTypeIconType =
  | PropertyType
  | PropertyTypeIconAlias
  | "DEVELOPMENT";

export type PropertyTypeIconProps = LucideProps & {
  type: PropertyTypeIconType;
};

function resolvePropertyTypeIcon(type: PropertyTypeIconType) {
  if (type === "DEVELOPMENT" || type === "development") {
    return DEVELOPMENT_ICON;
  }

  if (type in PROPERTY_TYPE_ICON_ALIASES) {
    const resolved = PROPERTY_TYPE_ICON_ALIASES[type as PropertyTypeIconAlias];
    if (resolved === "DEVELOPMENT") {
      return DEVELOPMENT_ICON;
    }
    return PROPERTY_TYPE_ICONS[resolved];
  }

  return PROPERTY_TYPE_ICONS[type as PropertyType] ?? PROPERTY_TYPE_ICONS.OTHER;
}

/**
 * Official Valorar property-type icon.
 * Reuses the same Lucide marks as the public "Tipo de propiedad" selector.
 */
export function PropertyTypeIcon({ type, ...props }: PropertyTypeIconProps) {
  const Icon = resolvePropertyTypeIcon(type);
  return <Icon aria-hidden {...props} />;
}
