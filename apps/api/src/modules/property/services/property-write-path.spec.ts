/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { readFileSync } from 'node:fs';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
  UserRole: { SUPER_ADMIN: 'SUPER_ADMIN' },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));
import { PropertyService } from './property.service';
import { PropertyRepository } from '../repositories/property.repository';
import { PropertyGeoService } from './property-geo.service';
import { PropertyAccessService } from './property-access.service';
import { GeoRepository } from '../../geo/repositories/geo.repository';
import { PropertyFeatureAssignmentService } from '../../property-feature-assignment/services/property-feature-assignment.service';
import { PropertyFeatureAssignmentRepository } from '../../property-feature-assignment/repositories/property-feature-assignment.repository';
import { PropertyFeatureRepository } from '../../property-feature/repositories/property-feature.repository';
import { PropertyResponseDto } from '../dto/property-response.dto';

const user = {
  id: 'user-1',
  tenantId: 'tenant-1',
  role: 'TENANT_ADMIN',
  name: 'Admin',
  email: 'admin@example.test',
} as const;

function setup(initial: Record<string, any> = {}) {
  let entity: Record<string, any> = {
    id: 'property-1',
    tenantId: 'tenant-1',
    createdById: 'user-1',
    assignedToId: 'user-1',
    slug: 'baseline-property',
    title: 'Original',
    description: 'Description',
    internalCode: 'REF-1',
    propertyType: 'HOUSE',
    isActive: true,
    countryId: 'country-1',
    provinceId: 'province-1',
    localityId: 'locality-1',
    neighborhoodId: 'neighborhood-1',
    country: 'AR',
    province: 'Province',
    city: 'City',
    neighborhood: 'Neighborhood',
    postalCode: '1000',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: {
      id: 'user-1',
      name: 'Admin',
      email: 'admin@example.test',
      isActive: true,
    },
    listings: [{ listingType: 'SALE' }],
    ...initial,
  };
  const events: string[] = [];
  const operations: { name: string; args: any }[] = [];
  const op = (name: string, fn: (args: any) => any) =>
    jest.fn(async (args: any) => {
      operations.push({ name, args });
      events.push(`start:${name}`);
      await Promise.resolve();
      const result: unknown = fn(args);
      events.push(`end:${name}`);
      return result;
    });
  const matches = (where: any) =>
    where.id === entity.id && where.tenantId === entity.tenantId;
  const apply = (args: any) => {
    entity = { ...entity, ...args.data, updatedAt: new Date('2026-10-07') };
    return entity;
  };
  const prisma: any = {
    property: {
      create: op('property.create', apply),
      findFirst: op('property.findFirst', ({ where }) =>
        matches(where) ? entity : null,
      ),
      findUnique: op('property.findUnique', () => null),
      updateMany: op('property.updateMany', (args) => {
        if (!matches(args.where)) return { count: 0 };
        apply(args);
        return { count: 1 };
      }),
      update: op('property.update', (args) => {
        if (!matches(args.where))
          throw Object.assign(new Error('Not found'), { code: 'P2025' });
        return apply(args);
      }),
    },
    user: {
      count: op('user.count', ({ where }) =>
        where.tenantId === 'tenant-1' && where.id !== 'foreign-user' ? 1 : 0,
      ),
      findFirst: op('user.findFirst', ({ where }) =>
        where.tenantId === 'tenant-1' && where.id !== 'foreign-user'
          ? { id: where.id }
          : null,
      ),
    },
    tenant: {
      count: op('tenant.count', ({ where }) =>
        where.id === 'tenant-1' ? 1 : 0,
      ),
    },
    tenantSetting: {
      findUnique: op('tenantSetting.findUnique', () => ({
        propertyVisibilityPolicy: 'AGENT_OWN_ONLY',
        propertyEditPolicy: 'CREATOR_OR_ASSIGNEE',
      })),
    },
    propertyAgentAccess: {
      findUnique: op('propertyAgentAccess.findUnique', () => null),
    },
    province: {
      findUnique: op('province.findUnique', ({ where }) => ({
        id: where.id,
        countryId: 'country-1',
        name: where.id === 'province-1' ? 'Province' : 'Province 2',
      })),
    },
    locality: {
      findUnique: op('locality.findUnique', ({ where }) => ({
        id: where.id,
        provinceId: where.id === 'locality-1' ? 'province-1' : 'province-2',
        name: where.id === 'locality-1' ? 'City' : 'City 2',
        postalCode: '2000',
      })),
    },
    neighborhood: {
      findUnique: op('neighborhood.findUnique', ({ where }) => ({
        id: where.id,
        localityId: 'locality-1',
        name: 'Neighborhood',
      })),
    },
    country: {
      findUnique: op('country.findUnique', () => ({
        id: 'country-1',
        iso2: 'AR',
      })),
    },
    propertyFeature: {
      findUnique: op('propertyFeature.findUnique', ({ where }) => ({
        id: where.id,
        isActive: true,
      })),
    },
    propertyFeatureAssignment: {
      deleteMany: op('assignment.deleteMany', () => ({ count: 2 })),
      createMany: op('assignment.createMany', () => ({ count: 3 })),
      findMany: op('assignment.findMany', () => []),
    },
  };
  prisma.$transaction = jest.fn((fn: (tx: any) => unknown) =>
    Promise.resolve(fn(prisma)),
  );
  const repository = new PropertyRepository(prisma);
  const geo = new PropertyGeoService(new GeoRepository(prisma));
  const resolve = jest.spyOn(geo, 'resolveForWrite');
  const listing = {
    hasActiveListingForProperty: jest.fn().mockResolvedValue(false),
  };
  const trust = { syncActiveListingsAfterDegradation: jest.fn() };
  const service = new PropertyService(
    repository,
    listing as never,
    trust as never,
    geo,
    new PropertyAccessService(prisma),
  );
  const attributes = new PropertyFeatureAssignmentService(
    new PropertyFeatureAssignmentRepository(prisma),
    repository,
    new PropertyFeatureRepository(prisma),
  );
  return {
    service,
    attributes,
    repository,
    prisma,
    resolve,
    listing,
    trust,
    operations,
    events,
    entity: () => entity,
  };
}

