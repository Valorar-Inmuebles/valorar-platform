import { describe, expect, it } from "vitest";
import {
  confirmCoordinates,
  coordinatesEqual,
  positionToCoordinates,
  readMapPosition,
} from "./location-map";
import { formValuesToUpdatePayload, propertyToFormValues } from "./form";
import { detailProperty } from "./detail-context.fixture";

describe("D1 coordinates and P1.2", () => {
  it.each([
    { latitude: "", longitude: "" },
    { latitude: "-34", longitude: "" },
    { latitude: "-91", longitude: "0" },
    { latitude: "0", longitude: "180.1" },
    { latitude: "NaN", longitude: "Infinity" },
    { latitude: "0x12", longitude: "0" },
    { latitude: "1,2.3", longitude: "0" },
  ])(
    "never invents a marker for invalid/incomplete coordinates %j",
    (values) => {
      expect(readMapPosition(values)).toBeNull();
    },
  );
  it("accepts signed decimals, locale input, zero and persisted numbers near zero", () => {
    expect(
      readMapPosition({ latitude: "-34,1234567", longitude: "-58.1234567" }),
    ).toEqual([-34.1234567, -58.1234567]);
    expect(readMapPosition({ latitude: "1e-7", longitude: "0" })).toEqual([
      0.0000001, 0,
    ]);
    expect(readMapPosition({ latitude: "90", longitude: "-180" })).toEqual([
      90, -180,
    ]);
  });
  it("rounds explicitly to Decimal(10,7) and preserves its full precision", () => {
    expect(positionToCoordinates([-34.12345678, -58.76543214])).toEqual({
      latitude: "-34.1234568",
      longitude: "-58.7654321",
    });
    expect(positionToCoordinates([-0.000000001, 0.0000001])).toEqual({
      latitude: "0.0000000",
      longitude: "0.0000001",
    });
    expect(confirmCoordinates({ latitude: "", longitude: "-58" })).toBeNull();
  });
  it("formats without introducing PATCH changes and only writes the coordinate that actually changed", () => {
    const initial = propertyToFormValues({
      ...detailProperty,
      latitude: -34.1234567,
      longitude: -58.1234567,
    });
    const confirmed = confirmCoordinates({
      latitude: "-34,12345670",
      longitude: "-58.12345670",
    })!;
    expect(coordinatesEqual(confirmed, initial)).toBe(true);
    expect(
      formValuesToUpdatePayload({ ...initial, ...confirmed }, initial),
    ).toEqual({});
    expect(
      formValuesToUpdatePayload(
        { ...initial, ...confirmed, latitude: "-34.1234568" },
        initial,
      ),
    ).toEqual({ latitude: -34.1234568 });
    expect(
      formValuesToUpdatePayload({ ...initial, title: "Nuevo título" }, initial),
    ).toEqual({ title: "Nuevo título" });
    expect(
      formValuesToUpdatePayload(
        { ...initial, ...confirmCoordinates({ latitude: "", longitude: "" }) },
        initial,
      ),
    ).toEqual({ latitude: null, longitude: null });
  });
});
