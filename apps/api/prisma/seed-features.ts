import { PropertyFeatureCategory } from '../generated/prisma/client';
import type { PrismaClient } from '../generated/prisma/client';

export type SeedPropertyFeatureSpec = {
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  sortOrder: number;
};

export const SEED_PROPERTY_FEATURES: SeedPropertyFeatureSpec[] = [
  // GENERAL
  {
    name: 'Apto crédito',
    slug: 'apto-credito',
    category: PropertyFeatureCategory.GENERAL,
    sortOrder: 1,
  },
  {
    name: 'Apto profesional',
    slug: 'apto-profesional',
    category: PropertyFeatureCategory.GENERAL,
    sortOrder: 2,
  },
  {
    name: 'Uso comercial',
    slug: 'uso-comercial',
    category: PropertyFeatureCategory.GENERAL,
    sortOrder: 3,
  },
  {
    name: 'Acepta permuta',
    slug: 'acepta-permuta',
    category: PropertyFeatureCategory.GENERAL,
    sortOrder: 4,
  },
  // SERVICE
  {
    name: 'Agua corriente',
    slug: 'agua-corriente',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 1,
  },
  {
    name: 'Gas natural',
    slug: 'gas-natural',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 2,
  },
  {
    name: 'Gas envasado',
    slug: 'gas-envasado',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 3,
  },
  {
    name: 'Cloacas',
    slug: 'cloacas',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 4,
  },
  {
    name: 'Internet',
    slug: 'internet',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 5,
  },
  {
    name: 'Electricidad',
    slug: 'electricidad',
    category: PropertyFeatureCategory.SERVICE,
    sortOrder: 6,
  },
  // ROOM — typology-eligible (see typology-feature-slugs.ts)
  {
    name: 'Baños',
    slug: 'banos',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 10,
  },
  {
    name: 'Baño en Suite',
    slug: 'bano-en-suite',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 11,
  },
  {
    name: 'Toilette',
    slug: 'toilette',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 12,
  },
  {
    name: 'Living',
    slug: 'living',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 1,
  },
  {
    name: 'Comedor',
    slug: 'comedor',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 2,
  },
  {
    name: 'Cocina',
    slug: 'cocina',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 3,
  },
  {
    name: 'Escritorio',
    slug: 'escritorio',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 13,
  },
  {
    name: 'Dependencia',
    slug: 'dependencia',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 14,
  },
  {
    name: 'Lavadero',
    slug: 'lavadero',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 4,
  },
  {
    name: 'Jardín',
    slug: 'jardin',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 5,
  },
  {
    name: 'Patio',
    slug: 'patio',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 6,
  },
  {
    name: 'Balcón',
    slug: 'balcon',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 7,
  },
  {
    name: 'Terraza',
    slug: 'terraza',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 8,
  },
  {
    name: 'Baulera',
    slug: 'baulera',
    category: PropertyFeatureCategory.ROOM,
    sortOrder: 15,
  },
  // AMENITY
  {
    name: 'Pileta',
    slug: 'pileta',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 1,
  },
  {
    name: 'Parrilla',
    slug: 'parrilla',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 2,
  },
  {
    name: 'Quincho',
    slug: 'quincho',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 3,
  },
  {
    name: 'Seguridad 24h',
    slug: 'seguridad-24h',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 4,
  },
  {
    name: 'Portero',
    slug: 'portero',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 5,
  },
  {
    name: 'Aire acondicionado',
    slug: 'aire-acondicionado',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 6,
  },
  {
    name: 'Calefacción',
    slug: 'calefaccion',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 7,
  },
  {
    name: 'Ascensor',
    slug: 'ascensor',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 8,
  },
  {
    name: 'Gimnasio',
    slug: 'gimnasio',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 9,
  },
  {
    name: 'SUM',
    slug: 'sum',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 10,
  },
  {
    name: 'Amoblado',
    slug: 'amoblado',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 11,
  },
  {
    name: 'Acepta mascotas',
    slug: 'acepta-mascotas',
    category: PropertyFeatureCategory.AMENITY,
    sortOrder: 12,
  },
];

export async function seedPropertyFeatures(
  prisma: PrismaClient,
): Promise<number> {
  let count = 0;

  for (const feature of SEED_PROPERTY_FEATURES) {
    await prisma.propertyFeature.upsert({
      where: { slug: feature.slug },
      update: {
        name: feature.name,
        category: feature.category,
        sortOrder: feature.sortOrder,
        isActive: true,
      },
      create: {
        name: feature.name,
        slug: feature.slug,
        category: feature.category,
        sortOrder: feature.sortOrder,
        isActive: true,
      },
    });
    count += 1;
  }

  return count;
}
