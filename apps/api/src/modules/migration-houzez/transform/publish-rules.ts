import type { InferenceRecord } from '../types';
import type { WordpressPropertyRaw } from '../types';

export type PublishTransformResult = {
  property: {
    title: string;
    slug: string;
    description: string | null;
    propertyType:
      | 'LAND'
      | 'APARTMENT'
      | 'HOUSE'
      | 'OFFICE'
      | 'COMMERCIAL'
      | 'WAREHOUSE'
      | 'INDUSTRIAL'
      | 'GARAGE'
      | 'PH'
      | 'FIELD'
      | 'COUNTRY_HOUSE'
      | 'OTHER';
    isActive: true;
    city: string;
    province: string | null;
    country: string;
    neighborhood: string | null;
    street: string | null;
    streetNumber: string | null;
    latitude: number | null;
    longitude: number | null;
    geocodeSource: 'IMPORT' | null;
    totalArea: number | null;
    coveredArea: number | null;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    halfBathrooms: number | null;
    parkingSpaces: number | null;
    internalCode: string | null;
  };
  listing: {
    listingType: 'SALE' | 'RENT' | 'TEMPORARY_RENT';
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'RESERVED' | 'CLOSED';
  };
  price: {
    amount: number;
    currency: 'USD' | 'ARS';
    isPrimary: true;
  } | null;
  featureNames: string[];
  inferences: InferenceRecord[];
  warnings: Array<{ code: string; message: string }>;
  blockers: Array<{ code: string; message: string }>;
};

const TYPE_MAP: Record<
  string,
  PublishTransformResult['property']['propertyType']
> = {
  Departamento: 'APARTMENT',
  'Departamento tipo Casa': 'PH',
  PH: 'PH',
  Casa: 'HOUSE',
  Lote: 'LAND',
  Oficina: 'OFFICE',
  Local: 'COMMERCIAL',
  'Negocio y Fondo de Comercio': 'COMMERCIAL',
  Cochera: 'GARAGE',
  Galpon: 'WAREHOUSE',
  Deposito: 'WAREHOUSE',
  'Edif. Indust.': 'INDUSTRIAL',
};

const MIAMI_LAT = 25.68654;
const MIAMI_LNG = -80.431345;

