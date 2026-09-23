import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  RentalContractPartyRole,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RentalReminderInboundQueryDto } from '../dto/rental-reminder-read-model.dto';
import {
  META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
  META_WHATSAPP_PROVIDER_KEY,
} from '../config/meta-whatsapp.config';

@Injectable()
export class CommunicationInboundRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOutboundByProviderMessageId(providerMessageId: string) {
    return this.prisma.rentalReminderDelivery.findFirst({
      where: {
        providerKey: META_WHATSAPP_PROVIDER_KEY,
        providerAccountKey: META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
        providerMessageId,
        channel: NotificationChannel.WHATSAPP,
      },
      select: {
        id: true,
        tenantId: true,
        contactPointId: true,
        destinationSnapshot: true,
        dispatch: {
          select: { contractId: true, recipientContactId: true },
        },
      },
    });
  }

  findContactPoints(addresses: string[]) {
    return this.prisma.contactPoint.findMany({
      where: {
        type: 'PHONE',
        isActive: true,
        canReceiveWhatsapp: true,
        normalizedValue: { in: addresses },
        contact: { isActive: true },
      },
      select: { id: true, tenantId: true, contactId: true },
      orderBy: [{ tenantId: 'asc' }, { contactId: 'asc' }, { id: 'asc' }],
    });
  }

  findRecentDeliveries(input: {
    addresses: string[];
    contactPointIds: string[];
    since: Date;
  }) {
    return this.prisma.rentalReminderDelivery.findMany({
      where: {
        providerKey: META_WHATSAPP_PROVIDER_KEY,
        providerAccountKey: META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
        channel: NotificationChannel.WHATSAPP,
        createdAt: { gte: input.since },
        OR: [
          { destinationSnapshot: { in: input.addresses } },
          ...(input.contactPointIds.length
            ? [{ contactPointId: { in: input.contactPointIds } }]
            : []),
        ],
      },
      select: {
        id: true,
        tenantId: true,
        contactPointId: true,
        destinationSnapshot: true,
        createdAt: true,
        dispatch: {
          select: { contractId: true, recipientContactId: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  findActiveRenterContracts(tenantId: string, contactId: string) {
    return this.prisma.rentalContractParty.findMany({
      where: {
        tenantId,
        contactId,
        role: RentalContractPartyRole.RENTER,
        contract: { tenantId, status: RentalContractStatus.ACTIVE },
      },
      select: { contractId: true },
      orderBy: { contractId: 'asc' },
    });
  }

  async persist(input: {
    tenantId: string;
    providerMessageId: string;
    senderAddress: string;
    messageType: string;
    body: string | null;
    metadata?: Prisma.InputJsonValue;
    receivedAt: Date;
    contactPointId: string | null;
    contactId: string | null;
    contractId: string | null;
    deliveryId: string | null;
  }) {
    const created = await this.prisma.communicationInboundMessage.createMany({
      data: [
        {
          tenantId: input.tenantId,
          providerKey: META_WHATSAPP_PROVIDER_KEY,
          providerAccountKey: META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
          channel: NotificationChannel.WHATSAPP,
          providerMessageId: input.providerMessageId,
          senderAddress: input.senderAddress,
          messageType: input.messageType,
          body: input.body,
          metadata: input.metadata,
          receivedAt: input.receivedAt,
          contactPointId: input.contactPointId,
          contactId: input.contactId,
          contractId: input.contractId,
          deliveryId: input.deliveryId,
        },
      ],
      skipDuplicates: true,
    });
    const message = await this.prisma.communicationInboundMessage.findFirst({
      where: {
        providerKey: META_WHATSAPP_PROVIDER_KEY,
        providerAccountKey: META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
        providerMessageId: input.providerMessageId,
      },
      select: {
        id: true,
        tenantId: true,
        contactPointId: true,
        contactId: true,
        contractId: true,
        deliveryId: true,
        messageType: true,
        receivedAt: true,
      },
    });
    return { created: created.count === 1, message };
  }

  async listReadModel(tenantId: string, query: RentalReminderInboundQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const receivedFrom = query.receivedFrom
      ? new Date(query.receivedFrom)
      : undefined;
    const receivedTo = query.receivedTo
      ? new Date(query.receivedTo)
      : undefined;
    const where: Prisma.CommunicationInboundMessageWhereInput = {
      tenantId,
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.unread ? { readAt: null } : {}),
      ...(query.unacknowledged ? { acknowledgedAt: null } : {}),
      ...(receivedFrom || receivedTo
        ? {
            receivedAt: {
              ...(receivedFrom ? { gte: receivedFrom } : {}),
              ...(receivedTo ? { lt: receivedTo } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.communicationInboundMessage.findMany({
        where,
        select: {
          id: true,
          messageType: true,
          body: true,
          receivedAt: true,
          senderAddress: true,
          readAt: true,
          acknowledgedAt: true,
          acknowledgedBy: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          contract: { select: { id: true, internalNumber: true } },
          deliveryId: true,
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.communicationInboundMessage.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Marks an inbound message as read in Admin. Idempotent: only the first
   * explicit read is recorded (readAt IS NULL compare-and-set), acknowledgedAt
   * and the acknowledgedBy actor are never touched.
   */
  async markInboundRead(input: {
    tenantId: string;
    messageId: string;
    now: Date;
  }): Promise<
    | { status: 'NOT_FOUND'; message: null }
    | { status: 'NOOP' | 'UPDATED'; message: InboundAttentionState }
  > {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communicationInboundMessage.findFirst({
        where: { id: input.messageId, tenantId: input.tenantId },
        select: { readAt: true },
      });
      if (!existing) {
        return { status: 'NOT_FOUND', message: null };
      }
      const { count } = await tx.communicationInboundMessage.updateMany({
        where: {
          id: input.messageId,
          tenantId: input.tenantId,
          readAt: null,
        },
        data: { readAt: input.now },
      });
      const message = await this.readAttentionState(
        tx,
        input.tenantId,
        input.messageId,
      );
      if (!message) {
        return { status: 'NOT_FOUND', message: null };
      }
      return { status: count === 1 ? 'UPDATED' : 'NOOP', message };
    });
  }

  /**
   * Acknowledges an inbound message as resolved by the current operator.
   * First-wins on actor/timestamp: a concurrent acknowledge cannot silently
   * replace whom acknowledged originally, and retries return the existing
   * state untouched. Acknowledging always implies read (readAt is set when
   * it is still null) so the invariant acknowledgedAt != null -> readAt != null
   * holds. No other entity is modified.
   */
  async acknowledgeInbound(input: {
    tenantId: string;
    messageId: string;
    now: Date;
    acknowledgedById: string | null;
  }): Promise<
    | { status: 'NOT_FOUND'; message: null }
    | { status: 'ALREADY_ACKNOWLEDGED'; message: InboundAttentionState }
    | { status: 'NOOP' | 'UPDATED'; message: InboundAttentionState }
  > {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communicationInboundMessage.findFirst({
        where: { id: input.messageId, tenantId: input.tenantId },
        select: { acknowledgedAt: true },
      });
      if (!existing) {
        return { status: 'NOT_FOUND', message: null };
      }
      if (existing.acknowledgedAt) {
        const message = await this.readAttentionState(
          tx,
          input.tenantId,
          input.messageId,
        );
        if (!message) {
          return { status: 'NOT_FOUND', message: null };
        }
        return { status: 'ALREADY_ACKNOWLEDGED', message };
      }
      const { count } = await tx.communicationInboundMessage.updateMany({
        where: {
          id: input.messageId,
          tenantId: input.tenantId,
          acknowledgedAt: null,
        },
        data: {
          acknowledgedAt: input.now,
          acknowledgedById: input.acknowledgedById,
        },
      });
      await tx.communicationInboundMessage.updateMany({
        where: { id: input.messageId, tenantId: input.tenantId, readAt: null },
        data: { readAt: input.now },
      });
      const message = await this.readAttentionState(
        tx,
        input.tenantId,
        input.messageId,
      );
      if (!message) {
        return { status: 'NOT_FOUND', message: null };
      }
      return { status: count === 1 ? 'UPDATED' : 'NOOP', message };
    });
  }

  private readAttentionState(
    tx: Prisma.TransactionClient,
    tenantId: string,
    messageId: string,
  ) {
    return tx.communicationInboundMessage.findFirst({
      where: { id: messageId, tenantId },
      select: {
        id: true,
        readAt: true,
        acknowledgedAt: true,
        acknowledgedById: true,
        acknowledgedBy: { select: { id: true, name: true } },
      },
    });
  }
}

export type InboundAttentionState = {
  id: string;
  readAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedById: string | null;
  acknowledgedBy: { id: string; name: string } | null;
};
