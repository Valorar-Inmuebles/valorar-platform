import { describe, expect, it } from "vitest";
import type { AdminProperty } from "@/lib/api/types/property";
import {
  emptyPropertyFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  propertyToFormValues,
  validatePropertyFormValues,
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
  const valid = () => propertyToFormValues(property);
  it("omits the preview slug on create and keeps edit slug and coordinates stable", () => {
    expect(formValuesToCreatePayload(valid())).not.toHaveProperty("slug");
    const initial = propertyToFormValues({
      ...property,
      latitude: -34.1234567,
      longitude: -58.1234567,
    });
    expect(
      formValuesToUpdatePayload({ ...initial, title: "Otro título" }, initial),
    ).toEqual({ title: "Otro título" });
    expect(
      formValuesToUpdatePayload(
        { ...initial, latitude: "-35.1234567" },
        initial,
      ),
    ).toEqual({ latitude: -35.1234567 });
  });
  it.each(["80,40", "80.40", "35,79", "120", ",5", "80,"])(
    "preserves decimal input %s as an API number",
    (value) => {
      const values = { ...valid(), totalArea: value };
      expect(validatePropertyFormValues(values)).toBeNull();
      expect(formValuesToCreatePayload(values).totalArea).toBe(
        Number(value.replace(",", ".")),
      );
    },
  );
  it.each([
    "1.234,56",
    "1,234.56",
    "80,401",
    "80foo",
    "1e2",
    "-1",
    "100000000",
  ])("rejects invalid or out-of-scale area %s", (value) => {
    expect(
      validatePropertyFormValues({ ...valid(), totalArea: value }),
    ).not.toBeNull();
  });
  it.each(["1.5", "-1", "2e3", "12foo", "2147483648"])(
    "rejects invalid quantity %s",
    (rooms) => {
      expect(validatePropertyFormValues({ ...valid(), rooms })).not.toBeNull();
    },
  );
  it.each(["180", "1799", "2101", "2000x", "2e3", "2000.1"])(
    "rejects invalid year %s",
    (yearBuilt) => {
      expect(
        validatePropertyFormValues({ ...valid(), yearBuilt }),
      ).not.toBeNull();
    },
  );
  it("normalizes decimal punctuation for P1.2 and retains empty and zero semantics", () => {
    const initial = propertyToFormValues({
      ...property,
      totalArea: 80.4,
      rooms: 2,
    });
    expect(
      formValuesToUpdatePayload({ ...initial, totalArea: "80,40" }, initial),
    ).toEqual({});
    expect(
      formValuesToUpdatePayload(
        { ...initial, totalArea: "", rooms: "0" },
        initial,
      ),
    ).toEqual({ totalArea: null, rooms: 0 });
    for (const yearBuilt of ["", "1800", "2100"])
      expect(validatePropertyFormValues({ ...valid(), yearBuilt })).toBeNull();
  });
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
