import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  RentalReminderEventType,
  RentalReminderPlanningIssueType,
} from '../../../../generated/prisma/client';
import {
  computeDeliveryKey,
  computeDispatchGroupKey,
  computeOccurrenceSetHash,
  computePlanningIssueKey,
  isOperationalReminderChannel,
} from '../domain/rental-reminder-domain';
import {
  addLocalDays,
  classifyPlannerWindow,
  enabledEvents,
  eventSchedule,
  isContactPointCompatible,
  isValidTimeZone,
  localDateAt,
  PLANNER_LOOKBACK_DAYS,
  PLANNER_MANAGED_ISSUE_TYPES,
} from '../domain/rental-reminder-planner';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';

type Policy = Awaited<
  ReturnType<RentalReminderRepository['findPlannerPolicies']>
>[number];
type Candidate = Awaited<
  ReturnType<RentalReminderRepository['findPlanningCandidates']>
>[number];

type IssueDetection = Parameters<
  RentalReminderRepository['reconcilePlanningIssues']
>[1][number];

type PlannedRoute = {
  channel: NotificationChannel;
  contactPointId: string;
  routeId: string;
  destinationSnapshot: string;
};

type PlannedGroup = {
  tenantId: string;
  contractId: string;
  recipientContactId: string;
  recipientName: string;
  eventType: RentalReminderEventType;
  dueDate: Date;
  scheduledFor: Date;
  occurrences: Candidate[];
  routes: Map<NotificationChannel, PlannedRoute>;
};

export type ReminderPlannerRunOptions = { dryRun?: boolean };

export type ReminderPlannerRunResult = {
  now: string;
  dryRun: boolean;
  tenants: number;
  candidates: number;
  dispatchesCreated: number;
  dispatchesDeduplicated: number;
  deliveriesPrepared: number;
  issuesDetected: number;
  plans: Array<{
    tenantId: string;
    contractId: string;
    recipientContactId: string;
    eventType: RentalReminderEventType;
    dueDate: string;
    occurrenceIds: string[];
    channels: NotificationChannel[];
  }>;
};

@Injectable()
export class ReminderPlannerService {
  constructor(private readonly repository: RentalReminderRepository) {}

  async run(
    now: Date,
    options: ReminderPlannerRunOptions = {},
  ): Promise<ReminderPlannerRunResult> {
    return this.runForPolicies(now, undefined, options);
  }

  async runForTenant(
    tenantId: string,
    now: Date,
    options: ReminderPlannerRunOptions = {},
  ): Promise<ReminderPlannerRunResult> {
    const normalizedTenantId = tenantId.trim();
    if (!normalizedTenantId) throw new Error('Planner tenantId is required');
    return this.runForPolicies(now, normalizedTenantId, options);
  }

  private async runForPolicies(
    now: Date,
    tenantId: string | undefined,
    options: ReminderPlannerRunOptions,
  ): Promise<ReminderPlannerRunResult> {
    if (Number.isNaN(now.getTime())) throw new Error('Planner now is invalid');

    const policies = await this.repository.findPlannerPolicies(tenantId);
    const result: ReminderPlannerRunResult = {
      now: now.toISOString(),
      dryRun: options.dryRun ?? false,
      tenants: policies.length,
      candidates: 0,
      dispatchesCreated: 0,
      dispatchesDeduplicated: 0,
      deliveriesPrepared: 0,
      issuesDetected: 0,
      plans: [],
    };

    for (const policy of policies) {
      const tenantResult = await this.planTenant(policy, now);
      result.candidates += tenantResult.candidateCount;
      result.issuesDetected += tenantResult.issues.length;
      result.plans.push(...tenantResult.plans);
      result.deliveriesPrepared += tenantResult.persistablePlans.reduce(
        (total, plan) => total + plan.deliveries.length,
        0,
      );

      if (options.dryRun) continue;

      await this.repository.reconcilePlanningIssues(
        policy.tenantId,
        tenantResult.issues,
        [...PLANNER_MANAGED_ISSUE_TYPES],
        now,
      );
      for (const plan of tenantResult.persistablePlans) {
        const saved = await this.repository.upsertPlannedDispatch(plan);
        if (saved.created) result.dispatchesCreated += 1;
        else result.dispatchesDeduplicated += 1;
      }
    }

    return result;
  }