/** Approved publish-wave transformation rules only. */
export function transformPublishProperty(
  raw: WordpressPropertyRaw,
): PublishTransformResult {
  const inferences: InferenceRecord[] = [];
  const warnings: Array<{ code: string; message: string }> = [];
  const blockers: Array<{ code: string; message: string }> = [];

  if (raw.status !== 'publish') {
    blockers.push({
      code: 'STATUS_NOT_PUBLISH',
      message: `Approved publish-wave rules refuse status="${raw.status}".`,
    });
  }

  const types = raw.taxonomies.property_type ?? [];
  const typeName = types[0];
  const propertyType = typeName ? TYPE_MAP[typeName] : undefined;
  if (!propertyType) {
    blockers.push({
      code: 'PROPERTY_TYPE_UNMAPPED',
      message: `No PropertyType mapping for ${JSON.stringify(types)}`,
    });
  } else {
    inferences.push({
      field: 'propertyType',
      value: propertyType,
      rule: 'tax.property_type map',
      source: `property_type:${typeName}`,
    });
  }

  const commercial = raw.taxonomies.property_status ?? [];
  const listing = mapListing(commercial, inferences, warnings, blockers);

  const currency = resolvePublishCurrency(raw, inferences, warnings, blockers);
  const amount = parsePositiveNumber(raw.meta.fave_property_price);
  let price: PublishTransformResult['price'] = null;
  if (amount != null && currency) {
    price = { amount, currency, isPrimary: true };
    inferences.push({
      field: 'price.amount',
      value: amount,
      rule: 'fave_property_price numeric',
      source: 'meta.fave_property_price',
    });
  } else if (listing.status === 'ACTIVE') {
    blockers.push({
      code: 'PRICE_REQUIRED_FOR_ACTIVE',
      message: 'ACTIVE listing requires a resolvable price.',
    });
  }

  const areas = transformAreas(raw, propertyType ?? 'OTHER', inferences);
  const roomsBlock = transformRoomsBaths(raw, inferences, warnings);
  const coords = transformCoords(raw, inferences, warnings);
  const address = transformAddress(raw, inferences);

  const slug = normalizeSlug(raw.slug) ?? slugify(raw.title);
  if (!raw.slug) {
    warnings.push({
      code: 'SLUG_GENERATED',
      message: 'post_name empty; slug generated from title.',
    });
  }
  inferences.push({
    field: 'slug',
    value: slug,
    rule: raw.slug ? 'post_name normalized' : 'slugify(title)',
    source: raw.slug ? 'posts.post_name' : 'posts.post_title',
  });

  const cities = raw.taxonomies.property_city ?? [];
  const areasTax = raw.taxonomies.property_area ?? [];
  const cityText =
    cities[0] === 'Capital Federal' || cities[0] === 'CABA'
      ? 'CABA'
      : cities[0] || address.cityFallback || 'CABA';

  return {
    property: {
      title: raw.title,
      slug,
      description: raw.content,
      propertyType: propertyType ?? 'OTHER',
      isActive: true,
      city: cityText,
      province:
        cities[0] === 'Capital Federal' || cityText === 'CABA'
          ? 'Ciudad Autónoma de Buenos Aires'
          : raw.meta.fave_property_state || null,
      country: 'AR',
      neighborhood: areasTax[0] ?? null,
      street: address.street,
      streetNumber: address.streetNumber,
      latitude: coords.latitude,
      longitude: coords.longitude,
      geocodeSource: coords.latitude != null ? 'IMPORT' : null,
      totalArea: areas.totalArea,
      coveredArea: areas.coveredArea,
      rooms: roomsBlock.rooms,
      bedrooms: roomsBlock.bedrooms,
      bathrooms: roomsBlock.bathrooms,
      halfBathrooms: roomsBlock.halfBathrooms,
      parkingSpaces: transformParking(raw, inferences),
      internalCode: raw.meta.fave_property_id
        ? `VL-${raw.meta.fave_property_id}`
        : `VL-${raw.id}`,
    },
    listing,
    price,
    featureNames: raw.taxonomies.property_feature ?? [],
    inferences,
    warnings,
    blockers,
  };
}

function mapListing(
  commercial: string[],
  inferences: InferenceRecord[],
  warnings: Array<{ code: string; message: string }>,
  blockers: Array<{ code: string; message: string }>,
): PublishTransformResult['listing'] {
  if (commercial.length > 1) {
    warnings.push({
      code: 'MULTI_COMMERCIAL_STATUS',
      message: `Multiple property_status terms: ${commercial.join(', ')}`,
    });
  }
  const set = new Set(commercial);
  if (set.has('En Venta') || set.has('Vendido') || set.has('Reservado')) {
    const status = set.has('Vendido')
      ? 'CLOSED'
      : set.has('Reservado')
        ? 'RESERVED'
        : 'ACTIVE';
    inferences.push({
      field: 'listing',
      value: { listingType: 'SALE', status },
      rule: 'publish-wave commercial map',
      source: `property_status:${commercial.join('|')}`,
    });
    return { listingType: 'SALE', status };
  }
  if (set.has('En Alquiler') || set.has('Alquilado')) {
    blockers.push({
      code: 'RENT_OUT_OF_SCOPE',
      message:
        'Rent mappings are not approved for the publish-wave importer yet.',
    });
    return { listingType: 'RENT', status: 'DRAFT' };
  }
  blockers.push({
    code: 'COMMERCIAL_STATUS_MISSING',
    message: 'No mappable property_status taxonomy.',
  });
  return { listingType: 'SALE', status: 'DRAFT' };
}

