import { describe, expect, it } from "vitest";
import { buildPublicPropertyDetailHref } from "./public-property-detail";

describe("buildPublicPropertyDetailHref", () => {
  it("includes listingType query param", () => {
    expect(buildPublicPropertyDetailHref("casa-caballito", "SALE")).toBe(
      "/propiedades/casa-caballito?listingType=SALE",
    );
  });

  it("encodes slug characters", () => {
    expect(buildPublicPropertyDetailHref("casa en palermo", "RENT")).toBe(
      "/propiedades/casa%20en%20palermo?listingType=RENT",
    );
  });

  it("supports temporary rent listing type", () => {
    expect(
      buildPublicPropertyDetailHref("depto-centro", "TEMPORARY_RENT"),
    ).toBe("/propiedades/depto-centro?listingType=TEMPORARY_RENT");
  });
});
