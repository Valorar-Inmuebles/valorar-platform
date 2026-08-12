import { NotFoundException } from '@nestjs/common';

jest.mock('../../../../generated/prisma/client', () => ({
  PropertyListingType: {
    SALE: 'SALE',
    RENT: 'RENT',
    TEMPORARY_RENT: 'TEMPORARY_RENT',
  },
  PropertyListingStatus: {
    ACTIVE: 'ACTIVE',
    RESERVED: 'RESERVED',
  },
  PrismaClient: class PrismaClient {},
}));

jest.mock('../repositories/public-property.repository', () => ({
  PublicPropertyRepository: class PublicPropertyRepository {},
}));

jest.mock('../../property/utils/property-location', () => ({
  resolvePropertyLocation: (property: {
    city: string;
    neighborhood: string | null;
    province: string | null;
    country: string;
  }) => ({
    city: property.city,
    neighborhood: property.neighborhood,
    province: property.province,
    country: property.country,
    provinceId: null,
    provinceName: property.province,
    localityId: null,
    localityName: property.city,
    neighborhoodId: null,
    neighborhoodName: property.neighborhood,
    countryId: null,
    countryName: property.country,
  }),
}));

import { PublicPropertyService } from './public-property.service';
import type { PublicPropertyRepository } from '../repositories/public-property.repository';

describe('PublicPropertyService priceless RESERVED', () => {
  const repository = {
    findBySlugPublic: jest.fn(),
    findManyPublic: jest.fn(),
    findFeaturedPublic: jest.fn(),
  };

  const service = new PublicPropertyService(
    repository as unknown as PublicPropertyRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serializes RESERVED property without primary price as nulls', async () => {
    repository.findBySlugPublic.mockResolvedValue({
      id: 'prop-1',
      slug: 'depto-pizzurno-300',
      title: 'Depto 2 ambientes. Pizzurno 300.',
      description: null,
      propertyType: 'APARTMENT',
      isActive: true,
      city: 'Ramos Mejía',
      neighborhood: 'Ramos Mejía',
      province: 'Buenos Aires',
      country: 'AR',
      latitude: null,
      longitude: null,
      condition: null,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      halfBathrooms: null,
      parkingSpaces: null,
      totalArea: 45,
      coveredArea: null,
      uncoveredArea: null,
      lotFront: null,
      lotDepth: null,
      yearBuilt: null,
      orientation: null,
      layout: null,
      brightness: null,
      images: [
        {
          id: 'img-1',
          url: 'https://cdn.example/cover.webp',
          storageKey: 'k',
          altText: null,
          sortOrder: 0,
          isCover: true,
        },
      ],
      listings: [
        {
          id: 'listing-1',
          listingType: 'SALE',
          status: 'RESERVED',
          isFeatured: false,
          publishedAt: new Date('2026-08-12T00:00:00.000Z'),
          expensesAmount: null,
          expensesCurrency: null,
          prices: [],
        },
      ],
      featureAssignments: [],
    });

    const detail = await service.findBySlug('depto-pizzurno-300', 'tenant-1');

    expect(detail.price).toBeNull();
    expect(detail.listing.primaryPrice).toBeNull();
    expect(detail.listingType).toBe('SALE');
  });

  it('excludes ACTIVE listings without price from detail', async () => {
    repository.findBySlugPublic.mockResolvedValue({
      id: 'prop-2',
      slug: 'active-no-price',
      title: 'Sin precio',
      description: null,
      propertyType: 'APARTMENT',
      isActive: true,
      city: 'CABA',
      neighborhood: null,
      province: null,
      country: 'AR',
      latitude: null,
      longitude: null,
      condition: null,
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      halfBathrooms: null,
      parkingSpaces: null,
      totalArea: null,
      coveredArea: null,
      uncoveredArea: null,
      lotFront: null,
      lotDepth: null,
      yearBuilt: null,
      orientation: null,
      layout: null,
      brightness: null,
      images: [
        {
          id: 'img-1',
          url: 'https://cdn.example/cover.webp',
          storageKey: 'k',
          altText: null,
          sortOrder: 0,
          isCover: true,
        },
      ],
      listings: [
        {
          id: 'listing-2',
          listingType: 'SALE',
          status: 'ACTIVE',
          isFeatured: false,
          publishedAt: new Date(),
          expensesAmount: null,
          expensesCurrency: null,
          prices: [],
        },
      ],
      featureAssignments: [],
    });

    await expect(
      service.findBySlug('active-no-price', 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps list cards with null price for RESERVED', async () => {
    repository.findManyPublic.mockResolvedValue([
      [
        {
          id: 'prop-1',
          slug: 'depto-pizzurno-300',
          title: 'Depto 2 ambientes. Pizzurno 300.',
          description: null,
          propertyType: 'APARTMENT',
          city: 'Ramos Mejía',
          neighborhood: null,
          bedrooms: 1,
          bathrooms: 1,
          totalArea: 45,
          images: [
            {
              url: 'https://cdn.example/cover.webp',
              storageKey: 'k',
              altText: null,
            },
          ],
          listings: [
            {
              id: 'listing-1',
              listingType: 'SALE',
              status: 'RESERVED',
              prices: [],
            },
          ],
        },
      ],
      1,
    ]);

    const result = await service.findAll({
      tenantId: 'tenant-1',
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].price).toBeNull();
    expect(result.data[0].currency).toBeNull();
  });
});
