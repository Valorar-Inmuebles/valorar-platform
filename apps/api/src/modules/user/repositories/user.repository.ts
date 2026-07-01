import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreateUserData = {
  tenantId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  passwordHash: string;
  role: UserRole;
  isActive?: boolean;
};

export type UpdateUserData = Prisma.UserUncheckedUpdateInput;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByTenant(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string, tenantId?: string | null): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, tenantId: string, data: UpdateUserData): Promise<User | null> {
    const result = await this.prisma.user.updateMany({
      where: { id, tenantId },
      data,
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
}
