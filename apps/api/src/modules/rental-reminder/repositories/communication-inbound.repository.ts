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
}
