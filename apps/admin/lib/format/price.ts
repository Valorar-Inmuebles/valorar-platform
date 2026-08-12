import { formatMoney, formatPrice as formatPriceShared, formatPropertyPriceLabel as formatPropertyPriceLabelShared, CONSULT_PRICE_LABEL } from "@repo/shared-types/format-money";
import type { PriceCurrency } from "@/lib/api/types/property-price";

export { formatMoney, CONSULT_PRICE_LABEL };

export function formatPrice(amount: number, currency: PriceCurrency): string {
  return formatPriceShared(amount, currency);
}

export function formatPropertyPriceLabel(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  return formatPropertyPriceLabelShared(amount, currency);
}
