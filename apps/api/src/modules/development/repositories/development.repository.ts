import { Injectable } from '@nestjs/common';
import { Development, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEVELOPMENT_LIST_ORDER_BY } from '../constants/list-order';
import { developmentGeoInclude } from '../utils/development-location';

export type CreateDevelopmentData = Prisma.DevelopmentUncheckedCreateInput;

export type UpdateDevelopmentData = Prisma.DevelopmentUncheckedUpdateInput;

export type DevelopmentRecord = Prisma.DevelopmentGetPayload<{
  include: typeof developmentGeoInclude;
}>;

export interface FindManyDevelopmentsOptions {
  isActive?: boolean;
}

@Injectable()
export class DevelopmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDevelopmentData): Promise<DevelopmentRecord> {
    return this.prisma.development.create({
      data,
      include: developmentGeoInclude,
    });
  }

  findById(id: string, tenantId: string): Promise<DevelopmentRecord | null> {
    return this.prisma.development.findFirst({
      where: { id, tenantId },
      include: developmentGeoInclude,
    });
  }

  findBySlug(slug: string, tenantId: string): Promise<Development | null> {
    return this.prisma.development.findUnique({
      where: {
        tenantId_slug: { tenantId, slug },
      },
    });
  }

  findByInternalCode(
    internalCode: string,
    tenantId: string,
  ): Promise<Development | null> {
    return this.prisma.development.findUnique({
      where: {
        tenantId_internalCode: { tenantId, internalCode },
      },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyDevelopmentsOptions = {},
  ): Promise<DevelopmentRecord[]> {
    const { isActive } = options;

    return this.prisma.development.findMany({
      where: {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: developmentGeoInclude,
      orderBy: DEVELOPMENT_LIST_ORDER_BY,
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateDevelopmentData,
  ): Promise<DevelopmentRecord | null> {
    const result = await this.prisma.development.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  async softArchive(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentRecord | null> {
    return this.update(id, tenantId, { isActive: false });
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }

  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return this.prisma.user
      .count({ where: { id: userId, tenantId, isActive: true } })
      .then((count) => count > 0);
  }
}
