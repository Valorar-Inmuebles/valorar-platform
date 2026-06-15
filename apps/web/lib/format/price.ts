import type { Currency } from "@repo/shared-types";

export function formatPrice(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return formatter.format(amount);
}