  private async planTenant(policy: Policy, now: Date) {
    const issues = new Map<string, IssueDetection>();
    const groups = new Map<string, PlannedGroup>();
    const timeZone = policy.tenant.settings?.timeZone;

    if (!isValidTimeZone(timeZone)) {
      const detection = this.issue({
        tenantId: policy.tenantId,
        type: RentalReminderPlanningIssueType.TENANT_TIME_ZONE_MISSING_OR_INVALID,
        metadata: { timeZone: timeZone ?? null },
      });
      issues.set(detection.deduplicationKey, detection);
      return {
        candidateCount: 0,
        issues: [...issues.values()],
        plans: [],
        persistablePlans: [],
      };
    }
    const validTimeZone = timeZone as string;

    const today = localDateAt(now, validTimeZone);
    const dueFrom = this.dateValue(
      addLocalDays(today, -(PLANNER_LOOKBACK_DAYS + 30)),
    );
    const dueTo = this.dateValue(addLocalDays(today, 31));
    const candidates = await this.repository.findPlanningCandidates(
      policy.tenantId,
      dueFrom,
      dueTo,
    );

    for (const candidate of candidates) {
      if (!candidate.dueDate) {
        const detection = this.issue({
          tenantId: policy.tenantId,
          contractId: candidate.obligation.contract.id,
          occurrenceId: candidate.id,
          type: RentalReminderPlanningIssueType.DUE_DATE_MISSING,
          metadata: { obligationId: candidate.obligation.id },
        });
        issues.set(detection.deduplicationKey, detection);
        continue;
      }
      if (candidate.obligation.showAmount && candidate.amount === null) {
        const detection = this.issue({
          tenantId: policy.tenantId,
          contractId: candidate.obligation.contract.id,
          occurrenceId: candidate.id,
          type: RentalReminderPlanningIssueType.DISPLAY_AMOUNT_MISSING,
          metadata: { obligationId: candidate.obligation.id },
        });
        issues.set(detection.deduplicationKey, detection);
        continue;
      }

      for (const eventType of enabledEvents(policy)) {
        const scheduledFor = eventSchedule({
          eventType,
          dueDate: candidate.dueDate,
          policy,
          timeZone: validTimeZone,
        });
        const window = classifyPlannerWindow({
          scheduledFor,
          eventType,
          dueDate: candidate.dueDate,
          now,
          timeZone: validTimeZone,
        });
        if (window === 'NOT_DUE') continue;
        if (window === 'EXPIRED') {
          const detection = this.issue({
            tenantId: policy.tenantId,
            contractId: candidate.obligation.contract.id,
            occurrenceId: candidate.id,
            type: RentalReminderPlanningIssueType.PLANNING_WINDOW_EXPIRED,
            metadata: {
              eventType,
              scheduledFor: scheduledFor.toISOString(),
            },
          });
          issues.set(detection.deduplicationKey, detection);
          continue;
        }
        this.addCandidateGroups(
          groups,
          issues,
          candidate,
          eventType,
          scheduledFor,
        );
      }
    }

    const persistablePlans = [...groups.values()]
      .sort((left, right) =>
        this.groupSortKey(left).localeCompare(this.groupSortKey(right)),
      )
      .map((group) =>
        this.toPersistencePlan(group, policy, validTimeZone, now),
      );
    const plans = persistablePlans.map((plan) => ({
      tenantId: plan.tenantId,
      contractId: plan.contractId,
      recipientContactId: plan.recipientContactId,
      eventType: plan.eventType,
      dueDate: this.dateKey(plan.dueDate),
      occurrenceIds: [...plan.occurrenceIds],
      channels: plan.deliveries.map((delivery) => delivery.channel),
    }));

    return {
      candidateCount: candidates.length,
      issues: [...issues.values()],
      plans,
      persistablePlans,
    };
  }

  private addCandidateGroups(
    groups: Map<string, PlannedGroup>,
    issues: Map<string, IssueDetection>,
    candidate: Candidate,
    eventType: RentalReminderEventType,
    scheduledFor: Date,
  ) {
    const contract = candidate.obligation.contract;
    const renters = contract.parties.filter(
      (party) =>
        party.tenantId === candidate.tenantId &&
        party.contact.tenantId === candidate.tenantId &&
        party.contact.isActive,
    );
    if (renters.length === 0) {
      const detection = this.issue({
        tenantId: candidate.tenantId,
        contractId: contract.id,
        occurrenceId: candidate.id,
        type: RentalReminderPlanningIssueType.NO_ENABLED_ROUTE,
        metadata: { reason: 'NO_ACTIVE_RENTER' },
      });
      issues.set(detection.deduplicationKey, detection);
      return;
    }

    for (const renter of renters) {
      const validRoutes = new Map<NotificationChannel, PlannedRoute>();
      let operationalRoutes = 0;
      for (const route of renter.notificationRoutes) {
        if (!route.isEnabled || !isOperationalReminderChannel(route.channel))
          continue;
        operationalRoutes += 1;
        const point = route.contactPoint;
        const valid =
          route.tenantId === candidate.tenantId &&
          point.tenantId === candidate.tenantId &&
          point.contactId === renter.contactId &&
          point.isActive &&
          point.value.trim().length > 0 &&
          isContactPointCompatible({
            channel: route.channel,
            contactPointType: point.type,
            canReceiveWhatsapp: point.canReceiveWhatsapp,
          });
        if (!valid) {
          const detection = this.issue({
            tenantId: candidate.tenantId,
            contractId: contract.id,
            occurrenceId: candidate.id,
            recipientContactId: renter.contactId,
            channel: route.channel,
            type: RentalReminderPlanningIssueType.CONTACT_POINT_INELIGIBLE,
            metadata: { routeId: route.id, contactPointId: point.id },
          });
          issues.set(detection.deduplicationKey, detection);
          continue;
        }
        validRoutes.set(route.channel, {
          channel: route.channel,
          routeId: route.id,
          contactPointId: point.id,
          destinationSnapshot: point.value,
        });
      }

      if (validRoutes.size === 0) {
        const detection = this.issue({
          tenantId: candidate.tenantId,
          contractId: contract.id,
          occurrenceId: candidate.id,
          recipientContactId: renter.contactId,
          type: RentalReminderPlanningIssueType.NO_ENABLED_ROUTE,
          metadata: {
            reason:
              operationalRoutes === 0
                ? 'NO_ENABLED_OPERATIONAL_ROUTE'
                : 'NO_ELIGIBLE_OPERATIONAL_ROUTE',
          },
        });
        issues.set(detection.deduplicationKey, detection);
        continue;
      }

      const dueDate = candidate.dueDate as Date;
      const groupKey = computeDispatchGroupKey({
        tenantId: candidate.tenantId,
        contractId: contract.id,
        recipientContactId: renter.contactId,
        eventType,
        dueDate: this.dateKey(dueDate),
      });
      const group = groups.get(groupKey) ?? {
        tenantId: candidate.tenantId,
        contractId: contract.id,
        recipientContactId: renter.contactId,
        recipientName: renter.contact.name,
        eventType,
        dueDate,
        scheduledFor,
        occurrences: [],
        routes: validRoutes,
      };
      group.occurrences.push(candidate);
      for (const [channel, route] of validRoutes)
        group.routes.set(channel, route);
      groups.set(groupKey, group);
    }
  }

