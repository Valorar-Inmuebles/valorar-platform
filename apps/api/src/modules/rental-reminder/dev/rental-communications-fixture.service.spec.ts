jest.mock('../../../../generated/prisma/client', () => ({
  UserRole: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    TENANT_ADMIN: 'TENANT_ADMIN',
    MANAGER: 'MANAGER',
    AGENT: 'AGENT',
    COLLABORATOR: 'COLLABORATOR',
  },
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  Currency: { ARS: 'ARS', USD: 'USD' },
  RentalConceptSystemCode: {
    RENT: 'RENT',
    EXPENSES: 'EXPENSES',
    ELECTRICITY: 'ELECTRICITY',
    GAS: 'GAS',
    ABL: 'ABL',
    AYSA: 'AYSA',
    INSURANCE: 'INSURANCE',
  },
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
  RentalAmountMode: { FIXED: 'FIXED', VARIABLE: 'VARIABLE' },
  RentalDueMode: {
    FIXED_DAY: 'FIXED_DAY',
    MANUAL_PER_PERIOD: 'MANUAL_PER_PERIOD',
  },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
  RentalReminderEventType: {
    PRE_DUE: 'PRE_DUE',
    DUE: 'DUE',
    POST_DUE: 'POST_DUE',
  },
  RentalReminderPlanningIssueType: {
    DUE_DATE_MISSING: 'DUE_DATE_MISSING',
    DISPLAY_AMOUNT_MISSING: 'DISPLAY_AMOUNT_MISSING',
    NO_ENABLED_ROUTE: 'NO_ENABLED_ROUTE',
    CONTACT_POINT_INELIGIBLE: 'CONTACT_POINT_INELIGIBLE',
    TENANT_TIME_ZONE_MISSING_OR_INVALID: 'TENANT_TIME_ZONE_MISSING_OR_INVALID',
    PROVIDER_CONFIGURATION_INVALID: 'PROVIDER_CONFIGURATION_INVALID',
    PROVIDER_TEMPLATE_INVALID: 'PROVIDER_TEMPLATE_INVALID',
    PLANNING_WINDOW_EXPIRED: 'PLANNING_WINDOW_EXPIRED',
  },
  RentalReminderPlanningIssueStatus: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
  RentalReminderDispatchOccurrenceStatus: {
    INCLUDED: 'INCLUDED',
    EXCLUDED_BEFORE_SEND: 'EXCLUDED_BEFORE_SEND',
  },
  RentalReminderStatusSource: {
    INTERNAL: 'INTERNAL',
    PROVIDER_RESPONSE: 'PROVIDER_RESPONSE',
    PROVIDER_WEBHOOK: 'PROVIDER_WEBHOOK',
  },
  RentalReminderAttemptStatus: {
    PROCESSING: 'PROCESSING',
    ACCEPTED: 'ACCEPTED',
    FAILED: 'FAILED',
  },
  RentalReminderDeliveryStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
  RentalReminderDispatchStatus: {
    PLANNED: 'PLANNED',
    READY: 'READY',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../prisma/prisma.service';
import { RentalCommunicationsFixtureService } from './rental-communications-fixture.service';

const TENANT_ID = 'tenant-demo-123';
const ADMIN_USER_ID = 'user-admin-123';

const DEVELOPMENT_ENV = {
  DATABASE_URL:
    'postgresql://user:pass@ep-super-glade-ac3ywgv7-pooler.neon.tech/neondb',
  VALORAR_DATABASE_ENV: 'development',
  NODE_ENV: 'development',
} as const;

const PROTECTED_ENV = {
  DATABASE_URL:
    'postgresql://user:pass@ep-mute-sun-ac6nva0v-pooler.neon.tech/neondb',
  VALORAR_DATABASE_ENV: 'development',
  NODE_ENV: 'development',
} as const;

const PRODUCTION_ENV = {
  DATABASE_URL:
    'postgresql://user:pass@ep-super-glade-ac3ywgv7-pooler.neon.tech/neondb',
  VALORAR_DATABASE_ENV: 'production',
  NODE_ENV: 'production',
} as const;

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion */

function createTxStub() {
  const pair = () => ({
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
  });
  return {
    communicationInboundMessage: pair(),
    rentalReminderDeliveryAttempt: pair(),
    rentalReminderDispatchOccurrence: pair(),
    rentalReminderDelivery: pair(),
    rentalReminderDispatch: pair(),
    rentalReminderPlanningIssue: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'fx-c4c-issue' }),
    },
    rentalObligationOccurrence: pair(),
    rentalObligation: pair(),
    rentalContractNotificationRoute: pair(),
    rentalContractParty: pair(),
    rentalContract: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'fx-c4c-contract-1' }),
    },
    contactPoint: pair(),
    contact: pair(),
    rentalConcept: pair(),
    rentalReminderPolicy: { upsert: jest.fn().mockResolvedValue({}) },
    tenantSetting: { upsert: jest.fn().mockResolvedValue({}) },
    rentalContractSequence: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

