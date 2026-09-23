import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RentalReminderPlanningIssueStatus,
  UserRole,
} from '../../../../generated/prisma/client';
import { validateDevelopmentDatabaseTarget } from '../../../common/safety/development-database-safety';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEMO_TENANT_SLUG } from '../../../../prisma/seed-data';
import {
  buildRentalCommunicationsFixturePlan,
  RENTAL_FIXTURE_ADMIN_EMAIL,
  RENTAL_FIXTURE_TIME_ZONE,
  RentalCommunicationsFixturePlan,
  RentalCommunicationsFixtureSummary,
  RentalFixtureGeoReference,
} from './rental-communications-fixture.plan';

export type RentalCommunicationsFixtureRunResult =
  | {
      ok: true;
      mode: 'dry-run' | 'applied';
      report: RentalCommunicationsFixtureReport;
    }
  | { ok: false; errors: string[] };

export type RentalCommunicationsFixtureReport = {
  fixture: 'rental-communications-v1-c4c';
  mode: 'dry-run' | 'applied';
  tenantId: string;
  tenantSlug: string;
  adminUserId: string;
  now: string;
  timeZone: string;
  window: { from: string; to: string };
  rows: {
    concepts: number;
    contacts: number;
    contactPoints: number;
    contract: number;
    parties: number;
    routes: number;
    obligations: number;
    occurrences: number;
    dispatches: number;
    dispatchOccurrences: number;
    deliveries: number;
    attempts: number;
    planningIssue: number;
    inbound: number;
  };
  upserts: { policy: boolean; tenantSetting: boolean; sequence: boolean };
  fixtureIds: RentalCommunicationsFixturePlan['fixtureIds'];
  expectedSummary: RentalCommunicationsFixtureSummary;
  verifiedSummary?: RentalCommunicationsFixtureSummary;
  verified?: boolean;
};

@Injectable()
export class RentalCommunicationsFixtureService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Canonical, reproducible and idempotent Rental Communications fixture
   * (C4C) for visual UAT on the isolated development database.
   *
   * - Reuses `validateDevelopmentDatabaseTarget` and refuses the protected
   *   production endpoint / baseline / non-development environments.
   * - Targets only the seed demo tenant (resolved by slug) and the seed admin
   *   (resolved by email + tenantId + TENANT_ADMIN).
   * - `apply=false` (default) returns a dry-run report without any write.
   * - `apply=true` deletes only fixture rows (tenant-scoped `fx-c4c-*` ids) and
   *   re-creates the deterministic scenario inside a single transaction, then
   *   verifies the current-day communications summary counts.
   */
  async run(
    input: {
      apply: boolean;
      now?: Date;
      environment?: NodeJS.ProcessEnv;
      baselineDatabaseUrl?: string | null;
    } = DEFAULT_INPUT,
  ): Promise<RentalCommunicationsFixtureRunResult> {
    const environment = input.environment ?? process.env;
    const guard = validateDevelopmentDatabaseTarget({
      databaseUrl: environment.DATABASE_URL,
      databaseEnvironment: environment.VALORAR_DATABASE_ENV,
      nodeEnvironment: environment.NODE_ENV,
      baselineDatabaseUrl: input.baselineDatabaseUrl ?? undefined,
    });
    if (!guard.ok) {
      return { ok: false, errors: guard.errors };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: DEMO_TENANT_SLUG },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      return {
        ok: false,
        errors: [
          `Demo tenant not found (slug "${DEMO_TENANT_SLUG}"). Run "npm run db:dev:seed -w api" first.`,
        ],
      };
    }

    const admin = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: RENTAL_FIXTURE_ADMIN_EMAIL,
        role: UserRole.TENANT_ADMIN,
      },
      select: { id: true },
    });
    if (!admin) {
      return {
        ok: false,
        errors: [
          `Demo admin not found (${RENTAL_FIXTURE_ADMIN_EMAIL}, TENANT_ADMIN on demo). Run "npm run db:dev:seed -w api" first.`,
        ],
      };
    }

    const setting = await this.prisma.tenantSetting.findUnique({
      where: { tenantId: tenant.id },
      select: { timeZone: true },
    });
    const timeZone = setting?.timeZone ?? RENTAL_FIXTURE_TIME_ZONE;
    const now = input.now ?? new Date();
    const geo = await this.resolveFixtureGeo();

    const plan = buildRentalCommunicationsFixturePlan({
      tenantId: tenant.id,
      adminUserId: admin.id,
      now,
      timeZone,
      geo,
    });

    if (!input.apply) {
      return {
        ok: true,
        mode: 'dry-run',
        report: buildReport(plan),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await cleanupFixtureRows(tx, plan);
      await writeFixtureUpserts(tx, plan);
      await writeFixtureRows(tx, plan);
    });

    const verifiedSummary = await this.countSummary(
      tenant.id,
      plan.from,
      plan.to,
    );
    const verified = summariesMatch(plan.expectedSummary, verifiedSummary);

    return {
      ok: true,
      mode: 'applied',
      report: { ...buildReport(plan), verifiedSummary, verified },
    };
  }

  private async countSummary(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<RentalCommunicationsFixtureSummary> {
    const [
      dispatchesScheduledToday,
      deliveriesSentToday,
      deliveriesDeliveredToday,
      deliveriesFailedToday,
      planningIssuesOpen,
      inboundUnacknowledged,
    ] = await this.prisma.$transaction([
      this.prisma.rentalReminderDispatch.count({
        where: { tenantId, scheduledFor: { gte: from, lt: to } },
      }),
      this.prisma.rentalReminderDelivery.count({
        where: { tenantId, sentAt: { gte: from, lt: to } },
      }),
      this.prisma.rentalReminderDelivery.count({
        where: { tenantId, deliveredAt: { gte: from, lt: to } },
      }),
      this.prisma.rentalReminderDelivery.count({
        where: { tenantId, failedAt: { gte: from, lt: to } },
      }),
      this.prisma.rentalReminderPlanningIssue.count({
        where: { tenantId, status: RentalReminderPlanningIssueStatus.OPEN },
      }),
      this.prisma.communicationInboundMessage.count({
        where: { tenantId, acknowledgedAt: null },
      }),
    ]);
    return {
      dispatchesScheduledToday,
      deliveriesSentToday,
      deliveriesDeliveredToday,
      deliveriesFailedToday,
      planningIssuesOpen,
      inboundUnacknowledged,
    };
  }

  private async resolveFixtureGeo(): Promise<RentalFixtureGeoReference> {
    const province = await this.prisma.province.findFirst({
      where: { name: 'Capital Federal' },
      select: { id: true, countryId: true, name: true },
    });
    if (!province) {
      throw new Error(
        'C4C fixture Geo reference not found: Province "Capital Federal" is required.',
      );
    }

    const locality = await this.prisma.locality.findFirst({
      where: { provinceId: province.id, name: 'Palermo' },
      select: { id: true, name: true },
    });
    if (!locality) {
      throw new Error(
        'C4C fixture Geo reference not found: Locality "Palermo" is required under Province "Capital Federal".',
      );
    }

    return {
      countryId: province.countryId,
      provinceId: province.id,
      provinceName: province.name,
      localityId: locality.id,
      localityName: locality.name,
    };
  }
}

