import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
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
}
