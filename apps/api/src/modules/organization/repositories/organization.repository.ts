import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenantId(tenantId: string) {
    return this.prisma.tenantSetting.findUnique({
      where: { tenantId },
    });
  }

  async upsert(tenantId: string, data: UpdateOrganizationDto) {
    return this.prisma.tenantSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  findTenantSummary(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
