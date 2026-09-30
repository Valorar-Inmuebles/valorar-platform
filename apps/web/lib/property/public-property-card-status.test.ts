import { describe, expect, it } from "vitest";
import { getPublicPropertyCardStatusLabel } from "./public-property-card-status";

describe("getPublicPropertyCardStatusLabel", () => {
  it.each([
    ["SALE", "ACTIVE", null],
    ["SALE", "RESERVED", "Reservada"],
    ["SALE", "CLOSED", "Vendida"],
    ["RENT", "ACTIVE", null],
    ["RENT", "RESERVED", "Reservada"],
    ["RENT", "CLOSED", "Alquilada"],
  ] as const)("renders %s + %s as %s", (listingType, status, expected) => {
    expect(getPublicPropertyCardStatusLabel(status, listingType)).toBe(
      expected,
    );
  });

  it("does not mix statuses when a property has sale and rent listings", () => {
    const listings = [
      { listingType: "SALE" as const, status: "CLOSED" as const },
      { listingType: "RENT" as const, status: "ACTIVE" as const },
    ];

    expect(
      listings.map((listing) =>
        getPublicPropertyCardStatusLabel(listing.status, listing.listingType),
      ),
    ).toEqual(["Vendida", null]);
  });
});
