import { Injectable } from '@nestjs/common';
import {
  RentalContractPartyRole,
  RentalContractStatus,
  RentalOccurrenceStatus,
} from '../../../../generated/prisma/client';
import { computeOccurrenceSetHash } from '../domain/rental-reminder-domain';
import {
  eventRemainsSemanticallyValid,
  isContactPointCompatible,
} from '../domain/rental-reminder-planner';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';

export type DeliveryRevalidationResult =
  | { status: 'NOT_FOUND' }
  | { status: 'IMMUTABLE'; deliveryId: string }
  | {
      status: 'READY';
      deliveryId: string;
      includedOccurrenceIds: string[];
      excludedOccurrenceIds: string[];
    }
  | { status: 'SKIPPED'; deliveryId: string; reason: string };

@Injectable()
export class ReminderDeliveryRevalidationService {
  constructor(private readonly repository: RentalReminderRepository) {}

  async revalidate(
    tenantId: string,
    deliveryId: string,
    now: Date,
  ): Promise<DeliveryRevalidationResult> {
    const delivery = await this.repository.findDeliveryForRevalidation(
      tenantId,
      deliveryId,
    );
    if (!delivery) return { status: 'NOT_FOUND' };
    if (delivery.attemptCount > 0)
      return { status: 'IMMUTABLE', deliveryId: delivery.id };

    const dispatch = delivery.dispatch;
    const renter = dispatch.occurrences
      .flatMap((item) => item.occurrence.obligation.contract.parties)
      .find(
        (party) =>
          party.role === RentalContractPartyRole.RENTER &&
          party.contactId === dispatch.recipientContactId,
      );
    const route = renter?.notificationRoutes.find(
      (candidate) =>
        candidate.id === delivery.routeId &&
        candidate.contactPointId === delivery.contactPointId &&
        candidate.channel === delivery.channel,
    );
    const routeEligible =
      renter?.tenantId === tenantId &&
      renter.contact.tenantId === tenantId &&
      renter.contact.isActive &&
      route?.tenantId === tenantId &&
      route.isEnabled &&
      route.contactPoint.tenantId === tenantId &&
      route.contactPoint.contactId === renter.contactId &&
      route.contactPoint.isActive &&
      route.contactPoint.value.trim().length > 0 &&
      isContactPointCompatible({
        channel: delivery.channel,
        contactPointType: route.contactPoint.type,
        canReceiveWhatsapp: route.contactPoint.canReceiveWhatsapp,
      });

    const included = routeEligible
      ? dispatch.occurrences.filter(({ occurrence }) => {
          const obligation = occurrence.obligation;
          return (
            occurrence.tenantId === tenantId &&
            occurrence.status === RentalOccurrenceStatus.PENDING &&
            occurrence.dueDate !== null &&
            obligation.tenantId === tenantId &&
            obligation.isActive &&
            obligation.includeInNotice &&
            (!obligation.showAmount || occurrence.amount !== null) &&
            obligation.contract.tenantId === tenantId &&
            obligation.contract.status === RentalContractStatus.ACTIVE &&
            eventRemainsSemanticallyValid({
              eventType: dispatch.eventType,
              dueDate: occurrence.dueDate,
              now,
              timeZone: String(
                (dispatch.policySnapshot as Record<string, unknown>).timeZone,
              ),
            })
          );
        })
      : [];
    const includedIds = included.map((item) => item.occurrenceId).sort();
    const excludedIds = dispatch.occurrences
      .map((item) => item.occurrenceId)
      .filter((id) => !includedIds.includes(id))
      .sort();
    const contentSnapshot = {
      version: 1,
      renderState: 'PENDING_C3',
      eventType: dispatch.eventType,
      dueDate: dispatch.dueDate.toISOString().slice(0, 10),
      occurrences: included
        .sort((left, right) =>
          left.occurrenceId.localeCompare(right.occurrenceId),
        )
        .map(({ occurrence }) => ({
          occurrenceId: occurrence.id,
          obligationId: occurrence.obligation.id,
          conceptId: occurrence.obligation.concept.id,
          conceptName: occurrence.obligation.concept.name,
          dueDate: occurrence.dueDate?.toISOString().slice(0, 10),
          showAmount: occurrence.obligation.showAmount,
          amount:
            occurrence.obligation.showAmount && occurrence.amount !== null
              ? occurrence.amount.toString()
              : null,
          currency: occurrence.currency,
        })),
    };
    const reason = routeEligible
      ? 'NO_LONGER_ELIGIBLE'
      : 'CONTACT_POINT_INELIGIBLE';

    await this.repository.applyDeliveryRevalidation({
      tenantId,
      deliveryId,
      includedOccurrenceIds: includedIds,
      excludedOccurrenceIds: excludedIds,
      occurrenceSetHash: computeOccurrenceSetHash(includedIds),
      contentSnapshot,
      now,
      updateDispatchSnapshot: dispatch.firstAttemptAt === null,
      skipReason: reason,
    });

    if (!includedIds.length)
      return { status: 'SKIPPED', deliveryId: delivery.id, reason };
    return {
      status: 'READY',
      deliveryId: delivery.id,
      includedOccurrenceIds: includedIds,
      excludedOccurrenceIds: excludedIds,
    };
  }
}