const reportPath = process.env.PROPERTY_WRITE_REPORT;
const replay = reportPath
  ? (JSON.parse(readFileSync(reportPath, 'utf8')) as {
      scenario: string;
      initial: Record<string, any>;
      writes: { method: string; body: any }[];
    }[])
  : [];
(reportPath ? describe : describe.skip)(
  'Property write path instrumentation (ORM boundary doubles, no SQL)',
  () => {
    it.each(replay)('$scenario', async ({ scenario, initial, writes }) => {
      const h = setup(initial);
      for (const write of writes) {
        if (write.method === 'PATCH')
          await h.service.update('property-1', 'tenant-1', write.body, user);
        else
          await h.attributes.replaceAll('property-1', 'tenant-1', write.body);
      }
      let active = 0;
      let phases = 0;
      for (const event of h.events) {
        if (event.startsWith('start:')) {
          if (active === 0) phases++;
          active++;
        } else active--;
      }
      console.info(
        JSON.stringify({
          scenario,
          orm: h.operations.map((op) => op.name),
          ormCount: h.operations.length,
          sequentialOrmPhases: phases,
          geoResolutions: h.resolve.mock.calls.length,
          transactions: h.prisma.$transaction.mock.calls.length,
        }),
      );
      expect(h.entity().isActive).toBe(true);
    });
  },
);

