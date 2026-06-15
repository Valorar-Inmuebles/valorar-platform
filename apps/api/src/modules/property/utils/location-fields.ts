import type {
  GeocodeAccuracy,
  GeocodeSource,
} from '../../../../generated/prisma/client';

type LocationInput = {
  province?: string;
  state?: string;
  googlePlaceId?: string;
  formattedAddress?: string;
  geocodeSource?: GeocodeSource;
  geocodeAccuracy?: GeocodeAccuracy;
};

export function resolveProvince(input: LocationInput): string | undefined {
  return input.province ?? input.state;
}

export function mapLocationEnrichmentFields(input: LocationInput) {
  return {
    ...(input.googlePlaceId !== undefined
      ? { googlePlaceId: input.googlePlaceId }
      : {}),
    ...(input.formattedAddress !== undefined
      ? { formattedAddress: input.formattedAddress }
      : {}),
    ...(input.geocodeSource !== undefined
      ? { geocodeSource: input.geocodeSource }
      : {}),
    ...(input.geocodeAccuracy !== undefined
      ? { geocodeAccuracy: input.geocodeAccuracy }
      : {}),
  };
}
