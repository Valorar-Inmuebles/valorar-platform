import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client';
import { getPermissionsForRole, type Permission, type PlatformRole } from '@repo/rbac';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

export class AuthUserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({ type: String })
  firstName?: string;

  @ApiPropertyOptional({ type: String })
  lastName?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiPropertyOptional({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLoginAt?: Date | null;

  @ApiProperty({ type: [String], description: 'Effective permissions for current role' })
  permissions!: Permission[];
}

export function toAuthUserResponseDto(
  user: AuthenticatedUser,
): AuthUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    tenantId: user.tenantId,
    lastLoginAt: user.lastLoginAt,
    permissions: [...getPermissionsForRole(user.role as PlatformRole)],
  };
}
