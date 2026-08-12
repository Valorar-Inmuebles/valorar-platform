import { describe, expect, it } from "vitest";
import {
  CONSULT_PRICE_LABEL,
  formatPropertyPriceLabel,
} from "./price";

describe("formatPropertyPriceLabel", () => {
  it("formats priced properties", () => {
    expect(formatPropertyPriceLabel(195000, "USD")).toBe("USD 195.000");
  });

  it('shows “Consultar precio” when price is missing', () => {
    expect(formatPropertyPriceLabel(null, null)).toBe(CONSULT_PRICE_LABEL);
    expect(formatPropertyPriceLabel(undefined, "USD")).toBe(CONSULT_PRICE_LABEL);
    expect(formatPropertyPriceLabel(100, null)).toBe(CONSULT_PRICE_LABEL);
  });
});
