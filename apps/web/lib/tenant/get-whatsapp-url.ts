import type { PropertyListingType } from "@repo/shared-types";
import { buildPublicPropertyDetailHref } from "@/lib/url/public-property-detail";

/** Fallback when no WhatsApp URL or phone is configured. */
export const WHATSAPP_FALLBACK_URL = "https://wa.me/";

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

/**
 * URL for the site-wide floating WhatsApp button.
 * Configure via `NEXT_PUBLIC_WHATSAPP_URL` (e.g. `https://wa.me/5491112345678`).
 */
export function getFloatingWhatsAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return WHATSAPP_FALLBACK_URL;
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
