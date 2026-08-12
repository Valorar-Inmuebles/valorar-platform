import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, type User } from '../../../../generated/prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  lastLoginAt?: Date | null;

  @ApiPropertyOptional()
  tenantId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /** Cartera operativa: Property.assignedToId (valor principal en listado). */
  @ApiProperty({ default: 0 })
  assignedPropertiesCount!: number;

  /** Autoría histórica: Property.createdById (secundario / tooltip). */
  @ApiProperty({ default: 0 })
  createdPropertiesCount!: number;

  static fromEntity(
    user: User,
    counts?: {
      assignedPropertiesCount?: number;
      createdPropertiesCount?: number;
    },
  ): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      assignedPropertiesCount: counts?.assignedPropertiesCount ?? 0,
      createdPropertiesCount: counts?.createdPropertiesCount ?? 0,
    };
  }
}
