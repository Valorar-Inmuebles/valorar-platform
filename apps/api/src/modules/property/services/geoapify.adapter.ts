import {
  Injectable,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import type {
  LocationCandidate,
  LocationSearchResult,
} from '../dto/property-location-search.dto';

const MAX_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function candidate(
  value: unknown,
  streetNumber?: string,
): LocationCandidate | null {
  const result = record(value);
  if (
    !result ||
    typeof result.formatted !== 'string' ||
    !result.formatted.trim() ||
    result.formatted.length > 300 ||
    typeof result.lat !== 'number' ||
    !Number.isFinite(result.lat) ||
    Math.abs(result.lat) > 90 ||
    typeof result.lon !== 'number' ||
    !Number.isFinite(result.lon) ||
    Math.abs(result.lon) > 180 ||
    String(result.country_code).toLowerCase() !== 'ar'
  )
    return null;
  const type = result.result_type;
  const matchType = record(result.rank)?.match_type;
  const granularity: LocationCandidate['granularity'] =
    (type === 'building' || type === 'amenity') &&
    result.housenumber === streetNumber &&
    Boolean(streetNumber) &&
    matchType === 'full_match'
      ? 'ADDRESS'
      : type === 'street' || type === 'building'
        ? 'STREET'
        : type === 'suburb' || type === 'district'
          ? 'NEIGHBORHOOD'
          : 'LOCALITY';
  const warnings =
    granularity === 'ADDRESS'
      ? []
      : [
          granularity === 'STREET'
            ? 'Ubicación aproximada de la calle; verificá la altura.'
            : 'Ubicación aproximada del barrio o localidad; ajustá el marcador.',
        ];
  const boundsRecord = record(result.bbox);
  const bounds =
    boundsRecord &&
    ['lat1', 'lon1', 'lat2', 'lon2'].every(
      (key) =>
        typeof boundsRecord[key] === 'number' &&
        Number.isFinite(boundsRecord[key]),
    )
      ? {
          south: Math.min(
            boundsRecord.lat1 as number,
            boundsRecord.lat2 as number,
          ),
          north: Math.max(
            boundsRecord.lat1 as number,
            boundsRecord.lat2 as number,
          ),
          west: Math.min(
            boundsRecord.lon1 as number,
            boundsRecord.lon2 as number,
          ),
          east: Math.max(
            boundsRecord.lon1 as number,
            boundsRecord.lon2 as number,
          ),
        }
      : undefined;
  const safeBounds =
    bounds &&
    Math.abs(bounds.south) <= 90 &&
    Math.abs(bounds.north) <= 90 &&
    Math.abs(bounds.west) <= 180 &&
    Math.abs(bounds.east) <= 180
      ? bounds
      : undefined;
  return {
    label: result.formatted,
    latitude: result.lat,
    longitude: result.lon,
    granularity,
    warnings,
    ...(safeBounds ? { bounds: safeBounds } : {}),
  };
}

@Injectable()
export class GeoapifyAdapter {
  async search(
    address: string,
    streetNumber?: string,
  ): Promise<LocationSearchResult> {
    const key = process.env.GEOAPIFY_API_KEY;
    if (!key)
      throw new ServiceUnavailableException({
        code: 'GEOCODING_UNAVAILABLE',
        message: 'La búsqueda de ubicación no está disponible.',
      });
    const configured = Number(process.env.GEOAPIFY_TIMEOUT_MS);
    const timeout =
      Number.isFinite(configured) && configured >= 1000 && configured <= 10000
        ? configured
        : DEFAULT_TIMEOUT_MS;
    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.search = new URLSearchParams({
      text: address,
      filter: 'countrycode:ar',
      lang: 'es',
      limit: '5',
      format: 'json',
      apiKey: key,
    }).toString();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        redirect: 'error',
      });
      if (response.status === 429)
        throw new HttpException(
          {
            code: 'GEOCODING_QUOTA',
            message:
              'El servicio de ubicación alcanzó su límite. Intentá más tarde.',
          },
          429,
        );
      if (!response.ok)
        throw new ServiceUnavailableException({
          code: 'GEOCODING_UNAVAILABLE',
          message: 'No se pudo buscar la ubicación. Intentá más tarde.',
        });
      const size = Number(response.headers.get('content-length'));
      if (Number.isFinite(size) && size > MAX_BYTES)
        throw new Error('oversized');
      if (!response.body) throw new Error('empty');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_BYTES) throw new Error('oversized');
          chunks.push(value);
        }
      } finally {
        if (length > MAX_BYTES) await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
      const results = record(payload)?.results;
      if (!Array.isArray(results)) throw new Error('invalid');
      const candidates = results
        .slice(0, 5)
        .map((item: unknown) => candidate(item, streetNumber))
        .filter((item): item is LocationCandidate => item !== null);
      return {
        status: candidates.length ? 'RESULTS' : 'NO_RESULTS',
        candidates,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Never propagate provider error strings: they may include the full URL/key.
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      )
        throw new ServiceUnavailableException({
          code: 'GEOCODING_TIMEOUT',
          message: 'La búsqueda demoró demasiado. Intentá de nuevo.',
        });
      throw new ServiceUnavailableException({
        code: 'GEOCODING_UNAVAILABLE',
        message: 'No se pudo buscar la ubicación. Intentá más tarde.',
      });
    }
  }
}
