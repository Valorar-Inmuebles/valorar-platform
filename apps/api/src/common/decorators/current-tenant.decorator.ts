import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { TENANT_REQUIRED_MESSAGE } from '../../modules/auth/constants/auth.constants';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new BadRequestException(TENANT_REQUIRED_MESSAGE);
    }

    return tenantId;
  },
);
