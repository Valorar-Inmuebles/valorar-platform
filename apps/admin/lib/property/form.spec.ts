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
    expect(
      formValuesToUpdatePayload(values, propertyToFormValues(property)),
    ).toEqual({
      title: "Casa centro actualizada",
    });
    expect(
      formValuesToUpdatePayload(values, propertyToFormValues(property)),
    ).not.toHaveProperty("isActive");
  });

  it("sends only description, ignoring unchanged nulls and normalized numbers", () => {
    const initial = propertyToFormValues({ ...property, totalArea: 100 });
    expect(
      formValuesToUpdatePayload(
        { ...initial, description: "Nueva descripción", totalArea: "100.00" },
        initial,
      ),
    ).toEqual({ description: "Nueva descripción" });
  });

  it("clears optional text, enum and number explicitly without undefined", () => {
    const initial = propertyToFormValues({
      ...property,
      description: "Texto",
      internalCode: "REF",
      condition: "GOOD",
      totalArea: 100,
      assignedToId: "user-1",
    });
    const payload = formValuesToUpdatePayload(
      {
        ...initial,
        description: "",
        internalCode: "",
        condition: "",
        totalArea: "",
        assignedToId: "",
      },
      initial,
    );
    expect(payload).toEqual({
      description: null,
      internalCode: null,
      condition: null,
      totalArea: null,
      assignedToId: null,
    });
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it("does not turn initially empty values into clear intentions", () => {
    const initial = propertyToFormValues(property);
    expect(formValuesToUpdatePayload(initial, initial)).toEqual({});
  });

  it("includes the GEO hierarchy and postal override only on geographic changes", () => {
    const initial = propertyToFormValues({ ...property, postalCode: "1234" });
    expect(
      formValuesToUpdatePayload(
        {
          ...initial,
          neighborhoodId: "neighborhood-2",
          neighborhoodName: "Barrio",
        },
        initial,
      ),
    ).toEqual({
      provinceId: "province-1",
      localityId: "locality-1",
      neighborhoodId: "neighborhood-2",
      neighborhood: "Barrio",
      postalCode: "1234",
    });
    expect(
      formValuesToUpdatePayload({ ...initial, street: "Otra calle" }, initial),
    ).toEqual({ street: "Otra calle" });
  });
});
