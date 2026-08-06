import type { DevelopmentStatus } from "./public-development";
import type { PropertyType } from "./public-property";

export type SpecificAttributeOption = {
  slug: string;
  label: string;
};

export type PropertySpecificAttributeDefinition = {
  key: string;
  propertyType: PropertyType;
  title: string;
  selection: "single" | "multiple";
  options: SpecificAttributeOption[];
};

export const GARAGE_TYPE_ATTRIBUTE = {
  key: "garageType",
  propertyType: "GARAGE",
  title: "Tipo de cochera",
  selection: "multiple",
  options: [
    { slug: "cochera-fija", label: "Fija" },
    { slug: "cochera-movil", label: "Móvil" },
    { slug: "cochera-superior", label: "Superior" },
    { slug: "cochera-cubierta", label: "Cubierta" },
    { slug: "cochera-semicubierta", label: "Semicubierta" },
    { slug: "cochera-descubierta", label: "Descubierta" },
    { slug: "cochera-planta-baja", label: "Planta Baja (PB)" },
    { slug: "cochera-subsuelo", label: "Subsuelo" },
  ],
} as const satisfies PropertySpecificAttributeDefinition;

export const PROPERTY_SPECIFIC_ATTRIBUTES = [
  GARAGE_TYPE_ATTRIBUTE,
] as const satisfies readonly PropertySpecificAttributeDefinition[];

export const PROPERTY_SPECIFIC_ATTRIBUTE_SLUGS = PROPERTY_SPECIFIC_ATTRIBUTES.flatMap(
  (attribute) => attribute.options.map((option) => option.slug),
);

export const DEVELOPMENT_STATUS_OPTIONS = [
  { value: "IN_PIT", label: "Pozo" },
  { value: "UNDER_CONSTRUCTION", label: "En construcción" },
  { value: "COMPLETED", label: "Terminado" },
] as const satisfies ReadonlyArray<{
  value: DevelopmentStatus;
  label: string;
}>;

export function getDevelopmentStatusLabel(status: DevelopmentStatus): string {
  return DEVELOPMENT_STATUS_OPTIONS.find((option) => option.value === status)
    ?.label ?? status;
}
