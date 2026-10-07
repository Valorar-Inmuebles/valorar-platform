import { Injectable } from '@nestjs/common';
import type { PropertyListResponse } from '@repo/shared-types';
import { Prisma } from '../../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../prisma/prisma.service';
import { PropertyListQueryDto } from '../dto/property-list-query.dto';
import { PropertyListRepository } from '../repositories/property-list.repository';
import {
  buildPublicPropertyUrl,
  getPublicWebBaseUrl,
} from '../utils/public-property-url';
import { PropertyAccessService } from './property-access.service';

@Injectable()
export class PropertyListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PropertyAccessService,
    private readonly repository: PropertyListRepository,
  ) {}

  list(
    tenantId: string,
    user: AuthenticatedUser,
    query: PropertyListQueryDto,
    now = new Date(),
  ): Promise<PropertyListResponse> {
    const base = getPublicWebBaseUrl();
    let hasPublicBase = false;
    try {
      hasPublicBase =
        base !== null && ['http:', 'https:'].includes(new URL(base).protocol);
    } catch {
      /* Invalid optional base means no public link. */
    }
    return this.prisma.$transaction(
      async (tx) => {
        const context = await this.access.listReadContext(tenantId, user, tx);
        const result = await this.repository.read(
          tx,
          tenantId,
          user.id,
          context.where,
          query,
          now,
        );
        return {
          ...result,
          items: result.items.map(
            ({
              createdById,
              assignedToId,
              shared,
              publicListingType,
              ...item
            }) => ({
              ...item,
              publicUrl:
                hasPublicBase && item.isAnyPublishable && publicListingType
                  ? buildPublicPropertyUrl(item.slug, publicListingType)
                  : null,
              capabilities: this.access.listCapabilities(
                {
                  id: item.id,
                  tenantId,
                  createdById,
                  assignedToId,
                  isActive: item.isActive,
                },
                user,
                context.policies,
                shared,
              ),
            }),
          ),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
