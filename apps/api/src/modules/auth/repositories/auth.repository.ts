import { Injectable } from '@nestjs/common';
import { TenantStatus } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  tenantExists(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
  }

  findTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true },
    });
  }

  isTenantActive(tenantId: string) {
    return this.prisma.tenant
      .findFirst({
        where: { id: tenantId, status: TenantStatus.ACTIVE },
        select: { id: true },
      })
      .then((row) => Boolean(row));
  }

  updateLastLoginAt(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
