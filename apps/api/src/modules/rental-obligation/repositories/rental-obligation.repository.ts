import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RentalFulfillmentOrigin,
  RentalFulfillmentStatus,
  RentalContractEventType,
  RentalOccurrenceStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const obligationInclude = {
  concept: {
    select: { id: true, name: true, systemCode: true, isActive: true },
  },
  contract: {
    select: { id: true, startsOn: true, endsOn: true, status: true },
  },
  rentValueRevisions: {
    orderBy: [{ effectiveFrom: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.RentalObligationInclude;

const occurrenceInclude = {
  obligation: {
    include: {
      concept: { select: { id: true, name: true, systemCode: true } },
      contract: {
        select: {
          id: true,
          internalNumber: true,
          status: true,
          startsOn: true,
          endsOn: true,
          propertyAddressSnapshot: true,
          parties: {
            where: { role: 'RENTER' },
            select: { contact: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  },
  fulfillments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.RentalObligationOccurrenceInclude;

export type RentalObligationRecord = Prisma.RentalObligationGetPayload<{
  include: typeof obligationInclude;
}>;
export type RentalOccurrenceRecord =
  Prisma.RentalObligationOccurrenceGetPayload<{
    include: typeof occurrenceInclude;
  }>;

export class RentalFulfillmentConflictError extends Error {}

@Injectable()
export class RentalObligationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findContract(id: string, tenantId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { id, tenantId },
      select: { id: true, startsOn: true, endsOn: true, status: true },
    });
  }

  findConcept(id: string, tenantId: string) {
    return this.prisma.rentalConcept.findFirst({
      where: { id, tenantId },
      select: { id: true, isActive: true, systemCode: true },
    });
  }

  findMany(contractId: string, tenantId: string) {
    return this.prisma.rentalObligation.findMany({
      where: { contractId, tenantId },
      include: obligationInclude,
      orderBy: [{ concept: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.rentalObligation.findFirst({
      where: { id, tenantId },
      include: obligationInclude,
    });
  }

  countActiveRent(contractId: string, tenantId: string, excludeId?: string) {
    return this.prisma.rentalObligation.count({
      where: {
        tenantId,
        contractId,
        isActive: true,
        concept: { systemCode: 'RENT' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  create(
    data: Prisma.RentalObligationUncheckedCreateInput,
    initialRevision?: {
      effectiveFrom: Date;
      amount: number;
      currency: Prisma.RentalRentValueRevisionUncheckedCreateInput['currency'];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const obligation = await tx.rentalObligation.create({ data });
      if (initialRevision) {
        await tx.rentalRentValueRevision.create({
          data: {
            tenantId: obligation.tenantId,
            obligationId: obligation.id,
            effectiveFrom: initialRevision.effectiveFrom,
            amount: initialRevision.amount,
            currency: initialRevision.currency,
          },
        });
      }
      return tx.rentalObligation.findUniqueOrThrow({
        where: { id: obligation.id },
        include: obligationInclude,
      });
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.RentalObligationUncheckedUpdateInput,
  ) {
    const result = await this.prisma.rentalObligation.updateMany({
      where: { id, tenantId },
      data,
    });
    return result.count ? this.findById(id, tenantId) : null;
  }

  async updateWithInitialRevision(
    id: string,
    tenantId: string,
    data: Prisma.RentalObligationUncheckedUpdateInput,
    revision: {
      effectiveFrom: Date;
      amount: number;
      currency: Prisma.RentalRentValueRevisionUncheckedCreateInput['currency'];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rentalObligation.updateMany({
        where: { id, tenantId },
        data,
      });
      if (!changed.count) return null;
      await tx.rentalRentValueRevision.create({
        data: { tenantId, obligationId: id, ...revision },
      });
      return tx.rentalObligation.findFirst({
        where: { id, tenantId },
        include: obligationInclude,
      });
    });
  }

  createRentValueRevision(
    obligationId: string,
    tenantId: string,
    input: {
      effectiveFrom: Date;
      amount: number;
      currency: Prisma.RentalRentValueRevisionUncheckedCreateInput['currency'];
      recordedById: string | null;
      reason: string | null;
    },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const revision = await tx.rentalRentValueRevision.create({
          data: { tenantId, obligationId, ...input },
        });
        const obligation = await tx.rentalObligation.findFirstOrThrow({
          where: { id: obligationId, tenantId },
          select: { contractId: true },
        });
        await tx.rentalContractEvent.create({
          data: {
            tenantId,
            contractId: obligation.contractId,
            type: RentalContractEventType.RENT_VALUE_REVISED,
            actorId: input.recordedById,
            metadata: {
              obligationId,
              revisionId: revision.id,
              effectiveFrom: input.effectiveFrom.toISOString().slice(0, 10),
              amount: input.amount,
              currency: input.currency,
            },
          },
        });
        await tx.$executeRaw`
          WITH resolved AS (
            SELECT occurrence.id, applicable.amount, applicable.currency
            FROM "RentalObligationOccurrence" occurrence
            CROSS JOIN LATERAL (
              SELECT candidate.amount, candidate.currency
              FROM "RentalRentValueRevision" candidate
              WHERE candidate."obligationId" = occurrence."obligationId"
                AND candidate."effectiveFrom" <= occurrence."periodStartsOn"
              ORDER BY candidate."effectiveFrom" DESC, candidate."createdAt" DESC
              LIMIT 1
            ) applicable
            WHERE occurrence."obligationId" = ${obligationId}
              AND occurrence."tenantId" = ${tenantId}
              AND occurrence.status = 'PENDING'
              AND occurrence."periodStartsOn" >= ${input.effectiveFrom}
          )
          UPDATE "RentalObligationOccurrence" occurrence
          SET
            amount = resolved.amount,
            currency = resolved.currency,
            "updatedAt" = CURRENT_TIMESTAMP
          FROM resolved
          WHERE occurrence.id = resolved.id
        `;
        const latest = await tx.rentalRentValueRevision.findFirstOrThrow({
          where: { obligationId, tenantId },
          orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        });
        await tx.rentalObligation.updateMany({
          where: { id: obligationId, tenantId },
          data: { defaultAmount: latest.amount },
        });
        return revision;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createMissingOccurrences(
    obligationId: string,
    tenantId: string,
    seeds: Array<
      Omit<
        Prisma.RentalObligationOccurrenceUncheckedCreateInput,
        'obligationId' | 'tenantId'
      >
    >,
  ) {
    if (seeds.length > 0) {
      await this.prisma.rentalObligationOccurrence.createMany({
        data: seeds.map((seed) => ({ ...seed, obligationId, tenantId })),
        skipDuplicates: true,
      });
    }
    return this.prisma.rentalObligationOccurrence.findMany({
      where: { obligationId, tenantId },
      include: occurrenceInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  tenantTimeZone(tenantId: string) {
    return this.prisma.tenantSetting
      .findUnique({ where: { tenantId }, select: { timeZone: true } })
      .then((setting) => setting?.timeZone ?? 'America/Argentina/Buenos_Aires');
  }

  findOccurrences(
    tenantId: string,
    where: Prisma.RentalObligationOccurrenceWhereInput,
    take?: number,
  ) {
    return this.prisma.rentalObligationOccurrence.findMany({
      where: { tenantId, ...where },
      include: occurrenceInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      ...(take ? { take } : {}),
    });
  }

  findOperationalOccurrences(
    tenantId: string,
    where: Prisma.RentalObligationOccurrenceWhereInput,
    orderBy: Prisma.RentalObligationOccurrenceOrderByWithRelationInput[],
    page: number,
    pageSize: number,
  ) {
    const scopedWhere = { tenantId, ...where };
    return this.prisma.$transaction([
      this.prisma.rentalObligationOccurrence.findMany({
        where: scopedWhere,
        include: occurrenceInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rentalObligationOccurrence.count({ where: scopedWhere }),
    ]);
  }

  findNextAttentionOccurrence(tenantId: string, contractId?: string) {
    return this.prisma.rentalObligationOccurrence.findFirst({
      where: {
        tenantId,
        status: RentalOccurrenceStatus.PENDING,
        obligation: {
          isActive: true,
          ...(contractId ? { contractId } : {}),
        },
      },
      include: occurrenceInclude,
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
  }

  findOccurrence(id: string, tenantId: string) {
    return this.prisma.rentalObligationOccurrence.findFirst({
      where: { id, tenantId },
      include: occurrenceInclude,
    });
  }

  async updatePendingOccurrence(
    id: string,
    tenantId: string,
    data: Prisma.RentalObligationOccurrenceUncheckedUpdateInput,
  ) {
    const result = await this.prisma.rentalObligationOccurrence.updateMany({
      where: { id, tenantId, status: RentalOccurrenceStatus.PENDING },
      data,
    });
    return result.count ? this.findOccurrence(id, tenantId) : null;
  }

  async recordFulfillment(
    occurrence: RentalOccurrenceRecord,
    input: {
      fulfilledOn: Date;
      amount: number | Prisma.Decimal | null;
      notes: string | null;
      recordedById: string | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.rentalObligationOccurrence.updateMany({
        where: {
          id: occurrence.id,
          tenantId: occurrence.tenantId,
          status: RentalOccurrenceStatus.PENDING,
        },
        data: { status: RentalOccurrenceStatus.FULFILLED },
      });
      if (claimed.count !== 1) throw new RentalFulfillmentConflictError();

      const fulfillment = await tx.rentalFulfillment.create({
        data: {
          tenantId: occurrence.tenantId,
          occurrenceId: occurrence.id,
          status: RentalFulfillmentStatus.RECORDED,
          fulfilledOn: input.fulfilledOn,
          amount: input.amount,
          notes: input.notes,
          origin: RentalFulfillmentOrigin.ADMIN,
          recordedById: input.recordedById,
        },
      });
      const updatedOccurrence =
        await tx.rentalObligationOccurrence.findFirstOrThrow({
          where: { id: occurrence.id, tenantId: occurrence.tenantId },
          include: occurrenceInclude,
        });
      return { fulfillment, occurrence: updatedOccurrence };
    });
  }

  findFulfillment(id: string, tenantId: string) {
    return this.prisma.rentalFulfillment.findFirst({
      where: { id, tenantId },
      include: { occurrence: { select: { id: true, status: true } } },
    });
  }

  reverseFulfillment(
    id: string,
    tenantId: string,
    occurrenceId: string,
    reversedById: string | null,
    reversalReason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reversed = await tx.rentalFulfillment.updateMany({
        where: { id, tenantId, status: RentalFulfillmentStatus.RECORDED },
        data: {
          status: RentalFulfillmentStatus.REVERSED,
          reversedAt: new Date(),
          reversedById,
          reversalReason,
        },
      });
      if (reversed.count !== 1) throw new RentalFulfillmentConflictError();
      const reopened = await tx.rentalObligationOccurrence.updateMany({
        where: {
          id: occurrenceId,
          tenantId,
          status: RentalOccurrenceStatus.FULFILLED,
        },
        data: { status: RentalOccurrenceStatus.PENDING },
      });
      if (reopened.count !== 1) throw new RentalFulfillmentConflictError();
      return tx.rentalObligationOccurrence.findFirstOrThrow({
        where: { id: occurrenceId, tenantId },
        include: occurrenceInclude,
      });
    });
  }
}
