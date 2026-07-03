import type { DevelopmentStatus } from "@repo/shared-types";
import type {
  AdminDevelopment,
  CreateDevelopmentPayload,
  DevelopmentCommercializationFormValues,
  DevelopmentFormValues,
  UpdateDevelopmentPayload,
} from "@/lib/api/types/development";

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

export function emptyDevelopmentFormValues(): DevelopmentFormValues {
  return {
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    status: "",
    internalCode: "",
    street: "",
    streetNumber: "",
    neighborhood: "",
    province: "",
    countryId: "",
    provinceId: "",
    localityId: "",
    neighborhoodId: "",
    provinceName: "",
    localityName: "",
    neighborhoodName: "",
    city: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    isActive: true,
    hasParkingSpaces: "no",
    parkingSpacesCount: "",
  };
}

export function developmentToFormValues(
  development: AdminDevelopment,
): DevelopmentFormValues {
  return {
    title: development.title,
    slug: development.slug,
    shortDescription: development.shortDescription,
    description: development.description,
    status: development.status ?? "",
    internalCode: development.internalCode ?? "",
    street: development.street ?? "",
    streetNumber: development.streetNumber ?? "",
    neighborhood: development.neighborhoodName ?? development.neighborhood ?? "",
    province: development.provinceName ?? development.province ?? "",
    countryId: development.countryId ?? "",
    provinceId: development.provinceId ?? "",
    localityId: development.localityId ?? "",
    neighborhoodId: development.neighborhoodId ?? "",
    provinceName: development.provinceName ?? development.province ?? "",
    localityName: development.localityName ?? development.city,
    neighborhoodName:
      development.neighborhoodName ?? development.neighborhood ?? "",
    city: development.localityName ?? development.city,
    postalCode: development.postalCode ?? "",
    latitude: development.latitude?.toString() ?? "",
    longitude: development.longitude?.toString() ?? "",
    isActive: development.isActive,
    hasParkingSpaces: development.hasParkingSpaces ? "yes" : "no",
    parkingSpacesCount: development.parkingSpacesCount?.toString() ?? "",
  };
}

export function developmentToCommercializationFormValues(
  development: AdminDevelopment,
): DevelopmentCommercializationFormValues {
  return {
    priceFrom: development.priceFrom?.toString() ?? "",
    currency: development.currency ?? "",
    hasFinancing: development.hasFinancing ? "yes" : "no",
    financingDescription: development.financingDescription ?? "",
  };
}

function parseOptionalFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateDevelopmentFormValues(
  values: DevelopmentFormValues,
): string | null {
  if (!values.title.trim()) return "El título es obligatorio.";
  if (!values.slug.trim()) return "El slug es obligatorio.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    return "El slug solo puede contener minúsculas, números y guiones.";
  }
  if (values.slug.length < 3) return "El slug debe tener al menos 3 caracteres.";
  if (!values.shortDescription.trim()) {
    return "La descripción corta es obligatoria.";
  }
  if (!values.description.trim()) return "La descripción es obligatoria.";
  if (!values.provinceId.trim()) return "Seleccioná una provincia.";
  if (!values.localityId.trim()) return "Seleccioná una localidad.";

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

  if (values.hasParkingSpaces === "yes" && values.parkingSpacesCount.trim()) {
    const count = Number.parseInt(values.parkingSpacesCount.trim(), 10);
    if (Number.isNaN(count) || count < 1) {
      return "La cantidad de cocheras debe ser un entero mayor a 0.";
    }
  }

  return null;
}

export function validateDevelopmentCommercializationFormValues(
  values: DevelopmentCommercializationFormValues,
): string | null {
  const priceTrimmed = values.priceFrom.trim();
  if (priceTrimmed) {
    const price = Number.parseFloat(priceTrimmed);
    if (Number.isNaN(price) || price < 0) {
      return "El precio desde debe ser un número mayor o igual a 0.";
    }
    if (!values.currency) {
      return "Seleccioná una moneda para el precio.";
    }
  }

  if (values.hasFinancing === "yes" && !values.financingDescription.trim()) {
    return "Completá la descripción de financiación.";
  }

  return null;
}

export function formValuesToCreatePayload(
  values: DevelopmentFormValues,
): CreateDevelopmentPayload {
  const hasParkingSpaces = values.hasParkingSpaces === "yes";
  const parkingSpacesCount = hasParkingSpaces
    ? parseOptionalInt(values.parkingSpacesCount)
    : undefined;

  return {
    slug: values.slug.trim(),
    title: values.title.trim(),
    shortDescription: values.shortDescription.trim(),
    description: values.description.trim(),
    status: values.status || undefined,
    city: values.localityName.trim(),
    provinceId: values.provinceId.trim(),
    localityId: values.localityId.trim(),
    neighborhoodId: values.neighborhoodId.trim() || null,
    province: values.provinceName.trim() || undefined,
    internalCode: trimOrUndefined(values.internalCode),
    street: trimOrUndefined(values.street),
    streetNumber: trimOrUndefined(values.streetNumber),
    neighborhood: trimOrUndefined(values.neighborhoodName),
    postalCode: trimOrUndefined(values.postalCode),
    latitude: parseOptionalFloat(values.latitude),
    longitude: parseOptionalFloat(values.longitude),
    isActive: values.isActive,
    hasParkingSpaces,
    parkingSpacesCount: hasParkingSpaces ? (parkingSpacesCount ?? null) : null,
  };
}

export function formValuesToUpdatePayload(
  values: DevelopmentFormValues,
): UpdateDevelopmentPayload {
  return {
    ...formValuesToCreatePayload(values),
    status: values.status ? (values.status as DevelopmentStatus) : null,
  };
}

export function commercializationFormValuesToUpdatePayload(
  values: DevelopmentCommercializationFormValues,
): UpdateDevelopmentPayload {
  const priceTrimmed = values.priceFrom.trim();
  const hasPrice = priceTrimmed.length > 0;

  return {
    priceFrom: hasPrice ? Number.parseFloat(priceTrimmed) : null,
    currency: hasPrice && values.currency ? values.currency : null,
    hasFinancing: values.hasFinancing === "yes",
    financingDescription:
      values.hasFinancing === "yes"
        ? values.financingDescription.trim()
        : null,
  };
}
