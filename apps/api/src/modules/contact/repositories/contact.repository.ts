import { Injectable } from '@nestjs/common';
import { ContactPointType, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const contactInclude = {
  contactPoints: {
    orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ContactInclude;

export type ContactRecord = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;

export type ContactPointRecord = Prisma.ContactPointGetPayload<object>;

export type CreateContactData = Omit<
  Prisma.ContactUncheckedCreateInput,
  'contactPoints'
> & {
  contactPoints?: {
    create: Array<Omit<Prisma.ContactPointUncheckedCreateInput, 'contactId'>>;
  };
};
export type UpdateContactData = Prisma.ContactUncheckedUpdateInput;
export type CreateContactPointData = Prisma.ContactPointUncheckedCreateInput;
export type UpdateContactPointData = Prisma.ContactPointUncheckedUpdateInput;

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateContactData): Promise<ContactRecord> {
    const { contactPoints, ...contactData } = data;

    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({ data: contactData });

      if (contactPoints?.create.length) {
        await tx.contactPoint.createMany({
          data: contactPoints.create.map((point) => ({
            ...point,
            contactId: contact.id,
          })),
        });
      }

      return tx.contact.findUniqueOrThrow({
        where: { id: contact.id },
        include: contactInclude,
      });
    });
  }

  findMany(
    tenantId: string,
    options: { search?: string; isActive?: boolean },
  ): Promise<ContactRecord[]> {
    return this.prisma.contact.findMany({
      where: {
        tenantId,
        ...(options.isActive !== undefined
          ? { isActive: options.isActive }
          : {}),
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                {
                  contactPoints: {
                    some: {
                      OR: [
                        {
                          value: {
                            contains: options.search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          normalizedValue: {
                            contains: options.search,
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: contactInclude,
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string, tenantId: string): Promise<ContactRecord | null> {
    return this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: contactInclude,
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateContactData,
  ): Promise<ContactRecord | null> {
    const result = await this.prisma.contact.updateMany({
      where: { id, tenantId },
      data,
    });

    return result.count === 0 ? null : this.findById(id, tenantId);
  }

  findPointById(
    id: string,
    contactId: string,
    tenantId: string,
  ): Promise<ContactPointRecord | null> {
    return this.prisma.contactPoint.findFirst({
      where: { id, contactId, tenantId },
    });
  }

  async createPoint(
    data: CreateContactPointData,
    makeDefault: boolean,
  ): Promise<ContactPointRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.contactPoint.updateMany({
          where: {
            tenantId: data.tenantId,
            contactId: data.contactId,
            type: data.type,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      return tx.contactPoint.create({ data });
    });
  }

  async updatePoint(
    id: string,
    contactId: string,
    tenantId: string,
    type: ContactPointType,
    data: UpdateContactPointData,
    makeDefault: boolean,
  ): Promise<ContactPointRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.contactPoint.updateMany({
          where: { tenantId, contactId, type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const result = await tx.contactPoint.updateMany({
        where: { id, contactId, tenantId },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.contactPoint.findFirst({ where: { id, contactId, tenantId } });
    });
  }
}
