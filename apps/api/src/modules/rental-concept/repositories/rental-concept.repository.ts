import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RentalConceptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, includeInactive: boolean) {
    return this.prisma.rentalConcept.findMany({
      where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.rentalConcept.findFirst({ where: { id, tenantId } });
  }

  findBySlug(slug: string, tenantId: string) {
    return this.prisma.rentalConcept.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  create(data: Prisma.RentalConceptUncheckedCreateInput) {
    return this.prisma.rentalConcept.create({ data });
  }

  async updateActive(id: string, tenantId: string, isActive: boolean) {
    const result = await this.prisma.rentalConcept.updateMany({
      where: { id, tenantId },
      data: { isActive },
    });

    return result.count === 0 ? null : this.findById(id, tenantId);
  }
}
