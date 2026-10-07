import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type QueryResult } from 'pg';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  evaluateListingPublishability,
  evaluatePropertyAttention,
  propertyRecentlyArchivedThreshold,
} from '@repo/property-rules';
import {
  canEditProperty,
  canViewProperty,
  type PropertyTenantPolicies,
} from '@repo/rbac';
import type { PropertyListResponse } from '@repo/shared-types';
import {
  PrismaClient,
  UserRole,
  PropertyListingStatus,
  PropertyType,
} from '../generated/prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AdminDashboardModule } from '../src/modules/admin-dashboard/admin-dashboard.module';
import { PropertyModule } from '../src/modules/property/property.module';
import { PropertyListService } from '../src/modules/property/services/property-list.service';
import { PropertyListRepository } from '../src/modules/property/repositories/property-list.repository';
import {
  PropertyListQueryDto,
  PROPERTY_LIST_ATTENTION,
  PROPERTY_LIST_SORTS,
} from '../src/modules/property/dto/property-list-query.dto';
import { AUDITED_PRODUCTION_NEON_IDENTITY } from '../src/modules/migration-developments/constants';
import type { AuthenticatedUser } from '../src/common/types/authenticated-user.type';

describe('Property list — isolated PostgreSQL + real HTTP guards', () => {
  const prefix = `p13b-${randomUUID()}`;
  const ids = {
    a: `${prefix}-a`,
    b: `${prefix}-b`,
    empty: `${prefix}-empty`,
    feature: `${prefix}-feature`,
  };
  const tenants = [ids.a, ids.b, ids.empty];
  const now = new Date();
  const policies: PropertyTenantPolicies = {
    visibility: 'AGENT_OWN_ONLY',
    edit: 'CREATOR_OR_ASSIGNEE',
  };
  const sql: string[] = [];
  let operations = 0;
  const driverStatements: string[] = [];
  let databaseRows = 0;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
  // Observe the real pg boundary, including BEGIN/SET omitted by Prisma query events.
  pool.on('connect', (connection) => {
    // The proxy forwards the original receiver through Reflect.apply.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    connection.query = new Proxy(connection.query, {
      apply(target, thisArg: unknown, args: unknown[]) {
        const config = args[0];
        driverStatements.push(
          typeof config === 'string'
            ? config
            : (config as { text: string }).text,
        );
        const record = (result: QueryResult | undefined) => {
          databaseRows += result?.rows?.length ?? 0;
        };
        const callback = args.at(-1);
        if (typeof callback === 'function') {
          args[args.length - 1] = (
            error: Error | null,
            result: QueryResult,
          ) => {
            record(result);
            Reflect.apply(callback, thisArg, [error, result]);
          };
        }
        const result: unknown = Reflect.apply(target, thisArg, args);
        if (result instanceof Promise)
          return result.then((value: QueryResult) => {
            record(value);
            return value;
          });
        return result;
      },
    });
  });
  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: [{ emit: 'event', level: 'query' }],
  });
  client.$on('query', (event) => sql.push(event.query));
  const measured = client.$extends({
    query: {
      $allOperations({ args, query }) {
        operations++;
        return query(args);
      },
    },
  });
  let app: INestApplication<App>;
  let service: PropertyListService;
  let repository: PropertyListRepository;
  let auth: AuthService;
  let users: Record<string, AuthenticatedUser>;
  let locality: { id: string; name: string; provinceId: string };
  let neighborhood: { id: string; name: string; localityId: string };
  let verified = false;
  const fixtures: Array<{
    id: string;
    isActive: boolean;
    updatedAt: Date;
    description: string | null;
    createdById: string;
    assignedToId: string | null;
    sharedCanView: boolean;
    sharedCanEdit: boolean;
    title: string;
    propertyType: PropertyType;
    imageCount: number;
    hasCoverImage: boolean;
    listingStatus: PropertyListingStatus | null;
    hasPrimaryPrice: boolean;
    featureCount: number;
    localityName: string;
    neighborhoodName: string | null;
  }> = [];
  const fixtureId = (i: number) => `${prefix}-p${String(i).padStart(3, '0')}`;

  const query = (patch: Partial<PropertyListQueryDto> = {}) =>
    Object.assign(new PropertyListQueryDto(), patch);
  const context = (
    f: (typeof fixtures)[number],
    role: UserRole = 'AGENT',
    p = policies,
  ) => ({
    userId: users.agent.id,
    role,
    createdById: f.createdById,
    assignedToId: f.assignedToId,
    sharedCanView: f.sharedCanView,
    sharedCanEdit: f.sharedCanEdit,
    tenantPolicies: p,
  });
  const publishable = (f: (typeof fixtures)[number]) =>
    evaluateListingPublishability({
      propertyIsActive: f.isActive,
      imageCount: f.imageCount,
      hasCoverImage: f.hasCoverImage,
      listingStatus: f.listingStatus ?? '',
      hasPrimaryPrice: f.hasPrimaryPrice,
    }).isPublishable;
  const counts = (rows: typeof fixtures) => ({
    all: rows.length,
    active: rows.filter((f) => f.isActive).length,
    archived: rows.filter((f) => !f.isActive).length,
    published: rows.filter(publishable).length,
    commercialDraft: rows.filter((f) => f.isActive && !publishable(f)).length,
  });
  const all = async (
    user: AuthenticatedUser,
    patch: Partial<PropertyListQueryDto> = {},
  ) => {
    const first = await service.list(
      ids.a,
      user,
      query({ ...patch, pageSize: 100 }),
      now,
    );
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page++)
      items.push(
        ...(
          await service.list(
            ids.a,
            user,
            query({ ...patch, pageSize: 100, page }),
            now,
          )
        ).items,
      );
    return { ...first, items };
  };
  const get = (path: string, user = users.admin, tenant?: string) => {
    const call = request(app.getHttpServer())
      .get(path)
      .set('Cookie', `access_token=${auth.signToken(user)}`);
    return tenant ? call.set('X-Tenant-Id', tenant) : call;
  };

  beforeAll(async () => {
    // Identity and prerequisites are SELECT-only. No fixture write occurs before these pass.
    const [identity] = await client.$queryRaw<
      Array<{ project: string; branch: string; endpoint: string }>
    >`
      SELECT current_setting('neon.project_id', true) AS project,
        current_setting('neon.branch_id', true) AS branch,
        current_setting('neon.endpoint_id', true) AS endpoint`;
    expect(identity.branch).toBe(process.env.PROPERTY_LIST_TEST_BRANCH_ID);
    expect(identity.branch).not.toBe(AUDITED_PRODUCTION_NEON_IDENTITY.branchId);
    expect(identity.endpoint).not.toBe(
      AUDITED_PRODUCTION_NEON_IDENTITY.endpointId,
    );
    expect(identity.endpoint).toBe(
      new URL(process.env.DATABASE_URL!).hostname
        .split('.')[0]
        .replace(/-pooler$/, ''),
    );
    const casing = await client.$queryRaw<
      Array<{ lower: string }>
    >`SELECT lower('ÁRBOL İ ΟΣ 𐐀' COLLATE "und-x-icu") AS lower`;
    expect(casing[0].lower).toBe('ÁRBOL İ ΟΣ 𐐀'.toLowerCase());
    locality = await client.locality.findFirstOrThrow({
      select: { id: true, name: true, provinceId: true },
    });
    verified = true;
    neighborhood = await client.neighborhood.create({
      data: {
        id: `${prefix}-neighborhood`,
        name: 'Barrio P13',
        slug: `${prefix}-neighborhood`,
        search: 'barrio p13',
        localityId: locality.id,
      },
    });
    console.info(
      'ISOLATED_DB',
      JSON.stringify({ ...identity, fixturePrefix: prefix }),
    );
    await client.tenant.createMany({
      data: tenants.map((id) => ({ id, name: id, slug: id })),
    });
    await client.tenantSetting.create({
      data: {
        tenantId: ids.a,
        propertyVisibilityPolicy: policies.visibility,
        propertyEditPolicy: policies.edit,
      },
    });
    const roles = {
      admin: UserRole.TENANT_ADMIN,
      agent: UserRole.AGENT,
      other: UserRole.AGENT,
      collaborator: UserRole.COLLABORATOR,
      manager: UserRole.MANAGER,
      super: UserRole.SUPER_ADMIN,
      b: UserRole.TENANT_ADMIN,
    };
    const createdUsers = await Promise.all(
      Object.entries(roles).map(([key, role]) =>
        client.user.create({
          data: {
            id: `${prefix}-${key}`,
            tenantId: key === 'super' ? null : key === 'b' ? ids.b : ids.a,
            firstName: key,
            lastName: 'P13',
            name: key,
            email: `${prefix}-${key}@example.invalid`,
            passwordHash: 'not-a-login-hash',
            role,
          },
        }),
      ),
    );
    users = Object.fromEntries(
      Object.keys(roles).map((key, i) => [key, createdUsers[i]]),
    );
    await client.propertyFeature.create({
      data: {
        id: ids.feature,
        name: 'P13 fixture',
        slug: ids.feature,
        category: 'GENERAL',
        isActive: false,
      },
    });
    const descriptions = [
      null,
      'x'.repeat(39),
      'x'.repeat(40),
      '\ufeff\u00a0' + '😀'.repeat(20) + '\u2029',
      '😀'.repeat(19) + 'x',
      ' \t\n',
      '<p>' + 'x'.repeat(40) + '</p>',
    ];
    const statuses: Array<PropertyListingStatus | null> = [
      'ACTIVE',
      'RESERVED',
      'CLOSED',
      'DRAFT',
      'PAUSED',
      'ACTIVE',
      null,
    ];
    for (let i = 0; i < 137; i++) {
      fixtures.push({
        id: fixtureId(i),
        title: i < 4 ? 'ÁRBOL İ ΟΣ 𐐀 literal%_\\' : `Propiedad ${i % 11}`,
        propertyType: Object.values(PropertyType)[i % 12],
        isActive: i % 9 !== 8,
        updatedAt:
          i === 8
            ? propertyRecentlyArchivedThreshold(now)
            : new Date(now.getTime() - (i % 40) * 86400000),
        description: descriptions[i % descriptions.length],
        createdById: i % 5 === 0 ? users.agent.id : users.admin.id,
        assignedToId: i % 5 === 1 ? users.agent.id : null,
        sharedCanView: i % 5 === 2,
        sharedCanEdit: i % 10 === 2 || i % 5 === 3,
        imageCount: i % 7 === 6 ? 0 : 1,
        hasCoverImage: i % 7 !== 5 && i % 7 !== 6,
        listingStatus: statuses[i % 7],
        hasPrimaryPrice: i % 2 === 0,
        featureCount: i % 3 === 0 ? 0 : 1,
        localityName: i % 2 === 0 ? locality.name : 'Legacy Ciudad',
        neighborhoodName:
          i % 2 === 0
            ? neighborhood.name
            : i % 3 === 0
              ? null
              : 'Legacy Barrio',
      });
    }
    await client.property.createMany({
      data: fixtures.map((f, i) => ({
        id: f.id,
        tenantId: ids.a,
        createdById: f.createdById,
        assignedToId: f.assignedToId,
        title: f.title,
        slug: f.id,
        internalCode: `P13-${i}`,
        propertyType: f.propertyType,
        isActive: f.isActive,
        description: f.description,
        city: 'Legacy Ciudad',
        neighborhood: f.neighborhoodName,
        localityId: i % 2 === 0 ? locality.id : null,
        provinceId: i % 2 === 0 ? locality.provinceId : null,
        neighborhoodId: i % 2 === 0 ? neighborhood.id : null,
        updatedAt: f.updatedAt,
      })),
    });
    await client.propertyListing.createMany({
      data: fixtures
        .filter((f) => f.listingStatus)
        .map((f) => ({
          id: `${f.id}-listing`,
          tenantId: ids.a,
          propertyId: f.id,
          listingType: 'SALE',
          status: f.listingStatus!,
          updatedAt: now,
        })),
    });
    await client.propertyImage.createMany({
      data: fixtures
        .filter((f) => f.imageCount)
        .map((f) => ({
          tenantId: ids.a,
          propertyId: f.id,
          storageKey: `${f.id}/fake`,
          isCover: f.hasCoverImage,
        })),
    });
    await client.propertyPrice.createMany({
      data: fixtures
        .filter((f) => f.listingStatus && f.hasPrimaryPrice)
        .map((f) => ({
          tenantId: ids.a,
          listingId: `${f.id}-listing`,
          amount: 123,
          currency: 'USD',
          isPrimary: true,
        })),
    });
    await client.propertyFeatureAssignment.createMany({
      data: fixtures
        .filter((f) => f.featureCount)
        .map((f) => ({
          tenantId: ids.a,
          propertyId: f.id,
          featureId: ids.feature,
        })),
    });
    await client.propertyAgentAccess.createMany({
      data: fixtures
        .filter((f) => f.sharedCanView || f.sharedCanEdit)
        .map((f) => ({
          tenantId: ids.a,
          propertyId: f.id,
          userId: users.agent.id,
          canView: f.sharedCanView,
          canEdit: f.sharedCanEdit,
        })),
    });
    await client.property.create({
      data: {
        id: `${prefix}-foreign`,
        tenantId: ids.b,
        createdById: users.b.id,
        slug: 'foreign',
        title: 'ÁRBOL foreign',
        city: 'Legacy Ciudad',
        propertyType: 'HOUSE',
      },
    });
    // Deliberately malformed cross-tenant relation: never grants visibility to A.
    await client.propertyAgentAccess.create({
      data: {
        tenantId: ids.b,
        propertyId: fixtureId(4),
        userId: users.agent.id,
        canView: true,
        canEdit: true,
      },
    });
    const module = await Test.createTestingModule({
      imports: [PrismaModule, PropertyModule, AdminDashboardModule],
    })
      .overrideProvider(PrismaService)
      .useValue(measured)
      .compile();
    app = module.createNestApplication<INestApplication<App>>();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    service = module.get(PropertyListService);
    repository = module.get(PropertyListRepository);
    auth = module.get(AuthService);
  });

  afterAll(async () => {
    try {
      await app?.close();
      if (verified) {
        // Exact fixture IDs only; preserve every pre-existing row and all Rental data.
        await client.propertyAgentAccess.deleteMany({
          where: { tenantId: { in: tenants } },
        });
        await client.property.deleteMany({
          where: { tenantId: { in: tenants } },
        });
        await client.user.deleteMany({ where: { id: { startsWith: prefix } } });
        await client.tenantSetting.deleteMany({
          where: { tenantId: { in: tenants } },
        });
        await client.tenant.deleteMany({ where: { id: { in: tenants } } });
        await client.propertyFeature.deleteMany({ where: { id: ids.feature } });
        await client.neighborhood.deleteMany({
          where: { id: `${prefix}-neighborhood` },
        });
        expect(
          await client.tenant.count({ where: { id: { in: tenants } } }),
        ).toBe(0);
      }
    } finally {
      await client.$disconnect();
      await pool.end();
    }
  });

  it('applies the real JWT, tenant and permission guards and reserves /list before /:id', async () => {
    await request(app.getHttpServer()).get('/properties/list').expect(401);
    await get('/properties/list', users.super).expect(400);
    await get('/properties/list', users.super, 'missing-tenant').expect(400);
    const response = await get('/properties/list').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect((response.body as PropertyListResponse).total).toBe(137);
    expect(
      (
        (await get('/properties/list', users.super, ids.b).expect(200))
          .body as PropertyListResponse
      ).total,
    ).toBe(1);
    expect(
      (
        (await get('/properties/list', users.agent, ids.b).expect(200))
          .body as PropertyListResponse
      ).total,
    ).toBe(fixtures.filter((f) => canViewProperty(context(f))).length);
    await client.tenant.update({
      where: { id: ids.empty },
      data: { status: 'SUSPENDED' },
    });
    try {
      await get('/properties/list', users.super, ids.empty).expect(403);
    } finally {
      await client.tenant.update({
        where: { id: ids.empty },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it.each([
    'page=0',
    'page=1000001',
    'page=1&page=2',
    'page=1e2',
    'pageSize=10',
    'sortBy=description',
    'sortOrder=DROP',
    'attention=withoutImages',
    'tenantId=other',
    'search=a&search=b',
    'search=' + 'x'.repeat(161),
    'localityId=',
    'unexpected=x',
    'listingType=CLOSED',
    'propertyType=UNKNOWN',
  ])('rejects invalid query %s', async (params) => {
    await get(`/properties/list?${params}`).expect(400);
  });

  it('returns the compact contract and commercial counts of exactly the authorized universe', async () => {
    for (const role of ['admin', 'agent', 'manager', 'super'] as const) {
      const result = await all(users[role]);
      const visible =
        role === 'agent'
          ? fixtures.filter((f) => canViewProperty(context(f)))
          : fixtures;
      expect(result.total).toBe(visible.length);
      expect(result.commercialCounts).toEqual(counts(visible));
      expect(result.items.map((i) => i.id).sort()).toEqual(
        visible.map((f) => f.id).sort(),
      );
      for (const item of result.items) {
        const f = fixtures.find((f) => f.id === item.id)!;
        expect(item.isAnyPublishable).toBe(publishable(f));
        expect(item.location).toEqual({
          localityName: f.localityName,
          neighborhoodName: f.neighborhoodName,
        });
        expect(item.publicUrl).toBe(
          publishable(f)
            ? `https://web.example/propiedades/${f.id}?listingType=SALE`
            : null,
        );
        expect(item.capabilities).toEqual({
          canEdit: canEditProperty(context(f, users[role].role)),
          canArchive: f.isActive && role !== 'agent',
          canRestore:
            !f.isActive && canEditProperty(context(f, users[role].role)),
        });
        expect(Object.keys(item).sort()).toEqual(
          [
            'id',
            'slug',
            'title',
            'internalCode',
            'propertyType',
            'isActive',
            'location',
            'listingTypes',
            'statusVariant',
            'isAnyPublishable',
            'publicUrl',
            'activeListingsCount',
            'createdBy',
            'capabilities',
          ].sort(),
        );
      }
    }
  });

  it.each(PROPERTY_LIST_ATTENTION)(
    'matches shared canonical attention predicate: %s',
    async (attention) => {
      const result = await all(users.admin, { attention });
      const expected = fixtures.filter(
        (f) =>
          evaluatePropertyAttention(
            {
              ...f,
              listingCount: f.listingStatus ? 1 : 0,
              isAnyPublishable: publishable(f),
              hasActiveListingWithoutPrimaryPrice:
                f.listingStatus === 'ACTIVE' && !f.hasPrimaryPrice,
            },
            now,
          )[attention],
      );
      expect(result.items.map((i) => i.id).sort()).toEqual(
        expected.map((f) => f.id).sort(),
      );
      expect(result.commercialCounts).toEqual(counts(fixtures));
    },
  );

  it('combines literal Unicode search with visibility, commercial status and GEO', async () => {
    for (const search of [
      'árbol',
      'i̇',
      'ος',
      '𐐨',
      '%_',
      '\\',
      "' OR true --",
      'P13-0',
      'Legacy Ciudad Legacy Barrio',
    ]) {
      const result = await all(users.agent, { search });
      const expected = fixtures.filter(
        (f, i) =>
          canViewProperty(context(f)) &&
          [f.title, `P13-${i}`, f.localityName, f.neighborhoodName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
      );
      expect(result.items.map((i) => i.id).sort()).toEqual(
        expected.map((f) => f.id).sort(),
      );
    }
    const geo = await all(users.agent, {
      provinceId: locality.provinceId,
      localityId: locality.id,
      neighborhoodId: neighborhood.id,
      propertyType: 'HOUSE',
      listingType: 'SALE',
      commercialStatus: 'published',
    });
    expect(geo.items.map((i) => i.id).sort()).toEqual(
      fixtures
        .filter(
          (f, i) =>
            i % 2 === 0 &&
            f.propertyType === 'HOUSE' &&
            canViewProperty(context(f)) &&
            publishable(f),
        )
        .map((f) => f.id)
        .sort(),
    );
    expect((await all(users.admin, { localityId: 'unknown' })).total).toBe(0);
    expect(
      (
        await all(users.admin, {
          commercialStatus: 'archived',
          attention: 'without-images',
        })
      ).total,
    ).toBe(0);
  });

  it('distinguishes read-all from edit-own and respects collaborator and edit policy', async () => {
    await client.tenantSetting.update({
      where: { tenantId: ids.a },
      data: {
        propertyVisibilityPolicy: 'AGENT_SEE_ALL',
        propertyEditPolicy: 'CREATOR_ONLY',
      },
    });
    try {
      const result = await all(users.agent);
      expect(result.total).toBe(fixtures.length);
      for (const item of result.items) {
        const f = fixtures.find((f) => f.id === item.id)!;
        expect(item.capabilities.canEdit).toBe(
          canEditProperty(
            context(f, 'AGENT', {
              visibility: 'AGENT_SEE_ALL',
              edit: 'CREATOR_ONLY',
            }),
          ),
        );
        expect(item.capabilities.canArchive).toBe(false);
      }
      expect(
        (await all(users.collaborator)).items.every((i) =>
          Object.values(i.capabilities).every((v) => !v),
        ),
      ).toBe(true);
    } finally {
      await client.tenantSetting.update({
        where: { tenantId: ids.a },
        data: {
          propertyVisibilityPolicy: policies.visibility,
          propertyEditPolicy: policies.edit,
        },
      });
    }
  });

  it.each(['active', 'published', 'commercial-draft', 'archived'] as const)(
    'filters commercial status %s without redefining counters',
    async (commercialStatus) => {
      const result = await all(users.agent, { commercialStatus });
      const visible = fixtures.filter((f) => canViewProperty(context(f)));
      const expected = visible.filter((f) =>
        commercialStatus === 'active'
          ? f.isActive
          : commercialStatus === 'published'
            ? publishable(f)
            : commercialStatus === 'archived'
              ? !f.isActive
              : f.isActive && !publishable(f),
      );
      expect(result.items.map((i) => i.id).sort()).toEqual(
        expected.map((f) => f.id).sort(),
      );
      expect(result.commercialCounts).toEqual(counts(visible));
    },
  );

  it('ignores cross-tenant listings, prices, images, features and creator data', async () => {
    const propertyId = fixtureId(6); // No listing or image; foreign relations must not publish it.
    const foreignListing = `${prefix}-corrupt-listing`;
    await client.propertyListing.create({
      data: {
        id: foreignListing,
        propertyId,
        tenantId: ids.b,
        listingType: 'RENT',
        status: 'CLOSED',
      },
    });
    await client.propertyImage.create({
      data: {
        id: `${prefix}-corrupt-image`,
        propertyId,
        tenantId: ids.b,
        storageKey: 'fake',
        isCover: true,
      },
    });
    await client.propertyFeatureAssignment.create({
      data: {
        id: `${prefix}-corrupt-feature`,
        propertyId,
        tenantId: ids.b,
        featureId: ids.feature,
      },
    });
    // p7 is ACTIVE without price: a price owned by B cannot make it published.
    await client.propertyPrice.create({
      data: {
        id: `${prefix}-corrupt-price`,
        listingId: `${fixtureId(7)}-listing`,
        tenantId: ids.b,
        isPrimary: true,
        amount: 1,
        currency: 'USD',
      },
    });
    await client.property.update({
      where: { id: propertyId },
      data: { createdById: users.b.id },
    });
    try {
      const result = await all(users.admin);
      expect(result.commercialCounts).toEqual(counts(fixtures));
      expect(result.items.find((i) => i.id === propertyId)).toMatchObject({
        listingTypes: [],
        isAnyPublishable: false,
        createdBy: null,
        activeListingsCount: 0,
      });
      expect(
        result.items.find((i) => i.id === fixtureId(7))?.isAnyPublishable,
      ).toBe(false);
      for (const attention of [
        'without-images',
        'without-commercialization',
        'without-features',
      ] as const)
        expect(
          (await all(users.admin, { attention })).items.some(
            (i) => i.id === propertyId,
          ),
        ).toBe(true);
    } finally {
      await client.propertyListing.delete({ where: { id: foreignListing } });
      await client.propertyImage.delete({
        where: { id: `${prefix}-corrupt-image` },
      });
      await client.propertyFeatureAssignment.delete({
        where: { id: `${prefix}-corrupt-feature` },
      });
      await client.propertyPrice.delete({
        where: { id: `${prefix}-corrupt-price` },
      });
      await client.property.update({
        where: { id: propertyId },
        data: {
          createdById: fixtures[6].createdById,
          updatedAt: fixtures[6].updatedAt,
        },
      });
    }
  });

  it('selects URL deterministically across operations, independently of listingType filters', async () => {
    const propertyId = fixtureId(0);
    const listingIds = [`${propertyId}-a`, `${propertyId}-b`];
    await client.propertyListing.createMany({
      data: [
        {
          id: listingIds[0],
          propertyId,
          tenantId: ids.a,
          listingType: 'RENT',
          status: 'CLOSED',
          updatedAt: now,
        },
        {
          id: listingIds[1],
          propertyId,
          tenantId: ids.a,
          listingType: 'TEMPORARY_RENT',
          status: 'RESERVED',
          updatedAt: now,
        },
      ],
    });
    await client.propertyListing.update({
      where: { id: `${propertyId}-listing` },
      data: { status: 'DRAFT' },
    });
    try {
      const result = await service.list(
        ids.a,
        users.admin,
        query({
          search: 'P13-0',
          listingType: 'SALE',
          commercialStatus: 'published',
        }),
        now,
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        listingTypes: ['SALE', 'RENT', 'TEMPORARY_RENT'],
        activeListingsCount: 0,
        publicUrl: `https://web.example/propiedades/${propertyId}?listingType=RENT`,
      });
      process.env.PUBLIC_WEB_URL = '';
      try {
        expect(
          (
            await service.list(
              ids.a,
              users.admin,
              query({ search: 'P13-0' }),
              now,
            )
          ).items[0],
        ).toMatchObject({ isAnyPublishable: true, publicUrl: null });
      } finally {
        process.env.PUBLIC_WEB_URL = 'https://web.example';
      }
    } finally {
      await client.propertyListing.deleteMany({
        where: { id: { in: listingIds }, tenantId: ids.a },
      });
      await client.propertyListing.update({
        where: { id: `${propertyId}-listing` },
        data: { status: 'ACTIVE', updatedAt: now },
      });
    }
  });

  it('preserves the inclusive archive threshold and UTF-16 description boundaries in SQL', async () => {
    const f = fixtures[8];
    const threshold = propertyRecentlyArchivedThreshold(now);
    try {
      for (const [updatedAt, expected] of [
        [new Date(threshold.getTime() - 1), false],
        [threshold, true],
        [new Date(now.getTime() + 60000), true],
      ] as const) {
        await client.property.update({
          where: { id: f.id },
          data: { updatedAt },
        });
        expect(
          (
            await all(users.admin, { attention: 'recently-archived' })
          ).items.some((i) => i.id === f.id),
        ).toBe(expected);
      }
    } finally {
      await client.property.update({
        where: { id: f.id },
        data: { updatedAt: f.updatedAt },
      });
    }
    const active = fixtures[0];
    try {
      for (const description of [
        'x'.repeat(39),
        'x'.repeat(40),
        '\ufeff' + '😀'.repeat(20) + '\u00a0',
        '😀'.repeat(19) + 'x',
        '\u0085' + 'x'.repeat(39),
      ]) {
        await client.property.update({
          where: { id: active.id },
          data: { description },
        });
        expect(
          (
            await all(users.admin, { attention: 'without-description' })
          ).items.some((i) => i.id === active.id),
        ).toBe(description.trim().length < 40);
      }
    } finally {
      await client.property.update({
        where: { id: active.id },
        data: { description: active.description, updatedAt: active.updatedAt },
      });
    }
  });

  it.each([20, 50, 100])(
    'paginates at %i without omissions, duplicates or changing counts',
    async (pageSize) => {
      const idsSeen: string[] = [];
      for (
        let page = 1;
        page <= Math.ceil(fixtures.length / pageSize);
        page++
      ) {
        const result = await service.list(
          ids.a,
          users.admin,
          query({ pageSize, page }),
          now,
        );
        idsSeen.push(...result.items.map((i) => i.id));
        expect(result.commercialCounts).toEqual(counts(fixtures));
        expect(result.total).toBe(fixtures.length);
      }
      const expected = [...fixtures]
        .sort(
          (a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime() ||
            a.id.localeCompare(b.id),
        )
        .map((f) => f.id);
      expect(idsSeen).toEqual(expected);
      const outOfRange = await service.list(
        ids.a,
        users.admin,
        query({ page: 1_000_000, pageSize }),
        now,
      );
      expect(outOfRange.page).toBe(Math.ceil(fixtures.length / pageSize));
    },
  );

  it.each(PROPERTY_LIST_SORTS)(
    'sorts %s stably in both directions',
    async (sortBy) => {
      for (const sortOrder of ['asc', 'desc'] as const) {
        const result = await all(users.admin, { sortBy, sortOrder });
        const ranks = [
          'FIELD',
          'HOUSE',
          'COUNTRY_HOUSE',
          'GARAGE',
          'APARTMENT',
          'WAREHOUSE',
          'INDUSTRIAL',
          'COMMERCIAL',
          'OFFICE',
          'OTHER',
          'PH',
          'LAND',
        ];
        const keys = (
          f: (typeof fixtures)[number],
        ): Array<string | number | null> => {
          switch (sortBy) {
            case 'title':
              return [f.title.toLowerCase()];
            case 'updatedAt':
              return [f.updatedAt.getTime()];
            case 'propertyType':
              return [ranks.indexOf(f.propertyType)];
            case 'location':
              return [
                f.localityName.toLowerCase() || null,
                f.neighborhoodName?.toLowerCase() || null,
              ];
            case 'commercialStatus':
              return [publishable(f) ? 0 : f.isActive ? 1 : 2];
            case 'createdBy':
              return [f.createdById === users.agent.id ? 'agent' : 'admin'];
          }
        };
        const expected = [...fixtures].sort((a, b) => {
          const ak = keys(a),
            bk = keys(b);
          for (let i = 0; i < ak.length; i++) {
            const x = ak[i],
              y = bk[i];
            if (x === y) continue;
            if (x === null) return 1;
            if (y === null) return -1;
            const comparison =
              typeof x === 'string' && typeof y === 'string'
                ? Buffer.compare(Buffer.from(x), Buffer.from(y))
                : Number(x) - Number(y);
            if (comparison)
              return sortOrder === 'asc' ? comparison : -comparison;
          }
          return a.id.localeCompare(b.id);
        });
        expect(result.items.map((i) => i.id)).toEqual(
          expected.map((f) => f.id),
        );
      }
    },
  );

  it('returns canonical empty pages, including an empty authorized universe', async () => {
    expect(
      await service.list(ids.empty, users.super, query({ page: 999 }), now),
    ).toEqual({
      items: [],
      total: 0,
      totalPages: 0,
      page: 1,
      pageSize: 20,
      commercialCounts: {
        all: 0,
        active: 0,
        archived: 0,
        published: 0,
        commercialDraft: 0,
      },
    });
    const filtered = await all(users.agent, { search: 'no-match', page: 999 });
    expect(filtered).toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });
    expect(filtered.commercialCounts).toEqual(
      counts(fixtures.filter((f) => canViewProperty(context(f)))),
    );
  });

  it('keeps policies, rows and counts on one snapshot during concurrent writes', async () => {
    const read = repository.read.bind(
      repository,
    ) as PropertyListRepository['read'];
    const interception = jest
      .spyOn(repository, 'read')
      .mockImplementationOnce(async (...args) => {
        await client.tenantSetting.update({
          where: { tenantId: ids.a },
          data: { propertyVisibilityPolicy: 'AGENT_SEE_ALL' },
        });
        await client.property.update({
          where: { id: fixtureId(0) },
          data: { isActive: false },
        });
        return read(...args);
      });
    try {
      const result = await service.list(
        ids.a,
        users.agent,
        query({ pageSize: 100 }),
        now,
      );
      expect(result.commercialCounts).toEqual(
        counts(fixtures.filter((f) => canViewProperty(context(f)))),
      );
      expect(result.items.find((i) => i.id === fixtureId(0))?.isActive).toBe(
        true,
      );
    } finally {
      interception.mockRestore();
      await client.property.update({
        where: { id: fixtureId(0) },
        data: {
          isActive: fixtures[0].isActive,
          updatedAt: fixtures[0].updatedAt,
        },
      });
      await client.tenantSetting.update({
        where: { tenantId: ids.a },
        data: { propertyVisibilityPolicy: policies.visibility },
      });
    }
  });

  it('measures real HTTP baseline vs 20/50/100 and enforces bounded SQL', async () => {
    const baselinePaths = [
      '/properties',
      '/properties/publishability-summary',
      '/property-listings?status=ACTIVE',
    ];
    const rows: Array<Record<string, unknown>> = [];
    const cases: Array<readonly [string, readonly string[]]> = [
      ['legacy', baselinePaths],
      ['legacy-attention', [...baselinePaths, '/admin/dashboard/summary']],
      ...[20, 50, 100].map(
        (size) =>
          [`list-${size}`, [`/properties/list?pageSize=${size}`]] as const,
      ),
    ];
    for (const [name, paths] of cases) {
      // Warm each route once; report individual measured samples, never estimates.
      await Promise.all(paths.map((path) => get(path).expect(200)));
      const samples: Array<{
        elapsedMs: number;
        ormOperations: number;
        sqlStatements: number;
        prismaQueryEvents: number;
        sqlSelects: number;
        databaseRows: number;
        payloadBytes: number;
        responseItems: number;
      }> = [];
      for (let run = 0; run < 3; run++) {
        sql.length = 0;
        operations = 0;
        driverStatements.length = 0;
        databaseRows = 0;
        const started = performance.now();
        const responses = await Promise.all(
          paths.map((path) => get(path).expect(200)),
        );
        const elapsedMs = performance.now() - started;
        samples.push({
          elapsedMs: Math.round(elapsedMs * 100) / 100,
          ormOperations: operations,
          sqlStatements: driverStatements.length,
          prismaQueryEvents: sql.length,
          sqlSelects: driverStatements.filter((s) =>
            /^\s*(SELECT|WITH)/i.test(s),
          ).length,
          databaseRows,
          payloadBytes: responses.reduce(
            (n, r) => n + Buffer.byteLength(r.text),
            0,
          ),
          responseItems: responses.reduce(
            (n, r) =>
              n +
              (Array.isArray(r.body)
                ? r.body.length
                : ((r.body as PropertyListResponse).items?.length ?? 0)),
            0,
          ),
        });
      }
      rows.push({ name, requests: paths.length, samples });
    }
    const pages = rows.filter((r) => String(r.name).startsWith('list-'));
    const statementCounts = pages.map(
      (r) => (r.samples as Array<{ sqlStatements: number }>)[0].sqlStatements,
    );
    expect(new Set(statementCounts).size).toBe(1);
    expect(statementCounts[0]).toBeLessThan(12);
    const report = {
      fixtureProperties: fixtures.length,
      fixtureListings: fixtures.filter((f) => f.listingStatus).length,
      region: 'sa-east-1',
      transport: 'supertest HTTP in-process, remote PostgreSQL',
      includesGuards: true,
      coldStart: false,
      rows,
    };
    console.info('PROPERTY_LIST_MEASUREMENTS', JSON.stringify(report));
    if (process.env.PROPERTY_LIST_REPORT_PATH)
      writeFileSync(
        process.env.PROPERTY_LIST_REPORT_PATH,
        JSON.stringify(report, null, 2),
      );
  });
});
