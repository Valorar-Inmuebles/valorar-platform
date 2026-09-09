import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const rentalContractInclude = {
  property: { select: { id: true, title: true } },
  renterContact: { select: { id: true, name: true, isActive: true } },
  landlordContact: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.RentalContractInclude;

export type RentalContractRecord = Prisma.RentalContractGetPayload<{
  include: typeof rentalContractInclude;
}>;

@Injectable()
export class RentalContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RentalContractUncheckedCreateInput) {
    return this.prisma.rentalContract.create({
      data,
      include: rentalContractInclude,
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
  ) {
    const result = await this.prisma.rentalContract.updateMany({
      where: { id, tenantId },
      data,
    });

    return result.count === 0 ? null : this.findById(id, tenantId);
  }

  propertyBelongsToTenant(propertyId: string, tenantId: string) {
    return this.prisma.property
      .count({ where: { id: propertyId, tenantId, isActive: true } })
      .then((count) => count > 0);
  }

  contactBelongsToTenant(contactId: string, tenantId: string) {
    return this.prisma.contact
      .count({ where: { id: contactId, tenantId, isActive: true } })
      .then((count) => count > 0);
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
        obligations: {
          some: {
            isActive: true,
            concept: { systemCode: 'RENT' },
          },
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
}
