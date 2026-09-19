import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RentalContractPartyInputDto } from '../dto/create-rental-contract.dto';

const rentalContractInclude = {
  property: {
    select: { id: true, title: true, propertyType: true, isActive: true },
  },
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

export type RentalContractRecord = Prisma.RentalContractGetPayload<{
  include: typeof rentalContractInclude;
}>;

@Injectable()
export class RentalContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.RentalContractUncheckedCreateInput,
    parties: RentalContractPartyInputDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.rentalContract.create({ data });
      await this.replaceParties(tx, contract.id, contract.tenantId, parties);
      return tx.rentalContract.findUniqueOrThrow({
        where: { id: contract.id },
        include: rentalContractInclude,
      });
    });
  }

  findMany(tenantId: string, status?: RentalContractStatus) {
    return this.prisma.rentalContract.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: rentalContractInclude,
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.rentalContract.findFirst({
      where: { id, tenantId },
      include: rentalContractInclude,
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.RentalContractUncheckedUpdateInput,
    parties?: RentalContractPartyInputDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rentalContract.updateMany({
        where: { id, tenantId },
        data,
      });
      if (changed.count === 0) return null;
      if (parties) await this.replaceParties(tx, id, tenantId, parties);
      return tx.rentalContract.findFirst({
        where: { id, tenantId },
        include: rentalContractInclude,
      });
    });
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
      .count({
        where: {
          contractId,
          tenantId,
          isActive: true,
          concept: { systemCode: 'RENT' },
        },
      })
      .then((count) => count > 0);
  }

  async activateWithRentRequirement(id: string, tenantId: string) {
    const changed = await this.prisma.rentalContract.updateMany({
      where: {
        id,
        tenantId,
        status: RentalContractStatus.DRAFT,
        parties: { some: { role: 'RENTER', contact: { isActive: true } } },
        obligations: {
          some: { isActive: true, concept: { systemCode: 'RENT' } },
        },
      },
      data: { status: RentalContractStatus.ACTIVE },
    });
    return changed.count === 1 ? this.findById(id, tenantId) : null;
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

  private async replaceParties(
    tx: Prisma.TransactionClient,
    contractId: string,
    tenantId: string,
    parties: RentalContractPartyInputDto[],
  ) {
    await tx.rentalContractParty.deleteMany({
      where: { contractId, tenantId },
    });
    for (const input of parties) {
      const party = await tx.rentalContractParty.create({
        data: {
          tenantId,
          contractId,
          contactId: input.contactId,
          role: input.role,
        },
      });
      if (input.notificationRoutes?.length) {
        await tx.rentalContractNotificationRoute.createMany({
          data: input.notificationRoutes.map((route) => ({
            tenantId,
            contractPartyId: party.id,
            channel: route.channel,
            contactPointId: route.contactPointId,
            isEnabled: route.isEnabled ?? true,
          })),
        });
      }
    }
  }
}
