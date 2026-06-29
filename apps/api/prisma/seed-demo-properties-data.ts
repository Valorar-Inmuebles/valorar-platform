import {
  Currency,
  PropertyCondition,
  PropertyListingType,
  PropertyType,
} from '../generated/prisma/client';

export type DemoImageAssetKey =
  | 'apartment'
  | 'house'
  | 'ph'
  | 'land'
  | 'office'
  | 'development';

export type DemoListingSpec = {
  listingType: PropertyListingType;
  isFeatured?: boolean;
  publishedDaysAgo?: number;
  expenses?: { amount: number; currency: Currency };
  prices: Array<{
    amount: number;
    currency: Currency;
    isPrimary?: boolean;
    label?: string;
  }>;
};

export type DemoPropertySpec = {
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  condition?: PropertyCondition;
  internalCode?: string;
  imageAsset: DemoImageAssetKey;
  location: {
    street?: string;
    streetNumber?: string;
    floor?: string;
    apartment?: string;
    neighborhood: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
  };
  totalArea?: number;
  coveredArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  rooms?: number;
  parkingSpaces?: number;
  yearBuilt?: number;
  listing: DemoListingSpec;
  extraListings?: DemoListingSpec[];
  featureSlugs?: string[];
  updatedDaysAgo?: number;
};

const CABA = 'Ciudad Autónoma de Buenos Aires';
const PROVINCE = 'Buenos Aires';

function salePrice(usd: number): DemoListingSpec['prices'] {
  return [{ amount: usd, currency: Currency.USD, isPrimary: true }];
}

function rentPrice(
  ars: number,
  expenses?: { amount: number; currency: Currency },
): DemoListingSpec {
  return {
    listingType: PropertyListingType.RENT,
    prices: [{ amount: ars, currency: Currency.ARS, isPrimary: true }],
    expenses,
  };
}

function saleListing(
  usd: number,
  options?: Partial<DemoListingSpec>,
): DemoListingSpec {
  return {
    listingType: PropertyListingType.SALE,
    prices: salePrice(usd),
    ...options,
  };
}

