import { describe, expect, it } from "vitest";
import type { AdminProperty } from "@/lib/api/types/property";
import {
  emptyPropertyFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  propertyToFormValues,
} from "./form";

const property = {
  id: "property-1",
  tenantId: "tenant-1",
  createdById: "user-1",
  assignedToId: null,
  slug: "casa-centro",
  internalCode: null,
  title: "Casa centro",
  description: null,
  propertyType: "HOUSE",
  condition: null,
  isActive: false,
  street: null,
  streetNumber: null,
  floor: null,
  apartment: null,
  neighborhood: null,
  city: "Córdoba",
  province: null,
  state: null,
  country: "AR",
  countryId: null,
  provinceId: "province-1",
  localityId: "locality-1",
  neighborhoodId: null,
  provinceName: null,
  localityName: null,
  neighborhoodName: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  totalArea: null,
  coveredArea: null,
  uncoveredArea: null,
  lotFront: null,
  lotDepth: null,
  rooms: null,
  bedrooms: null,
  bathrooms: null,
  halfBathrooms: null,
  parkingSpaces: null,
  yearBuilt: null,
  orientation: null,
  layout: null,
  brightness: null,
  listingTypes: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies AdminProperty;

describe("Property form lifecycle isolation", () => {
  it("relies on the API default when creating a property", () => {
    const values = {
      ...emptyPropertyFormValues(),
      title: "Casa centro",
      slug: "casa-centro",
      propertyType: "HOUSE" as const,
      provinceId: "province-1",
      localityId: "locality-1",
      localityName: "Córdoba",
    };

    expect(formValuesToCreatePayload(values)).not.toHaveProperty("isActive");
  });

  it("does not restore an archived property while editing other fields", () => {
    const values = propertyToFormValues(property);
    values.title = "Casa centro actualizada";

    expect(values).not.toHaveProperty("isActive");
    expect(formValuesToUpdatePayload(values)).toMatchObject({
      title: "Casa centro actualizada",
    });
    expect(formValuesToUpdatePayload(values)).not.toHaveProperty("isActive");
  });
});
