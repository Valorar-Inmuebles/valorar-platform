jest.mock('../../../../generated/prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(
      message: string,
      options: { code: string; clientVersion: string },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = options.code;
    }
  }

  return {
    UserRole: {
      SUPER_ADMIN: 'SUPER_ADMIN',
      TENANT_ADMIN: 'TENANT_ADMIN',
      MANAGER: 'MANAGER',
      AGENT: 'AGENT',
      COLLABORATOR: 'COLLABORATOR',
    },
    Prisma: {
      PrismaClientKnownRequestError,
    },
  };
});

jest.mock('../repositories/user.repository', () => ({
  UserRepository: class UserRepository {},
}));

jest.mock('../../auth/utils/password.util', () => ({
  hashPassword: jest.fn(async (value: string) => `hashed:${value}`),
}));

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '../../../../generated/prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

describe('UserService deletion', () => {
  const actor = {
    id: 'actor-1',
    email: 'admin@demo.valorar.dev',
    name: 'Admin',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
  };

  const userRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findManyByTenant: jest.fn(),
    getPropertyCountsByUserIds: jest.fn(),
    getDeletionRelationCounts: jest.fn(),
    withTenantUserLocks: jest.fn(),
    clearAssignedProperties: jest.fn(),
    deleteUser: jest.fn(),
    countActiveTenantAdmins: jest.fn(),
    update: jest.fn(),
  };

  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(userRepository as unknown as UserRepository);
  });

  it('lists users with aggregated property counts (no N+1, no eligibility)', async () => {
    const now = new Date();
    userRepository.findManyByTenant.mockResolvedValue([
      {
        id: 'agent-1',
        firstName: 'Agente',
        lastName: 'Uno',
        name: 'Agente Uno',
        email: 'a1@demo.valorar.dev',
        phone: null,
        avatarUrl: null,
        role: UserRole.AGENT,
        isActive: true,
        lastLoginAt: null,
        tenantId: 'tenant-1',
        createdAt: now,
        updatedAt: now,
        passwordHash: 'x',
      },
      {
        id: 'agent-2',
        firstName: 'Agente',
        lastName: 'Dos',
        name: 'Agente Dos',
        email: 'a2@demo.valorar.dev',
        phone: null,
        avatarUrl: null,
        role: UserRole.AGENT,
        isActive: false,
        lastLoginAt: null,
        tenantId: 'tenant-1',
        createdAt: now,
        updatedAt: now,
        passwordHash: 'x',
      },
    ]);
    userRepository.getPropertyCountsByUserIds.mockResolvedValue({
      assigned: new Map([['agent-1', 3]]),
      created: new Map([
        ['agent-1', 5],
        ['agent-2', 2],
      ]),
    });

    const result = await service.listUsers('tenant-1');

    expect(userRepository.getPropertyCountsByUserIds).toHaveBeenCalledWith(
      'tenant-1',
      ['agent-1', 'agent-2'],
    );
    expect(userRepository.getDeletionRelationCounts).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({
      id: 'agent-1',
      assignedPropertiesCount: 3,
      createdPropertiesCount: 5,
    });
    expect(result[1]).toMatchObject({
      id: 'agent-2',
      isActive: false,
      assignedPropertiesCount: 0,
      createdPropertiesCount: 2,
    });
  });

  it('returns eligibility without locking', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-2',
      role: UserRole.AGENT,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
    });
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 0,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 2,
      assignedPropertiesCount: 1,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });

    const result = await service.getDeletionEligibility(
      'user-2',
      'tenant-1',
      actor,
    );

    expect(result.canDelete).toBe(true);
    expect(result.sideEffectsIfDeleted.assignedPropertiesToClear).toBe(1);
    expect(userRepository.withTenantUserLocks).not.toHaveBeenCalled();
  });

  it('deletes inside tenant→user locks and clears assignments', async () => {
    const lockedUser = {
      id: 'user-2',
      role: UserRole.AGENT,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 0,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 2,
      assignedPropertiesCount: 2,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });
    userRepository.clearAssignedProperties.mockResolvedValue({ count: 2 });
    userRepository.deleteUser.mockResolvedValue({ count: 1 });

    await service.deleteUser('user-2', 'tenant-1', actor);

    expect(userRepository.withTenantUserLocks).toHaveBeenCalledWith(
      'tenant-1',
      'user-2',
      expect.any(Function),
    );
    expect(userRepository.clearAssignedProperties).toHaveBeenCalled();
    expect(userRepository.deleteUser).toHaveBeenCalled();
  });

  it('returns 409 when eligibility changes under lock (race)', async () => {
    const lockedUser = {
      id: 'user-2',
      role: UserRole.AGENT,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 1,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 2,
      assignedPropertiesCount: 0,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });

    await expect(
      service.deleteUser('user-2', 'tenant-1', actor),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes a user who has logged in when there is no business authorship', async () => {
    const lockedUser = {
      id: 'user-2',
      role: UserRole.AGENT,
      isActive: true,
      lastLoginAt: new Date('2026-08-01T00:00:00.000Z'),
      tenantId: 'tenant-1',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 0,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 2,
      assignedPropertiesCount: 2,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });
    userRepository.clearAssignedProperties.mockResolvedValue({ count: 2 });
    userRepository.deleteUser.mockResolvedValue({ count: 1 });

    await service.deleteUser('user-2', 'tenant-1', actor);

    expect(userRepository.clearAssignedProperties).toHaveBeenCalled();
    expect(userRepository.deleteUser).toHaveBeenCalled();
  });
  it('returns 409 when deleting would remove the last active TENANT_ADMIN', async () => {
    const lockedUser = {
      id: 'admin-2',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 0,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 1,
      assignedPropertiesCount: 0,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });

    await expect(
      service.deleteUser('admin-2', 'tenant-1', actor),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 403 for self-delete under lock', async () => {
    const lockedUser = {
      id: actor.id,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.getDeletionRelationCounts.mockResolvedValue({
      createdPropertiesCount: 0,
      createdDevelopmentsCount: 0,
      activeTenantAdminCount: 2,
      assignedPropertiesCount: 0,
      agentAccessAsUserCount: 0,
      agentAccessGrantedByCount: 0,
    });

    try {
      await service.deleteUser(actor.id, 'tenant-1', actor);
      fail('expected HttpException');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }

    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 404 when the locked user is missing', async () => {
    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser: null,
        }),
    );

    await expect(
      service.deleteUser('missing', 'tenant-1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps unexpected P2003 to 409 without partial delete semantics', async () => {
    userRepository.withTenantUserLocks.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.deleteUser('user-2', 'tenant-1', actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates TENANT_ADMIN under Tenant→User locks when another admin remains', async () => {
    const lockedUser = {
      id: 'admin-2',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
      firstName: 'A',
      lastName: 'B',
      name: 'A B',
      email: 'a@demo.valorar.dev',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.countActiveTenantAdmins.mockResolvedValue(2);
    userRepository.update.mockResolvedValue({
      ...lockedUser,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: null,
      avatarUrl: null,
      passwordHash: 'x',
    });

    const result = await service.updateUser(
      'admin-2',
      'tenant-1',
      { isActive: false },
      actor,
    );

    expect(userRepository.withTenantUserLocks).toHaveBeenCalledWith(
      'tenant-1',
      'admin-2',
      expect.any(Function),
    );
    expect(userRepository.countActiveTenantAdmins).toHaveBeenCalledWith(
      'tenant-1',
      expect.anything(),
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'admin-2',
      'tenant-1',
      { isActive: false },
      expect.anything(),
    );
    expect(result.isActive).toBe(false);
  });

  it('allows deactivating a non-admin under the same lock primitive', async () => {
    const lockedUser = {
      id: 'agent-1',
      role: UserRole.AGENT,
      isActive: true,
      lastLoginAt: null,
      tenantId: 'tenant-1',
      firstName: 'Agente',
      lastName: 'Demo',
      name: 'Agente Demo',
      email: 'agent@demo.valorar.dev',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.update.mockResolvedValue({
      ...lockedUser,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: null,
      avatarUrl: null,
      passwordHash: 'x',
    });

    await service.updateUser('agent-1', 'tenant-1', { isActive: false }, actor);

    expect(userRepository.withTenantUserLocks).toHaveBeenCalled();
    expect(userRepository.countActiveTenantAdmins).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalled();
  });

  it('returns 409 when a concurrent deactivate would leave zero active admins', async () => {
    const lockedUser = {
      id: 'admin-2',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      tenantId: 'tenant-1',
      firstName: 'A',
      lastName: 'B',
      name: 'A B',
      email: 'a@demo.valorar.dev',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    // After Tenant lock, only one admin remains (peer already deactivated/deleted).
    userRepository.countActiveTenantAdmins.mockResolvedValue(1);

    await expect(
      service.updateUser('admin-2', 'tenant-1', { isActive: false }, actor),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('serializes deactivate with DELETE via the shared Tenant→User lock primitive', async () => {
    const lockedUser = {
      id: 'admin-2',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      tenantId: 'tenant-1',
      firstName: 'A',
      lastName: 'B',
      name: 'A B',
      email: 'a@demo.valorar.dev',
    };

    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser,
        }),
    );
    userRepository.countActiveTenantAdmins.mockResolvedValue(1);

    await expect(
      service.updateUser('admin-2', 'tenant-1', { isActive: false }, actor),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.withTenantUserLocks).toHaveBeenCalledWith(
      'tenant-1',
      'admin-2',
      expect.any(Function),
    );
  });

  it('still forbids deactivating the last active TENANT_ADMIN', async () => {
    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser: {
            id: 'admin-2',
            role: UserRole.TENANT_ADMIN,
            isActive: true,
            tenantId: 'tenant-1',
            firstName: 'A',
            lastName: 'B',
            name: 'A B',
            email: 'a@demo.valorar.dev',
          },
        }),
    );
    userRepository.countActiveTenantAdmins.mockResolvedValue(1);

    await expect(
      service.updateUser('admin-2', 'tenant-1', { isActive: false }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('forbids self-deactivation with 403 under locks', async () => {
    userRepository.withTenantUserLocks.mockImplementation(
      async (_tenantId, _userId, work) =>
        work({
          tx: Symbol('tx'),
          lockedUser: {
            id: actor.id,
            role: UserRole.TENANT_ADMIN,
            isActive: true,
            tenantId: 'tenant-1',
            firstName: 'A',
            lastName: 'B',
            name: 'A B',
            email: actor.email,
          },
        }),
    );

    await expect(
      service.updateUser(actor.id, 'tenant-1', { isActive: false }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('does not lock for reactivation or non-deactivation updates', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'agent-1',
      role: UserRole.AGENT,
      isActive: false,
      tenantId: 'tenant-1',
      firstName: 'A',
      lastName: 'B',
      name: 'A B',
      email: 'agent@demo.valorar.dev',
    });
    userRepository.update.mockResolvedValue({
      id: 'agent-1',
      role: UserRole.AGENT,
      isActive: true,
      tenantId: 'tenant-1',
      firstName: 'A',
      lastName: 'B',
      name: 'A B',
      email: 'agent@demo.valorar.dev',
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: null,
      avatarUrl: null,
      passwordHash: 'x',
      lastLoginAt: null,
    });

    await service.updateUser('agent-1', 'tenant-1', { isActive: true }, actor);

    expect(userRepository.withTenantUserLocks).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalled();
  });
});
