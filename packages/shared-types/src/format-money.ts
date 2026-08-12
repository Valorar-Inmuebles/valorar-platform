const moneyFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export const CONSULT_PRICE_LABEL = "Consultar precio";

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount);
}

export function formatPrice(amount: number, currency: string): string {
  return `${currency} ${formatMoney(amount)}`;
}

/**
 * Display label for a property primary price.
 * Missing / non-finite amount → “Consultar precio” (never invent 0).
 */
export function formatPropertyPriceLabel(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (
    amount == null ||
    !Number.isFinite(amount) ||
    currency == null ||
    String(currency).trim() === ""
  ) {
    return CONSULT_PRICE_LABEL;
  }
  return formatPrice(amount, currency);
}

/** Strip non-digit characters from user input. */
export function sanitizeMoneyInput(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? "" : String(parsed);
}

/** Format a raw digit string for masked display (es-AR thousands). */
export function formatMoneyInput(raw: string): string {
  const sanitized = sanitizeMoneyInput(raw);
  if (!sanitized) return "";
  return formatMoney(Number.parseInt(sanitized, 10));
}

/** Convert a stored numeric amount to raw digits for controlled input state. */
export function moneyToInputValue(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return Math.trunc(amount).toString();
}

/** Parse raw digit string to number for submission. */
export function parseMoneyInput(raw: string): number | undefined {
  const sanitized = sanitizeMoneyInput(raw);
  if (!sanitized) return undefined;
  const parsed = Number.parseInt(sanitized, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
