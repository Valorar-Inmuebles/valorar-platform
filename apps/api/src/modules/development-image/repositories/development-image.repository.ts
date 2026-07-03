import { Injectable } from '@nestjs/common';
import { DevelopmentImage, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreateDevelopmentImageData =
  Prisma.DevelopmentImageUncheckedCreateInput;

export type UpdateDevelopmentImageData =
  Prisma.DevelopmentImageUncheckedUpdateInput;

export interface FindManyDevelopmentImagesOptions {
  developmentId?: string;
}

@Injectable()
export class DevelopmentImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithCoverHandling(
    data: CreateDevelopmentImageData,
    demoteOthers: boolean,
  ): Promise<DevelopmentImage> {
    if (!demoteOthers) {
      return this.prisma.developmentImage.create({ data });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.developmentImage.updateMany({
        where: {
          developmentId: data.developmentId,
          tenantId: data.tenantId,
        },
        data: { isCover: false },
      });

      return tx.developmentImage.create({ data });
    });
  }

  findById(id: string, tenantId: string): Promise<DevelopmentImage | null> {
    return this.prisma.developmentImage.findFirst({
      where: { id, tenantId },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyDevelopmentImagesOptions = {},
  ): Promise<DevelopmentImage[]> {
    const { developmentId } = options;

    return this.prisma.developmentImage.findMany({
      where: {
        tenantId,
        ...(developmentId !== undefined ? { developmentId } : {}),
      },
      orderBy: [
        { isCover: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  countByDevelopment(
    developmentId: string,
    tenantId: string,
  ): Promise<number> {
    return this.prisma.developmentImage.count({
      where: { developmentId, tenantId },
    });
  }

  hasCoverImage(developmentId: string, tenantId: string): Promise<boolean> {
    return this.prisma.developmentImage
      .count({
        where: { developmentId, tenantId, isCover: true },
      })
      .then((count) => count > 0);
  }

  async getStatsByDevelopmentIds(
    tenantId: string,
    developmentIds: string[],
  ): Promise<Map<string, { imageCount: number; hasCoverImage: boolean }>> {
    const stats = new Map<
      string,
      { imageCount: number; hasCoverImage: boolean }
    >();

    for (const developmentId of developmentIds) {
      stats.set(developmentId, { imageCount: 0, hasCoverImage: false });
    }

    if (developmentIds.length === 0) {
      return stats;
    }

    const images = await this.prisma.developmentImage.findMany({
      where: { tenantId, developmentId: { in: developmentIds } },
      select: { developmentId: true, isCover: true },
    });

    for (const image of images) {
      const entry = stats.get(image.developmentId);

      if (!entry) {
        continue;
      }

      entry.imageCount += 1;

      if (image.isCover) {
        entry.hasCoverImage = true;
      }
    }

    return stats;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateDevelopmentImageData,
  ): Promise<DevelopmentImage | null> {
    const result = await this.prisma.developmentImage.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  updateWithCoverHandling(
    id: string,
    tenantId: string,
    developmentId: string,
    data: UpdateDevelopmentImageData,
    demoteOthers: boolean,
  ): Promise<DevelopmentImage | null> {
    if (!demoteOthers) {
      return this.update(id, tenantId, data);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.developmentImage.updateMany({
        where: {
          developmentId,
          tenantId,
          NOT: { id },
        },
        data: { isCover: false },
      });

      const result = await tx.developmentImage.updateMany({
        where: { id, tenantId },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.developmentImage.findFirst({
        where: { id, tenantId },
      });
    });
  }

  async deleteWithPromotion(
    id: string,
    tenantId: string,
    developmentId: string,
    wasCover: boolean,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (wasCover) {
        const nextCover = await tx.developmentImage.findFirst({
          where: {
            developmentId,
            tenantId,
            NOT: { id },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextCover) {
          await tx.developmentImage.updateMany({
            where: { developmentId, tenantId },
            data: { isCover: false },
          });

          await tx.developmentImage.updateMany({
            where: { id: nextCover.id, tenantId },
            data: { isCover: true },
          });
        }
      }

      const result = await tx.developmentImage.deleteMany({
        where: { id, tenantId },
      });

      return result.count > 0;
    });
  }

  async reorderMany(
    tenantId: string,
    developmentId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<DevelopmentImage[]> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const result = await tx.developmentImage.updateMany({
          where: { id: item.id, tenantId, developmentId },
          data: { sortOrder: item.sortOrder },
        });

        if (result.count === 0) {
          return [];
        }
      }

      return tx.developmentImage.findMany({
        where: { tenantId, developmentId },
        orderBy: [
          { isCover: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    });
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