describe('Property differential write regressions', () => {
  it('preserves create defaults, canonical GEO and tenant-scoped author validation', async () => {
    const h = setup();
    const payload = {
      slug: 'new-property',
      title: 'Nueva propiedad',
      propertyType: 'HOUSE' as const,
      city: 'Legacy city',
      provinceId: 'province-2',
      localityId: 'locality-2',
      internalCode: ' NEW ',
    };
    const created = await h.service.create(payload, 'tenant-1', 'user-1');
    expect(created).toMatchObject({
      title: 'Nueva propiedad',
      tenantId: 'tenant-1',
      createdById: 'user-1',
      isActive: true,
      internalCode: 'NEW',
      city: 'City 2',
      province: 'Province 2',
      neighborhoodId: null,
      postalCode: '2000',
      assignedToId: null,
    });
    expect(h.resolve).toHaveBeenCalledTimes(1);
    await expect(
      h.service.create(payload, 'tenant-1', 'foreign-user'),
    ).rejects.toThrow(BadRequestException);
    expect(h.prisma.property.create).toHaveBeenCalledTimes(1);
  });

  it('keeps explicit archive/restore and only syncs degradation on archive', async () => {
    const h = setup();
    await h.service.update('property-1', 'tenant-1', { isActive: false }, user);
    expect(h.entity().isActive).toBe(false);
    expect(h.trust.syncActiveListingsAfterDegradation).toHaveBeenCalledWith(
      'property-1',
      'tenant-1',
    );
    await h.service.update('property-1', 'tenant-1', { isActive: true }, user);
    expect(h.entity().isActive).toBe(true);
    expect(h.trust.syncActiveListingsAfterDegradation).toHaveBeenCalledTimes(1);
    expect(h.resolve).not.toHaveBeenCalled();
  });

  it.each(['title', 'description'])(
    'updates only %s and preserves archived lifecycle and unrelated fields',
    async (field) => {
      const h = setup({ isActive: false });
      const before = { ...h.entity() };
      const result = await h.service.update(
        'property-1',
        'tenant-1',
        { [field]: 'Nuevo texto' },
        user,
      );
      expect(h.entity()).toEqual({
        ...before,
        [field]: 'Nuevo texto',
        updatedAt: new Date('2026-10-07'),
      });
      expect(result.isActive).toBe(false);
      expect(h.resolve).not.toHaveBeenCalled();
      expect(h.trust.syncActiveListingsAfterDegradation).not.toHaveBeenCalled();
      expect(h.operations.map((op) => op.name)).toEqual([
        'property.findFirst',
        'propertyAgentAccess.findUnique',
        'tenantSetting.findUnique',
        'property.update',
      ]);
    },
  );

  it('persists intentional nulls and allowed empty description', async () => {
    const h = setup();
    const patch = JSON.parse(
      '{"description":"","internalCode":null,"assignedToId":null,"totalArea":null,"condition":null}',
    );
    const result = await h.service.update(
      'property-1',
      'tenant-1',
      patch,
      user,
    );
    expect(result).toMatchObject(patch);
    expect(h.entity()).toMatchObject(patch);
  });

  it('does not revalidate unchanged slug, normalized code, assignee or GEO from a full client', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      {
        slug: 'baseline-property',
        internalCode: ' REF-1 ',
        assignedToId: 'user-1',
        provinceId: 'province-1',
        localityId: 'locality-1',
        neighborhoodId: 'neighborhood-1',
      },
      user,
    );
    expect(h.resolve).not.toHaveBeenCalled();
    expect(h.prisma.property.findUnique).not.toHaveBeenCalled();
    expect(h.prisma.user.findFirst).not.toHaveBeenCalled();
    expect(h.listing.hasActiveListingForProperty).not.toHaveBeenCalled();
  });

  it('validates changed slug lock and tenant uniqueness', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      { slug: 'new-slug' },
      user,
    );
    expect(h.listing.hasActiveListingForProperty).toHaveBeenCalledWith(
      'property-1',
      'tenant-1',
    );
    expect(h.prisma.property.findUnique).toHaveBeenCalledWith({
      where: { tenantId_slug: { tenantId: 'tenant-1', slug: 'new-slug' } },
    });
    h.listing.hasActiveListingForProperty.mockResolvedValue(true);
    await expect(
      h.service.update('property-1', 'tenant-1', { slug: 'locked-slug' }, user),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates changed code and rejects a duplicate within the tenant', async () => {
    const h = setup();
    (h.prisma.property.findUnique as jest.Mock).mockResolvedValue({
      id: 'other-property',
    });
    await expect(
      h.service.update(
        'property-1',
        'tenant-1',
        { internalCode: 'OTHER' },
        user,
      ),
    ).rejects.toThrow('already exists');
    expect(h.prisma.property.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_internalCode: { tenantId: 'tenant-1', internalCode: 'OTHER' },
      },
    });
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('validates a changed assignee against active tenant users', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      { assignedToId: 'user-2' },
      user,
    );
    expect(h.prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-2', tenantId: 'tenant-1', isActive: true },
      select: { id: true },
    });
    await expect(
      h.service.update(
        'property-1',
        'tenant-1',
        { assignedToId: 'foreign-user' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates GEO hierarchy, syncs legacy names, preserves an explicit postal clear', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      JSON.parse(
        '{"provinceId":"province-2","localityId":"locality-2","neighborhoodId":null,"postalCode":null}',
      ),
      user,
    );
    expect(h.entity()).toMatchObject({
      provinceId: 'province-2',
      localityId: 'locality-2',
      neighborhoodId: null,
      province: 'Province 2',
      city: 'City 2',
      neighborhood: null,
      postalCode: null,
    });
    expect(h.resolve).toHaveBeenCalledTimes(1);
    await expect(
      h.service.update(
        'property-1',
        'tenant-1',
        { provinceId: 'province-2', localityId: 'locality-1' },
        user,
      ),
    ).rejects.toThrow('localityId must belong');
    await expect(
      h.service.update(
        'property-1',
        'tenant-1',
        {
          provinceId: 'province-2',
          localityId: 'locality-2',
          neighborhoodId: 'neighborhood-1',
        },
        user,
      ),
    ).rejects.toThrow('neighborhoodId must belong');
  });

  it('keeps the existing required GEO parent contract on a changed neighborhood', async () => {
    const h = setup();
    await expect(
      h.service.update(
        'property-1',
        'tenant-1',
        { neighborhoodId: 'neighborhood-2' },
        user,
      ),
    ).rejects.toThrow('provinceId and localityId are required');
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('keeps clearing an omitted neighborhood on a changed parent pair', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      { provinceId: 'province-2', localityId: 'locality-2' },
      user,
    );
    expect(h.entity()).toMatchObject({
      provinceId: 'province-2',
      localityId: 'locality-2',
      neighborhoodId: null,
      neighborhood: null,
    });
  });

  it("does not overwrite another editor's unrelated scalar field", async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      { title: 'Editor A' },
      user,
    );
    await h.service.update(
      'property-1',
      'tenant-1',
      { description: 'Editor B' },
      user,
    );
    expect(h.entity()).toMatchObject({
      title: 'Editor A',
      description: 'Editor B',
    });
  });

  it('does not accept conflicting legacy names as unchanged GEO', async () => {
    const h = setup();
    await h.service.update(
      'property-1',
      'tenant-1',
      {
        provinceId: 'province-1',
        localityId: 'locality-1',
        city: 'Wrong name',
      },
      user,
    );
    expect(h.resolve).toHaveBeenCalledTimes(1);
    expect(h.entity().city).toBe('City');
  });

  it('rejects another tenant before validation/writes', async () => {
    const h = setup();
    await expect(
      h.service.update(
        'property-1',
        'tenant-2',
        { title: 'Intrusion' },
        { ...user, tenantId: 'tenant-2' },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(h.operations).toHaveLength(1);
    expect(h.operations[0]?.args.where).toEqual({
      id: 'property-1',
      tenantId: 'tenant-2',
    });
  });

  it.each([
    ['AGENT', 'stranger', false],
    ['COLLABORATOR', 'user-1', false],
    ['AGENT', 'user-1', true],
    ['MANAGER', 'stranger', true],
    ['SUPER_ADMIN', 'super', true],
  ] as const)('preserves %s / %s edit policy', async (role, id, allowed) => {
    const h = setup();
    const action = h.service.update(
      'property-1',
      'tenant-1',
      { title: 'Edit' },
      {
        ...user,
        id,
        role,
        tenantId: role === 'SUPER_ADMIN' ? null : 'tenant-1',
      },
    );
    if (allowed) await expect(action).resolves.toMatchObject({ title: 'Edit' });
    else {
      await expect(action).rejects.toThrow(ForbiddenException);
      expect(h.prisma.property.update).not.toHaveBeenCalled();
    }
  });

  it('honors creator-only versus assignee policy', async () => {
    const h = setup({ createdById: 'creator', assignedToId: 'agent' });
    const agent = { ...user, role: 'AGENT' as const, id: 'agent' };
    await expect(
      h.service.update('property-1', 'tenant-1', {}, agent),
    ).resolves.toBeDefined();
    (h.prisma.tenantSetting.findUnique as jest.Mock).mockResolvedValue({
      propertyVisibilityPolicy: 'AGENT_OWN_ONLY',
      propertyEditPolicy: 'CREATOR_ONLY',
    });
    await expect(
      h.service.update('property-1', 'tenant-1', {}, agent),
    ).rejects.toThrow(ForbiddenException);
  });

  it('keeps the full response DTO and tenant-scoped update include without a follow-up read', async () => {
    const h = setup({ totalArea: '125.50', latitude: '-34.60' });
    const result = await h.service.update(
      'property-1',
      'tenant-1',
      { title: 'Fresh' },
      user,
    );
    expect(result).toEqual(PropertyResponseDto.fromEntity(h.entity() as never));
    expect(result).toMatchObject({
      title: 'Fresh',
      totalArea: 125.5,
      latitude: -34.6,
      state: 'Province',
      listingTypes: ['SALE'],
      createdBy: { id: 'user-1' },
    });
    expect(h.prisma.property.findFirst).toHaveBeenCalledTimes(1);
    expect(h.prisma.property.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'property-1', tenantId: 'tenant-1' },
        include: expect.objectContaining({
          geoCountry: true,
          createdBy: expect.any(Object),
          listings: expect.any(Object),
        }),
      }),
    );
  });

  it('keeps assignment replacement validations, tenant filters and transaction', async () => {
    const h = setup();
    await h.attributes.replaceAll('property-1', 'tenant-1', {
      features: [{ featureId: 'feature-0', value: '' }],
    });
    expect(h.prisma.propertyFeature.findUnique).toHaveBeenCalled();
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(h.prisma.propertyFeatureAssignment.deleteMany).toHaveBeenCalledWith({
      where: { propertyId: 'property-1', tenantId: 'tenant-1' },
    });
    expect(h.prisma.propertyFeatureAssignment.createMany).toHaveBeenCalledWith({
      data: [
        {
          propertyId: 'property-1',
          tenantId: 'tenant-1',
          featureId: 'feature-0',
          value: '',
        },
      ],
    });
    await expect(
      h.attributes.replaceAll('property-1', 'tenant-2', { features: [] }),
    ).rejects.toThrow(NotFoundException);
  });
});
