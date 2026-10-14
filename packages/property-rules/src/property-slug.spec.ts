import { describe, expect, it } from "vitest";
import { propertySlugCandidate, propertySlugFromTitle } from "./property-slug";

describe("property URL base", () => {
  it("normalizes accents, whitespace and punctuation", () => {
    expect(propertySlugFromTitle(" Departamento 3 ambientes en Palermo ")).toBe(
      "departamento-3-ambientes-en-palermo",
    );
    expect(propertySlugFromTitle("Ático / Ñandú & balcón")).toBe(
      "atico-nandu-balcon",
    );
  });
  it("has a valid fallback and trims edge hyphens after truncation", () => {
    expect(propertySlugFromTitle("🏡")).toBe("propiedad");
    expect(propertySlugFromTitle("A")).toBe("propiedad");
    expect(propertySlugFromTitle(`${"a".repeat(119)} casa`)).toBe(
      "a".repeat(119),
    );
  });
  it("reserves space for every suffix within the 120-character contract", () => {
    const base = "a".repeat(120);
    for (const ordinal of [1, 2, 3, 10000]) {
      const slug = propertySlugCandidate(base, ordinal);
      expect(slug.length).toBeLessThanOrEqual(120);
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      if (ordinal > 1) expect(slug.endsWith(`-${ordinal}`)).toBe(true);
    }
  });
});
