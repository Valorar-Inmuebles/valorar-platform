import { formatMoney, formatPrice as formatPriceShared, formatPropertyPriceLabel as formatPropertyPriceLabelShared, CONSULT_PRICE_LABEL } from "@repo/shared-types/format-money";

export { formatMoney, CONSULT_PRICE_LABEL };

export function formatPrice(amount: number, currency: string): string {
  return formatPriceShared(amount, currency);
}

export function formatPropertyPriceLabel(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  return formatPropertyPriceLabelShared(amount, currency);
}
