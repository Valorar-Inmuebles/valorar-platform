import { formatMoney, formatPrice as formatPriceShared } from "@repo/shared-types/format-money";
import type { Currency } from "@repo/shared-types";

export { formatMoney };

export function formatPrice(amount: number, currency: Currency): string {
  return formatPriceShared(amount, currency);
}
