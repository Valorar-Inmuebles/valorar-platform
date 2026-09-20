import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  RentalContractEventType,
  RentalContractPartyRole,
  RentalContractStatus,
  RentalObligationKind,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RentalContractPartyInputDto } from '../dto/create-rental-contract.dto';

const relationSummarySelect = {
  id: true,
  internalNumber: true,
  status: true,
} satisfies Prisma.RentalContractSelect;

const rentalContractInclude = {
  property: {
    select: { id: true, title: true, propertyType: true, isActive: true },
  },
  previousContract: { select: relationSummarySelect },
  renewedContract: { select: relationSummarySelect },
  parties: {
    include: {
      contact: {
        include: {
          contactPoints: {
            orderBy: [
              { type: 'asc' as const },
              { isDefault: 'desc' as const },
              { createdAt: 'asc' as const },
            ],
          },
        },
      },
      notificationRoutes: {
        include: { contactPoint: true },
        orderBy: { channel: 'asc' as const },
      },
    },
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.RentalContractInclude;

const rentalContractListSelect = {
  id: true,
  internalNumber: true,
  status: true,
  propertyId: true,
  propertyAddressSnapshot: true,
  propertyCountryId: true,
  propertyProvinceId: true,
  propertyLocalityId: true,
  propertyNeighborhoodId: true,
  startsOn: true,
  endsOn: true,
  createdAt: true,
  updatedAt: true,
  property: {
    select: { id: true, title: true, propertyType: true, isActive: true },
  },
  parties: {
    select: {
      role: true,
      isPrimary: true,
      contact: { select: { id: true, name: true } },
    },
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  obligations: {
    where: { isActive: true },
    select: {
      concept: { select: { id: true, name: true, systemCode: true } },
      occurrences: {
        where: { status: 'PENDING' as const },
        select: {
          id: true,
          dueDate: true,
          amount: true,
          currency: true,
        },
        orderBy: [
          { dueDate: { sort: 'asc' as const, nulls: 'last' as const } },
          { createdAt: 'asc' as const },
        ],
        take: 1,
      },
    },
  },
} satisfies Prisma.RentalContractSelect;

const renewalSourceInclude = {
  parties: {
    include: {
      contact: { include: { contactPoints: true } },
      notificationRoutes: { include: { contactPoint: true } },
    },
  },
  obligations: {
    where: { isActive: true, kind: RentalObligationKind.RECURRING },
    include: {
      concept: { select: { systemCode: true } },
      rentValueRevisions: { orderBy: { effectiveFrom: 'asc' as const } },
    },
  },
} satisfies Prisma.RentalContractInclude;

export type RentalContractRecord = Prisma.RentalContractGetPayload<{
  include: typeof rentalContractInclude;
}>;
export type RentalContractListRecord = Prisma.RentalContractGetPayload<{
  select: typeof rentalContractListSelect;
}>;

export type RentalContractListOptions = {
  status?: RentalContractStatus;
  search?: string;
  endingFrom?: Date;
  endingBefore?: Date;
  countryId?: string;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  partyContactId?: string;
  partyRole?: RentalContractPartyRole;
  sortBy:
    | 'internalNumber'
    | 'startsOn'
    | 'endsOn'
    | 'status'
    | 'propertyAddress'
    | 'createdAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

export type RentalContractRenewalResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'INVALID_STATUS'; status: RentalContractStatus }
  | { outcome: 'ALREADY_RENEWED'; contract: RentalContractRecord }
  | { outcome: 'CREATED'; contract: RentalContractRecord };

type CreateContractData = Omit<
  Prisma.RentalContractUncheckedCreateInput,
  'internalNumber'
>;

@Injectable()
export class RentalContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateContractData, parties: RentalContractPartyInputDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const internalNumber = await this.allocateInternalNumber(
        tx,
        data.tenantId,
      );
      const contract = await tx.rentalContract.create({
        data: { ...data, internalNumber },
      });
      await this.syncParties(tx, contract.id, contract.tenantId, parties);
      return tx.rentalContract.findUniqueOrThrow({
        where: { id: contract.id },
        include: rentalContractInclude,
      });
    });
  }

  findMany(tenantId: string, options: RentalContractListOptions) {
    const where: Prisma.RentalContractWhereInput = {
      tenantId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.endingFrom || options.endingBefore
        ? {
            endsOn: {
              ...(options.endingFrom ? { gte: options.endingFrom } : {}),
              ...(options.endingBefore ? { lte: options.endingBefore } : {}),
            },
          }
        : {}),
      ...(options.countryId ? { propertyCountryId: options.countryId } : {}),
      ...(options.provinceId ? { propertyProvinceId: options.provinceId } : {}),
      ...(options.localityId ? { propertyLocalityId: options.localityId } : {}),
      ...(options.neighborhoodId
        ? { propertyNeighborhoodId: options.neighborhoodId }
        : {}),
      ...(options.partyContactId || options.partyRole
        ? {
            parties: {
              some: {
                ...(options.partyContactId
                  ? { contactId: options.partyContactId }
                  : {}),
                ...(options.partyRole ? { role: options.partyRole } : {}),
              },
            },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              {
                internalNumber: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                propertyAddressSnapshot: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                property: {
                  is: {
                    OR: [
                      {
                        title: {
                          contains: options.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        internalCode: {
                          contains: options.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
              {
                parties: {
                  some: {
                    contact: {
                      name: {
                        contains: options.search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const orderField =
      options.sortBy === 'propertyAddress'
        ? 'propertyAddressSnapshot'
        : options.sortBy;
    const orderBy = [
      { [orderField]: options.sortOrder },
      { id: 'asc' as const },
    ] as Prisma.RentalContractOrderByWithRelationInput[];
    return this.prisma.$transaction([
      this.prisma.rentalContract.findMany({
        where,
        select: rentalContractListSelect,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.rentalContract.count({ where }),
    ]);
  }

  findGeneralById(id: string, tenantId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { id, tenantId },
      include: {
        ...rentalContractInclude,
        obligations: {
          include: {
            concept: true,
            rentValueRevisions: {
              orderBy: [
                { effectiveFrom: 'desc' as const },
                { createdAt: 'desc' as const },
              ],
            },
            occurrences: {
              where: { status: 'PENDING' },
              include: {
                fulfillments: { orderBy: { createdAt: 'desc' as const } },
              },
              orderBy: [
                {
                  dueDate: {
                    sort: 'asc' as const,
                    nulls: 'last' as const,
                  },
                },
                { createdAt: 'asc' as const },
              ],
              take: 10,
            },
          },
          orderBy: [{ concept: { sortOrder: 'asc' as const } }],
        },
      },
    });
  }

  findContractEvents(
    tenantId: string,
    contractId: string,
    options: {
      type?: RentalContractEventType;
      from?: Date;
      to?: Date;
      skip: number;
      take: number;
    },
  ) {
    const where: Prisma.RentalContractEventWhereInput = {
      tenantId,
      contractId,
      ...(options.type ? { type: options.type } : {}),
      ...(options.from || options.to
        ? {
            occurredAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.rentalContractEvent.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.rentalContractEvent.count({ where }),
    ]);
  }

  findFulfillmentHistory(
    tenantId: string,
    contractId: string,
    options: { from?: Date; to?: Date; take: number },
  ) {
    const baseWhere: Prisma.RentalFulfillmentWhereInput = {
      tenantId,
      occurrence: { obligation: { contractId } },
    };
    const dateRange = {
      ...(options.from ? { gte: options.from } : {}),
      ...(options.to ? { lte: options.to } : {}),
    };
    const recordedWhere: Prisma.RentalFulfillmentWhereInput = {
      ...baseWhere,
      ...(options.from || options.to ? { createdAt: dateRange } : {}),
    };
    const reversedWhere: Prisma.RentalFulfillmentWhereInput = {
      ...baseWhere,
      reversedAt: {
        not: null,
        ...(options.from ? { gte: options.from } : {}),
        ...(options.to ? { lte: options.to } : {}),
      },
    };
    const include = {
      recordedBy: { select: { id: true, name: true } },
      reversedBy: { select: { id: true, name: true } },
      occurrence: {
        select: {
          id: true,
          periodKey: true,
          dueDate: true,
          obligation: {
            select: { concept: { select: { id: true, name: true } } },
          },
        },
      },
    } satisfies Prisma.RentalFulfillmentInclude;
    return this.prisma.$transaction([
      this.prisma.rentalFulfillment.findMany({
        where: recordedWhere,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: options.take,
      }),
      this.prisma.rentalFulfillment.count({ where: recordedWhere }),
      this.prisma.rentalFulfillment.findMany({
        where: reversedWhere,
        include,
        orderBy: [{ reversedAt: 'desc' }, { id: 'desc' }],
        take: options.take,
      }),
      this.prisma.rentalFulfillment.count({
        where: reversedWhere,
      }),
    ]);
  }

  dashboard(tenantId: string, today: Date, attentionUntil: Date) {
    return this.prisma.$transaction([
      this.prisma.rentalContract.groupBy({
        by: ['status'],
        where: { tenantId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.rentalContract.count({
        where: {
          tenantId,
          status: RentalContractStatus.ACTIVE,
          endsOn: { gte: today, lte: attentionUntil },
        },
      }),
      this.prisma.rentalObligationOccurrence.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.rentalObligationOccurrence.count({
        where: {
          tenantId,
          status: 'PENDING',
          dueDate: { lt: today },
        },
      }),
      this.prisma.rentalObligationOccurrence.count({
        where: { tenantId, status: 'FULFILLED' },
      }),
      this.prisma.rentalContractEvent.findMany({
        where: { tenantId },
        select: {
          id: true,
          contractId: true,
          type: true,
          occurredAt: true,
          contract: { select: { internalNumber: true } },
          actor: { select: { id: true, name: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),
    ]);
  }

  findById(id: string, tenantId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { id, tenantId },
      include: rentalContractInclude,
    });
  }

  findRenewalByPrevious(previousContractId: string, tenantId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { previousContractId, tenantId },
      include: rentalContractInclude,
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.RentalContractUncheckedUpdateInput,
    parties?: RentalContractPartyInputDto[],
    actorId: string | null = null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rentalContract.updateMany({
        where: { id, tenantId },
        data,
      });
      if (changed.count === 0) return null;
      if (parties) {
        const partiesChanged = await this.syncParties(
          tx,
          id,
          tenantId,
          parties,
        );
        if (partiesChanged) {
          await this.createEvent(tx, {
            tenantId,
            contractId: id,
            type: RentalContractEventType.PARTIES_CHANGED,
            actorId,
          });
        }
      }
      return tx.rentalContract.findFirst({
        where: { id, tenantId },
        include: rentalContractInclude,
      });
    });
  }

  renew(
    sourceId: string,
    tenantId: string,
    createdById: string | null,
  ): Promise<RentalContractRenewalResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const source = await tx.rentalContract.findFirst({
          where: { id: sourceId, tenantId },
          include: renewalSourceInclude,
        });
        if (!source) return { outcome: 'NOT_FOUND' } as const;
        if (
          source.status !== RentalContractStatus.ACTIVE &&
          source.status !== RentalContractStatus.ENDED
        ) {
          return {
            outcome: 'INVALID_STATUS',
            status: source.status,
          } as const;
        }

        const existingRenewal = await tx.rentalContract.findFirst({
          where: { tenantId, previousContractId: source.id },
          include: rentalContractInclude,
        });
        if (existingRenewal) {
          return {
            outcome: 'ALREADY_RENEWED',
            contract: existingRenewal,
          } as const;
        }

        const startsOn = source.endsOn
          ? new Date(source.endsOn.getTime() + 86_400_000)
          : source.startsOn;
        const internalNumber = await this.allocateInternalNumber(tx, tenantId);
        const renewed = await tx.rentalContract.create({
          data: {
            tenantId,
            internalNumber,
            previousContractId: source.id,
            createdById,
            propertyId: source.propertyId,
            propertyCountryId: source.propertyCountryId,
            propertyProvinceId: source.propertyProvinceId,
            propertyLocalityId: source.propertyLocalityId,
            propertyNeighborhoodId: source.propertyNeighborhoodId,
            propertyAddressSnapshot: source.propertyAddressSnapshot,
            propertyCountrySnapshot: source.propertyCountrySnapshot,
            propertyProvinceSnapshot: source.propertyProvinceSnapshot,
            propertyLocalitySnapshot: source.propertyLocalitySnapshot,
            propertyNeighborhoodSnapshot: source.propertyNeighborhoodSnapshot,
            propertyStreetSnapshot: source.propertyStreetSnapshot,
            propertyStreetNumberSnapshot: source.propertyStreetNumberSnapshot,
            propertyFloorSnapshot: source.propertyFloorSnapshot,
            propertyUnitSnapshot: source.propertyUnitSnapshot,
            propertyPostalCodeSnapshot: source.propertyPostalCodeSnapshot,
            propertyNotesSnapshot: source.propertyNotesSnapshot,
            startsOn,
            endsOn: null,
            status: RentalContractStatus.DRAFT,
          },
        });

        const parties: RentalContractPartyInputDto[] = source.parties.map(
          (party) => ({
            contactId: party.contactId,
            role: party.role,
            isPrimary: party.isPrimary,
            notificationRoutes:
              party.role === 'RENTER'
                ? party.notificationRoutes
                    .filter((route) =>
                      this.isCompatibleRoute(party.contactId, route),
                    )
                    .map((route) => ({
                      channel: route.channel,
                      contactPointId: route.contactPointId,
                      isEnabled: route.isEnabled,
                    }))
                : [],
          }),
        );
        await this.syncParties(tx, renewed.id, tenantId, parties);

        if (source.obligations.length) {
          for (const obligation of source.obligations) {
            const isRent = obligation.concept.systemCode === 'RENT';
            const effectiveRevision = isRent
              ? obligation.rentValueRevisions
                  .filter((revision) => revision.effectiveFrom <= startsOn)
                  .at(-1)
              : null;
            const defaultAmount =
              effectiveRevision?.amount ?? obligation.defaultAmount;
            const copied = await tx.rentalObligation.create({
              data: {
                tenantId,
                contractId: renewed.id,
                conceptId: obligation.conceptId,
                kind: obligation.kind,
                recurrenceMonths: obligation.recurrenceMonths,
                dueMode: obligation.dueMode,
                dueDay: obligation.dueDay,
                amountMode: obligation.amountMode,
                defaultAmount,
                currency: obligation.currency,
                adjustmentIntervalMonths: obligation.adjustmentIntervalMonths,
                includeInNotice: obligation.includeInNotice,
                showAmount: obligation.showAmount,
                startsOn,
                endsOn: null,
                isActive: true,
              },
            });
            if (isRent && defaultAmount != null) {
              await tx.rentalRentValueRevision.create({
                data: {
                  tenantId,
                  obligationId: copied.id,
                  effectiveFrom: startsOn,
                  amount: defaultAmount,
                  currency: obligation.currency,
                },
              });
            }
          }
        }

        await this.createEvent(tx, {
          tenantId,
          contractId: source.id,
          type: RentalContractEventType.RENEWED,
          actorId: createdById,
          metadata: {
            renewedContractId: renewed.id,
            renewedInternalNumber: internalNumber,
          },
        });

        return {
          outcome: 'CREATED',
          contract: await tx.rentalContract.findUniqueOrThrow({
            where: { id: renewed.id },
            include: rentalContractInclude,
          }),
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  propertyBelongsToTenant(propertyId: string, tenantId: string) {
    return this.prisma.property
      .count({ where: { id: propertyId, tenantId } })
      .then((count) => count > 0);
  }

  contactsByIds(contactIds: string[], tenantId: string) {
    return this.prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId, isActive: true },
      include: { contactPoints: true },
    });
  }

  hasActiveRentObligation(contractId: string, tenantId: string) {
    return this.prisma.rentalObligation
      .findFirst({
        where: {
          contractId,
          tenantId,
          isActive: true,
          concept: { systemCode: 'RENT' },
          kind: RentalObligationKind.RECURRING,
          recurrenceMonths: 1,
          dueMode: 'FIXED_DAY',
          dueDay: { gte: 1, lte: 31 },
          amountMode: 'FIXED',
          defaultAmount: { gt: 0 },
          adjustmentIntervalMonths: { gte: 1, lte: 12 },
          rentValueRevisions: { some: {} },
        },
        include: {
          rentValueRevisions: {
            orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
      })
      .then((obligation) => {
        const initial = obligation?.rentValueRevisions[0];
        return Boolean(
          obligation &&
          initial &&
          initial.effectiveFrom.getTime() === obligation.startsOn.getTime() &&
          initial.currency === obligation.currency &&
          initial.amount.gt(0) &&
          obligation.defaultAmount != null &&
          initial.amount.equals(obligation.defaultAmount),
        );
      });
  }

  async activateWithRentRequirement(
    id: string,
    tenantId: string,
    actorId: string | null = null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rentalContract.updateMany({
        where: {
          id,
          tenantId,
          status: RentalContractStatus.DRAFT,
          endsOn: { not: null },
          parties: {
            some: {
              role: 'RENTER',
              isPrimary: true,
              contact: { isActive: true },
            },
          },
          obligations: {
            some: {
              isActive: true,
              concept: { systemCode: 'RENT' },
              kind: RentalObligationKind.RECURRING,
              recurrenceMonths: 1,
              dueMode: 'FIXED_DAY',
              dueDay: { gte: 1, lte: 31 },
              amountMode: 'FIXED',
              defaultAmount: { gt: 0 },
              adjustmentIntervalMonths: { gte: 1, lte: 12 },
              rentValueRevisions: { some: {} },
            },
          },
        },
        data: { status: RentalContractStatus.ACTIVE },
      });
      if (changed.count !== 1) return null;
      await this.createEvent(tx, {
        tenantId,
        contractId: id,
        type: RentalContractEventType.ACTIVATED,
        actorId,
      });
      return tx.rentalContract.findFirst({
        where: { id, tenantId },
        include: rentalContractInclude,
      });
    });
  }

  tenantTimeZone(tenantId: string) {
    return this.prisma.tenantSetting
      .findUnique({ where: { tenantId }, select: { timeZone: true } })
      .then((setting) => setting?.timeZone ?? 'America/Argentina/Buenos_Aires');
  }

  transitionToTerminal(
    id: string,
    tenantId: string,
    status: Extract<RentalContractStatus, 'ENDED' | 'CANCELLED'>,
    localToday: Date,
    actorId: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rentalContract.updateMany({
        where: {
          id,
          tenantId,
          status:
            status === RentalContractStatus.ENDED
              ? RentalContractStatus.ACTIVE
              : {
                  in: [RentalContractStatus.DRAFT, RentalContractStatus.ACTIVE],
                },
        },
        data: { status },
      });
      if (changed.count !== 1) return null;
      await this.createEvent(tx, {
        tenantId,
        contractId: id,
        type:
          status === RentalContractStatus.ENDED
            ? RentalContractEventType.ENDED
            : RentalContractEventType.CANCELLED,
        actorId,
      });
      await tx.rentalObligation.updateMany({
        where: { contractId: id, tenantId, isActive: true },
        data: { isActive: false },
      });
      await tx.rentalObligationOccurrence.updateMany({
        where: {
          tenantId,
          status: 'PENDING',
          dueDate: { gt: localToday },
          obligation: { contractId: id },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: actorId,
          cancellationReason:
            status === 'ENDED' ? 'Contract ended' : 'Contract cancelled',
        },
      });
      return tx.rentalContract.findFirst({
        where: { id, tenantId },
        include: rentalContractInclude,
      });
    });
  }

  private async allocateInternalNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const sequence = await tx.rentalContractSequence.upsert({
      where: { tenantId },
      create: { tenantId, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    if (sequence.lastValue > 999_999) {
      throw new Error('Rental contract number sequence exhausted');
    }
    return `ALQ-${String(sequence.lastValue).padStart(6, '0')}`;
  }

  private async syncParties(
    tx: Prisma.TransactionClient,
    contractId: string,
    tenantId: string,
    parties: RentalContractPartyInputDto[],
  ) {
    const existing = await tx.rentalContractParty.findMany({
      where: { contractId, tenantId },
      include: { notificationRoutes: true },
    });
    const partiesChanged = this.partiesDiffer(existing, parties);
    const desiredKeys = new Set(
      parties.map((party) => `${party.role}:${party.contactId}`),
    );
    const removedIds = existing
      .filter((party) => !desiredKeys.has(`${party.role}:${party.contactId}`))
      .map((party) => party.id);
    if (removedIds.length) {
      await tx.rentalContractParty.deleteMany({
        where: { id: { in: removedIds }, contractId, tenantId },
      });
    }

    const primaryContactId = parties.find(
      (party) => party.role === 'RENTER' && party.isPrimary,
    )?.contactId;
    await tx.rentalContractParty.updateMany({
      where: {
        contractId,
        tenantId,
        role: 'RENTER',
        isPrimary: true,
        ...(primaryContactId ? { contactId: { not: primaryContactId } } : {}),
      },
      data: { isPrimary: false },
    });

    const existingByKey = new Map(
      existing.map((party) => [`${party.role}:${party.contactId}`, party]),
    );
    for (const input of parties) {
      const key = `${input.role}:${input.contactId}`;
      const current = existingByKey.get(key);
      const party = current
        ? await tx.rentalContractParty.update({
            where: { id: current.id },
            data: { isPrimary: input.isPrimary ?? false },
          })
        : await tx.rentalContractParty.create({
            data: {
              tenantId,
              contractId,
              contactId: input.contactId,
              role: input.role,
              isPrimary: input.isPrimary ?? false,
            },
          });
      await this.syncRoutes(
        tx,
        tenantId,
        party.id,
        current?.notificationRoutes ?? [],
        input.notificationRoutes ?? [],
      );
    }
    return partiesChanged;
  }

  private partiesDiffer(
    existing: Array<{
      role: RentalContractPartyRole;
      contactId: string;
      isPrimary: boolean;
      notificationRoutes: Array<{
        channel: NotificationChannel;
        contactPointId: string;
        isEnabled: boolean;
      }>;
    }>,
    desired: RentalContractPartyInputDto[],
  ) {
    if (existing.length !== desired.length) return true;
    const byKey = new Map(
      existing.map((party) => [`${party.role}:${party.contactId}`, party]),
    );
    return desired.some((input) => {
      const current = byKey.get(`${input.role}:${input.contactId}`);
      if (!current || current.isPrimary !== (input.isPrimary ?? false)) {
        return true;
      }
      const routes = input.notificationRoutes ?? [];
      if (current.notificationRoutes.length !== routes.length) return true;
      const currentRoutes = new Map(
        current.notificationRoutes.map((route) => [route.channel, route]),
      );
      return routes.some((route) => {
        const currentRoute = currentRoutes.get(route.channel);
        return (
          !currentRoute ||
          currentRoute.contactPointId !== route.contactPointId ||
          currentRoute.isEnabled !== (route.isEnabled ?? true)
        );
      });
    });
  }

  private async syncRoutes(
    tx: Prisma.TransactionClient,
    tenantId: string,
    contractPartyId: string,
    existing: Array<{
      id: string;
      channel: NotificationChannel;
      contactPointId: string;
      isEnabled: boolean;
    }>,
    desired: NonNullable<RentalContractPartyInputDto['notificationRoutes']>,
  ) {
    const desiredChannels = new Set(desired.map((route) => route.channel));
    const removedIds = existing
      .filter((route) => !desiredChannels.has(route.channel))
      .map((route) => route.id);
    if (removedIds.length) {
      await tx.rentalContractNotificationRoute.deleteMany({
        where: { id: { in: removedIds }, tenantId, contractPartyId },
      });
    }

    const existingByChannel = new Map(
      existing.map((route) => [route.channel, route]),
    );
    for (const route of desired) {
      const current = existingByChannel.get(route.channel);
      if (current) {
        const isEnabled = route.isEnabled ?? true;
        if (
          current.contactPointId !== route.contactPointId ||
          current.isEnabled !== isEnabled
        ) {
          await tx.rentalContractNotificationRoute.update({
            where: { id: current.id },
            data: { contactPointId: route.contactPointId, isEnabled },
          });
        }
      } else {
        await tx.rentalContractNotificationRoute.create({
          data: {
            tenantId,
            contractPartyId,
            channel: route.channel,
            contactPointId: route.contactPointId,
            isEnabled: route.isEnabled ?? true,
          },
        });
      }
    }
  }

  private isCompatibleRoute(
    contactId: string,
    route: {
      channel: NotificationChannel;
      contactPoint: {
        contactId: string;
        type: 'EMAIL' | 'PHONE';
        isActive: boolean;
        canReceiveSms: boolean;
        canReceiveWhatsapp: boolean;
      };
    },
  ): boolean {
    const point = route.contactPoint;
    if (!point.isActive || point.contactId !== contactId) return false;
    if (route.channel === NotificationChannel.EMAIL)
      return point.type === 'EMAIL';
    if (route.channel === NotificationChannel.WHATSAPP)
      return point.type === 'PHONE' && point.canReceiveWhatsapp;
    return point.type === 'PHONE' && point.canReceiveSms;
  }

  private createEvent(
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      contractId: string;
      type: RentalContractEventType;
      actorId: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return tx.rentalContractEvent.create({ data });
  }
}
