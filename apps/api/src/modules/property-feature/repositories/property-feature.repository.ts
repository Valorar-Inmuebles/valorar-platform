import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyFeature,
  PropertyFeatureCategory,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreatePropertyFeatureData = Prisma.PropertyFeatureUncheckedCreateInput;

export type UpdatePropertyFeatureData = Prisma.PropertyFeatureUncheckedUpdateInput;

export interface FindManyPropertyFeaturesOptions {
  category?: PropertyFeatureCategory;
  isActive?: boolean;
}

@Injectable()
export class PropertyFeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePropertyFeatureData): Promise<PropertyFeature> {
    return this.prisma.propertyFeature.create({ data });
  }

  findById(id: string): Promise<PropertyFeature | null> {
    return this.prisma.propertyFeature.findUnique({
      where: { id },
    });
  }

  findBySlug(slug: string): Promise<PropertyFeature | null> {
    return this.prisma.propertyFeature.findUnique({
      where: { slug },
    });
  }

  findMany(
    options: FindManyPropertyFeaturesOptions = {},
  ): Promise<PropertyFeature[]> {
    const { category, isActive } = options;

    return this.prisma.propertyFeature.findMany({
      where: {
        ...(category !== undefined ? { category } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async update(
    id: string,
    data: UpdatePropertyFeatureData,
  ): Promise<PropertyFeature | null> {
    try {
      return await this.prisma.propertyFeature.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }

  async deactivate(id: string): Promise<PropertyFeature | null> {
    return this.update(id, { isActive: false });
  }
}
