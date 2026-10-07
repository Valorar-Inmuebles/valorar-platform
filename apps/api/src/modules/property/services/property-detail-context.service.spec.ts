jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';
import { PropertyDetailContextService } from './property-detail-context.service';
import { PropertyDetailContextRepository } from '../repositories/property-detail-context.repository';
import { PropertyAccessService } from './property-access.service';
import { PropertyPublishabilityService } from './property-publishability.service';
import { PropertyRepository } from '../repositories/property.repository';
import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';
import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { PropertyListingResponseDto } from '../../property-listing/dto/property-listing-response.dto';
import { PropertyPriceResponseDto } from '../../property-price/dto/property-price-response.dto';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PropertyService } from './property.service';
import { PropertyListingService } from '../../property-listing/services/property-listing.service';
import { PropertyPriceService } from '../../property-price/services/property-price.service';
import { PropertyImageService } from '../../property-image/services/property-image.service';
import { PropertyFeatureAssignmentService } from '../../property-feature-assignment/services/property-feature-assignment.service';
import { PropertyFeatureAssignmentRepository } from '../../property-feature-assignment/repositories/property-feature-assignment.repository';

type DetailRecord = NonNullable<
  Awaited<ReturnType<PropertyDetailContextRepository['findVisible']>>
>;

function fixture(count = 1): DetailRecord {
  const date = new Date('2026-01-01T00:00:00Z');
  // Only fields relevant to the read contract; absent nullable fields are identical
  // on both legacy and aggregate DTO projections.
  return {
    id: 'property-1',
    tenantId: 'tenant-1',
    createdById: 'creator',
    assignedToId: 'assigned',
    isActive: true,
    slug: 'baseline-property',
    city: 'City',
    country: 'AR',
    createdAt: date,
    updatedAt: date,
    images: [{ id: 'cover-1' }],
    _count: { images: 33, featureAssignments: 5 },
    listings: Array.from({ length: count }, (_, i) => ({
      id: `listing-${i}`,
      propertyId: 'property-1',
      tenantId: 'tenant-1',
      listingType: ['SALE', 'RENT', 'TEMPORARY_RENT'][i],
      status: 'ACTIVE',
      expensesAmount: null,
      expensesCurrency: null,
      isFeatured: i === 0,
      publishedAt: date,
      closedAt: null,
      createdAt: date,
      updatedAt: date,
      prices: [
        {
          id: `price-${i}`,
          listingId: `listing-${i}`,
          tenantId: 'tenant-1',
          amount: 100000,
          currency: 'USD',
          isPrimary: true,
          label: null,
          createdAt: date,
          updatedAt: date,
        },
      ],
    })),
  } as unknown as DetailRecord;
}

function harness(record: DetailRecord | null = fixture()) {
  const prisma = {
    tenantSetting: {
      findUnique: jest.fn().mockResolvedValue({
        propertyVisibilityPolicy: 'AGENT_OWN_ONLY',
        propertyEditPolicy: 'CREATOR_ONLY',
      }),
    },
    property: {
      findFirst: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue(record ? [record] : []),
    },
    propertyListing: {
      findFirst: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          record?.listings.find((listing) => listing.id === where.id) ?? null,
        ),
      ),
      findMany: jest.fn().mockResolvedValue(record?.listings ?? []),
    },
    propertyImage: {
      count: jest.fn(({ where }: { where: { isCover?: boolean } }) =>
        Promise.resolve(
          where.isCover
            ? (record?.images.length ?? 0)
            : (record?._count.images ?? 0),
        ),
      ),
      findMany: jest.fn().mockResolvedValue(
        Array.from({ length: 33 }, (_, i) => ({
          id: `image-${i}`,
          isCover: i === 0,
        })),
      ),
    },
    propertyPrice: {
      count: jest.fn(({ where }: { where: { listingId: string } }) =>
        Promise.resolve(
          record?.listings
            .find((listing) => listing.id === where.listingId)
            ?.prices.filter((price) => price.isPrimary).length ?? 0,
        ),
      ),
      findMany: jest.fn(({ where }: { where: { listingId: string } }) =>
        Promise.resolve(
          record?.listings.find((listing) => listing.id === where.listingId)
            ?.prices ?? [],
        ),
      ),
    },
    propertyFeatureAssignment: {
      findMany: jest.fn().mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          featureId: `feature-${i}`,
          feature: {
            name: `Feature ${i}`,
            slug: `feature-${i}`,
            category: 'GENERAL',
          },
          value: null,
        })),
      ),
    },
  };
  const access = new PropertyAccessService(prisma as never);
  const repository = new PropertyDetailContextRepository(prisma as never);
  const service = new PropertyDetailContextService(repository, access);
  const legacy = new PropertyPublishabilityService(
    new PropertyRepository(prisma as never),
    new PropertyListingRepository(prisma as never),
    new PropertyImageRepository(prisma as never),
    new PropertyPriceRepository(prisma as never),
  );
  const user = {
    id: 'creator',
    tenantId: 'tenant-1',
    role: 'AGENT',
  } as AuthenticatedUser;
  return { prisma, access, repository, service, legacy, user };
}