const DEFAULT_INPUT = {
  apply: false,
} as const;

function buildReport(
  plan: RentalCommunicationsFixturePlan,
): RentalCommunicationsFixtureReport {
  const rows = {
    concepts: plan.concepts.length,
    contacts: plan.contacts.length,
    contactPoints: plan.contactPoints.length,
    contract: 1,
    parties: plan.parties.length,
    routes: plan.routes.length,
    obligations: plan.obligations.length,
    occurrences: plan.occurrences.length,
    dispatches: plan.dispatches.length,
    dispatchOccurrences: plan.dispatchOccurrences.length,
    deliveries: plan.deliveries.length,
    attempts: plan.attempts.length,
    planningIssue: 1,
    inbound: plan.inbound.length,
  };
  return {
    fixture: 'rental-communications-v1-c4c',
    mode: 'dry-run',
    tenantId: plan.tenantId,
    tenantSlug: DEMO_TENANT_SLUG,
    adminUserId: plan.adminUserId,
    now: plan.now.toISOString(),
    timeZone: plan.timeZone,
    window: { from: plan.from.toISOString(), to: plan.to.toISOString() },
    rows,
    upserts: { policy: true, tenantSetting: true, sequence: true },
    fixtureIds: plan.fixtureIds,
    expectedSummary: plan.expectedSummary,
  };
}

