import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { propertyInclude } from '../utils/property-location';

@Injectable()
export class PropertyDetailContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVisible(
    id: string,
    tenantId: string,
    visibility: Prisma.PropertyWhereInput,
  ) {
    return this.prisma.property.findFirst({
      where: { AND: [{ id, tenantId }, visibility] },
      include: {
        ...propertyInclude,
        listings: {
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
          include: {
            prices: {
              where: { tenantId },
              orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
            },
          },
        },
        // Only existence of a cover: no gallery URLs/metadata in the header read.
        images: {
          where: { tenantId, isCover: true },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            images: { where: { tenantId } },
            featureAssignments: { where: { tenantId } },
          },
        },
      },
    });
  }
}
