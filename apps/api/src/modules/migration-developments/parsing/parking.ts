import type { SourceIssue } from '../types';

const PARKING_PATTERN = /\bcocheras?\b/i;
const COUNT_PATTERN = /(\d+)\s+cocheras?\b/i;

export type ParkingDetection = {
  hasParkingSpaces: boolean;
  parkingSpacesCount: number | null;
  issues: SourceIssue[];
};

export function detectParking(text: string): ParkingDetection {
  if (!PARKING_PATTERN.test(text)) {
    return {
      hasParkingSpaces: false,
      parkingSpacesCount: null,
      issues: [],
    };
  }

  const countMatch = text.match(COUNT_PATTERN);
  const parkingSpacesCount = countMatch
    ? Number.parseInt(countMatch[1], 10)
    : null;
  const issues: SourceIssue[] = [];

  if (parkingSpacesCount == null) {
    issues.push({
      code: 'GENERIC_PARKING_WITHOUT_COUNT',
      severity: 'warning',
      blocking: false,
      message:
        'Parking is mentioned without an explicit count; parkingSpacesCount stays null.',
    });
  }

  return {
    hasParkingSpaces: true,
    parkingSpacesCount,
    issues,
  };
}
