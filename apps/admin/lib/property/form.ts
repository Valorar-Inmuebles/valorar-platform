import type {
  Orientation,
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
  PropertyType,
} from "@repo/shared-types";
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
    floor: "",
    apartment: "",
    neighborhood: "",
    province: "",
    countryId: "",
    provinceId: "",
    localityId: "",
    neighborhoodId: "",
    provinceName: "",
    localityName: "",
    neighborhoodName: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    rooms: "",
    bedrooms: "",
    bathrooms: "",
    halfBathrooms: "",
    parkingSpaces: "",
    totalArea: "",
    coveredArea: "",
    uncoveredArea: "",
    lotFront: "",
    lotDepth: "",
    yearBuilt: "",
    orientation: "",
    layout: "",
    brightness: "",
    isActive: true,
  };
}

export function propertyToFormValues(property: AdminProperty): PropertyFormValues {
  return {
    title: property.title,
    slug: property.slug,
    propertyType: property.propertyType,
    city: property.localityName ?? property.city,
    description: property.description ?? "",
    internalCode: property.internalCode ?? "",
    condition: property.condition ?? "",
    street: property.street ?? "",
    streetNumber: property.streetNumber ?? "",
    floor: property.floor ?? "",
    apartment: property.apartment ?? "",
    neighborhood: property.neighborhoodName ?? property.neighborhood ?? "",
    province: property.provinceName ?? property.province ?? "",
    countryId: property.countryId ?? "",
    provinceId: property.provinceId ?? "",
    localityId: property.localityId ?? "",
    neighborhoodId: property.neighborhoodId ?? "",
    provinceName: property.provinceName ?? property.province ?? "",
    localityName: property.localityName ?? property.city,
    neighborhoodName: property.neighborhoodName ?? property.neighborhood ?? "",
    postalCode: property.postalCode ?? "",
    latitude: property.latitude?.toString() ?? "",
    longitude: property.longitude?.toString() ?? "",
    rooms: property.rooms?.toString() ?? "",
    bedrooms: property.bedrooms?.toString() ?? "",
    bathrooms: property.bathrooms?.toString() ?? "",
    halfBathrooms: property.halfBathrooms?.toString() ?? "",
    parkingSpaces: property.parkingSpaces?.toString() ?? "",
    totalArea: property.totalArea?.toString() ?? "",
    coveredArea: property.coveredArea?.toString() ?? "",
    uncoveredArea: property.uncoveredArea?.toString() ?? "",
    lotFront: property.lotFront?.toString() ?? "",
    lotDepth: property.lotDepth?.toString() ?? "",
    yearBuilt: property.yearBuilt?.toString() ?? "",
    orientation: property.orientation ?? "",
    layout: property.layout ?? "",
    brightness: property.brightness ?? "",
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

function validateOptionalNonNegativeInt(
  value: string,
  label: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${label} debe ser un número entero mayor o igual a 0.`;
  }

  return null;
}

function validateOptionalNonNegativeFloat(
  value: string,
  label: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${label} debe ser un número mayor o igual a 0.`;
  }

  return null;
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
  if (!values.provinceId.trim()) return "Seleccioná una provincia.";
  if (!values.localityId.trim()) return "Seleccioná una localidad.";

  const intFields: Array<[string, string]> = [
    [values.rooms, "Ambientes"],
    [values.bedrooms, "Dormitorios"],
    [values.bathrooms, "Baños"],
    [values.halfBathrooms, "Toilettes"],
    [values.parkingSpaces, "Cocheras"],
  ];

  for (const [value, label] of intFields) {
    const error = validateOptionalNonNegativeInt(value, label);
    if (error) return error;
  }

  const floatFields: Array<[string, string]> = [
    [values.totalArea, "Superficie total"],
    [values.coveredArea, "Superficie cubierta"],
    [values.uncoveredArea, "Superficie descubierta"],
    [values.lotFront, "Frente del terreno"],
    [values.lotDepth, "Fondo del terreno"],
  ];

  for (const [value, label] of floatFields) {
    const error = validateOptionalNonNegativeFloat(value, label);
    if (error) return error;
  }

  const yearBuiltTrimmed = values.yearBuilt.trim();
  if (yearBuiltTrimmed) {
    const yearBuilt = Number.parseInt(yearBuiltTrimmed, 10);
    if (Number.isNaN(yearBuilt) || yearBuilt < 1800 || yearBuilt > 2100) {
      return "El año de construcción debe estar entre 1800 y 2100.";
    }
  }

  const latitudeTrimmed = values.latitude.trim();
  if (latitudeTrimmed) {
    const latitude = Number.parseFloat(latitudeTrimmed);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return "La latitud debe estar entre -90 y 90.";
    }
  }

  const longitudeTrimmed = values.longitude.trim();
  if (longitudeTrimmed) {
    const longitude = Number.parseFloat(longitudeTrimmed);
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return "La longitud debe estar entre -180 y 180.";
    }
  }

  return null;
}

export function formValuesToCreatePayload(
  values: PropertyFormValues,
): CreatePropertyPayload {
  return {
    slug: values.slug.trim(),
    title: values.title.trim(),
    propertyType: values.propertyType as PropertyType,
    city: values.localityName.trim(),
    provinceId: values.provinceId.trim(),
    localityId: values.localityId.trim(),
    neighborhoodId: values.neighborhoodId.trim() || null,
    province: values.provinceName.trim() || undefined,
    description: trimOrUndefined(values.description),
    internalCode: trimOrUndefined(values.internalCode),
    condition: values.condition || undefined,
    street: trimOrUndefined(values.street),
    streetNumber: trimOrUndefined(values.streetNumber),
    floor: trimOrUndefined(values.floor),
    apartment: trimOrUndefined(values.apartment),
    neighborhood: trimOrUndefined(values.neighborhoodName),
    postalCode: trimOrUndefined(values.postalCode),
    latitude: parseOptionalFloat(values.latitude),
    longitude: parseOptionalFloat(values.longitude),
    rooms: parseOptionalInt(values.rooms),
    bedrooms: parseOptionalInt(values.bedrooms),
    bathrooms: parseOptionalInt(values.bathrooms),
    halfBathrooms: parseOptionalInt(values.halfBathrooms),
    parkingSpaces: parseOptionalInt(values.parkingSpaces),
    totalArea: parseOptionalFloat(values.totalArea),
    coveredArea: parseOptionalFloat(values.coveredArea),
    uncoveredArea: parseOptionalFloat(values.uncoveredArea),
    lotFront: parseOptionalFloat(values.lotFront),
    lotDepth: parseOptionalFloat(values.lotDepth),
    yearBuilt: parseOptionalInt(values.yearBuilt),
    orientation: values.orientation || undefined,
    layout: values.layout || undefined,
    brightness: values.brightness || undefined,
    isActive: values.isActive,
  };
}

export function formValuesToUpdatePayload(
  values: PropertyFormValues,
): UpdatePropertyPayload {
  return formValuesToCreatePayload(values);
}