describe('PropertyDetailContextService', () => {
  it.each(['DRAFT', 'ACTIVE', 'PAUSED', 'RESERVED', 'CLOSED'] as const)(
    'preserves legacy checklist and DTOs for %s, active/archived, with/without cover and price',
    async (status) => {
      for (const isActive of [true, false]) {
        for (const complete of [true, false]) {
          const record = fixture(3);
          record.isActive = isActive;
          record.listings.forEach((listing) => {
            listing.status = status;
            if (!complete) listing.prices = [];
          });
          if (!complete) {
            record.images = [];
            record._count.images = 0;
          }
          const { service, legacy, user } = harness(record);
          const result = await service.findOne(
            record.id,
            record.tenantId,
            user,
          );
          expect(result.property).toEqual(
            PropertyResponseDto.fromEntity(record),
          );
          expect(result.imageCount).toBe(record._count.images);
          expect(result.hasCoverImage).toBe(complete);
          expect(result.featureCount).toBe(5);
          for (const [index, operation] of result.operations.entries()) {
            expect(operation.listing).toEqual(
              PropertyListingResponseDto.fromEntity(record.listings[index]),
            );
            expect(operation.prices).toEqual(
              record.listings[index].prices.map((price) =>
                PropertyPriceResponseDto.fromEntity(price),
              ),
            );
            expect(operation.publishability).toEqual(
              await legacy.evaluate(
                record.id,
                operation.listing.id,
                record.tenantId,
              ),
            );
          }
          expect(result).not.toHaveProperty('images');
          expect(result).not.toHaveProperty('featureAssignments');
        }
      }
    },
  );

  it.each([0, 1, 3])(
    'uses constant Prisma operations for %i listings (not SQL statement counts)',
    async (count) => {
      const { prisma, service, user, legacy } = harness(fixture(count));
      for (let i = 0; i < count; i++)
        await legacy.evaluate('property-1', `listing-${i}`, 'tenant-1');
      const checklistCalls = Object.values(prisma)
        .flatMap((delegate) => Object.values(delegate))
        .reduce((sum, fn) => sum + fn.mock.calls.length, 0);
      expect(checklistCalls).toBe(5 * count);
      jest.clearAllMocks();
      const result = await service.findOne('property-1', 'tenant-1', user);
      expect(result.operations).toHaveLength(count);
      expect(prisma.tenantSetting.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.property.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.propertyListing.findFirst).not.toHaveBeenCalled();
      expect(prisma.propertyImage.count).not.toHaveBeenCalled();
      expect(prisma.propertyPrice.count).not.toHaveBeenCalled();
    },
  );

  it.each([1, 3])(
    'measures legacy vs aggregate flow with %i listings using real services/repositories',
    async (count) => {
      const { prisma, service, legacy, access, user } = harness(fixture(count));
      const properties = new PropertyRepository(prisma as never);
      const listings = new PropertyListingRepository(prisma as never);
      const prices = new PropertyPriceRepository(prisma as never);
      const images = new PropertyImageRepository(prisma as never);
      const propertyService = new PropertyService(
        properties,
        listings,
        undefined as never,
        undefined as never,
        access,
      );
      const listingService = new PropertyListingService(
        listings,
        properties,
        prices,
        images,
      );
      const priceService = new PropertyPriceService(
        prices,
        listings,
        undefined as never,
      );
      const imageService = new PropertyImageService(
        images,
        properties,
        undefined as never,
        undefined as never,
      );
      const featureService = new PropertyFeatureAssignmentService(
        new PropertyFeatureAssignmentRepository(prisma as never),
        properties,
        undefined as never,
      );
      const propertyRead = () =>
        propertyService.findOne('property-1', 'tenant-1', user);
      const featureRead = () =>
        featureService.findAll('property-1', 'tenant-1');
      const imageRead = () => imageService.findAll('tenant-1', 'property-1');
      // Frozen loader orchestration at c0bdbd7; the endpoints/services remain available.
      const commercialRead = async () => {
        const [, operations] = await Promise.all([
          propertyRead(),
          listingService.findAll('tenant-1', { propertyId: 'property-1' }),
        ]);
        await Promise.all(
          operations.map((listing) =>
            legacy.evaluate('property-1', listing.id, 'tenant-1'),
          ),
        );
        await Promise.all(
          operations.map((listing) =>
            priceService.findAll('tenant-1', listing.id),
          ),
        );
      };
      const headerRead = () =>
        Promise.all([commercialRead(), imageRead(), featureRead()]);
      const calls = () =>
        Object.values(prisma)
          .flatMap((delegate) => Object.values(delegate))
          .reduce((sum, fn) => sum + fn.mock.calls.length, 0);
      for (const [tab, legacyTab, specific, before, after] of [
        [
          'Datos',
          () => Promise.all([headerRead(), featureRead()]),
          featureRead,
          18 + 14 * count,
          4,
        ],
        [
          'Comercialización',
          commercialRead,
          async () => {},
          12 + 14 * count,
          2,
        ],
        [
          'Características',
          () => Promise.all([propertyRead(), featureRead()]),
          featureRead,
          12 + 7 * count,
          4,
        ],
        [
          'Imágenes',
          () => Promise.all([propertyRead(), imageRead()]),
          imageRead,
          12 + 7 * count,
          4,
        ],
      ] as const) {
        jest.clearAllMocks();
        await Promise.all([headerRead(), legacyTab()]);
        expect(calls()).toBe(before);
        jest.clearAllMocks();
        // Shared HTTP context is counted once; specific tab endpoints stay as before.
        await Promise.all([
          service.findOne('property-1', 'tenant-1', user),
          specific(),
        ]);
        expect(calls()).toBe(after);
        console.info(
          JSON.stringify({
            tab,
            listings: count,
            beforePrismaOperations: before,
            afterPrismaOperations: after,
            excludes: 'SQL expansion, guards/auth, users/catalog',
          }),
        );
      }
    },
  );

  it('returns the same 404 for missing or invisible property', async () => {
    const { service, user } = harness(null);
    await expect(
      service.findOne('missing', 'tenant-1', user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['AGENT', 'COLLABORATOR', 'TENANT_ADMIN', 'SUPER_ADMIN'] as const)(
    'retains tenant and creator/assigned/shared visibility for %s',
    async (role) => {
      const { access, repository, service, user } = harness();
      user.role = role;
      const read = jest.spyOn(repository, 'findVisible');
      const expected = await access.buildListWhere('tenant-1', user, {
        id: 'property-1',
      });
      await service.findOne('property-1', 'tenant-1', user);
      expect(read).toHaveBeenCalledWith('property-1', 'tenant-1', expected);
      if (role === 'AGENT' || role === 'COLLABORATOR') {
        expect(expected.OR).toEqual([
          { createdById: user.id },
          { assignedToId: user.id },
          { agentAccess: { some: { userId: user.id, canView: true } } },
        ]);
      } else {
        expect(expected).toEqual({ id: 'property-1', tenantId: 'tenant-1' });
      }
    },
  );

  it('honors AGENT_SEE_ALL without removing tenant scope', async () => {
    const { prisma, repository, service, user } = harness();
    prisma.tenantSetting.findUnique.mockResolvedValue({
      propertyVisibilityPolicy: 'AGENT_SEE_ALL',
      propertyEditPolicy: 'CREATOR_ONLY',
    });
    const read = jest.spyOn(repository, 'findVisible');
    await service.findOne('property-1', 'tenant-1', user);
    expect(read).toHaveBeenCalledWith('property-1', 'tenant-1', {
      id: 'property-1',
      tenantId: 'tenant-1',
    });
  });
});
