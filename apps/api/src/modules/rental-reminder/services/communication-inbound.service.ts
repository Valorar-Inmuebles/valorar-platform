import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import type { RentalReminderInboundQueryDto } from '../dto/rental-reminder-read-model.dto';
import { normalizeMetaWhatsAppInboundSender } from '../providers/meta-whatsapp-recipient';
import { CommunicationInboundRepository } from '../repositories/communication-inbound.repository';

const RECENT_DELIVERY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export type NormalizedMetaInboundMessage = {
  providerMessageId: string;
  sender: string;
  contextMessageId: string | null;
  messageType: string;
  body: string | null;
  metadata?: Prisma.InputJsonValue;
  receivedAt: Date;
};

@Injectable()
export class CommunicationInboundService {
  constructor(private readonly repository: CommunicationInboundRepository) {}

  async persist(message: NormalizedMetaInboundMessage) {
    const sender = normalizeMetaWhatsAppInboundSender(message.sender);
    const addresses = [sender.e164, sender.graphRecipient];
    const points = await this.repository.findContactPoints(addresses);
    const exact = message.contextMessageId
      ? await this.repository.findOutboundByProviderMessageId(
          message.contextMessageId,
        )
      : null;
    const exactMatchesSender =
      exact !== null &&
      this.sameAddress(exact.destinationSnapshot, sender.e164);
    const recentRaw = await this.repository.findRecentDeliveries({
      addresses,
      contactPointIds: points.map((point) => point.id),
      since: new Date(
        message.receivedAt.getTime() - RECENT_DELIVERY_LOOKBACK_MS,
      ),
    });
    const recent = recentRaw.filter((delivery) =>
      this.sameAddress(delivery.destinationSnapshot, sender.e164),
    );

    const recentTenantIds = this.unique(recent.map((item) => item.tenantId));
    const pointTenantIds = this.unique(points.map((item) => item.tenantId));
    const tenantId = exactMatchesSender
      ? exact.tenantId
      : recentTenantIds.length === 1
        ? recentTenantIds[0]
        : recentTenantIds.length > 1
          ? null
          : pointTenantIds.length === 1
            ? pointTenantIds[0]
            : null;
    if (!tenantId) return { status: 'UNMAPPED_TENANT' as const };

    const tenantPoints = points.filter((point) => point.tenantId === tenantId);
    const contactIds = this.unique(
      tenantPoints.map((point) => point.contactId),
    );
    const contactId = exactMatchesSender
      ? exact.dispatch.recipientContactId
      : contactIds.length === 1
        ? contactIds[0]
        : null;
    const contactPointId = exactMatchesSender
      ? exact.contactPointId
      : tenantPoints.length === 1
        ? tenantPoints[0].id
        : null;
    const tenantDeliveries = exactMatchesSender
      ? [exact]
      : recent.filter((delivery) => delivery.tenantId === tenantId);
    const deliveryIds = this.unique(tenantDeliveries.map((item) => item.id));
    const deliveryId = deliveryIds.length === 1 ? deliveryIds[0] : null;
    const deliveryContractIds = this.unique(
      tenantDeliveries.map((item) => item.dispatch.contractId),
    );
    let contractId =
      deliveryContractIds.length === 1 ? deliveryContractIds[0] : null;
    if (!contractId && contactId) {
      const activeContracts = await this.repository.findActiveRenterContracts(
        tenantId,
        contactId,
      );
      const activeIds = this.unique(
        activeContracts.map((item) => item.contractId),
      );
      contractId = activeIds.length === 1 ? activeIds[0] : null;
    }

    const persisted = await this.repository.persist({
      tenantId,
      providerMessageId: message.providerMessageId,
      senderAddress: sender.e164,
      messageType: message.messageType,
      body: message.body,
      metadata: message.metadata,
      receivedAt: message.receivedAt,
      contactPointId,
      contactId,
      contractId,
      deliveryId,
    });
    return {
      status: persisted.created
        ? ('PERSISTED' as const)
        : ('DUPLICATE' as const),
      message: persisted.message,
    };
  }

  listReadModel(tenantId: string, query: RentalReminderInboundQueryDto) {
    return this.repository.listReadModel(tenantId, query);
  }

  private sameAddress(value: string, expectedE164: string) {
    try {
      return normalizeMetaWhatsAppInboundSender(value).e164 === expectedE164;
    } catch {
      return false;
    }
  }

  private unique(values: Array<string | null>) {
    return [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ];
  }
}
