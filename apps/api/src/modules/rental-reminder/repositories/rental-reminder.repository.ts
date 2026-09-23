import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  RentalContractPartyRole,
  RentalContractStatus,
  RentalOccurrenceStatus,
  RentalReminderAttemptStatus,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchOccurrenceStatus,
  RentalReminderDispatchStatus,
  RentalReminderPlanningIssueStatus,
  RentalReminderStatusSource,
  RentalReminderWebhookReceiptStatus,
  TenantStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  RentalReminderPlanningIssueQueryDto,
  UpdateRentalReminderPolicyDto,
} from '../dto/rental-reminder.dto';
import type { RentalReminderContractHistoryQueryDto } from '../dto/rental-reminder-read-model.dto';
import { computeAttemptKey } from '../domain/rental-reminder-domain';

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
    const scheduledFrom = query.scheduledFrom
      ? new Date(query.scheduledFrom)
      : undefined;
    const scheduledTo = query.scheduledTo
      ? new Date(query.scheduledTo)
      : undefined;
    const where: Prisma.RentalReminderDispatchWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(scheduledFrom || scheduledTo
        ? {
            scheduledFor: {
              ...(scheduledFrom ? { gte: scheduledFrom } : {}),
              ...(scheduledTo ? { lt: scheduledTo } : {}),
            },
          }
        : {}),
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
    const sentFrom = query.sentFrom ? new Date(query.sentFrom) : undefined;
    const sentTo = query.sentTo ? new Date(query.sentTo) : undefined;
    const deliveredFrom = query.deliveredFrom
      ? new Date(query.deliveredFrom)
      : undefined;
    const deliveredTo = query.deliveredTo
      ? new Date(query.deliveredTo)
      : undefined;
    const failedFrom = query.failedFrom
      ? new Date(query.failedFrom)
      : undefined;
    const failedTo = query.failedTo ? new Date(query.failedTo) : undefined;
    const where: Prisma.RentalReminderDeliveryWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.dispatchId ? { dispatchId: query.dispatchId } : {}),
      ...(query.contractId
        ? { dispatch: { tenantId, contractId: query.contractId } }
        : {}),
      ...(sentFrom || sentTo
        ? {
            sentAt: {
              ...(sentFrom ? { gte: sentFrom } : {}),
              ...(sentTo ? { lt: sentTo } : {}),
            },
          }
        : {}),
      ...(deliveredFrom || deliveredTo
        ? {
            deliveredAt: {
              ...(deliveredFrom ? { gte: deliveredFrom } : {}),
              ...(deliveredTo ? { lt: deliveredTo } : {}),
            },
          }
        : {}),
      ...(failedFrom || failedTo
        ? {
            failedAt: {
              ...(failedFrom ? { gte: failedFrom } : {}),
              ...(failedTo ? { lt: failedTo } : {}),
            },
          }
        : {}),
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

  findContractSummary(tenantId: string, contractId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { tenantId, id: contractId },
      select: { id: true, internalNumber: true },
    });
  }

  findContractCommunicationsHistory(
    tenantId: string,
    contractId: string,
    query: RentalReminderContractHistoryQueryDto,
  ) {
    const paging = pageOptions(query.page, query.pageSize);
    const where: Prisma.RentalReminderDispatchWhereInput = {
      tenantId,
      contractId,
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.dispatchStatus ? { status: query.dispatchStatus } : {}),
      ...(query.channel
        ? { deliveries: { some: { channel: query.channel } } }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.rentalReminderDispatch.findMany({
        where,
        include: {
          deliveries: {
            where: { ...(query.channel ? { channel: query.channel } : {}) },
            include: {
              attempts: { orderBy: { attemptNumber: 'asc' as const } },
            },
          },
          occurrences: {
            select: {
              occurrenceId: true,
              status: true,
              exclusionReason: true,
              occurrence: {
                select: {
                  dueDate: true,
                  obligation: {
                    select: { concept: { select: { name: true } } },
                  },
                },
              },
            },
            orderBy: { occurrenceId: 'asc' as const },
          },
        },
        orderBy: [{ scheduledFor: 'desc' as const }, { id: 'desc' as const }],
        skip: paging.skip,
        take: paging.pageSize,
      }),
      this.prisma.rentalReminderDispatch.count({ where }),
    ]);
  }

  countCommunicationsSummary(tenantId: string, from: Date, to: Date) {
    return this.prisma
      .$transaction([
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
      ])
      .then(
        ([
          dispatchesScheduledToday,
          deliveriesSentToday,
          deliveriesDeliveredToday,
          deliveriesFailedToday,
          planningIssuesOpen,
          inboundUnacknowledged,
        ]) => ({
          dispatchesScheduledToday,
          deliveriesSentToday,
          deliveriesDeliveredToday,
          deliveriesFailedToday,
          planningIssuesOpen,
          inboundUnacknowledged,
        }),
      );
  }

  findTenantTimezone(tenantId: string) {
    return this.prisma.rentalReminderPolicy.findUnique({
      where: { tenantId },
      select: {
        tenant: { select: { settings: { select: { timeZone: true } } } },
      },
    });
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
    deliveryId?: string;
    now: Date;
    token: string;
    lockedUntil: Date;
  }) {
    await this.recoverExpiredAttempt(input);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await this.prisma.rentalReminderDelivery.findFirst({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(input.deliveryId ? { id: input.deliveryId } : {}),
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

  private recoverExpiredAttempt(input: {
    tenantId?: string;
    deliveryId?: string;
    now: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(input.deliveryId ? { id: input.deliveryId } : {}),
          status: RentalReminderDeliveryStatus.PROCESSING,
          attemptCount: { gt: 0 },
          lockedUntil: { lt: input.now },
        },
        include: {
          attempts: {
            where: { status: RentalReminderAttemptStatus.PROCESSING },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });
      const attempt = delivery?.attempts[0];
      if (!delivery || !attempt) return false;
      const recovered = await tx.rentalReminderDeliveryAttempt.updateMany({
        where: {
          id: attempt.id,
          tenantId: delivery.tenantId,
          deliveryId: delivery.id,
          status: RentalReminderAttemptStatus.PROCESSING,
        },
        data: {
          status: RentalReminderAttemptStatus.FAILED,
          finishedAt: input.now,
          errorCategory: 'LEASE_EXPIRED',
          errorCode: 'DELIVERY_LEASE_EXPIRED',
          errorMessage: 'Delivery processing lease expired.',
        },
      });
      if (recovered.count !== 1) return false;
      const terminal = delivery.attemptCount >= 4;
      await tx.rentalReminderDelivery.update({
        where: { id: delivery.id },
        data: {
          status: terminal
            ? RentalReminderDeliveryStatus.FAILED
            : RentalReminderDeliveryStatus.PENDING,
          statusSource: RentalReminderStatusSource.INTERNAL,
          nextAttemptAt: terminal ? null : input.now,
          failedAt: terminal ? input.now : null,
          processingToken: null,
          lockedUntil: null,
          errorCategory: 'LEASE_EXPIRED',
          errorCode: 'DELIVERY_LEASE_EXPIRED',
          errorMessage: 'Delivery processing lease expired.',
        },
      });
      if (terminal) {
        await this.refreshDispatchStatus(
          tx,
          delivery.tenantId,
          delivery.dispatchId,
          input.now,
        );
      }
      return true;
    });
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

  skipClaimedDeliveryBeforeRetry(input: {
    tenantId: string;
    deliveryId: string;
    token: string;
    skippedAt: Date;
    reason: string;
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
      if (!delivery) return false;
      await tx.rentalReminderDelivery.update({
        where: { id: delivery.id },
        data: {
          status: RentalReminderDeliveryStatus.SKIPPED,
          skippedAt: input.skippedAt,
          nextAttemptAt: null,
          processingToken: null,
          lockedUntil: null,
          errorCategory: input.reason,
        },
      });
      await this.refreshDispatchStatus(
        tx,
        input.tenantId,
        delivery.dispatchId,
        input.skippedAt,
      );
      return true;
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

  findClaimedDelivery(input: {
    tenantId: string;
    deliveryId: string;
    token: string;
  }) {
    return this.prisma.rentalReminderDelivery.findFirst({
      where: {
        id: input.deliveryId,
        tenantId: input.tenantId,
        status: RentalReminderDeliveryStatus.PROCESSING,
        processingToken: input.token,
      },
      include: {
        dispatch: {
          include: {
            contract: { select: { internalNumber: true } },
          },
        },
      },
    });
  }

  findReadyEmailDelivery(tenantId: string, deliveryId: string) {
    return this.prisma.rentalReminderDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId,
        channel: NotificationChannel.EMAIL,
        status: RentalReminderDeliveryStatus.PENDING,
      },
      select: {
        id: true,
        tenantId: true,
        dispatchId: true,
        channel: true,
        destinationSnapshot: true,
        nextAttemptAt: true,
        dispatch: {
          select: {
            contractId: true,
            contract: { select: { internalNumber: true } },
          },
        },
      },
    });
  }

  findReadyWhatsAppDelivery(tenantId: string, deliveryId: string) {
    return this.prisma.rentalReminderDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId,
        channel: NotificationChannel.WHATSAPP,
        status: RentalReminderDeliveryStatus.PENDING,
      },
      select: {
        id: true,
        tenantId: true,
        dispatchId: true,
        channel: true,
        destinationSnapshot: true,
        nextAttemptAt: true,
        contentSnapshot: true,
        dispatch: {
          select: {
            contractId: true,
            recipientSnapshot: true,
            contract: { select: { internalNumber: true } },
          },
        },
      },
    });
  }

  createDeliveryAttempt(input: {
    tenantId: string;
    deliveryId: string;
    token: string;
    startedAt: Date;
    subject: string;
    body: string;
    contentSnapshot: Prisma.InputJsonValue;
    templateKey: string;
    templateVersion: string;
    providerTemplateRef?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: {
          id: input.deliveryId,
          tenantId: input.tenantId,
          status: RentalReminderDeliveryStatus.PROCESSING,
          processingToken: input.token,
          attemptCount: { lt: 4 },
        },
        select: {
          id: true,
          dispatchId: true,
          deliveryKey: true,
          attemptCount: true,
          providerKey: true,
          dispatch: { select: { firstAttemptAt: true } },
        },
      });
      if (!delivery) return null;
      const attemptNumber = delivery.attemptCount + 1;
      const attempt = await tx.rentalReminderDeliveryAttempt.create({
        data: {
          tenantId: input.tenantId,
          deliveryId: delivery.id,
          attemptNumber,
          attemptKey: computeAttemptKey(delivery.deliveryKey, attemptNumber),
          status: RentalReminderAttemptStatus.PROCESSING,
          startedAt: input.startedAt,
        },
      });
      await tx.rentalReminderDelivery.update({
        where: { id: delivery.id },
        data: {
          ...(delivery.attemptCount === 0
            ? {
                subjectSnapshot: input.subject,
                bodySnapshot: input.body,
                contentSnapshot: input.contentSnapshot,
                templateKey: input.templateKey,
                templateVersion: input.templateVersion,
                providerTemplateRef: input.providerTemplateRef,
              }
            : {}),
          attemptCount: attemptNumber,
          nextAttemptAt: null,
        },
      });
      await tx.rentalReminderDispatch.update({
        where: { id: delivery.dispatchId },
        data: {
          status: RentalReminderDispatchStatus.PROCESSING,
          ...(delivery.dispatch.firstAttemptAt
            ? {}
            : {
                frozenAt: input.startedAt,
                firstAttemptAt: input.startedAt,
              }),
        },
      });
      return { ...attempt, providerKey: delivery.providerKey };
    });
  }

  acceptDeliveryAttempt(input: {
    tenantId: string;
    deliveryId: string;
    attemptId: string;
    token: string;
    providerMessageId: string;
    finishedAt: Date;
    latencyMs: number;
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
      if (!delivery) return false;
      const attempt = await tx.rentalReminderDeliveryAttempt.updateMany({
        where: {
          id: input.attemptId,
          tenantId: input.tenantId,
          deliveryId: delivery.id,
          status: RentalReminderAttemptStatus.PROCESSING,
        },
        data: {
          status: RentalReminderAttemptStatus.ACCEPTED,
          finishedAt: input.finishedAt,
          latencyMs: input.latencyMs,
          providerMessageId: input.providerMessageId,
        },
      });
      if (attempt.count !== 1) return false;
      await tx.rentalReminderDelivery.update({
        where: { id: delivery.id },
        data: {
          status: RentalReminderDeliveryStatus.SENT,
          statusSource: RentalReminderStatusSource.PROVIDER_RESPONSE,
          providerMessageId: input.providerMessageId,
          sentAt: input.finishedAt,
          processingToken: null,
          lockedUntil: null,
          errorCategory: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      await this.refreshDispatchStatus(
        tx,
        input.tenantId,
        delivery.dispatchId,
        input.finishedAt,
      );
      return true;
    });
  }

  failDeliveryAttempt(input: {
    tenantId: string;
    deliveryId: string;
    attemptId: string;
    token: string;
    finishedAt: Date;
    latencyMs: number;
    retryAt: Date | null;
    errorCategory: string;
    errorCode: string | null;
    errorMessage: string;
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
      if (!delivery) return false;
      const attempt = await tx.rentalReminderDeliveryAttempt.updateMany({
        where: {
          id: input.attemptId,
          tenantId: input.tenantId,
          deliveryId: delivery.id,
          status: RentalReminderAttemptStatus.PROCESSING,
        },
        data: {
          status: RentalReminderAttemptStatus.FAILED,
          finishedAt: input.finishedAt,
          latencyMs: input.latencyMs,
          errorCategory: input.errorCategory,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
        },
      });
      if (attempt.count !== 1) return false;
      await tx.rentalReminderDelivery.update({
        where: { id: delivery.id },
        data: {
          status: input.retryAt
            ? RentalReminderDeliveryStatus.PENDING
            : RentalReminderDeliveryStatus.FAILED,
          statusSource: RentalReminderStatusSource.PROVIDER_RESPONSE,
          nextAttemptAt: input.retryAt,
          failedAt: input.retryAt ? null : input.finishedAt,
          processingToken: null,
          lockedUntil: null,
          errorCategory: input.errorCategory,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
        },
      });
      await this.refreshDispatchStatus(
        tx,
        input.tenantId,
        delivery.dispatchId,
        input.finishedAt,
      );
      return true;
    });
  }

  manualResetFailedDelivery(input: {
    tenantId: string;
    deliveryId: string;
    now: Date;
  }): Promise<
    | {
        ok: true;
        attemptCount: number;
        nextAttemptNumber: number;
        dispatchReopened: boolean;
      }
    | {
        ok: false;
        reason:
          | 'NOT_FOUND'
          | 'NOT_FAILED'
          | 'IN_FLIGHT'
          | 'MAX_ATTEMPTS'
          | 'CONCURRENT';
      }
  > {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: { id: input.deliveryId, tenantId: input.tenantId },
        select: {
          id: true,
          dispatchId: true,
          status: true,
          attemptCount: true,
          lockedUntil: true,
          errorCategory: true,
          errorCode: true,
          errorMessage: true,
        },
      });
      if (!delivery) return { ok: false, reason: 'NOT_FOUND' as const };
      const failed = delivery.status === RentalReminderDeliveryStatus.FAILED;
      const danglingProcessing =
        delivery.status === RentalReminderDeliveryStatus.PROCESSING &&
        delivery.lockedUntil !== null &&
        delivery.lockedUntil < input.now;
      if (!failed && !danglingProcessing)
        return { ok: false, reason: 'NOT_FAILED' as const };
      if (delivery.attemptCount >= 4)
        return { ok: false, reason: 'MAX_ATTEMPTS' as const };
      if (danglingProcessing) {
        // A lease-expired PROCESSING delivery is only recoverable when no live
        // PROCESSING attempt exists; a live attempt belongs to a worker and is
        // the responsibility of the canonical lease recovery path.
        const liveAttempt = await tx.rentalReminderDeliveryAttempt.findFirst({
          where: {
            tenantId: input.tenantId,
            deliveryId: delivery.id,
            status: RentalReminderAttemptStatus.PROCESSING,
          },
          select: { id: true },
        });
        if (liveAttempt) return { ok: false, reason: 'IN_FLIGHT' as const };
      }
      const updated = await tx.rentalReminderDelivery.updateMany({
        where: {
          id: delivery.id,
          tenantId: input.tenantId,
          OR: [
            { status: RentalReminderDeliveryStatus.FAILED },
            {
              status: RentalReminderDeliveryStatus.PROCESSING,
              lockedUntil: { lt: input.now },
            },
          ],
        },
        data: {
          status: RentalReminderDeliveryStatus.PENDING,
          statusSource: RentalReminderStatusSource.INTERNAL,
          nextAttemptAt: input.now,
          failedAt: null,
          processingToken: null,
          lockedUntil: null,
        },
      });
      if (updated.count !== 1)
        return { ok: false, reason: 'CONCURRENT' as const };
      const dispatch = await tx.rentalReminderDispatch.findFirst({
        where: { tenantId: input.tenantId, id: delivery.dispatchId },
        select: { id: true, completedAt: true },
      });
      const dispatchReopened =
        dispatch !== null && dispatch.completedAt !== null;
      if (dispatchReopened) {
        await tx.rentalReminderDispatch.updateMany({
          where: {
            tenantId: input.tenantId,
            id: delivery.dispatchId,
            completedAt: { not: null },
          },
          data: {
            status: RentalReminderDispatchStatus.READY,
            completedAt: null,
          },
        });
      }
      return {
        ok: true,
        attemptCount: delivery.attemptCount,
        nextAttemptNumber: delivery.attemptCount + 1,
        dispatchReopened,
      };
    });
  }

  private async refreshDispatchStatus(
    tx: Prisma.TransactionClient,
    tenantId: string,
    dispatchId: string,
    now: Date,
  ) {
    const deliveries = await tx.rentalReminderDelivery.findMany({
      where: { tenantId, dispatchId },
      select: { status: true },
    });
    const activeStatuses: RentalReminderDeliveryStatus[] = [
      RentalReminderDeliveryStatus.PENDING,
      RentalReminderDeliveryStatus.PROCESSING,
    ];
    const active = deliveries.some((item) =>
      activeStatuses.includes(item.status),
    );
    if (active) return;
    const successStatuses: RentalReminderDeliveryStatus[] = [
      RentalReminderDeliveryStatus.SENT,
      RentalReminderDeliveryStatus.DELIVERED,
      RentalReminderDeliveryStatus.READ,
    ];
    const successes = deliveries.filter((item) =>
      successStatuses.includes(item.status),
    ).length;
    const failures = deliveries.filter(
      (item) => item.status === RentalReminderDeliveryStatus.FAILED,
    ).length;
    const status =
      successes === deliveries.length
        ? RentalReminderDispatchStatus.COMPLETED
        : successes > 0
          ? RentalReminderDispatchStatus.PARTIALLY_COMPLETED
          : failures > 0
            ? RentalReminderDispatchStatus.FAILED
            : RentalReminderDispatchStatus.SKIPPED;
    await tx.rentalReminderDispatch.update({
      where: { id: dispatchId },
      data: { status, completedAt: now },
    });
  }

  applyProviderWebhook(input: {
    providerKey: string;
    providerAccountKey: string;
    providerEventKey: string;
    providerMessageId: string;
    eventType: string;
    providerOccurredAt: Date | null;
    payloadDigest: string;
    targetStatus: RentalReminderDeliveryStatus | null;
    errorCategory?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    processedAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.rentalReminderDelivery.findFirst({
        where: {
          providerKey: input.providerKey,
          providerAccountKey: input.providerAccountKey,
          providerMessageId: input.providerMessageId,
        },
        include: {
          attempts: {
            where: { providerMessageId: input.providerMessageId },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });
      if (!delivery) return { status: 'UNMAPPED' as const };
      const current = delivery.status;
      const successfulStatuses: RentalReminderDeliveryStatus[] = [
        RentalReminderDeliveryStatus.DELIVERED,
        RentalReminderDeliveryStatus.READ,
      ];
      const successful = successfulStatuses.includes(current);
      const canApply =
        input.targetStatus !== null &&
        !(
          input.targetStatus === RentalReminderDeliveryStatus.FAILED &&
          successful
        ) &&
        !(
          input.targetStatus === RentalReminderDeliveryStatus.SENT &&
          (successful || current === RentalReminderDeliveryStatus.FAILED)
        ) &&
        !(
          input.targetStatus === RentalReminderDeliveryStatus.DELIVERED &&
          current === RentalReminderDeliveryStatus.READ
        );
      const receipt = await tx.rentalReminderWebhookReceipt.createMany({
        data: [
          {
            tenantId: delivery.tenantId,
            deliveryId: delivery.id,
            attemptId: delivery.attempts[0]?.id,
            providerKey: input.providerKey,
            providerAccountKey: input.providerAccountKey,
            providerEventKey: input.providerEventKey,
            providerMessageId: input.providerMessageId,
            eventType: input.eventType,
            providerOccurredAt: input.providerOccurredAt,
            processedAt: input.processedAt,
            status: canApply
              ? RentalReminderWebhookReceiptStatus.APPLIED
              : RentalReminderWebhookReceiptStatus.IGNORED,
            payloadDigest: input.payloadDigest,
            errorCategory: input.errorCategory,
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
          },
        ],
        skipDuplicates: true,
      });
      if (receipt.count === 0) return { status: 'DUPLICATE' as const };
      if (canApply && input.targetStatus) {
        await tx.rentalReminderDelivery.update({
          where: { id: delivery.id },
          data: {
            status: input.targetStatus,
            statusSource: RentalReminderStatusSource.PROVIDER_WEBHOOK,
            ...(input.targetStatus === RentalReminderDeliveryStatus.SENT
              ? {
                  sentAt:
                    delivery.sentAt ??
                    input.providerOccurredAt ??
                    input.processedAt,
                }
              : {}),
            ...(input.targetStatus === RentalReminderDeliveryStatus.DELIVERED
              ? { deliveredAt: input.providerOccurredAt ?? input.processedAt }
              : {}),
            ...(input.targetStatus === RentalReminderDeliveryStatus.READ
              ? { readAt: input.providerOccurredAt ?? input.processedAt }
              : {}),
            ...(input.targetStatus === RentalReminderDeliveryStatus.FAILED
              ? {
                  failedAt: input.providerOccurredAt ?? input.processedAt,
                  errorCategory: input.errorCategory,
                  errorCode: input.errorCode,
                  errorMessage: input.errorMessage,
                }
              : {}),
          },
        });
        await this.refreshDispatchStatus(
          tx,
          delivery.tenantId,
          delivery.dispatchId,
          input.processedAt,
        );
      }
      return {
        status: canApply ? ('APPLIED' as const) : ('IGNORED' as const),
      };
    });
  }
}