export const DEMO_PROPERTIES: DemoPropertySpec[] = [
  // ── Venta — Departamentos (8) ──────────────────────────────────────────────
  {
    slug: 'venta-depto-palermo-01',
    title: 'Departamento 3 ambientes en Palermo Hollywood',
    description:
      'Luminoso departamento con balcón al contrafrente, cocina integrada y amenities de categoría. Ideal para vivienda o inversión en una de las zonas más demandadas de CABA.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'apartment',
    location: {
      street: 'Honduras',
      streetNumber: '4782',
      floor: '8',
      apartment: 'B',
      neighborhood: 'Palermo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5875,
      longitude: -58.4312,
    },
    totalArea: 78,
    coveredArea: 72,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    yearBuilt: 2018,
    listing: saleListing(185000, {
      isFeatured: true,
      publishedDaysAgo: 12,
    }),
    extraListings: [
      rentPrice(850000, { amount: 95000, currency: Currency.ARS }),
    ],
    featureSlugs: ['apto-credito', 'pileta', 'sum', 'ascensor', 'balcon'],
    updatedDaysAgo: 2,
  },
  {
    slug: 'venta-depto-belgrano-01',
    title: 'Departamento 4 ambientes en Belgrano R',
    description:
      'Amplio piso alto con dependencia, doble circulación y vista abierta. Edificio clásico reciclado a nuevo.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Vuelta de Obligado',
      streetNumber: '2100',
      floor: '10',
      apartment: 'A',
      neighborhood: 'Belgrano',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5621,
      longitude: -58.4588,
    },
    totalArea: 112,
    coveredArea: 105,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 1,
    yearBuilt: 1995,
    listing: saleListing(265000, { publishedDaysAgo: 25 }),
    featureSlugs: ['apto-credito', 'living', 'comedor', 'calefaccion'],
    updatedDaysAgo: 5,
  },
  {
    slug: 'venta-depto-recoleta-01',
    title: 'Monoambiente en Recoleta',
    description:
      'Unidad funcional a estrenar, ideal primera vivienda. A pasos de Av. Callao y líneas de subte.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.NEW,
    imageAsset: 'apartment',
    location: {
      street: 'Ayacucho',
      streetNumber: '1200',
      floor: '4',
      apartment: 'C',
      neighborhood: 'Recoleta',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5928,
      longitude: -58.3929,
    },
    totalArea: 38,
    coveredArea: 38,
    rooms: 1,
    bedrooms: 0,
    bathrooms: 1,
    yearBuilt: 2024,
    listing: saleListing(98000, {
      isFeatured: true,
      publishedDaysAgo: 8,
    }),
    featureSlugs: ['apto-profesional', 'aire-acondicionado', 'ascensor'],
    updatedDaysAgo: 1,
  },
  {
    slug: 'venta-depto-caballito-01',
    title: 'Departamento 2 ambientes en Caballito',
    description:
      'Piso bajo con patio propio. Muy buena distribución y excelente conectividad.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Acoyte',
      streetNumber: '650',
      floor: 'PB',
      apartment: '4',
      neighborhood: 'Caballito',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6187,
      longitude: -58.4412,
    },
    totalArea: 55,
    coveredArea: 48,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 1978,
    listing: saleListing(115000, { publishedDaysAgo: 40 }),
    featureSlugs: ['patio', 'apto-credito', 'gas-natural'],
    updatedDaysAgo: 8,
  },
  {
    slug: 'venta-depto-almagro-01',
    title: 'Departamento 3 ambientes en Almagro',
    description:
      'Departamento al frente con balcón corrido. Edificio con portero y baulera.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Corrientes',
      streetNumber: '3800',
      floor: '6',
      apartment: 'A',
      neighborhood: 'Almagro',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6055,
      longitude: -58.4211,
    },
    totalArea: 68,
    coveredArea: 65,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 1985,
    listing: saleListing(142000, { publishedDaysAgo: 55 }),
    featureSlugs: ['balcon', 'portero', 'apto-credito'],
    updatedDaysAgo: 12,
  },
  {
    slug: 'venta-depto-villa-crespo-01',
    title: 'Loft 2 ambientes en Villa Crespo',
    description:
      'Loft con entrepiso, cocina industrial y techos altos. Zona gastronómica y diseño.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'apartment',
    location: {
      street: 'Thames',
      streetNumber: '520',
      floor: '2',
      apartment: '1',
      neighborhood: 'Villa Crespo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5968,
      longitude: -58.4365,
    },
    totalArea: 62,
    coveredArea: 62,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 2015,
    listing: saleListing(158000, { publishedDaysAgo: 18 }),
    featureSlugs: ['apto-profesional', 'aire-acondicionado', 'living'],
    updatedDaysAgo: 4,
  },
  {
    slug: 'venta-depto-nunez-01',
    title: 'Departamento 3 ambientes en Nuñez',
    description:
      'Departamento con vista al río, cochera fija y amenities completos.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.NEW,
    imageAsset: 'apartment',
    location: {
      street: 'Libertador',
      streetNumber: '7800',
      floor: '12',
      apartment: 'D',
      neighborhood: 'Nuñez',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5478,
      longitude: -58.4567,
    },
    totalArea: 85,
    coveredArea: 80,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    parkingSpaces: 1,
    yearBuilt: 2022,
    listing: saleListing(210000, { publishedDaysAgo: 30 }),
    featureSlugs: ['pileta', 'gimnasio', 'seguridad-24h', 'apto-credito'],
    updatedDaysAgo: 6,
  },
  {
    slug: 'venta-depto-colegiales-01',
    title: 'Departamento 2 ambientes en Colegiales',
    description:
      'Unidad reciclada con calidad de terminación. Barrio tranquilo y arbolado.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'apartment',
    location: {
      street: 'Teodoro García',
      streetNumber: '2400',
      floor: '3',
      apartment: 'B',
      neighborhood: 'Colegiales',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5745,
      longitude: -58.4478,
    },
    totalArea: 52,
    coveredArea: 50,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 2010,
    listing: saleListing(128000, { publishedDaysAgo: 45 }),
    featureSlugs: ['apto-credito', 'cocina', 'balcon'],
    updatedDaysAgo: 10,
  },

  // ── Venta — Casas (4) ────────────────────────────────────────────────────
  {
    slug: 'venta-casa-san-isidro-01',
    title: 'Casa 5 ambientes en San Isidro',
    description:
      'Chalet con jardín, quincho y pileta. Barrio residencial premium del partido de San Isidro.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'house',
    location: {
      street: 'Av. del Libertador',
      streetNumber: '16200',
      neighborhood: 'San Isidro',
      city: 'San Isidro',
      province: PROVINCE,
      latitude: -34.4721,
      longitude: -58.5289,
    },
    totalArea: 320,
    coveredArea: 185,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 2,
    yearBuilt: 2005,
    listing: saleListing(420000, {
      isFeatured: true,
      publishedDaysAgo: 5,
    }),
    extraListings: [
      rentPrice(1800000, { amount: 45000, currency: Currency.ARS }),
    ],
    featureSlugs: ['pileta', 'parrilla', 'quincho', 'jardin', 'apto-credito'],
    updatedDaysAgo: 3,
  },
  {
    slug: 'venta-casa-vicente-lopez-01',
    title: 'Casa 4 ambientes en Vicente López',
    description:
      'Casa moderna con living comedor integrado y suite principal con vestidor.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'house',
    location: {
      street: 'Maipú',
      streetNumber: '1850',
      neighborhood: 'Vicente López',
      city: 'Vicente López',
      province: PROVINCE,
      latitude: -34.5245,
      longitude: -58.4789,
    },
    totalArea: 240,
    coveredArea: 165,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    yearBuilt: 2019,
    listing: saleListing(385000, { publishedDaysAgo: 22 }),
    featureSlugs: ['jardin', 'parrilla', 'apto-credito', 'gas-natural'],
    updatedDaysAgo: 7,
  },
  {
    slug: 'venta-casa-olivos-01',
    title: 'Casa 6 ambientes en Olivos',
    description:
      'Propiedad de gran metraje con dependencia de servicio y garage para tres autos.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.GOOD,
    imageAsset: 'house',
    location: {
      street: 'Av. Maipú',
      streetNumber: '3200',
      neighborhood: 'Olivos',
      city: 'Olivos',
      province: PROVINCE,
      latitude: -34.5089,
      longitude: -58.5012,
    },
    totalArea: 380,
    coveredArea: 220,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 3,
    yearBuilt: 1998,
    listing: saleListing(450000, { publishedDaysAgo: 60 }),
    featureSlugs: ['jardin', 'patio', 'apto-credito', 'cloacas'],
    updatedDaysAgo: 15,
  },
  {
    slug: 'venta-casa-tigre-01',
    title: 'Casa 4 ambientes en Tigre',
    description:
      'Casa con acceso al río, deck de madera y vista al canal. Entorno natural.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'house',
    location: {
      street: 'Paseo Victorica',
      streetNumber: '890',
      neighborhood: 'Tigre',
      city: 'Tigre',
      province: PROVINCE,
      latitude: -34.4267,
      longitude: -58.5798,
    },
    totalArea: 290,
    coveredArea: 150,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    yearBuilt: 2012,
    listing: saleListing(310000, { publishedDaysAgo: 35 }),
    featureSlugs: ['parrilla', 'jardin', 'acepta-permuta'],
    updatedDaysAgo: 9,
  },

  // ── Venta — PH (2) ───────────────────────────────────────────────────────
  {
    slug: 'venta-ph-palermo-01',
    title: 'PH 3 ambientes con terraza en Palermo',
    description:
      'PH reciclado con terraza propia y parrilla. Sin expensas de consorcio.',
    propertyType: PropertyType.PH,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'ph',
    location: {
      street: 'Thames',
      streetNumber: '1450',
      neighborhood: 'Palermo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5912,
      longitude: -58.4298,
    },
    totalArea: 95,
    coveredArea: 78,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 2016,
    listing: saleListing(175000, { publishedDaysAgo: 20 }),
    featureSlugs: ['terraza', 'parrilla', 'apto-credito'],
    updatedDaysAgo: 6,
  },
  {
    slug: 'venta-ph-belgrano-01',
    title: 'PH 4 ambientes en Belgrano',
    description:
      'Dos plantas con patio y lavadero cubierto. Ideal familia.',
    propertyType: PropertyType.PH,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'ph',
    location: {
      street: 'Zabala',
      streetNumber: '2100',
      neighborhood: 'Belgrano',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5589,
      longitude: -58.4556,
    },
    totalArea: 120,
    coveredArea: 98,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2008,
    listing: saleListing(198000, { publishedDaysAgo: 48 }),
    featureSlugs: ['patio', 'lavadero', 'apto-credito'],
    updatedDaysAgo: 11,
  },

  // ── Venta — Terrenos (2) ─────────────────────────────────────────────────
  {
    slug: 'venta-terreno-tigre-01',
    title: 'Terreno en venta en Tigre',
    description:
      'Lote en zona residencial con todos los servicios. Ideal construcción vivienda unifamiliar.',
    propertyType: PropertyType.LAND,
    condition: PropertyCondition.GOOD,
    imageAsset: 'land',
    location: {
      street: 'Cazón',
      streetNumber: '450',
      neighborhood: 'Tigre',
      city: 'Tigre',
      province: PROVINCE,
      latitude: -34.4189,
      longitude: -58.5912,
    },
    totalArea: 450,
    listing: saleListing(95000, { publishedDaysAgo: 70 }),
    featureSlugs: ['agua-corriente', 'electricidad', 'cloacas'],
    updatedDaysAgo: 20,
  },
  {
    slug: 'venta-terreno-san-fernando-01',
    title: 'Terreno en San Fernando',
    description:
      'Parcela sobre lote interno, acceso pavimentado. Documentación al día.',
    propertyType: PropertyType.LAND,
    condition: PropertyCondition.GOOD,
    imageAsset: 'land',
    location: {
      street: 'Las Heras',
      streetNumber: '1200',
      neighborhood: 'San Fernando',
      city: 'San Fernando',
      province: PROVINCE,
      latitude: -34.4412,
      longitude: -58.5589,
    },
    totalArea: 380,
    listing: saleListing(78000, { publishedDaysAgo: 85 }),
    featureSlugs: ['agua-corriente', 'gas-natural'],
    updatedDaysAgo: 22,
  },

  // ── Alquiler — Departamentos (6) ─────────────────────────────────────────
  {
    slug: 'alquiler-depto-palermo-01',
    title: 'Alquiler — Departamento 2 ambientes en Palermo',
    description:
      'Departamento amoblado, listo para mudarse. Contrato a 24 meses.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'apartment',
    location: {
      street: 'Guatemala',
      streetNumber: '4200',
      floor: '5',
      apartment: 'A',
      neighborhood: 'Palermo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5889,
      longitude: -58.4256,
    },
    totalArea: 48,
    coveredArea: 45,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    listing: {
      ...rentPrice(720000, { amount: 82000, currency: Currency.ARS }),
      publishedDaysAgo: 10,
    },
    featureSlugs: ['amoblado', 'acepta-mascotas', 'ascensor'],
    updatedDaysAgo: 4,
  },
  {
    slug: 'alquiler-depto-belgrano-01',
    title: 'Alquiler — Departamento 3 ambientes en Belgrano',
    description:
      'Piso alto con balcón y cochera opcional. Excelente estado de conservación.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Cabildo',
      streetNumber: '2500',
      floor: '9',
      apartment: 'C',
      neighborhood: 'Belgrano',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5612,
      longitude: -58.4623,
    },
    totalArea: 72,
    coveredArea: 68,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    listing: {
      ...rentPrice(980000, { amount: 110000, currency: Currency.ARS }),
      publishedDaysAgo: 15,
    },
    featureSlugs: ['balcon', 'apto-profesional', 'calefaccion'],
    updatedDaysAgo: 5,
  },
  {
    slug: 'alquiler-depto-recoleta-01',
    title: 'Alquiler — Departamento 2 ambientes en Recoleta',
    description:
      'Unidad muy luminosa, cocina separada y baño completo. Zona segura.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Juncal',
      streetNumber: '3100',
      floor: '7',
      apartment: 'B',
      neighborhood: 'Recoleta',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5901,
      longitude: -58.4012,
    },
    totalArea: 55,
    coveredArea: 52,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    listing: {
      ...rentPrice(650000, { amount: 75000, currency: Currency.ARS }),
      isFeatured: true,
      publishedDaysAgo: 7,
    },
    featureSlugs: ['aire-acondicionado', 'portero', 'ascensor'],
    updatedDaysAgo: 2,
  },
  {
    slug: 'alquiler-depto-caballito-01',
    title: 'Alquiler — Departamento 3 ambientes en Caballito',
    description:
      'Departamento con patio compartido. Cerca de Parque Rivadavia y subte.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.GOOD,
    imageAsset: 'apartment',
    location: {
      street: 'Rivadavia',
      streetNumber: '5500',
      floor: '2',
      apartment: 'D',
      neighborhood: 'Caballito',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6198,
      longitude: -58.4389,
    },
    totalArea: 65,
    coveredArea: 60,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    listing: {
      ...rentPrice(580000, { amount: 68000, currency: Currency.ARS }),
      publishedDaysAgo: 28,
    },
    featureSlugs: ['patio', 'gas-natural', 'acepta-mascotas'],
    updatedDaysAgo: 8,
  },
  {
    slug: 'alquiler-depto-puerto-madero-01',
    title: 'Alquiler — Departamento 3 ambientes en Puerto Madero',
    description:
      'Torre premium con amenities, seguridad 24h y vista al dique.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.NEW,
    imageAsset: 'apartment',
    location: {
      street: 'Azucena Villaflor',
      streetNumber: '450',
      floor: '18',
      apartment: 'A',
      neighborhood: 'Puerto Madero',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6112,
      longitude: -58.3645,
    },
    totalArea: 92,
    coveredArea: 88,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    parkingSpaces: 1,
    yearBuilt: 2021,
    listing: {
      ...rentPrice(1450000, { amount: 180000, currency: Currency.ARS }),
      publishedDaysAgo: 14,
    },
    featureSlugs: ['pileta', 'gimnasio', 'seguridad-24h', 'sum'],
    updatedDaysAgo: 3,
  },
  {
    slug: 'alquiler-depto-san-telmo-01',
    title: 'Alquiler — Loft en San Telmo',
    description:
      'Loft en edificio patrimonial reciclado. Ideal profesional creativo.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'apartment',
    location: {
      street: 'Defensa',
      streetNumber: '980',
      floor: '3',
      apartment: '1',
      neighborhood: 'San Telmo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6212,
      longitude: -58.3712,
    },
    totalArea: 58,
    coveredArea: 58,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    listing: {
      ...rentPrice(620000, { amount: 55000, currency: Currency.ARS }),
      publishedDaysAgo: 32,
    },
    featureSlugs: ['apto-profesional', 'living', 'aire-acondicionado'],
    updatedDaysAgo: 14,
  },

  // ── Alquiler — Casas (2) ───────────────────────────────────────────────────
  {
    slug: 'alquiler-casa-san-isidro-01',
    title: 'Alquiler — Casa 4 ambientes en San Isidro',
    description:
      'Casa con jardín y garage. Barrio cerrado con seguridad.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'house',
    location: {
      street: 'Av. Beiró',
      streetNumber: '3200',
      neighborhood: 'San Isidro',
      city: 'San Isidro',
      province: PROVINCE,
      latitude: -34.4856,
      longitude: -58.5123,
    },
    totalArea: 220,
    coveredArea: 140,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    listing: {
      ...rentPrice(1200000, { amount: 35000, currency: Currency.ARS }),
      publishedDaysAgo: 19,
    },
    featureSlugs: ['jardin', 'seguridad-24h', 'acepta-mascotas'],
    updatedDaysAgo: 7,
  },
  {
    slug: 'alquiler-casa-martinez-01',
    title: 'Alquiler — Casa 5 ambientes en Martínez',
    description:
      'Chalet sobre lote de 400 m². Ideal familia numerosa.',
    propertyType: PropertyType.HOUSE,
    condition: PropertyCondition.GOOD,
    imageAsset: 'house',
    location: {
      street: 'Av. Santa Fe',
      streetNumber: '2100',
      neighborhood: 'Martínez',
      city: 'Martínez',
      province: PROVINCE,
      latitude: -34.4989,
      longitude: -58.5012,
    },
    totalArea: 350,
    coveredArea: 195,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 2,
    listing: {
      ...rentPrice(1650000, { amount: 42000, currency: Currency.ARS }),
      publishedDaysAgo: 42,
    },
    featureSlugs: ['jardin', 'parrilla', 'quincho'],
    updatedDaysAgo: 16,
  },

  // ── Alquiler — Oficinas (2) ────────────────────────────────────────────────
  {
    slug: 'alquiler-oficina-microcentro-01',
    title: 'Alquiler — Oficina en Microcentro',
    description:
      'Oficina divisible con recepción y dos privados. Edificio corporativo.',
    propertyType: PropertyType.OFFICE,
    condition: PropertyCondition.EXCELLENT,
    imageAsset: 'office',
    location: {
      street: 'Reconquista',
      streetNumber: '650',
      floor: '12',
      apartment: '1204',
      neighborhood: 'Microcentro',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6012,
      longitude: -58.3712,
    },
    totalArea: 85,
    coveredArea: 85,
    listing: {
      listingType: PropertyListingType.RENT,
      prices: [{ amount: 2200, currency: Currency.USD, isPrimary: true }],
      expenses: { amount: 450, currency: Currency.USD },
      isFeatured: true,
      publishedDaysAgo: 6,
    },
    featureSlugs: ['apto-profesional', 'ascensor', 'seguridad-24h', 'internet'],
    updatedDaysAgo: 1,
  },
  {
    slug: 'alquiler-oficina-belgrano-01',
    title: 'Alquiler — Oficina en Belgrano',
    description:
      'Planta libre con excelente iluminación natural. Ideal estudio profesional.',
    propertyType: PropertyType.OFFICE,
    condition: PropertyCondition.VERY_GOOD,
    imageAsset: 'office',
    location: {
      street: 'Monroe',
      streetNumber: '3100',
      floor: '6',
      apartment: '601',
      neighborhood: 'Belgrano',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5589,
      longitude: -58.4612,
    },
    totalArea: 62,
    coveredArea: 62,
    listing: {
      listingType: PropertyListingType.RENT,
      prices: [{ amount: 1400, currency: Currency.USD, isPrimary: true }],
      expenses: { amount: 280, currency: Currency.USD },
      publishedDaysAgo: 38,
    },
    featureSlugs: ['apto-profesional', 'aire-acondicionado', 'internet'],
    updatedDaysAgo: 13,
  },

  // ── Emprendimientos — Proxy Property (4) ───────────────────────────────────
  {
    slug: 'emprendimiento-puerto-madero-01',
    title: 'Emprendimiento Torre Libertador — Puerto Madero',
    description:
      'Desarrollo en pozo con unidades de 1, 2 y 3 ambientes. Entrega estimada 2027. Amenities de categoría y financiación en pesos.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.UNDER_CONSTRUCTION,
    internalCode: 'DEV-001',
    imageAsset: 'development',
    location: {
      street: 'Alicia Moreau de Justo',
      streetNumber: '1200',
      neighborhood: 'Puerto Madero',
      city: CABA,
      province: PROVINCE,
      latitude: -34.6089,
      longitude: -58.3612,
    },
    totalArea: 55,
    coveredArea: 50,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 2027,
    listing: saleListing(125000, {
      isFeatured: true,
      publishedDaysAgo: 3,
    }),
    featureSlugs: ['pileta', 'gimnasio', 'sum', 'seguridad-24h', 'apto-credito'],
    updatedDaysAgo: 1,
  },
  {
    slug: 'emprendimiento-palermo-01',
    title: 'Emprendimiento Palermo Green — Palermo Chico',
    description:
      'Proyecto sustentable con certificación LEED. Unidades desde monoambiente hasta 4 ambientes.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.UNDER_CONSTRUCTION,
    internalCode: 'DEV-002',
    imageAsset: 'development',
    location: {
      street: 'Sánchez de Bustamante',
      streetNumber: '2100',
      neighborhood: 'Palermo',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5812,
      longitude: -58.4189,
    },
    totalArea: 48,
    coveredArea: 45,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 2026,
    listing: saleListing(98000, { publishedDaysAgo: 16 }),
    featureSlugs: ['pileta', 'parrilla', 'ascensor', 'apto-credito'],
    updatedDaysAgo: 5,
  },
  {
    slug: 'emprendimiento-belgrano-01',
    title: 'Emprendimiento Belgrano Park — Belgrano',
    description:
      'Torre de 18 pisos frente a plaza. Cocheras opcionales y bauleras.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.UNDER_CONSTRUCTION,
    internalCode: 'DEV-003',
    imageAsset: 'development',
    location: {
      street: 'Echeverría',
      streetNumber: '1500',
      neighborhood: 'Belgrano',
      city: CABA,
      province: PROVINCE,
      latitude: -34.5545,
      longitude: -58.4512,
    },
    totalArea: 72,
    coveredArea: 68,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 2026,
    listing: saleListing(145000, { publishedDaysAgo: 24 }),
    featureSlugs: ['sum', 'gimnasio', 'seguridad-24h', 'apto-credito'],
    updatedDaysAgo: 8,
  },
  {
    slug: 'emprendimiento-vicente-lopez-01',
    title: 'Emprendimiento Río VIC — Vicente López',
    description:
      'Complejo mixto con unidades residenciales y locales comerciales en planta baja. Financiación directa.',
    propertyType: PropertyType.APARTMENT,
    condition: PropertyCondition.UNDER_CONSTRUCTION,
    internalCode: 'DEV-004',
    imageAsset: 'development',
    location: {
      street: 'Av. del Libertador',
      streetNumber: '1250',
      neighborhood: 'Vicente López',
      city: 'Vicente López',
      province: PROVINCE,
      latitude: -34.5189,
      longitude: -58.4812,
    },
    totalArea: 65,
    coveredArea: 60,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    yearBuilt: 2027,
    listing: saleListing(118000, { publishedDaysAgo: 33 }),
    featureSlugs: ['pileta', 'quincho', 'apto-credito', 'uso-comercial'],
    updatedDaysAgo: 11,
  },
];

const DEMO_IMAGE_FILES = [
  { fileName: 'cover.webp', sortOrder: 0, isCover: true, altSuffix: 'Portada' },
  { fileName: '01.webp', sortOrder: 1, isCover: false, altSuffix: 'Interior' },
  { fileName: '02.webp', sortOrder: 2, isCover: false, altSuffix: 'Ambiente' },
  { fileName: '03.webp', sortOrder: 3, isCover: false, altSuffix: 'Detalle' },
] as const;

export function resolveDemoImagePaths(
  slug: string,
  _asset: DemoImageAssetKey,
): Array<{
  fileName: string;
  storageKey: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
  altText: string;
}> {
  const publicBase = `/seed/properties/${slug}`;
  const storageBase = `tenants/demo/properties/${slug}`;

  return DEMO_IMAGE_FILES.map((file) => ({
    fileName: file.fileName,
    storageKey: `${storageBase}/${file.fileName}`,
    url: `${publicBase}/${file.fileName}`,
    sortOrder: file.sortOrder,
    isCover: file.isCover,
    altText: `${file.altSuffix} — ${slug}`,
  }));
}

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}
