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
}
