import { buildGeoTextFields, createSearch } from '@repo/geo-text';
import {
  CANONICAL_CABA_PROVINCE_ISO_CODE,
  CANONICAL_CABA_PROVINCE_SLUG,
  DEFAULT_PROVINCE_NAME,
} from '../constants';

/**
 * Canonical CABA barrios stored as Locality rows under Province "Capital Federal".
 * Matches the GEO-001 seed (CABA - {Barrio} rows, province key C) plus later
 * data migrations such as Parque Avellaneda.
 */
export const CABA_LOCALITY_NAMES = [
  'Agronomía',
  'Almagro',
  'Balvanera',
  'Barracas',
  'Belgrano',
  'Boca',
  'Boedo',
  'Caballito',
  'Chacarita',
  'Coghlan',
  'Colegiales',
  'Constitución',
  'Flores',
  'Floresta',
  'La Paternal',
  'Liniers',
  'Mataderos',
  'Monte Castro',
  'Monserrat',
  'Nueva Pompeya',
  'Núñez',
  'Palermo',
  'Parque Avellaneda',
  'Parque Chacabuco',
  'Parque Chas',
  'Parque Patricios',
  'Puerto Madero',
  'Recoleta',
  'Retiro',
  'Saavedra',
  'San Cristóbal',
  'San Nicolás',
  'San Telmo',
  'Vélez Sársfield',
  'Versalles',
  'Villa Crespo',
  'Villa del Parque',
  'Villa Devoto',
  'Villa General Mitre',
  'Villa Lugano',
  'Villa Luro',
  'Villa Ortúzar',
  'Villa Pueyrredón',
  'Villa Real',
  'Villa Riachuelo',
  'Villa Santa Rita',
  'Villa Soldati',
  'Villa Urquiza',
] as const;

export type CatalogLocality = {
  name: string;
  slug: string;
  search: string;
};

export type CatalogProvince = {
  name: string;
  slug: string;
  search: string;
  isoCode: string | null;
  aliases: ReadonlySet<string>;
  localities: CatalogLocality[];
};

export type OfflineGeoCatalog = {
  provinces: CatalogProvince[];
};

export const CABA_PROVINCE_SEARCH_ALIASES = new Set([
  createSearch('Capital Federal'),
  createSearch('Ciudad Autónoma de Buenos Aires'),
  createSearch('CABA'),
  createSearch('Ciudad de Buenos Aires'),
  createSearch('Cap. Fed.'),
]);

export function buildCabaGeoCatalog(): OfflineGeoCatalog {
  return {
    provinces: [
      {
        name: DEFAULT_PROVINCE_NAME,
        slug: CANONICAL_CABA_PROVINCE_SLUG,
        search: createSearch(DEFAULT_PROVINCE_NAME),
        isoCode: CANONICAL_CABA_PROVINCE_ISO_CODE,
        aliases: CABA_PROVINCE_SEARCH_ALIASES,
        localities: CABA_LOCALITY_NAMES.map((name) => {
          const fields = buildGeoTextFields(name);
          return {
            name,
            slug: fields.slug,
            search: fields.search,
          };
        }),
      },
    ],
  };
}

export const DEFAULT_GEO_CATALOG = buildCabaGeoCatalog();
