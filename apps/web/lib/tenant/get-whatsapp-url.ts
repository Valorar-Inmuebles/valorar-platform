import type { PropertyListingType } from "@repo/shared-types";
import { buildPublicPropertyDetailHref } from "@/lib/url/public-property-detail";

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  return digits.length > 0 ? digits : null;
}

export function getWhatsAppUrl(params: {
  phone: string;
  message: string;
}): string | null {
  const normalized = normalizeWhatsAppPhone(params.phone);

  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(params.message)}`;
}

export function buildPropertyWhatsAppMessage(params: {
  title: string;
  siteUrl: string;
  slug: string;
  listingType: PropertyListingType;
}): string {
  const canonicalPath = buildPublicPropertyDetailHref(
    params.slug,
    params.listingType,
  );
  const baseUrl = params.siteUrl.replace(/\/$/, "");

  return `Hola, me interesa ${params.title} — ${baseUrl}${canonicalPath}`;
}
