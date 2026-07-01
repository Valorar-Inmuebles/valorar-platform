import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type PropertyFeatureAssignmentWithFeature =
  Prisma.PropertyFeatureAssignmentGetPayload<{
    include: { feature: true };
  }>;

export type ReplacePropertyFeatureAssignmentItem = {
  featureId: string;
  value?: string | null;
};

@Injectable()
export class PropertyFeatureAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProperty(
    propertyId: string,
    tenantId: string,
  ): Promise<PropertyFeatureAssignmentWithFeature[]> {
    return this.prisma.propertyFeatureAssignment.findMany({
      where: { propertyId, tenantId },
      include: { feature: true },
      orderBy: [
        { feature: { category: 'asc' } },
        { feature: { sortOrder: 'asc' } },
        { feature: { name: 'asc' } },
      ],
    });
  }

  findByPropertyAndFeature(
    propertyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<PropertyFeatureAssignmentWithFeature | null> {
    return this.prisma.propertyFeatureAssignment.findFirst({
      where: { propertyId, featureId, tenantId },
      include: { feature: true },
    });
  }

  create(
    propertyId: string,
    tenantId: string,
    featureId: string,
    value?: string | null,
  ): Promise<PropertyFeatureAssignmentWithFeature> {
    return this.prisma.propertyFeatureAssignment.create({
      data: {
        tenantId,
        propertyId,
        featureId,
        value: value ?? null,
      },
      include: { feature: true },
    });
  }

  async deleteByPropertyAndFeature(
    propertyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<PropertyFeatureAssignmentWithFeature | null> {
    const existing = await this.findByPropertyAndFeature(
      propertyId,
      featureId,
      tenantId,
    );

    if (!existing) {
      return null;
    }

    await this.prisma.propertyFeatureAssignment.deleteMany({
      where: { propertyId, featureId, tenantId },
    });

    return existing;
  }

  replaceAll(
    propertyId: string,
    tenantId: string,
    items: ReplacePropertyFeatureAssignmentItem[],
  ): Promise<PropertyFeatureAssignmentWithFeature[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.propertyFeatureAssignment.deleteMany({
        where: { propertyId, tenantId },
      });

      if (items.length === 0) {
        return [];
      }

      await tx.propertyFeatureAssignment.createMany({
        data: items.map((item) => ({
          tenantId,
          propertyId,
          featureId: item.featureId,
          value: item.value ?? null,
        })),
      });

      return tx.propertyFeatureAssignment.findMany({
        where: { propertyId, tenantId },
        include: { feature: true },
        orderBy: [
          { feature: { category: 'asc' } },
          { feature: { sortOrder: 'asc' } },
          { feature: { name: 'asc' } },
        ],
      });
    });
  }

  async countByPropertyIds(
    tenantId: string,
    propertyIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    for (const propertyId of propertyIds) {
      counts.set(propertyId, 0);
    }

    if (propertyIds.length === 0) {
      return counts;
    }

    const rows = await this.prisma.propertyFeatureAssignment.groupBy({
      by: ['propertyId'],
      where: {
        tenantId,
        propertyId: { in: propertyIds },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      counts.set(row.propertyId, row._count._all);
    }

    return counts;
  }
}
