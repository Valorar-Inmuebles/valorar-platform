import { Injectable } from '@nestjs/common';
import {
  DevelopmentTypology,
  Prisma,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreateDevelopmentTypologyData =
  Prisma.DevelopmentTypologyUncheckedCreateInput;

export type UpdateDevelopmentTypologyData =
  Prisma.DevelopmentTypologyUncheckedUpdateInput;

export interface FindManyDevelopmentTypologiesOptions {
  developmentId?: string;
}

@Injectable()
export class DevelopmentTypologyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDevelopmentTypologyData): Promise<DevelopmentTypology> {
    return this.prisma.developmentTypology.create({ data });
  }

  findById(id: string, tenantId: string): Promise<DevelopmentTypology | null> {
    return this.prisma.developmentTypology.findFirst({
      where: { id, tenantId },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyDevelopmentTypologiesOptions = {},
  ): Promise<DevelopmentTypology[]> {
    const { developmentId } = options;

    return this.prisma.developmentTypology.findMany({
      where: {
        tenantId,
        ...(developmentId !== undefined ? { developmentId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateDevelopmentTypologyData,
  ): Promise<DevelopmentTypology | null> {
    const result = await this.prisma.developmentTypology.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.prisma.developmentTypology.deleteMany({
      where: { id, tenantId },
    });

    return result.count > 0;
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
