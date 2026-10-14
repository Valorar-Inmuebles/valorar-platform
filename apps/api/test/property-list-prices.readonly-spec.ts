import 'reflect-metadata';
import { Client } from 'pg';
import { Prisma } from '../generated/prisma/client';
import { PropertyListRepository } from '../src/modules/property/repositories/property-list.repository';
import { PropertyListQueryDto } from '../src/modules/property/dto/property-list-query.dto';

// Run with the existing PostgreSQL config/setup, overriding testMatch to this file.
// Fixtures are statement-local CTEs using the real table composite types. No DDL,
// INSERT, UPDATE, DELETE or temporary tables; the connection is READ ONLY too.
const tables = [
  'Property',
  'PropertyListing',
  'PropertyPrice',
  'PropertyImage',
  'User',
  'Locality',
  'Neighborhood',
  'PropertyAgentAccess',
  'PropertyFeatureAssignment',
] as const;
type Fixtures = Partial<
  Record<(typeof tables)[number], Record<string, unknown>[]>
>;
const property = (id = 'p', patch: Record<string, unknown> = {}) => ({
  id,
  tenantId: 'tenant-a',
  title: id,
  slug: id,
  propertyType: 'HOUSE',
  isActive: true,
  city: 'Rosario',
  createdById: 'user',
  updatedAt: '2026-10-13T00:00:00Z',
  ...patch,
});
const listing = (status = 'ACTIVE', patch: Record<string, unknown> = {}) => ({
  id: 'listing',
  tenantId: 'tenant-a',
  propertyId: 'p',
  listingType: 'SALE',
  status,
  updatedAt: '2026-10-13T00:00:00Z',
  ...patch,
});
const price = (patch: Record<string, unknown> = {}) => ({
  id: 'primary',
  tenantId: 'tenant-a',
  listingId: 'listing',
  isPrimary: true,
  amount: 150000.25,
  currency: 'USD',
  createdAt: '2026-10-13T00:00:00Z',
  ...patch,
});
const cover = (patch: Record<string, unknown> = {}) => ({
  id: 'cover',
  tenantId: 'tenant-a',
  propertyId: 'p',
  isCover: true,
  ...patch,
});