function resolvePublishCurrency(
  raw: WordpressPropertyRaw,
  inferences: InferenceRecord[],
  _warnings: Array<{ code: string; message: string }>,
  blockers: Array<{ code: string; message: string }>,
): 'USD' | 'ARS' | null {
  const candidates = [
    raw.meta.fave_property_price_prefix,
    raw.meta.fave_property_price_postfix,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim());

  for (const c of candidates) {
    if (/^(u\$\s*s|usd)$/i.test(c)) {
      inferences.push({
        field: 'price.currency',
        value: 'USD',
        rule: 'publish-wave prefix/postfix USD marker',
        source: c,
      });
      return 'USD';
    }
  }

  // Approved only inside publish wave when sale magnitudes + markers dominate.
  if (raw.status === 'publish') {
    inferences.push({
      field: 'price.currency',
      value: 'USD',
      rule: 'publish-wave default USD when marker absent but sale publish lot',
      source: 'status=publish + approved wave rule',
    });
    return 'USD';
  }

  blockers.push({
    code: 'CURRENCY_UNRESOLVED',
    message: 'Currency cannot be resolved under approved rules.',
  });
  return null;
}

function transformAreas(
  raw: WordpressPropertyRaw,
  propertyType: string,
  inferences: InferenceRecord[],
): { totalArea: number | null; coveredArea: number | null } {
  const size = parsePositiveNumber(raw.meta.fave_property_size);
  const land = parsePositiveNumber(raw.meta.fave_property_land);

  if (size != null && land != null) {
    inferences.push({
      field: 'areas',
      value: { coveredArea: size, totalArea: land },
      rule: 'both size+land → coveredArea=size, totalArea=land',
      source: 'meta.fave_property_size + fave_property_land',
    });
    return { coveredArea: size, totalArea: land };
  }
  if (land != null && size == null) {
    inferences.push({
      field: 'totalArea',
      value: land,
      rule: 'land only → totalArea',
      source: 'meta.fave_property_land',
    });
    return { totalArea: land, coveredArea: null };
  }
  if (size != null) {
    inferences.push({
      field: 'totalArea',
      value: size,
      rule: 'size only → totalArea; coveredArea null',
      source: 'meta.fave_property_size',
    });
    return { totalArea: size, coveredArea: null };
  }
  if (propertyType === 'LAND') {
    inferences.push({
      field: 'areas',
      value: null,
      rule: 'LAND without land/size meta',
      source: 'none',
    });
  }
  return { totalArea: null, coveredArea: null };
}

function transformRoomsBaths(
  raw: WordpressPropertyRaw,
  inferences: InferenceRecord[],
  warnings: Array<{ code: string; message: string }>,
) {
  const bedrooms = parseNonNegativeInt(raw.meta.fave_property_bedrooms);
  const roomsFromTitle = parseRoomsFromTitle(raw.title);
  const bathRaw = raw.meta.fave_property_bathrooms;
  let bathrooms: number | null = null;
  let halfBathrooms: number | null = null;

  if (bathRaw && /y\s*1\/2/i.test(bathRaw)) {
    const whole = parseNonNegativeInt(bathRaw);
    bathrooms = whole ?? 2;
    halfBathrooms = 1;
    inferences.push({
      field: 'bathrooms/halfBathrooms',
      value: { bathrooms, halfBathrooms },
      rule: 'fractional bathroom string',
      source: bathRaw,
    });
  } else {
    const b = parseNonNegativeInt(bathRaw);
    if (b === 0) {
      bathrooms = null;
      inferences.push({
        field: 'bathrooms',
        value: null,
        rule: 'bathrooms=0 treated as null for non-habitable',
        source: bathRaw ?? 'null',
      });
    } else {
      bathrooms = b;
    }
  }

  if (roomsFromTitle != null) {
    inferences.push({
      field: 'rooms',
      value: roomsFromTitle,
      rule: 'parse title ambientes/monoambiente — never from bedrooms',
      source: 'posts.post_title',
    });
  } else {
    inferences.push({
      field: 'rooms',
      value: null,
      rule: 'no title ambientes; leave null',
      source: 'posts.post_title',
    });
  }

  if (bedrooms != null) {
    inferences.push({
      field: 'bedrooms',
      value: bedrooms,
      rule: 'fave_property_bedrooms → bedrooms',
      source: 'meta.fave_property_bedrooms',
    });
  }

  if (
    roomsFromTitle != null &&
    bedrooms != null &&
    roomsFromTitle !== bedrooms
  ) {
    warnings.push({
      code: 'ROOMS_BEDROOMS_MISMATCH',
      message: `title ambientes=${roomsFromTitle} vs bedrooms meta=${bedrooms}`,
    });
  }

  return {
    rooms: roomsFromTitle,
    bedrooms,
    bathrooms,
    halfBathrooms,
  };
}

