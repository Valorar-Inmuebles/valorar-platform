export type CoordinateValues = { latitude: string; longitude: string };
export type MapPosition = [number, number];

function coordinate(value: string, max: number): number | null {
  const text = value.trim().replace(",", ".");
  // Exponents may come from Number.toString() for persisted values near zero.
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
}

export function readMapPosition(values: CoordinateValues): MapPosition | null {
  const latitude = coordinate(values.latitude, 90);
  const longitude = coordinate(values.longitude, 180);
  return latitude === null || longitude === null ? null : [latitude, longitude];
}

export function positionToCoordinates([
  latitude,
  longitude,
]: MapPosition): CoordinateValues {
  // Match Decimal(10,7) explicitly; no implicit truncation in persistence.
  const format = (value: number) => (Number(value.toFixed(7)) || 0).toFixed(7);
  return { latitude: format(latitude), longitude: format(longitude) };
}

export function confirmCoordinates(
  values: CoordinateValues,
): CoordinateValues | null {
  if (!values.latitude.trim() && !values.longitude.trim())
    return { latitude: "", longitude: "" };
  const position = readMapPosition(values);
  return position ? positionToCoordinates(position) : null;
}

export function coordinatesEqual(
  a: CoordinateValues,
  b: CoordinateValues,
): boolean {
  if (a.latitude === b.latitude && a.longitude === b.longitude) return true;
  const first = confirmCoordinates(a);
  const second = confirmCoordinates(b);
  return (
    first !== null &&
    second !== null &&
    first.latitude === second.latitude &&
    first.longitude === second.longitude
  );
}