describe('Property list prices — real PostgreSQL, statement-local fixtures, zero writes', () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    options: '-c default_transaction_read_only=on -c statement_timeout=10000',
  });
  const repository = new PropertyListRepository();
  beforeAll(async () => {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { rows } = await client.query<{
      project: string;
      branch: string;
      endpoint: string;
      database: string;
      readonly: string;
    }>(`SELECT current_setting('neon.project_id') AS project,
      current_setting('neon.branch_id') AS branch,
      current_setting('neon.endpoint_id') AS endpoint,
      current_database() AS database, current_setting('transaction_read_only') AS readonly`);
    expect(rows[0]).toEqual({
      project: 'square-lab-71259415',
      branch: process.env.PROPERTY_LIST_TEST_BRANCH_ID,
      endpoint: new URL(process.env.DATABASE_URL!).hostname
        .split('.')[0]
        .replace('-pooler', ''),
      database: 'neondb',
      readonly: 'on',
    });
  });
  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  async function read(
    fixtures: Fixtures = {},
    patch: Partial<PropertyListQueryDto> = {},
  ) {
    const data: Fixtures = {
      Property: [property()],
      PropertyListing: [listing()],
      PropertyPrice: [price()],
      PropertyImage: [cover()],
      ...fixtures,
    };
    const queryRaw = jest.fn(async (sql: Prisma.Sql) => {
      const values: unknown[] = [...sql.values];
      const ctes = tables.map((table) => {
        values.push(JSON.stringify(data[table] ?? []));
        return `"${table}" AS (SELECT * FROM jsonb_populate_recordset(NULL::public."${table}", $${values.length}::jsonb))`;
      });
      const text = sql.text.replace(/^\s*WITH\s+/, `WITH ${ctes.join(', ')}, `);
      return (await client.query(text, values)).rows as unknown[];
    });
    const result = await repository.read(
      { $queryRaw: queryRaw } as unknown as Prisma.TransactionClient,
      'tenant-a',
      'user',
      Prisma.sql`p."tenantId" = ${'tenant-a'}`,
      Object.assign(new PropertyListQueryDto(), patch),
      new Date('2026-10-13T00:00:00Z'),
    );
    expect(queryRaw).toHaveBeenCalledTimes(1);
    return result;
  }

  it('projects only the primary USD price, never secondary prices or full relations', async () => {
    const result = await read({
      PropertyPrice: [
        price(),
        price({ id: 'secondary', amount: 999999, isPrimary: false }),
      ],
    });
    expect(result.items[0].publishedOperations).toEqual([
      {
        listingType: 'SALE',
        primaryPrice: { amount: 150000.25, currency: 'USD' },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('999999');
    expect(result.items[0]).not.toHaveProperty('prices');
  });
  it('projects multiple operations and ARS rental, retaining existing type/count semantics', async () => {
    const result = await read({
      PropertyListing: [
        listing(),
        listing('ACTIVE', { id: 'rent', listingType: 'RENT' }),
        listing('PAUSED', { id: 'temp', listingType: 'TEMPORARY_RENT' }),
      ],
      PropertyPrice: [
        price(),
        price({
          id: 'rent-price',
          listingId: 'rent',
          currency: 'ARS',
          amount: 850000,
        }),
        price({ id: 'temp-price', listingId: 'temp' }),
      ],
    });
    expect(result.items[0].publishedOperations).toEqual([
      {
        listingType: 'SALE',
        primaryPrice: { amount: 150000.25, currency: 'USD' },
      },
      {
        listingType: 'RENT',
        primaryPrice: { amount: 850000, currency: 'ARS' },
      },
    ]);
    expect(result.items[0].listingTypes).toEqual([
      'SALE',
      'RENT',
      'TEMPORARY_RENT',
    ]);
    expect(result.items[0].activeListingsCount).toBe(2);
  });
  it.each(['RESERVED', 'CLOSED'])(
    '%s without primary is published with null price',
    async (status) => {
      const result = await read({
        PropertyListing: [listing(status)],
        PropertyPrice: [price({ isPrimary: false })],
      });
      expect(result.items[0].publishedOperations).toEqual([
        { listingType: 'SALE', primaryPrice: null },
      ]);
      expect(result.items[0].statusVariant).toBe('published');
    },
  );
  it.each(['DRAFT', 'PAUSED'])(
    '%s never exposes even a primary price',
    async (status) => {
      const result = await read({ PropertyListing: [listing(status)] });
      expect(result.items[0].publishedOperations).toEqual([]);
    },
  );
  it('ACTIVE with only secondary prices is not publicable', async () => {
    const result = await read({ PropertyPrice: [price({ isPrimary: false })] });
    expect(result.items[0].publishedOperations).toEqual([]);
  });
  it.each([
    { Property: [property('p', { isActive: false })] },
    { PropertyImage: [] },
    { PropertyImage: [cover({ isCover: false })] },
    { PropertyImage: [cover({ tenantId: 'tenant-b' })] },
    { PropertyListing: [listing('ACTIVE', { tenantId: 'tenant-b' })] },
    { PropertyPrice: [price({ tenantId: 'tenant-b' })] },
  ])(
    'does not leak nonpublicable or foreign-tenant operations: %j',
    async (fixtures) => {
      const result = await read(fixtures);
      expect(result.items[0].publishedOperations).toEqual([]);
    },
  );
  it('never projects a foreign-tenant price even for RESERVED', async () => {
    const result = await read({
      PropertyListing: [listing('RESERVED')],
      PropertyPrice: [price({ tenantId: 'tenant-b' })],
    });
    expect(result.items[0].publishedOperations).toEqual([
      { listingType: 'SALE', primaryPrice: null },
    ]);
  });
  it('defensively keeps one operation/count if legacy data has two primary prices', async () => {
    const result = await read({
      PropertyPrice: [price(), price({ id: 'z-duplicate', amount: 999999 })],
    });
    expect(result.items[0].publishedOperations).toHaveLength(1);
    expect(result.items[0].publishedOperations[0].primaryPrice?.amount).toBe(
      150000.25,
    );
    expect(result.items[0].activeListingsCount).toBe(1);
  });
  it.each([20, 50, 100] as const)(
    'keeps one SQL call for %s rows, server pagination, sorting and counts',
    async (pageSize) => {
      const properties = Array.from({ length: 105 }, (_, i) =>
        property(`p${String(i).padStart(3, '0')}`),
      );
      const fixtures = {
        Property: [
          ...properties,
          property('foreign', { tenantId: 'tenant-b' }),
        ],
        PropertyListing: properties.map((p) =>
          listing('ACTIVE', { id: p.id, propertyId: p.id }),
        ),
        PropertyImage: properties.map((p) =>
          cover({ id: p.id, propertyId: p.id }),
        ),
        PropertyPrice: properties.map((p) =>
          price({ id: p.id, listingId: p.id }),
        ),
      };
      const result = await read(fixtures, {
        pageSize,
        page: 2,
        sortBy: 'title',
        sortOrder: 'asc',
        commercialStatus: 'published',
      });
      expect(result.total).toBe(105);
      expect(result.commercialCounts.published).toBe(105);
      expect(result.items).toHaveLength(Math.min(pageSize, 105 - pageSize));
      expect(result.items[0].id).toBe(`p${String(pageSize).padStart(3, '0')}`);
      expect(
        result.items.every((item) => item.publishedOperations.length === 1),
      ).toBe(true);
    },
  );
});