async function cleanupFixtureRows(
  tx: Prisma.TransactionClient,
  plan: RentalCommunicationsFixturePlan,
): Promise<void> {
  const { tenantId, fixtureIds } = plan;
  // FK-safe order: children first, then parents.
  await tx.communicationInboundMessage.deleteMany({
    where: { tenantId, id: { in: fixtureIds.inboundIds } },
  });
  await tx.rentalReminderDeliveryAttempt.deleteMany({
    where: { tenantId, id: { in: fixtureIds.attemptIds } },
  });
  await tx.rentalReminderDispatchOccurrence.deleteMany({
    where: { tenantId, dispatchId: { in: fixtureIds.dispatchIds } },
  });
  await tx.rentalReminderDelivery.deleteMany({
    where: { tenantId, id: { in: fixtureIds.deliveryIds } },
  });
  await tx.rentalReminderDispatch.deleteMany({
    where: { tenantId, id: { in: fixtureIds.dispatchIds } },
  });
  await tx.rentalReminderPlanningIssue.deleteMany({
    where: { tenantId, id: { in: fixtureIds.issueIds } },
  });
  await tx.rentalObligationOccurrence.deleteMany({
    where: { tenantId, id: { in: fixtureIds.occurrenceIds } },
  });
  await tx.rentalObligation.deleteMany({
    where: { tenantId, id: { in: fixtureIds.obligationIds } },
  });
  await tx.rentalContractNotificationRoute.deleteMany({
    where: { tenantId, id: { in: fixtureIds.routeIds } },
  });
  await tx.rentalContractParty.deleteMany({
    where: { tenantId, id: { in: fixtureIds.partyIds } },
  });
  await tx.rentalContract.deleteMany({
    where: { tenantId, id: { in: fixtureIds.contractIds } },
  });
  await tx.contactPoint.deleteMany({
    where: { tenantId, id: { in: fixtureIds.contactPointIds } },
  });
  await tx.contact.deleteMany({
    where: { tenantId, id: { in: fixtureIds.contactIds } },
  });
  await tx.rentalConcept.deleteMany({
    where: { tenantId, id: { in: fixtureIds.conceptIds } },
  });
}

async function writeFixtureUpserts(
  tx: Prisma.TransactionClient,
  plan: RentalCommunicationsFixturePlan,
): Promise<void> {
  // Policy: upsert by tenantId (the demo tenant already has the C1 backfill
  // policy; never delete it). TenantSetting: upsert timezone. Sequence: bump
  // to at least 1 so ALQ-000001 is coherent.
  await tx.rentalReminderPolicy.upsert({
    where: { tenantId: plan.tenantId },
    create: { tenantId: plan.tenantId, ...plan.policy },
    update: { ...plan.policy },
  });
  await tx.tenantSetting.upsert({
    where: { tenantId: plan.tenantId },
    create: { tenantId: plan.tenantId, timeZone: plan.tenantSettingTimeZone },
    update: { timeZone: plan.tenantSettingTimeZone },
  });
  const existing = await tx.rentalContractSequence.findUnique({
    where: { tenantId: plan.tenantId },
    select: { lastValue: true },
  });
  const sequenceLastValue = Math.max(
    existing?.lastValue ?? 0,
    plan.sequenceLastValue,
  );
  await tx.rentalContractSequence.upsert({
    where: { tenantId: plan.tenantId },
    create: { tenantId: plan.tenantId, lastValue: sequenceLastValue },
    update: { lastValue: sequenceLastValue },
  });
}

async function writeFixtureRows(
  tx: Prisma.TransactionClient,
  plan: RentalCommunicationsFixturePlan,
): Promise<void> {
  // Write order respects the FK constraints: parents first, children last.
  const { tenantId } = plan;
  await tx.rentalConcept.createMany({
    data: plan.concepts.map((row) => ({ ...row, tenantId })),
  });
  await tx.contact.createMany({
    data: plan.contacts.map((row) => ({ ...row, tenantId })),
  });
  await tx.contactPoint.createMany({
    data: plan.contactPoints.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalContract.create({
    data: { ...plan.contract, tenantId },
  });
  await tx.rentalContractParty.createMany({
    data: plan.parties.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalContractNotificationRoute.createMany({
    data: plan.routes.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalObligation.createMany({
    data: plan.obligations.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalObligationOccurrence.createMany({
    data: plan.occurrences.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalReminderDispatch.createMany({
    data: plan.dispatches.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalReminderDispatchOccurrence.createMany({
    data: plan.dispatchOccurrences.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalReminderDelivery.createMany({
    data: plan.deliveries.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalReminderDeliveryAttempt.createMany({
    data: plan.attempts.map((row) => ({ ...row, tenantId })),
  });
  await tx.rentalReminderPlanningIssue.create({
    data: { ...plan.planningIssue, tenantId },
  });
  await tx.communicationInboundMessage.createMany({
    data: plan.inbound.map((row) => ({ ...row, tenantId })),
  });
}

function summariesMatch(
  expected: RentalCommunicationsFixtureSummary,
  actual: RentalCommunicationsFixtureSummary,
): boolean {
  return (
    expected.dispatchesScheduledToday === actual.dispatchesScheduledToday &&
    expected.deliveriesSentToday === actual.deliveriesSentToday &&
    expected.deliveriesDeliveredToday === actual.deliveriesDeliveredToday &&
    expected.deliveriesFailedToday === actual.deliveriesFailedToday &&
    expected.planningIssuesOpen === actual.planningIssuesOpen &&
    expected.inboundUnacknowledged === actual.inboundUnacknowledged
  );
}
