import type { PropertyType } from "@repo/shared-types";
import type {
  AdminProperty,
  CreatePropertyPayload,
  PropertyFormValues,
  UpdatePropertyPayload,
} from "@/lib/api/types/property";

export function slugifyTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function emptyPropertyFormValues(): PropertyFormValues {
  return {
    title: "",
    slug: "",
    propertyType: "",
    city: "",
    description: "",
    internalCode: "",
    condition: "",
    street: "",
    streetNumber: "",
    neighborhood: "",
    province: "",
    postalCode: "",
    bedrooms: "",
    bathrooms: "",
    totalArea: "",
    coveredArea: "",
    isActive: true,
  };
}

export function propertyToFormValues(property: AdminProperty): PropertyFormValues {
  return {
    title: property.title,
    slug: property.slug,
    propertyType: property.propertyType,
    city: property.city,
    description: property.description ?? "",
    internalCode: property.internalCode ?? "",
    condition: property.condition ?? "",
    street: property.street ?? "",
    streetNumber: property.streetNumber ?? "",
    neighborhood: property.neighborhood ?? "",
    province: property.province ?? "",
    postalCode: property.postalCode ?? "",
    bedrooms: property.bedrooms?.toString() ?? "",
    bathrooms: property.bathrooms?.toString() ?? "",
    totalArea: property.totalArea?.toString() ?? "",
    coveredArea: property.coveredArea?.toString() ?? "",
    isActive: property.isActive,
  };
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validatePropertyFormValues(
  values: PropertyFormValues,
): string | null {
  if (!values.title.trim()) return "El título es obligatorio.";
  if (!values.slug.trim()) return "El slug es obligatorio.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    return "El slug solo puede contener minúsculas, números y guiones.";
  }
  if (values.slug.length < 3) return "El slug debe tener al menos 3 caracteres.";
  if (!values.propertyType) return "Seleccioná un tipo de propiedad.";
  if (!values.city.trim()) return "La ciudad es obligatoria.";
  return null;
}

export function formValuesToCreatePayload(
  values: PropertyFormValues,
): CreatePropertyPayload {
  return {
    slug: values.slug.trim(),
    title: values.title.trim(),
    propertyType: values.propertyType as PropertyType,
    city: values.city.trim(),
    description: trimOrUndefined(values.description),
    internalCode: trimOrUndefined(values.internalCode),
    condition: values.condition || undefined,
    street: trimOrUndefined(values.street),
    streetNumber: trimOrUndefined(values.streetNumber),
    neighborhood: trimOrUndefined(values.neighborhood),
    province: trimOrUndefined(values.province),
    postalCode: trimOrUndefined(values.postalCode),
    bedrooms: parseOptionalInt(values.bedrooms),
    bathrooms: parseOptionalInt(values.bathrooms),
    totalArea: parseOptionalFloat(values.totalArea),
    coveredArea: parseOptionalFloat(values.coveredArea),
    isActive: values.isActive,
  };
}

export function formValuesToUpdatePayload(
  values: PropertyFormValues,
): UpdatePropertyPayload {
  return formValuesToCreatePayload(values);
}