const SUMMARY_COUNTS = [2, 3, 2, 1, 1, 2];

function createPrismaMock(options?: {
  tenant?: unknown;
  admin?: unknown;
  timeZone?: string | null;
  province?: unknown;
  locality?: unknown;
}) {
  const tx = createTxStub();
  const hasTenant = options && 'tenant' in options;
  const hasAdmin = options && 'admin' in options;
  const hasTimeZone = options && 'timeZone' in options;
  const hasProvince = options && 'province' in options;
  const hasLocality = options && 'locality' in options;
  const prisma = {
    tenant: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          hasTenant ? options!.tenant : { id: TENANT_ID, slug: 'demo' },
        ),
    },
    user: {
      findFirst: jest
        .fn()
        .mockResolvedValue(hasAdmin ? options!.admin : { id: ADMIN_USER_ID }),
    },
    tenantSetting: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          hasTimeZone
            ? options!.timeZone === null
              ? null
              : { timeZone: options!.timeZone }
            : { timeZone: 'America/Argentina/Buenos_Aires' },
        ),
    },
    province: {
      findFirst: jest.fn().mockResolvedValue(
        hasProvince
          ? options!.province
          : {
              id: 'province-caba',
              countryId: 'country-ar',
              name: 'Capital Federal',
            },
      ),
    },
    locality: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          hasLocality
            ? options!.locality
            : { id: 'locality-palermo', name: 'Palermo' },
        ),
    },
    rentalReminderDispatch: {
      count: jest.fn().mockResolvedValue(SUMMARY_COUNTS[0]),
    },
    rentalReminderDelivery: {
      count: jest
        .fn()
        .mockResolvedValueOnce(SUMMARY_COUNTS[1])
        .mockResolvedValueOnce(SUMMARY_COUNTS[2])
        .mockResolvedValueOnce(SUMMARY_COUNTS[3]),
    },
    rentalReminderPlanningIssue: {
      count: jest.fn().mockResolvedValue(SUMMARY_COUNTS[4]),
    },
    communicationInboundMessage: {
      count: jest.fn().mockResolvedValue(SUMMARY_COUNTS[5]),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (arg: unknown): Promise<unknown> => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(tx);
        }
        const queries = arg as Array<{ count?: () => Promise<unknown> }>;
        return Promise.all(
          queries.map((query) =>
            typeof query.count === 'function'
              ? Promise.resolve(query.count())
              : Promise.resolve(query),
          ),
        );
      }),
  };
  return { prisma: prisma as any, tx };
}

function createService(prisma: any) {
  return new RentalCommunicationsFixtureService(prisma as PrismaService);
}

