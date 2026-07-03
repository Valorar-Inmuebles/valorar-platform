import type { DevelopmentStatus } from "@repo/shared-types";
import type { AdminDevelopment } from "@/lib/api/types/development";
import type { PriceCurrency } from "@/lib/api/types/property-price";

export type DevelopmentPriceSummary = {
  amount: number;
  currency: PriceCurrency;
};

export type DevelopmentSeoSummary = {
  scoreLabel: string;
  isReady: boolean;
  issues: string[];
};

export type DevelopmentExecutiveSnapshot = {
  shortAddress: string;
  provinceLabel: string;
  localityLabel: string;
  lifecycleLabel: "Activo" | "Archivado";
  status: DevelopmentStatus | null;
  price: DevelopmentPriceSummary | null;
  hasFinancing: boolean;
  imageCount: number;
  hasCoverImage: boolean;
  featureCount: number;
  typologyCount: number;
  seo: DevelopmentSeoSummary;
  updatedAt: string;
};

export function formatDevelopmentShortAddress(
  development: AdminDevelopment,
): string {
  const streetLine = [development.street, development.streetNumber]
    .filter(Boolean)
    .join(" ");

  if (streetLine) {
    return streetLine;
  }

  return (
    development.neighborhoodName ??
    development.neighborhood ??
    development.city
  );
}

export function resolveProvinceLabel(development: AdminDevelopment): string {
  return development.provinceName ?? development.province ?? "—";
}

export function resolveLocalityLabel(development: AdminDevelopment): string {
  return development.localityName ?? development.city ?? "—";
}

export function evaluateDevelopmentSeo(
  development: AdminDevelopment,
): DevelopmentSeoSummary {
  const issues: string[] = [];

  if (!development.slug.trim()) {
    issues.push("Falta slug");
  }

  if (!development.title.trim()) {
    issues.push("Falta título");
  }

  if (!development.shortDescription.trim()) {
    issues.push("Falta descripción corta");
  }

  const description = development.description.trim();
  if (description.length < 40) {
    issues.push("Descripción corta para SEO");
  }

  const isReady = issues.length === 0;

  return {
    isReady,
    scoreLabel: isReady
      ? "Listo"
      : `${issues.length} pendiente${issues.length === 1 ? "" : "s"}`,
    issues,
  };
}

export function buildDevelopmentExecutiveSnapshot(input: {
  development: AdminDevelopment;
  imageCount: number;
  hasCoverImage: boolean;
  featureCount: number;
  typologyCount: number;
}): DevelopmentExecutiveSnapshot {
  const { development } = input;

  return {
    shortAddress: formatDevelopmentShortAddress(development),
    provinceLabel: resolveProvinceLabel(development),
    localityLabel: resolveLocalityLabel(development),
    lifecycleLabel: development.isActive ? "Activo" : "Archivado",
    status: development.status,
    price:
      development.priceFrom != null && development.currency
        ? {
            amount: development.priceFrom,
            currency: development.currency,
          }
        : null,
    hasFinancing: development.hasFinancing,
    imageCount: input.imageCount,
    hasCoverImage: input.hasCoverImage,
    featureCount: input.featureCount,
    typologyCount: input.typologyCount,
    seo: evaluateDevelopmentSeo(development),
    updatedAt: development.updatedAt,
  };
}
