import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type DevelopmentTypologyFeatureAssignmentWithFeature =
  Prisma.DevelopmentTypologyFeatureAssignmentGetPayload<{
    include: { feature: true };
  }>;

export type ReplaceDevelopmentTypologyFeatureAssignmentItem = {
  featureId: string;
  value?: string | null;
};

@Injectable()
export class DevelopmentTypologyFeatureAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByTypology(
    typologyId: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyFeatureAssignmentWithFeature[]> {
    return this.prisma.developmentTypologyFeatureAssignment.findMany({
      where: { typologyId, tenantId },
      include: { feature: true },
      orderBy: [
        { feature: { category: 'asc' } },
        { feature: { sortOrder: 'asc' } },
        { feature: { name: 'asc' } },
      ],
    });
  }

  findByTypologyAndFeature(
    typologyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyFeatureAssignmentWithFeature | null> {
    return this.prisma.developmentTypologyFeatureAssignment.findFirst({
      where: { typologyId, featureId, tenantId },
      include: { feature: true },
    });
  }

  create(
    typologyId: string,
    tenantId: string,
    featureId: string,
    value?: string | null,
  ): Promise<DevelopmentTypologyFeatureAssignmentWithFeature> {
    return this.prisma.developmentTypologyFeatureAssignment.create({
      data: {
        tenantId,
        typologyId,
        featureId,
        value: value ?? null,
      },
      include: { feature: true },
    });
  }

  async deleteByTypologyAndFeature(
    typologyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyFeatureAssignmentWithFeature | null> {
    const existing = await this.findByTypologyAndFeature(
      typologyId,
      featureId,
      tenantId,
    );

    if (!existing) {
      return null;
    }

    await this.prisma.developmentTypologyFeatureAssignment.deleteMany({
      where: { typologyId, featureId, tenantId },
    });

    return existing;
  }

  replaceAll(
    typologyId: string,
    tenantId: string,
    items: ReplaceDevelopmentTypologyFeatureAssignmentItem[],
  ): Promise<DevelopmentTypologyFeatureAssignmentWithFeature[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.developmentTypologyFeatureAssignment.deleteMany({
        where: { typologyId, tenantId },
      });

      if (items.length === 0) {
        return [];
      }

      await tx.developmentTypologyFeatureAssignment.createMany({
        data: items.map((item) => ({
          tenantId,
          typologyId,
          featureId: item.featureId,
          value: item.value ?? null,
        })),
      });

      return tx.developmentTypologyFeatureAssignment.findMany({
        where: { typologyId, tenantId },
        include: { feature: true },
        orderBy: [
          { feature: { category: 'asc' } },
          { feature: { sortOrder: 'asc' } },
          { feature: { name: 'asc' } },
        ],
      });
    });
  }
}