describe('RentalCommunicationsFixtureService.run', () => {
  it('rejects a non-development database target without touching prisma', async () => {
    const { prisma } = createPrismaMock();
    const service = createService(prisma);
    const result = await service.run({
      apply: false,
      environment: { ...PRODUCTION_ENV },
      baselineDatabaseUrl: 'postgresql://baseline',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects the protected production endpoint', async () => {
    const { prisma } = createPrismaMock();
    const service = createService(prisma);
    const result = await service.run({
      apply: false,
      environment: { ...PROTECTED_ENV },
      baselineDatabaseUrl: 'postgresql://baseline',
    });
    expect(result.ok).toBe(false);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('fails when the demo tenant is missing', async () => {
    const { prisma } = createPrismaMock({ tenant: null });
    const service = createService(prisma);
    const result = await service.run({
      apply: false,
      environment: { ...DEVELOPMENT_ENV },
    });
    expect(result.ok).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails when the demo admin is missing', async () => {
    const { prisma } = createPrismaMock({ admin: null });
    const service = createService(prisma);
    const result = await service.run({
      apply: false,
      environment: { ...DEVELOPMENT_ENV },
    });
    expect(result.ok).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails clearly when the canonical fixture province is missing', async () => {
    const { prisma } = createPrismaMock({ province: null });
    const service = createService(prisma);

    await expect(
      service.run({
        apply: false,
        environment: { ...DEVELOPMENT_ENV },
      }),
    ).rejects.toThrow(
      'C4C fixture Geo reference not found: Province "Capital Federal" is required.',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dry-run returns the report without writing anything', async () => {
    const { prisma } = createPrismaMock();
    const service = createService(prisma);
    const result = await service.run({
      apply: false,
      now: new Date('2026-09-23T14:30:00.000Z'),
      environment: { ...DEVELOPMENT_ENV },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('dry-run');
    expect(result.report.tenantSlug).toBe('demo');
    expect(result.report.rows).toEqual({
      concepts: 2,
      contacts: 2,
      contactPoints: 2,
      contract: 1,
      parties: 2,
      routes: 2,
      obligations: 2,
      occurrences: 2,
      dispatches: 2,
      dispatchOccurrences: 2,
      deliveries: 4,
      attempts: 4,
      planningIssue: 1,
      inbound: 3,
    });
    expect(result.report.expectedSummary).toEqual({
      dispatchesScheduledToday: 2,
      deliveriesSentToday: 3,
      deliveriesDeliveredToday: 2,
      deliveriesFailedToday: 1,
      planningIssuesOpen: 1,
      inboundUnacknowledged: 2,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('apply cleans scoped fixture rows, upserts and writes in one transaction', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = createService(prisma);
    const result = await service.run({
      apply: true,
      now: new Date('2026-09-23T14:30:00.000Z'),
      environment: { ...DEVELOPMENT_ENV },
      baselineDatabaseUrl: 'postgresql://baseline',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('applied');
    expect(result.report.verified).toBe(true);
    expect(result.report.verifiedSummary).toEqual({
      dispatchesScheduledToday: 2,
      deliveriesSentToday: 3,
      deliveriesDeliveredToday: 2,
      deliveriesFailedToday: 1,
      planningIssuesOpen: 1,
      inboundUnacknowledged: 2,
    });

    // One transaction, cleanup first, then upserts and creates.
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.rentalConcept.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.contact.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalContractNotificationRoute.deleteMany).toHaveBeenCalledTimes(
      1,
    );
    expect(tx.rentalReminderPlanningIssue.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDispatch.deleteMany).toHaveBeenCalledTimes(1);
    expect(
      tx.rentalReminderDispatchOccurrence.deleteMany,
    ).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDelivery.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDeliveryAttempt.deleteMany).toHaveBeenCalledTimes(
      1,
    );
    expect(tx.communicationInboundMessage.deleteMany).toHaveBeenCalledTimes(1);

    // Cleanup is scoped by tenantId + fixture ids.
    const conceptDelete = tx.rentalConcept.deleteMany.mock.calls[0][0] as any;
    expect(conceptDelete.where.tenantId).toBe(TENANT_ID);
    expect(conceptDelete.where.id.in).toContain('fx-c4c-concept-rent');
    expect(conceptDelete.where.id.in).toContain('fx-c4c-concept-expenses');
    const deliveryDelete = tx.rentalReminderDelivery.deleteMany.mock
      .calls[0][0] as any;
    expect(deliveryDelete.where.id.in).toContain(
      'fx-c4c-delivery-due-whatsapp',
    );

    // Upserts: policy by tenantId, tenantSetting timezone, sequence >= 1.
    expect(tx.rentalReminderPolicy.upsert).toHaveBeenCalledTimes(1);
    const policyUpsert = tx.rentalReminderPolicy.upsert.mock.calls[0][0] as any;
    expect(policyUpsert.where.tenantId).toBe(TENANT_ID);
    expect(policyUpsert.update.sendTimeMinutes).toBe(600);
    expect(tx.tenantSetting.upsert).toHaveBeenCalledTimes(1);
    expect(tx.rentalContractSequence.findUnique).toHaveBeenCalledTimes(1);
    const sequenceUpsert = tx.rentalContractSequence.upsert.mock
      .calls[0][0] as any;
    expect(sequenceUpsert.create.lastValue).toBe(1);
    expect(sequenceUpsert.create.tenantId).toBe(TENANT_ID);

    // All fixture rows written with deterministic ids and tenantId.
    expect(tx.rentalConcept.createMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalContract.create).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDispatch.createMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDelivery.createMany).toHaveBeenCalledTimes(1);
    expect(tx.rentalReminderDeliveryAttempt.createMany).toHaveBeenCalledTimes(
      1,
    );
    expect(tx.communicationInboundMessage.createMany).toHaveBeenCalledTimes(1);
    const delivered = tx.rentalReminderDelivery.createMany.mock
      .calls[0][0] as any;
    expect(delivered.data).toHaveLength(4);
    for (const row of delivered.data) {
      expect(row.id).toMatch(/^fx-c4c-/);
      expect(row.tenantId).toBe(TENANT_ID);
      expect(row.statusSource).toBe('INTERNAL');
    }
  });

  it('re-running apply produces the same deterministic scenario (no duplicates)', async () => {
    const first = createPrismaMock();
    const second = createPrismaMock();
    const serviceA = createService(first.prisma);
    const serviceB = createService(second.prisma);
    const now = new Date('2026-09-23T14:30:00.000Z');
    const runA = await serviceA.run({
      apply: true,
      now,
      environment: { ...DEVELOPMENT_ENV },
    });
    const runB = await serviceB.run({
      apply: true,
      now,
      environment: { ...DEVELOPMENT_ENV },
    });
    expect(runA.ok && runB.ok).toBe(true);
    if (!runA.ok || !runB.ok) return;
    // Same report/rows and cleanup of the same fixture ids on every run.
    expect(runB.report.rows).toEqual(runA.report.rows);
    const deliveriesA = first.tx.rentalReminderDelivery.createMany.mock
      .calls[0][0] as any;
    const deliveriesB = second.tx.rentalReminderDelivery.createMany.mock
      .calls[0][0] as any;
    expect(deliveriesA.data.map((row: any) => row.id)).toEqual(
      deliveriesB.data.map((row: any) => row.id),
    );
  });

  it('verifies counts after apply and reports verified=false on mismatch', async () => {
    const { prisma } = createPrismaMock();
    prisma.rentalReminderDelivery.count.mockReset();
    prisma.rentalReminderDelivery.count.mockResolvedValueOnce(1); // sent
    prisma.rentalReminderDelivery.count.mockResolvedValueOnce(1); // delivered
    prisma.rentalReminderDelivery.count.mockResolvedValueOnce(0); // failed
    const service = createService(prisma);
    const result = await service.run({
      apply: true,
      now: new Date('2026-09-23T14:30:00.000Z'),
      environment: { ...DEVELOPMENT_ENV },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.verified).toBe(false);
  });
});
