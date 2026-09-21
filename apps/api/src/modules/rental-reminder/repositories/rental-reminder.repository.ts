import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  RentalContractPartyRole,
  RentalContractStatus,
  RentalOccurrenceStatus,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchOccurrenceStatus,
  RentalReminderDispatchStatus,
  RentalReminderPlanningIssueStatus,
  TenantStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  RentalReminderPlanningIssueQueryDto,
  UpdateRentalReminderPolicyDto,
} from '../dto/rental-reminder.dto';

const pageOptions = (page = 1, pageSize = 20) => ({
  page,
  pageSize,
  skip: (page - 1) * pageSize,
});

@Injectable()
export class RentalReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPolicy(tenantId: string) {
    return this.prisma.rentalReminderPolicy.findUnique({
      where: { tenantId },
      include: {
        tenant: { select: { settings: { select: { timeZone: true } } } },
      },
    });
  }

  updatePolicy(tenantId: string, data: UpdateRentalReminderPolicyDto) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rentalReminderPolicy.updateMany({
        where: { tenantId },
        data,
      });
      if (updated.count !== 1) return null;
      return tx.rentalReminderPolicy.findUnique({
        where: { tenantId },
        include: {
          tenant: { select: { settings: { select: { timeZone: true } } } },
        },
      });
    });
  }

  findPlanningIssues(
    tenantId: string,
    query: RentalReminderPlanningIssueQueryDto,
  ) {
    const paging = pageOptions(query.page, query.pageSize);
    const where: Prisma.RentalReminderPlanningIssueWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.rentalReminderPlanningIssue.findMany({
        where,
        orderBy: [{ lastDetectedAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip,
        take: paging.pageSize,
      }),
      this.prisma.rentalReminderPlanningIssue.count({ where }),
    ]);
  }

  findDispatches(tenantId: string, query: RentalReminderDispatchQueryDto) {
    const paging = pageOptions(query.page, query.pageSize);
    const where: Prisma.RentalReminderDispatchWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.rentalReminderDispatch.findMany({
        where,
        include: {
          occurrences: {
            select: { occurrenceId: true, status: true, exclusionReason: true },
            orderBy: { occurrenceId: 'asc' },
          },
          _count: { select: { deliveries: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip,
        take: paging.pageSize,
      }),
      this.prisma.rentalReminderDispatch.count({ where }),
    ]);
  }

  findDeliveries(tenantId: string, query: RentalReminderDeliveryQueryDto) {
    const paging = pageOptions(query.page, query.pageSize);
    const where: Prisma.RentalReminderDeliveryWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.dispatchId ? { dispatchId: query.dispatchId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.rentalReminderDelivery.findMany({
        where,
        include: { _count: { select: { attempts: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip,
        take: paging.pageSize,
      }),
      this.prisma.rentalReminderDelivery.count({ where }),
    ]);
  }

  async findAttempts(
    tenantId: string,
    deliveryId: string,
    page = 1,
    pageSize = 20,
  ) {
    const deliveryExists = await this.prisma.rentalReminderDelivery.count({
      where: { id: deliveryId, tenantId },
    });
    if (deliveryExists === 0) return null;
    const paging = pageOptions(page, pageSize);
    return this.prisma.$transaction([
      this.prisma.rentalReminderDeliveryAttempt.findMany({
        where: { tenantId, deliveryId },
        orderBy: [{ attemptNumber: 'desc' }, { id: 'desc' }],
        skip: paging.skip,
        take: paging.pageSize,
      }),
      this.prisma.rentalReminderDeliveryAttempt.count({
        where: { tenantId, deliveryId },
      }),
    ]);
  }

  findPlannerPolicies() {
    return this.prisma.rentalReminderPolicy.findMany({
      where: { tenant: { status: TenantStatus.ACTIVE } },
      include: {
        tenant: { select: { settings: { select: { timeZone: true } } } },
      },
      orderBy: { tenantId: 'asc' },
    });
  }

  findPlanningCandidates(tenantId: string, dueFrom: Date, dueTo: Date) {
    return this.prisma.rentalObligationOccurrence.findMany({
      where: {
        tenantId,
        status: RentalOccurrenceStatus.PENDING,
        OR: [{ dueDate: null }, { dueDate: { gte: dueFrom, lte: dueTo } }],
        obligation: {
          tenantId,
          isActive: true,
          includeInNotice: true,
          contract: { tenantId, status: RentalContractStatus.ACTIVE },
        },
      },
      select: {
        id: true,
        tenantId: true,
        dueDate: true,
        amount: true,
        currency: true,
        status: true,
        obligation: {
          select: {
            id: true,
            tenantId: true,
            showAmount: true,
            includeInNotice: true,
            isActive: true,
            concept: {
              select: { id: true, name: true, slug: true, systemCode: true },
            },
            contract: {
              select: {
                id: true,
                tenantId: true,
                internalNumber: true,
                status: true,
                parties: {
                  where: { role: RentalContractPartyRole.RENTER },
                  select: {
                    id: true,
                    tenantId: true,
                    role: true,
                    contactId: true,
                    contact: {
                      select: {
                        id: true,
                        tenantId: true,
                        name: true,
                        isActive: true,
                      },
                    },
                    notificationRoutes: {
                      select: {
                        id: true,
                        tenantId: true,
                        channel: true,
                        isEnabled: true,
                        contactPointId: true,
                        contactPoint: {
                          select: {
                            id: true,
                            tenantId: true,
                            contactId: true,
                            type: true,
                            value: true,
                            isActive: true,
                            canReceiveWhatsapp: true,
                          },
                        },
                      },
                      orderBy: [{ channel: 'asc' }, { id: 'asc' }],
                    },
                  },
                  orderBy: [
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' },
                    { id: 'asc' },
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  async reconcilePlanningIssues(
    tenantId: string,
    detections: Array<{
      contractId?: string | null;
      occurrenceId?: string | null;
      recipientContactId?: string | null;
      channel?: NotificationChannel | null;
      type: Prisma.RentalReminderPlanningIssueUncheckedCreateInput['type'];
      deduplicationKey: string;
      metadata?: Prisma.InputJsonValue;
    }>,
    managedTypes: Prisma.RentalReminderPlanningIssueWhereInput['type'][],
    detectedAt: Date,
  ) {
    const detectedKeys = detections.map((item) => item.deduplicationKey);
    return this.prisma.$transaction(async (tx) => {
      for (const detection of detections) {
        await tx.rentalReminderPlanningIssue.upsert({
          where: {
            tenantId_deduplicationKey: {
              tenantId,
              deduplicationKey: detection.deduplicationKey,
            },
          },
          create: {
            tenantId,
            ...detection,
            status: RentalReminderPlanningIssueStatus.OPEN,
            firstDetectedAt: detectedAt,
            lastDetectedAt: detectedAt,
          },
          update: {
            contractId: detection.contractId,
            occurrenceId: detection.occurrenceId,
            recipientContactId: detection.recipientContactId,
            channel: detection.channel,
            type: detection.type,
            metadata: detection.metadata,
            status: RentalReminderPlanningIssueStatus.OPEN,
            lastDetectedAt: detectedAt,
            resolvedAt: null,
          },
        });
      }

      await tx.rentalReminderPlanningIssue.updateMany({
        where: {
          tenantId,
          status: RentalReminderPlanningIssueStatus.OPEN,
          type: { in: managedTypes as never },
          ...(detectedKeys.length
            ? { deduplicationKey: { notIn: detectedKeys } }
            : {}),
        },
        data: {
          status: RentalReminderPlanningIssueStatus.RESOLVED,
          resolvedAt: detectedAt,
        },
      });
    });
  }

  async upsertPlannedDispatch(input: {
    tenantId: string;
    contractId: string;
    recipientContactId: string;
    recipientIdentityKey: string;
    eventType: Prisma.RentalReminderDispatchUncheckedCreateInput['eventType'];
    dueDate: Date;
    scheduledFor: Date;
    groupKey: string;
    occurrenceSetHash: string;
    occurrenceIds: string[];
    policySnapshot: Prisma.InputJsonValue;
    recipientSnapshot: Prisma.InputJsonValue;
    contentSnapshot: Prisma.InputJsonValue;
    deliveries: Array<{
      channel: NotificationChannel;
      contactPointId: string;
      routeId: string;
      deliveryKey: string;
      destinationSnapshot: string;
      contentSnapshot: Prisma.InputJsonValue;
      providerKey: string;
      providerAccountKey: string;
      templateKey: string;
      templateVersion: string;
    }>;
    evaluatedAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.rentalReminderDispatch.findUnique({
        where: {
          tenantId_groupKey: {
            tenantId: input.tenantId,
            groupKey: input.groupKey,
          },
        },
        select: { id: true },
      });
      const dispatch = await tx.rentalReminderDispatch.upsert({
        where: {
          tenantId_groupKey: {
            tenantId: input.tenantId,
            groupKey: input.groupKey,
          },
        },
        create: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          recipientContactId: input.recipientContactId,
          recipientIdentityKey: input.recipientIdentityKey,
          eventType: input.eventType,
          dueDate: input.dueDate,
          scheduledFor: input.scheduledFor,
          groupKey: input.groupKey,
          occurrenceSetHash: input.occurrenceSetHash,
          status: RentalReminderDispatchStatus.PLANNED,
          policySnapshot: input.policySnapshot,
          recipientSnapshot: input.recipientSnapshot,
          contentSnapshot: input.contentSnapshot,
        },
        update: {},
        select: { id: true, firstAttemptAt: true, status: true },
      });

      if (
        dispatch.firstAttemptAt ||
        (dispatch.status !== RentalReminderDispatchStatus.PLANNED &&
          dispatch.status !== RentalReminderDispatchStatus.READY)
      ) {
        return { dispatchId: dispatch.id, created: false, mutable: false };
      }

      await tx.rentalReminderDispatch.update({
        where: { id: dispatch.id },
        data: {
          recipientContactId: input.recipientContactId,
          recipientIdentityKey: input.recipientIdentityKey,
          scheduledFor: input.scheduledFor,
          occurrenceSetHash: input.occurrenceSetHash,
          policySnapshot: input.policySnapshot,
          recipientSnapshot: input.recipientSnapshot,
          contentSnapshot: input.contentSnapshot,
          status: RentalReminderDispatchStatus.READY,
          skipReason: null,
          completedAt: null,
        },
      });

      await tx.rentalReminderDispatchOccurrence.createMany({
        data: input.occurrenceIds.map((occurrenceId) => ({
          tenantId: input.tenantId,
          dispatchId: dispatch.id,
          occurrenceId,
          status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
          evaluatedAt: input.evaluatedAt,
        })),
        skipDuplicates: true,
      });
      await tx.rentalReminderDispatchOccurrence.updateMany({
        where: {
          tenantId: input.tenantId,
          dispatchId: dispatch.id,
          occurrenceId: { in: input.occurrenceIds },
        },
        data: {
          status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
          exclusionReason: null,
          evaluatedAt: input.evaluatedAt,
        },
      });
      await tx.rentalReminderDispatchOccurrence.updateMany({
        where: {
          tenantId: input.tenantId,
          dispatchId: dispatch.id,
          occurrenceId: { notIn: input.occurrenceIds },
          status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
        },
        data: {
          status: RentalReminderDispatchOccurrenceStatus.EXCLUDED_BEFORE_SEND,
          exclusionReason: 'NO_LONGER_IN_PLANNED_SET',
          evaluatedAt: input.evaluatedAt,
        },
      });

      for (const delivery of input.deliveries) {
        await tx.rentalReminderDelivery.upsert({
          where: {
            tenantId_deliveryKey: {
              tenantId: input.tenantId,
              deliveryKey: delivery.deliveryKey,
            },
          },
          create: {
            tenantId: input.tenantId,
            dispatchId: dispatch.id,
            ...delivery,
            status: RentalReminderDeliveryStatus.PENDING,
            nextAttemptAt: input.scheduledFor,
            subjectSnapshot: null,
            bodySnapshot: '',
          },
          update: {
            contactPointId: delivery.contactPointId,
            routeId: delivery.routeId,
            destinationSnapshot: delivery.destinationSnapshot,
            contentSnapshot: delivery.contentSnapshot,
            providerKey: delivery.providerKey,
            providerAccountKey: delivery.providerAccountKey,
            templateKey: delivery.templateKey,
            templateVersion: delivery.templateVersion,
            nextAttemptAt: input.scheduledFor,
          },
        });
      }

      const activeChannels = input.deliveries.map((item) => item.channel);
      await tx.rentalReminderDelivery.updateMany({
        where: {
          tenantId: input.tenantId,
          dispatchId: dispatch.id,
          channel: { notIn: activeChannels },
          status: RentalReminderDeliveryStatus.PENDING,
          attemptCount: 0,
        },
        data: {
          status: RentalReminderDeliveryStatus.SKIPPED,
          skippedAt: input.evaluatedAt,
          errorCategory: 'ROUTE_NO_LONGER_ELIGIBLE',
          nextAttemptAt: null,
        },
      });

      return {
        dispatchId: dispatch.id,
        created: !existing,
        mutable: true,
      };
    });
  }

  findDeliveryForRevalidation(tenantId: string, deliveryId: string) {
    return this.prisma.rentalReminderDelivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: {
        dispatch: {
          include: {
            occurrences: {
              orderBy: { occurrenceId: 'asc' },
              include: {
                occurrence: {
                  include: {
                    obligation: {
                      include: {
                        concept: true,
                        contract: {
                          include: {
                            parties: {
                              where: { role: RentalContractPartyRole.RENTER },
                              include: {
                                contact: true,
                                notificationRoutes: {
                                  include: { contactPoint: true },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            deliveries: { select: { id: true, status: true } },
          },
        },
      },
    });
  }

  async applyDeliveryRevalidation(input: {
    tenantId: string;
    deliveryId: string;
    includedOccurrenceIds: string[];
    excludedOccurrenceIds: string[];
    occurrenceSetHash: string;
    contentSnapshot: Prisma.InputJsonValue;
    now: Date;
    updateDispatchSnapshot: boolean;
    skipReason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: {
          id: input.deliveryId,
          tenantId: input.tenantId,
          attemptCount: 0,
        },
        select: { id: true, dispatchId: true, status: true },
      });
      if (!delivery) return null;

      if (input.includedOccurrenceIds.length === 0) {
        await tx.rentalReminderDelivery.update({
          where: { id: delivery.id },
          data: {
            status: RentalReminderDeliveryStatus.SKIPPED,
            skippedAt: input.now,
            nextAttemptAt: null,
            processingToken: null,
            lockedUntil: null,
            errorCategory: input.skipReason ?? 'NO_LONGER_ELIGIBLE',
          },
        });
      } else {
        await tx.rentalReminderDelivery.update({
          where: { id: delivery.id },
          data: { contentSnapshot: input.contentSnapshot },
        });
      }

      if (input.updateDispatchSnapshot) {
        if (input.excludedOccurrenceIds.length) {
          await tx.rentalReminderDispatchOccurrence.updateMany({
            where: {
              tenantId: input.tenantId,
              dispatchId: delivery.dispatchId,
              occurrenceId: { in: input.excludedOccurrenceIds },
            },
            data: {
              status:
                RentalReminderDispatchOccurrenceStatus.EXCLUDED_BEFORE_SEND,
              exclusionReason: 'NO_LONGER_ELIGIBLE',
              evaluatedAt: input.now,
            },
          });
        }
        if (input.includedOccurrenceIds.length) {
          await tx.rentalReminderDispatchOccurrence.updateMany({
            where: {
              tenantId: input.tenantId,
              dispatchId: delivery.dispatchId,
              occurrenceId: { in: input.includedOccurrenceIds },
            },
            data: {
              status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
              exclusionReason: null,
              evaluatedAt: input.now,
            },
          });
          await tx.rentalReminderDispatch.update({
            where: { id: delivery.dispatchId },
            data: {
              occurrenceSetHash: input.occurrenceSetHash,
              contentSnapshot: input.contentSnapshot,
            },
          });
        }
      }

      const remaining = await tx.rentalReminderDelivery.count({
        where: {
          tenantId: input.tenantId,
          dispatchId: delivery.dispatchId,
          status: { not: RentalReminderDeliveryStatus.SKIPPED },
        },
      });
      if (remaining === 0) {
        await tx.rentalReminderDispatch.update({
          where: { id: delivery.dispatchId },
          data: {
            status: RentalReminderDispatchStatus.SKIPPED,
            skipReason: input.skipReason ?? 'NO_LONGER_ELIGIBLE',
            completedAt: input.now,
          },
        });
      }
      return { deliveryId: delivery.id, dispatchId: delivery.dispatchId };
    });
  }

  async claimReadyDelivery(input: {
    tenantId?: string;
    now: Date;
    token: string;
    lockedUntil: Date;
  }) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await this.prisma.rentalReminderDelivery.findFirst({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          OR: [
            {
              status: RentalReminderDeliveryStatus.PENDING,
              nextAttemptAt: { lte: input.now },
              OR: [{ lockedUntil: null }, { lockedUntil: { lt: input.now } }],
            },
            {
              status: RentalReminderDeliveryStatus.PROCESSING,
              attemptCount: 0,
              lockedUntil: { lt: input.now },
            },
          ],
        },
        orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
        select: { id: true, tenantId: true, dispatchId: true },
      });
      if (!candidate) return null;

      const claimed = await this.prisma.rentalReminderDelivery.updateMany({
        where: {
          id: candidate.id,
          tenantId: candidate.tenantId,
          OR: [
            {
              status: RentalReminderDeliveryStatus.PENDING,
              nextAttemptAt: { lte: input.now },
              OR: [{ lockedUntil: null }, { lockedUntil: { lt: input.now } }],
            },
            {
              status: RentalReminderDeliveryStatus.PROCESSING,
              attemptCount: 0,
              lockedUntil: { lt: input.now },
            },
          ],
        },
        data: {
          status: RentalReminderDeliveryStatus.PROCESSING,
          processingToken: input.token,
          lockedUntil: input.lockedUntil,
        },
      });
      if (claimed.count !== 1) continue;

      await this.prisma.rentalReminderDispatch.updateMany({
        where: {
          id: candidate.dispatchId,
          tenantId: candidate.tenantId,
          status: RentalReminderDispatchStatus.READY,
        },
        data: { status: RentalReminderDispatchStatus.PROCESSING },
      });
      return this.prisma.rentalReminderDelivery.findFirst({
        where: {
          id: candidate.id,
          tenantId: candidate.tenantId,
          processingToken: input.token,
        },
        include: { dispatch: true },
      });
    }
    return null;
  }

  async releaseDeliveryClaim(input: {
    tenantId: string;
    deliveryId: string;
    token: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: {
          id: input.deliveryId,
          tenantId: input.tenantId,
          status: RentalReminderDeliveryStatus.PROCESSING,
          processingToken: input.token,
        },
        select: { id: true, dispatchId: true },
      });
      if (!delivery) return { count: 0 };
      const released = await tx.rentalReminderDelivery.updateMany({
        where: {
          id: delivery.id,
          tenantId: input.tenantId,
          status: RentalReminderDeliveryStatus.PROCESSING,
          processingToken: input.token,
        },
        data: {
          status: RentalReminderDeliveryStatus.PENDING,
          processingToken: null,
          lockedUntil: null,
        },
      });
      if (released.count === 1) {
        const otherClaims = await tx.rentalReminderDelivery.count({
          where: {
            tenantId: input.tenantId,
            dispatchId: delivery.dispatchId,
            status: RentalReminderDeliveryStatus.PROCESSING,
          },
        });
        if (otherClaims === 0) {
          await tx.rentalReminderDispatch.updateMany({
            where: {
              id: delivery.dispatchId,
              tenantId: input.tenantId,
              status: RentalReminderDispatchStatus.PROCESSING,
              firstAttemptAt: null,
            },
            data: { status: RentalReminderDispatchStatus.READY },
          });
        }
      }
      return released;
    });
  }

  async persistRetrySchedule(input: {
    tenantId: string;
    deliveryId: string;
    token: string;
    attemptNumber: number;
    nextAttemptAt: Date | null;
    failedAt: Date;
  }) {
    return this.prisma.rentalReminderDelivery.updateMany({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
        status: RentalReminderDeliveryStatus.PROCESSING,
        processingToken: input.token,
        attemptCount: input.attemptNumber,
      },
      data: input.nextAttemptAt
        ? {
            status: RentalReminderDeliveryStatus.PENDING,
            nextAttemptAt: input.nextAttemptAt,
            processingToken: null,
            lockedUntil: null,
          }
        : {
            status: RentalReminderDeliveryStatus.FAILED,
            failedAt: input.failedAt,
            nextAttemptAt: null,
            processingToken: null,
            lockedUntil: null,
          },
    });
  }
}
