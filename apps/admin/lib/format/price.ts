import { formatMoney, formatPrice as formatPriceShared } from "@repo/shared-types/format-money";
import type { PriceCurrency } from "@/lib/api/types/property-price";

export { formatMoney };

export function formatPrice(amount: number, currency: PriceCurrency): string {
  return formatPriceShared(amount, currency);
}