  private toPersistencePlan(
    group: PlannedGroup,
    policy: Policy,
    timeZone: string,
    now: Date,
  ) {
    const occurrenceIds = [
      ...new Set(group.occurrences.map((occurrence) => occurrence.id)),
    ].sort();
    const groupKey = computeDispatchGroupKey({
      tenantId: group.tenantId,
      contractId: group.contractId,
      recipientContactId: group.recipientContactId,
      eventType: group.eventType,
      dueDate: this.dateKey(group.dueDate),
    });
    const contentSnapshot = {
      version: 1,
      renderState: 'PENDING_C3',
      eventType: group.eventType,
      dueDate: this.dateKey(group.dueDate),
      occurrences: group.occurrences
        .filter((item) => occurrenceIds.includes(item.id))
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((item) => ({
          occurrenceId: item.id,
          obligationId: item.obligation.id,
          conceptId: item.obligation.concept.id,
          conceptName: item.obligation.concept.name,
          dueDate: this.dateKey(item.dueDate as Date),
          showAmount: item.obligation.showAmount,
          amount:
            item.obligation.showAmount && item.amount !== null
              ? item.amount.toString()
              : null,
          currency: item.currency,
        })),
    };
    const routes = [...group.routes.values()].sort((left, right) =>
      left.channel.localeCompare(right.channel),
    );

    return {
      tenantId: group.tenantId,
      contractId: group.contractId,
      recipientContactId: group.recipientContactId,
      recipientIdentityKey: `contact:${group.recipientContactId}`,
      eventType: group.eventType,
      dueDate: group.dueDate,
      scheduledFor: group.scheduledFor,
      groupKey,
      occurrenceSetHash: computeOccurrenceSetHash(occurrenceIds),
      occurrenceIds,
      policySnapshot: {
        version: 1,
        timeZone,
        preDueEnabled: policy.preDueEnabled,
        preDueDays: policy.preDueDays,
        dueEnabled: policy.dueEnabled,
        postDueEnabled: policy.postDueEnabled,
        postDueDays: policy.postDueDays,
        sendTimeMinutes: policy.sendTimeMinutes,
      },
      recipientSnapshot: {
        contactId: group.recipientContactId,
        name: group.recipientName,
      },
      contentSnapshot,
      deliveries: routes.map((route) => ({
        ...route,
        deliveryKey: computeDeliveryKey(groupKey, route.channel),
        contentSnapshot,
        providerKey:
          route.channel === NotificationChannel.EMAIL
            ? 'mailersend'
            : 'meta-whatsapp',
        providerAccountKey: 'platform-default',
        templateKey: 'rental-reminder',
        templateVersion: 'c2-unrendered',
      })),
      evaluatedAt: now,
    };
  }

  private issue(input: {
    tenantId: string;
    contractId?: string | null;
    occurrenceId?: string | null;
    recipientContactId?: string | null;
    channel?: NotificationChannel | null;
    type: RentalReminderPlanningIssueType;
    metadata?: Prisma.InputJsonObject;
  }): IssueDetection {
    return {
      ...input,
      deduplicationKey: computePlanningIssueKey(input),
      metadata: input.metadata,
    };
  }

  private dateValue(value: { year: number; month: number; day: number }) {
    return new Date(Date.UTC(value.year, value.month - 1, value.day));
  }

  private dateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private groupSortKey(group: PlannedGroup) {
    return [
      group.tenantId,
      group.contractId,
      group.recipientContactId,
      group.eventType,
      this.dateKey(group.dueDate),
    ].join('|');
  }
}
