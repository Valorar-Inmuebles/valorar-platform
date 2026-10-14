import { ConflictException, Injectable } from '@nestjs/common';
import { propertySlugCandidate } from '@repo/property-rules';
import { Prisma, Property } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { propertyInclude } from '../utils/property-location';

export type CreatePropertyData = Prisma.PropertyUncheckedCreateInput;

export type UpdatePropertyData = Prisma.PropertyUncheckedUpdateInput;

export type PropertyRecord = Prisma.PropertyGetPayload<{
  include: typeof propertyInclude;
}>;

export type PropertyWithCreatorRecord = PropertyRecord;

export interface FindManyPropertiesOptions {
  isActive?: boolean;
  where?: Prisma.PropertyWhereInput;
}

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePropertyData): Promise<PropertyRecord> {
    return this.prisma.property.create({
      data,
      include: propertyInclude,
    });
  }

  async createWithGeneratedSlug(
    data: CreatePropertyData,
  ): Promise<PropertyRecord> {
    const base = data.slug;
    // Only compact slug strings, tenant-scoped. Reserve room for numeric suffixes
    // in the prefix search so a 120-character base still has collision coverage.
    const existing = await this.prisma.property.findMany({
      where: {
        tenantId: data.tenantId,
        slug: { startsWith: base.slice(0, 100) },
      },
      select: { slug: true },
    });
    const used = new Set(existing.map((property) => property.slug));
    let ordinal = 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      while (used.has(propertySlugCandidate(base, ordinal))) ordinal++;
      const slug = propertySlugCandidate(base, ordinal);
      try {
        return await this.create({ ...data, slug });
      } catch (error) {
        // Do not retry internalCode conflicts, foreign keys or uncertain writes.
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        )
          throw error;
        const target = error.meta?.target;
        const slugConflict = Array.isArray(target)
          ? target.length === 2 &&
            target.includes('tenantId') &&
            target.includes('slug')
          : target === 'Property_tenantId_slug_key';
        if (!slugConflict) throw error;
        used.add(slug);
      }
    }
    throw new ConflictException(
      'No se pudo reservar una URL única. Volvé a intentar.',
    );
  }

  findById(id: string, tenantId: string): Promise<PropertyRecord | null> {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
      include: propertyInclude,
    });
  }

  findBySlug(slug: string, tenantId: string): Promise<Property | null> {
    return this.prisma.property.findUnique({
      where: {
        tenantId_slug: { tenantId, slug },
      },
    });
  }

  findByInternalCode(
    internalCode: string,
    tenantId: string,
  ): Promise<Property | null> {
    return this.prisma.property.findUnique({
      where: {
        tenantId_internalCode: { tenantId, internalCode },
      },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyPropertiesOptions = {},
  ): Promise<PropertyRecord[]> {
    const { isActive, where: extraWhere } = options;

    return this.prisma.property.findMany({
      where: extraWhere ?? {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: propertyInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findManyWithCreator(tenantId: string): Promise<PropertyWithCreatorRecord[]> {
    return this.prisma.property.findMany({
      where: { tenantId },
      include: propertyInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  count(
    tenantId: string,
    options: FindManyPropertiesOptions = {},
  ): Promise<number> {
    const { isActive } = options;

    return this.prisma.property.count({
      where: {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  searchForRental(
    tenantId: string,
    options: { search?: string; page: number; pageSize: number },
  ) {
    const where: Prisma.PropertyWhereInput = {
      tenantId,
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' } },
              {
                internalCode: {
                  contains: options.search,
                  mode: 'insensitive',
                },
              },
              { street: { contains: options.search, mode: 'insensitive' } },
              {
                formattedAddress: {
                  contains: options.search,
                  mode: 'insensitive',
                },
              },
              { city: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        select: {
          id: true,
          title: true,
          internalCode: true,
          propertyType: true,
          isActive: true,
          street: true,
          streetNumber: true,
          floor: true,
          apartment: true,
          neighborhood: true,
          city: true,
          province: true,
          country: true,
          countryId: true,
          provinceId: true,
          localityId: true,
          neighborhoodId: true,
          postalCode: true,
          formattedAddress: true,
        },
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.property.count({ where }),
    ]);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyData,
  ): Promise<PropertyRecord | null> {
    try {
      return await this.prisma.property.update({
        where: { id, tenantId },
        // Attribute-only form saves still run this authorized PATCH first.
        // Preserve the save timestamp even when the scalar diff is empty.
        data: Object.keys(data).length === 0 ? { updatedAt: new Date() } : data,
        include: propertyInclude,
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

  async softArchive(
    id: string,
    tenantId: string,
  ): Promise<PropertyRecord | null> {
    const result = await this.prisma.property.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }

  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return this.prisma.user
      .count({
        where: { id: userId, tenantId },
      })
      .then((count) => count > 0);
  }

  findActiveTenantUser(userId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isActive: true,
      },
      select: { id: true },
    });
  }
}
