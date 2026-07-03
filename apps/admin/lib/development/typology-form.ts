import type { AdminDevelopmentTypology } from "@/lib/api/types/development-typology";
import type {
  CreateDevelopmentTypologyPayload,
  DevelopmentTypologyFormValues,
  UpdateDevelopmentTypologyPayload,
} from "@/lib/api/types/development-typology";
import type { PriceCurrency } from "@/lib/api/types/development";

export function emptyTypologyFormValues(): DevelopmentTypologyFormValues {
  return {
    name: "",
    description: "",
    totalCount: "",
    availableCount: "",
    surfaceFrom: "",
    surfaceTo: "",
    priceFrom: "",
    currency: "",
  };
}

export function typologyToFormValues(
  typology: AdminDevelopmentTypology,
): DevelopmentTypologyFormValues {
  return {
    name: typology.name,
    description: typology.description,
    totalCount: typology.totalCount?.toString() ?? "",
    availableCount: typology.availableCount?.toString() ?? "",
    surfaceFrom: typology.surfaceFrom?.toString() ?? "",
    surfaceTo: typology.surfaceTo?.toString() ?? "",
    priceFrom: typology.priceFrom?.toString() ?? "",
    currency: typology.currency ?? "",
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

export function validateTypologyFormValues(
  values: DevelopmentTypologyFormValues,
): string | null {
  if (!values.name.trim()) return "El nombre es obligatorio.";
  if (!values.description.trim()) return "La descripción es obligatoria.";

  const totalCount = parseOptionalInt(values.totalCount);
  const availableCount = parseOptionalInt(values.availableCount);

  if (values.totalCount.trim() && totalCount === undefined) {
    return "Cantidad total debe ser un número entero válido.";
  }

  if (values.availableCount.trim() && availableCount === undefined) {
    return "Cantidad disponible debe ser un número entero válido.";
  }

  if (
    totalCount != null &&
    availableCount != null &&
    availableCount > totalCount
  ) {
    return "Las unidades disponibles no pueden superar el total.";
  }

  const surfaceFrom = parseOptionalFloat(values.surfaceFrom);
  const surfaceTo = parseOptionalFloat(values.surfaceTo);

  if (values.surfaceFrom.trim() && surfaceFrom === undefined) {
    return "Superficie desde debe ser un número válido.";
  }

  if (values.surfaceTo.trim()) {
    if (surfaceTo === undefined || surfaceTo <= 0) {
      return "Superficie hasta debe ser un número mayor a 0.";
    }
    if (surfaceFrom != null && surfaceTo < surfaceFrom) {
      return "Superficie hasta debe ser mayor o igual a superficie desde.";
    }
  }

  const priceFrom = parseOptionalFloat(values.priceFrom);
  if (values.priceFrom.trim()) {
    if (priceFrom === undefined || priceFrom <= 0) {
      return "Precio desde debe ser un número mayor a 0.";
    }
    if (!values.currency) {
      return "Seleccioná una moneda si indicás un precio.";
    }
  }

  if (values.currency && !values.priceFrom.trim()) {
    return "Indicá un precio desde si seleccionás una moneda.";
  }

  return null;
}

function buildOptionalPayload(values: DevelopmentTypologyFormValues) {
  const totalCount = parseOptionalInt(values.totalCount);
  const availableCount = parseOptionalInt(values.availableCount);
  const surfaceFrom = parseOptionalFloat(values.surfaceFrom);
  const surfaceTo = parseOptionalFloat(values.surfaceTo);
  const priceFrom = parseOptionalFloat(values.priceFrom);

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    totalCount,
    availableCount,
    surfaceFrom,
    surfaceTo,
    priceFrom,
    currency: values.currency
      ? (values.currency as PriceCurrency)
      : undefined,
  };
}

export function formValuesToCreatePayload(
  developmentId: string,
  values: DevelopmentTypologyFormValues,
  sortOrder?: number,
): CreateDevelopmentTypologyPayload {
  return {
    developmentId,
    ...buildOptionalPayload(values),
    sortOrder,
  };
}

export function formValuesToUpdatePayload(
  values: DevelopmentTypologyFormValues,
): UpdateDevelopmentTypologyPayload {
  return buildOptionalPayload(values);
}
