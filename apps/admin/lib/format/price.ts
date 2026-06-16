import type { PriceCurrency } from "@/lib/api/types/property-price";

export function formatPrice(amount: number, currency: PriceCurrency): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(amount);
}
