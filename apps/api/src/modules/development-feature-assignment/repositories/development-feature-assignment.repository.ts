import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type DevelopmentFeatureAssignmentWithFeature =
  Prisma.DevelopmentFeatureAssignmentGetPayload<{
    include: { feature: true };
  }>;

export type ReplaceDevelopmentFeatureAssignmentItem = {
  featureId: string;
  value?: string | null;
};

@Injectable()
export class DevelopmentFeatureAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByDevelopment(
    developmentId: string,
    tenantId: string,
  ): Promise<DevelopmentFeatureAssignmentWithFeature[]> {
    return this.prisma.developmentFeatureAssignment.findMany({
      where: { developmentId, tenantId },
      include: { feature: true },
      orderBy: [
        { feature: { category: 'asc' } },
        { feature: { sortOrder: 'asc' } },
        { feature: { name: 'asc' } },
      ],
    });
  }

  findByDevelopmentAndFeature(
    developmentId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentFeatureAssignmentWithFeature | null> {
    return this.prisma.developmentFeatureAssignment.findFirst({
      where: { developmentId, featureId, tenantId },
      include: { feature: true },
    });
  }

  create(
    developmentId: string,
    tenantId: string,
    featureId: string,
    value?: string | null,
  ): Promise<DevelopmentFeatureAssignmentWithFeature> {
    return this.prisma.developmentFeatureAssignment.create({
      data: {
        tenantId,
        developmentId,
        featureId,
        value: value ?? null,
      },
      include: { feature: true },
    });
  }

  async deleteByDevelopmentAndFeature(
    developmentId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentFeatureAssignmentWithFeature | null> {
    const existing = await this.findByDevelopmentAndFeature(
      developmentId,
      featureId,
      tenantId,
    );

    if (!existing) {
      return null;
    }

    await this.prisma.developmentFeatureAssignment.deleteMany({
      where: { developmentId, featureId, tenantId },
    });

    return existing;
  }

  replaceAll(
    developmentId: string,
    tenantId: string,
    items: ReplaceDevelopmentFeatureAssignmentItem[],
  ): Promise<DevelopmentFeatureAssignmentWithFeature[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.developmentFeatureAssignment.deleteMany({
        where: { developmentId, tenantId },
      });

      if (items.length === 0) {
        return [];
      }

      await tx.developmentFeatureAssignment.createMany({
        data: items.map((item) => ({
          tenantId,
          developmentId,
          featureId: item.featureId,
          value: item.value ?? null,
        })),
      });

      return tx.developmentFeatureAssignment.findMany({
        where: { developmentId, tenantId },
        include: { feature: true },
        orderBy: [
          { feature: { category: 'asc' } },
          { feature: { sortOrder: 'asc' } },
          { feature: { name: 'asc' } },
        ],
      });
    });
  }

  async countByDevelopmentIds(
    tenantId: string,
    developmentIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    for (const developmentId of developmentIds) {
      counts.set(developmentId, 0);
    }

    if (developmentIds.length === 0) {
      return counts;
    }

    const rows = await this.prisma.developmentFeatureAssignment.groupBy({
      by: ['developmentId'],
      where: {
        tenantId,
        developmentId: { in: developmentIds },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      counts.set(row.developmentId, row._count._all);
    }

    return counts;
  }
}