function transformParking(
  raw: WordpressPropertyRaw,
  inferences: InferenceRecord[],
): number | null {
  const g = raw.meta.fave_property_garage;
  if (!g || /^(no|n\/a|-)$/i.test(g.trim())) {
    inferences.push({
      field: 'parkingSpaces',
      value: null,
      rule: 'garage NO/empty → null',
      source: g ?? 'null',
    });
    return null;
  }
  const n = parseNonNegativeInt(g);
  inferences.push({
    field: 'parkingSpaces',
    value: n,
    rule: 'fave_property_garage numeric',
    source: g,
  });
  return n;
}

function transformCoords(
  raw: WordpressPropertyRaw,
  inferences: InferenceRecord[],
  warnings: Array<{ code: string; message: string }>,
): { latitude: number | null; longitude: number | null } {
  let lat = parseCoord(raw.meta.houzez_geolocation_lat);
  let lng = parseCoord(raw.meta.houzez_geolocation_long);
  if (lat == null || lng == null) {
    const parts = String(raw.meta.fave_property_location || '').split(',');
    if (parts.length >= 2) {
      lat = parseCoord(parts[0]);
      lng = parseCoord(parts[1]);
    }
  }
  if (lat == null || lng == null) {
    return { latitude: null, longitude: null };
  }
  if (isMiamiDefault(lat, lng)) {
    warnings.push({
      code: 'COORDS_MIAMI_DEFAULT',
      message: 'Houzez Miami default coordinates treated as absent.',
    });
    inferences.push({
      field: 'latitude/longitude',
      value: null,
      rule: 'Miami default invalid',
      source: `${lat},${lng}`,
    });
    return { latitude: null, longitude: null };
  }
  inferences.push({
    field: 'latitude/longitude',
    value: { lat, lng },
    rule: 'import coords (no geocode)',
    source: 'houzez_geolocation_* or fave_property_location',
  });
  return { latitude: lat, longitude: lng };
}

function transformAddress(
  raw: WordpressPropertyRaw,
  inferences: InferenceRecord[],
): {
  street: string | null;
  streetNumber: string | null;
  cityFallback: string | null;
} {
  const address = raw.meta.fave_property_address?.trim() || null;
  const mapAddress = raw.meta.fave_property_map_address?.trim() || null;
  const source = address || mapAddress;
  if (!source) {
    return { street: null, streetNumber: null, cityFallback: null };
  }
  const m = source.match(/^(.*?)[,\s]+(\d+)\s*(?:,|$)/);
  if (m) {
    inferences.push({
      field: 'street/streetNumber',
      value: { street: m[1].trim(), streetNumber: m[2] },
      rule: 'parse address text',
      source,
    });
    return {
      street: m[1].trim(),
      streetNumber: m[2],
      cityFallback: null,
    };
  }
  inferences.push({
    field: 'street',
    value: source,
    rule: 'raw address as street',
    source,
  });
  return { street: source, streetNumber: null, cityFallback: null };
}

export function parseRoomsFromTitle(title: string): number | null {
  if (/monoambiente/i.test(title)) return 1;
  const m = title.match(/(\d+)\s*amb(?:iente)?s?/i);
  if (m) return Number(m[1]);
  return null;
}

function isMiamiDefault(lat: number, lng: number): boolean {
  return Math.abs(lat - MIAMI_LAT) < 0.001 && Math.abs(lng - MIAMI_LNG) < 0.001;
}

function parsePositiveNumber(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeInt(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === '') return null;
  const m = String(v)
    .trim()
    .match(/^(\d+)/);
  if (!m) return null;
  return Number(m[1]);
}

function parseCoord(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeSlug(slug: string): string | null {
  if (!slug) return null;
  try {
    const decoded = decodeURIComponent(slug).toLowerCase();
    const cleaned = decoded
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'propiedad'
  );
}
