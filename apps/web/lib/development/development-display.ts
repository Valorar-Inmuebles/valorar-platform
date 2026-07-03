import type { PublicDevelopmentDetail } from "@repo/shared-types";

export function formatDevelopmentParkingLabel(
  development: Pick<
    PublicDevelopmentDetail,
    "hasParkingSpaces" | "parkingSpacesCount"
  >,
): string | null {
  if (
    !development.hasParkingSpaces ||
    development.parkingSpacesCount == null
  ) {
    return null;
  }

  const count = development.parkingSpacesCount;
  return `${count} cochera${count === 1 ? "" : "s"}`;
}
