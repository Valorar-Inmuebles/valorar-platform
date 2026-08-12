import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserRole } from '../../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { hashPassword } from '../../auth/utils/password.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import type { UserDeletionEligibilityDto } from '../dto/user-deletion-eligibility.dto';
import { UserRepository } from '../repositories/user.repository';
import { buildFullName, isAssignableRole } from '../utils/user-name.util';
import {
  evaluateUserDeletionEligibility,
  isForbiddenDeletionReason,
  type UserDeletionEligibility,
} from '../utils/user-deletion.eligibility';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listUsers(tenantId: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findManyByTenant(tenantId);
    const counts = await this.userRepository.getPropertyCountsByUserIds(
      tenantId,
      users.map((user) => user.id),
    );

    return users.map((user) =>
      UserResponseDto.fromEntity(user, {
        assignedPropertiesCount: counts.assigned.get(user.id) ?? 0,
        createdPropertiesCount: counts.created.get(user.id) ?? 0,
      }),
    );
  }

  async getUser(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id, tenantId);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return UserResponseDto.fromEntity(user);
  }

  /**
   * Informative precheck. Does not lock rows; DELETE revalidates under locks.
   *
   * Deletion is blocked by business authorship (created properties/developments)
   * and safety rules (self, last admin, SUPER_ADMIN). Login activity alone does
   * not block deletion. Extend when Lead, Invitation, Audit or other historical
   * authorship relations exist.
   */
  async getDeletionEligibility(
    id: string,
    tenantId: string,
    actor: AuthenticatedUser,
  ): Promise<UserDeletionEligibilityDto> {
    const user = await this.userRepository.findById(id, tenantId);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return this.buildEligibility(user, tenantId, actor);
  }

  async deleteUser(
    id: string,
    tenantId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    try {
      await this.userRepository.withTenantUserLocks(
        tenantId,
        id,
        async ({ tx, lockedUser }) => {
          if (!lockedUser || lockedUser.tenantId !== tenantId) {
            throw new NotFoundException(`User with id "${id}" not found`);
          }

          const eligibility = await this.buildEligibility(
            lockedUser,
            tenantId,
            actor,
            tx,
          );

          if (!eligibility.canDelete) {
            this.throwDeletionDenied(eligibility);
          }

          await this.userRepository.clearAssignedProperties(id, tenantId, tx);

          const deleted = await this.userRepository.deleteUser(id, tenantId, tx);
          if (deleted.count === 0) {
            throw new NotFoundException(`User with id "${id}" not found`);
          }
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException({
          message:
            'El usuario ya no puede eliminarse por restricciones de integridad.',
          userId: id,
          canDelete: false,
          reasons: [
            {
              code: 'HAS_CREATED_PROPERTIES',
              message:
                'El usuario tiene relaciones históricas y no puede eliminarse.',
            },
          ],
          sideEffectsIfDeleted: {
            assignedPropertiesToClear: 0,
            agentAccessRowsToDelete: 0,
            grantedByRowsToNull: 0,
          },
        });
      }

      throw error;
    }
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
    // Deactivation must serialize with DELETE via Tenant → User locks.
    // Reactivation and non-lifecycle updates keep the lighter path.
    if (dto.isActive === false) {
      return this.deactivateUserWithLocks(id, tenantId, dto, actor);
    }

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

    const updated = await this.userRepository.update(
      id,
      tenantId,
      await this.buildUpdateData(existing, dto),
    );

    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return UserResponseDto.fromEntity(updated);
  }

  /**
   * Serializes LAST_ACTIVE_TENANT_ADMIN with DELETE using the same lock order:
   * Tenant FOR UPDATE → User FOR UPDATE → recount → validate → update.
   */
  private async deactivateUserWithLocks(
    id: string,
    tenantId: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.userRepository.withTenantUserLocks(
      tenantId,
      id,
      async ({ tx, lockedUser }) => {
        if (!lockedUser || lockedUser.tenantId !== tenantId) {
          throw new NotFoundException(`User with id "${id}" not found`);
        }

        if (lockedUser.role === UserRole.SUPER_ADMIN) {
          throw new ForbiddenException('Cannot modify platform super admin');
        }

        if (lockedUser.isActive) {
          await this.assertCanDeactivate(lockedUser, actor, tenantId, tx);
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

        const updated = await this.userRepository.update(
          id,
          tenantId,
          await this.buildUpdateData(lockedUser, dto),
          tx,
        );

        if (!updated) {
          throw new NotFoundException(`User with id "${id}" not found`);
        }

        return UserResponseDto.fromEntity(updated);
      },
    );
  }

  private async buildUpdateData(
    existing: Pick<User, 'firstName' | 'lastName'>,
    dto: UpdateUserDto,
  ): Promise<Parameters<UserRepository['update']>[2]> {
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
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() }
        : {}),
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

    return data;
  }

  async updateProfile(
    userId: string,
    dto: Pick<
      UpdateUserDto,
      'firstName' | 'lastName' | 'phone' | 'avatarUrl' | 'password'
    >,
  ): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const tenantId = existing.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Platform users cannot update profile here');
    }

    return this.updateUser(userId, tenantId, dto, {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      role: existing.role,
      tenantId: existing.tenantId,
    });
  }

  private async buildEligibility(
    user: User,
    tenantId: string,
    actor: AuthenticatedUser,
    client?: Parameters<UserRepository['getDeletionRelationCounts']>[2],
  ): Promise<UserDeletionEligibility> {
    const counts = await this.userRepository.getDeletionRelationCounts(
      user.id,
      tenantId,
      client,
    );

    return evaluateUserDeletionEligibility({
      userId: user.id,
      role: user.role,
      isActive: user.isActive,
      actorId: actor.id,
      ...counts,
    });
  }

  private throwDeletionDenied(eligibility: UserDeletionEligibility): never {
    const hasForbidden = eligibility.reasons.some((reason) =>
      isForbiddenDeletionReason(reason.code),
    );

    const body = {
      message:
        eligibility.reasons[0]?.message ?? 'No se puede eliminar el usuario.',
      ...eligibility,
    };

    if (hasForbidden) {
      throw new HttpException(body, HttpStatus.FORBIDDEN);
    }

    throw new ConflictException(body);
  }

  private async assertCanDeactivate(
    existing: { id: string; role: UserRole; isActive: boolean },
    actor: AuthenticatedUser,
    tenantId: string,
    client?: Parameters<UserRepository['countActiveTenantAdmins']>[1],
  ): Promise<void> {
    if (actor.id === existing.id) {
      throw new ForbiddenException('No podés desactivar tu propia cuenta');
    }

    if (existing.role === UserRole.TENANT_ADMIN) {
      const activeAdmins = await this.userRepository.countActiveTenantAdmins(
        tenantId,
        client,
      );

      if (activeAdmins <= 1) {
        throw new ConflictException(
          'No podés desactivar al único administrador activo del tenant',
        );
      }
    }
  }

  private assertCanAssignRole(role: UserRole, actorRole: UserRole): void {
    if (!isAssignableRole(role, actorRole)) {
      throw new ForbiddenException(
        'Insufficient permissions to assign this role',
      );
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
