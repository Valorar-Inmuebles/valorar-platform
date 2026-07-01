import { Injectable } from '@nestjs/common';
import { TenantStatus } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { UpdatePlatformTenantDto } from '../dto/update-platform-tenant.dto';

type TenantSettingsInput = {
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  domain?: string | null;
};

@Injectable()
export class PlatformTenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.tenant.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            properties: true,
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            properties: true,
          },
        },
      },
    });
  }

  slugExists(slug: string, excludeId?: string) {
    return this.prisma.tenant
      .findFirst({
        where: {
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      })
      .then((row) => Boolean(row));
  }

  createTenant(
    data: { name: string; slug: string },
    settings: TenantSettingsInput,
  ) {
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        settings: {
          create: {
            companyName: data.name,
            ...settings,
          },
        },
      },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            properties: true,
          },
        },
      },
    });
  }

  updateTenant(
    id: string,
    tenantData: { name?: string; slug?: string },
    settings: TenantSettingsInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id },
        data: tenantData,
      });

      const hasSettings = Object.keys(settings).length > 0;

      if (hasSettings) {
        await tx.tenantSetting.upsert({
          where: { tenantId: id },
          create: {
            tenantId: id,
            ...settings,
          },
          update: settings,
        });
      }

      return tx.tenant.findUniqueOrThrow({
        where: { id },
        include: {
          settings: true,
          _count: {
            select: {
              users: true,
              properties: true,
            },
          },
        },
      });
    });
  }

  updateStatus(id: string, status: TenantStatus) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            properties: true,
          },
        },
      },
    });
  }

  getPlatformStats() {
    return Promise.all([
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { tenantId: { not: null } } }),
      this.prisma.property.count(),
    ]).then(([activeTenants, suspendedTenants, totalUsers, totalProperties]) => ({
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalProperties,
    }));
  }

  findActiveOptions() {
    return this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: {
          select: {
            logoUrl: true,
          },
        },
      },
    });
  }

  findByIdWithStatus(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }
}
