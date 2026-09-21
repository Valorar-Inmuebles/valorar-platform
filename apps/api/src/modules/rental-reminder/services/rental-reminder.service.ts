import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  RentalReminderPageQueryDto,
  RentalReminderPlanningIssueQueryDto,
  UpdateRentalReminderPolicyDto,
} from '../dto/rental-reminder.dto';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';

@Injectable()
export class RentalReminderService {
  constructor(private readonly repository: RentalReminderRepository) {}

  async getPolicy(tenantId: string) {
    const policy = await this.repository.findPolicy(tenantId);
    if (!policy)
      throw new NotFoundException('Rental reminder policy not found');
    return this.policyResponse(policy);
  }

  async updatePolicy(tenantId: string, dto: UpdateRentalReminderPolicyDto) {
    const policy = await this.repository.updatePolicy(tenantId, dto);
    if (!policy)
      throw new NotFoundException('Rental reminder policy not found');
    return this.policyResponse(policy);
  }

  async listPlanningIssues(
    tenantId: string,
    query: RentalReminderPlanningIssueQueryDto,
  ) {
    return this.toPage(
      await this.repository.findPlanningIssues(tenantId, query),
      query,
    );
  }

  async listDispatches(
    tenantId: string,
    query: RentalReminderDispatchQueryDto,
  ) {
    return this.toPage(
      await this.repository.findDispatches(tenantId, query),
      query,
    );
  }

  async listDeliveries(
    tenantId: string,
    query: RentalReminderDeliveryQueryDto,
  ) {
    return this.toPage(
      await this.repository.findDeliveries(tenantId, query),
      query,
    );
  }

  async listAttempts(
    tenantId: string,
    deliveryId: string,
    query: RentalReminderPageQueryDto,
  ) {
    const result = await this.repository.findAttempts(
      tenantId,
      deliveryId,
      query.page,
      query.pageSize,
    );
    if (!result)
      throw new NotFoundException('Rental reminder delivery not found');
    return this.toPage(result, query);
  }

  private policyResponse(policy: {
    id: string;
    preDueEnabled: boolean;
    preDueDays: number;
    dueEnabled: boolean;
    postDueEnabled: boolean;
    postDueDays: number;
    sendTimeMinutes: number;
    createdAt: Date;
    updatedAt: Date;
    tenant: { settings: { timeZone: string } | null };
  }) {
    return {
      id: policy.id,
      preDueEnabled: policy.preDueEnabled,
      preDueDays: policy.preDueDays,
      dueEnabled: policy.dueEnabled,
      postDueEnabled: policy.postDueEnabled,
      postDueDays: policy.postDueDays,
      sendTimeMinutes: policy.sendTimeMinutes,
      timeZone:
        policy.tenant.settings?.timeZone ?? 'America/Argentina/Buenos_Aires',
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  private toPage<T>(
    [items, total]: [T[], number],
    query: RentalReminderPageQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
