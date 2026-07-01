import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { hashPassword } from '../../auth/utils/password.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserRepository } from '../repositories/user.repository';
import { buildFullName, isAssignableRole } from '../utils/user-name.util';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listUsers(tenantId: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findManyByTenant(tenantId);
    return users.map(UserResponseDto.fromEntity);
  }

  async getUser(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return UserResponseDto.fromEntity(user);
  }

  async createUser(
    tenantId: string,
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    await this.assertTenantExists(tenantId);
    this.assertCanAssignRole(dto.role, actor.role);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot create SUPER_ADMIN via tenant API');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const passwordHash = await hashPassword(dto.password);

    const user = await this.userRepository.create({
      tenantId,
      firstName,
      lastName,
      name: buildFullName(firstName, lastName),
      email,
      phone: this.normalizeOptionalString(dto.phone),
      avatarUrl: this.normalizeOptionalString(dto.avatarUrl),
      passwordHash,
      role: dto.role,
      isActive: dto.isActive ?? true,
    });

    return UserResponseDto.fromEntity(user);
  }

  async updateUser(
    id: string,
    tenantId: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (existing.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify platform super admin');
    }

    if (dto.role !== undefined) {
      this.assertCanAssignRole(dto.role, actor.role);
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const emailOwner = await this.userRepository.findByEmail(email);
      if (emailOwner && emailOwner.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const firstName =
      dto.firstName !== undefined ? dto.firstName.trim() : existing.firstName;
    const lastName =
      dto.lastName !== undefined ? dto.lastName.trim() : existing.lastName;

    const data: Parameters<UserRepository['update']>[2] = {
      ...(dto.firstName !== undefined ? { firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName } : {}),
      ...(dto.firstName !== undefined || dto.lastName !== undefined
        ? { name: buildFullName(firstName, lastName) }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined
        ? { phone: this.normalizeOptionalString(dto.phone) }
        : {}),
      ...(dto.avatarUrl !== undefined
        ? { avatarUrl: this.normalizeOptionalString(dto.avatarUrl) }
        : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    if (dto.password) {
      data.passwordHash = await hashPassword(dto.password);
    }

    const updated = await this.userRepository.update(id, tenantId, data);

    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return UserResponseDto.fromEntity(updated);
  }

  async updateProfile(
    userId: string,
    dto: Pick<UpdateUserDto, 'firstName' | 'lastName' | 'phone' | 'avatarUrl' | 'password'>,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const tenantId = existing.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Platform users cannot update profile here');
    }

    return this.updateUser(
      userId,
      tenantId,
      dto,
      {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        tenantId: existing.tenantId,
      },
    );
  }

  private assertCanAssignRole(role: UserRole, actorRole: UserRole): void {
    if (!isAssignableRole(role, actorRole)) {
      throw new ForbiddenException('Insufficient permissions to assign this role');
    }
  }

  private normalizeOptionalString(value?: string): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.userRepository.tenantExists(tenantId);
    if (!exists) {
      throw new NotFoundException('Tenant not found');
    }
  }
}
