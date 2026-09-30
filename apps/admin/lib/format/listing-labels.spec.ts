import { describe, expect, it } from "vitest";
import { getListingStatusLabel } from "./listing-labels";

describe("getListingStatusLabel", () => {
  it("labels a closed sale as Vendida", () => {
    expect(getListingStatusLabel("CLOSED", "SALE")).toBe("Vendida");
  });

  it.each(["RENT", "TEMPORARY_RENT"] as const)(
    "labels a closed rental %s as Alquilada",
    (listingType) => {
      expect(getListingStatusLabel("CLOSED", listingType)).toBe("Alquilada");
    },
  );

  it.each([
    ["SALE", "Activa"],
    ["RENT", "Activa"],
  ] as const)("keeps active %s as %s", (listingType, expected) => {
    expect(getListingStatusLabel("ACTIVE", listingType)).toBe(expected);
  });

  it("keeps labels independent for sale and rental listings of one property", () => {
    const listings = [
      { listingType: "SALE" as const, status: "ACTIVE" as const },
      { listingType: "RENT" as const, status: "CLOSED" as const },
    ];

    expect(
      listings.map((listing) =>
        getListingStatusLabel(listing.status, listing.listingType),
      ),
    ).toEqual(["Activa", "Alquilada"]);
  });
});
