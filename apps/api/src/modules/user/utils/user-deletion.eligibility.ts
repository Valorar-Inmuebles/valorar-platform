/**
 * User deletion eligibility (tenant admin API).
 *
 * Business history that blocks deletion today:
 * - Property.createdById
 * - Development.createdById
 *
 * Access (`lastLoginAt`) is NOT business history and does not block deletion.
 * Eligibility MUST be extended when Lead, Invitation, Audit or other historical
 * authorship relations are introduced.
 */

export const USER_DELETION_REASON_CODES = [
  'HAS_CREATED_PROPERTIES',
  'HAS_CREATED_DEVELOPMENTS',
  'SELF_DELETE',
  'LAST_ACTIVE_TENANT_ADMIN',
  'SUPER_ADMIN_FORBIDDEN',
] as const;

export type UserDeletionReasonCode =
  (typeof USER_DELETION_REASON_CODES)[number];

export type UserDeletionReason = {
  code: UserDeletionReasonCode;
  message: string;
  count?: number;
};

export type UserDeletionSideEffects = {
  assignedPropertiesToClear: number;
  agentAccessRowsToDelete: number;
  grantedByRowsToNull: number;
};

export type UserDeletionEligibility = {
  userId: string;
  canDelete: boolean;
  reasons: UserDeletionReason[];
  sideEffectsIfDeleted: UserDeletionSideEffects;
};

export type UserDeletionEvalInput = {
  userId: string;
  role: string;
  isActive: boolean;
  actorId: string;
  createdPropertiesCount: number;
  createdDevelopmentsCount: number;
  activeTenantAdminCount: number;
  assignedPropertiesCount: number;
  agentAccessAsUserCount: number;
  agentAccessGrantedByCount: number;
};

const REASON_MESSAGES: Record<UserDeletionReasonCode, string> = {
  HAS_CREATED_PROPERTIES:
    'Este usuario creó propiedades y no puede eliminarse.',
  HAS_CREATED_DEVELOPMENTS:
    'Este usuario creó emprendimientos y no puede eliminarse.',
  SELF_DELETE: 'No podés eliminar tu propia cuenta.',
  LAST_ACTIVE_TENANT_ADMIN:
    'No podés eliminar al único administrador activo del tenant.',
  SUPER_ADMIN_FORBIDDEN:
    'No se puede eliminar un superadministrador de plataforma desde el tenant.',
};

export function evaluateUserDeletionEligibility(
  input: UserDeletionEvalInput,
): UserDeletionEligibility {
  const reasons: UserDeletionReason[] = [];

  if (input.role === 'SUPER_ADMIN') {
    reasons.push({
      code: 'SUPER_ADMIN_FORBIDDEN',
      message: REASON_MESSAGES.SUPER_ADMIN_FORBIDDEN,
    });
  }

  if (input.actorId === input.userId) {
    reasons.push({
      code: 'SELF_DELETE',
      message: REASON_MESSAGES.SELF_DELETE,
    });
  }

  if (input.createdPropertiesCount > 0) {
    reasons.push({
      code: 'HAS_CREATED_PROPERTIES',
      message: REASON_MESSAGES.HAS_CREATED_PROPERTIES,
      count: input.createdPropertiesCount,
    });
  }

  if (input.createdDevelopmentsCount > 0) {
    reasons.push({
      code: 'HAS_CREATED_DEVELOPMENTS',
      message: REASON_MESSAGES.HAS_CREATED_DEVELOPMENTS,
      count: input.createdDevelopmentsCount,
    });
  }

  if (
    input.role === 'TENANT_ADMIN' &&
    input.isActive &&
    input.activeTenantAdminCount <= 1
  ) {
    reasons.push({
      code: 'LAST_ACTIVE_TENANT_ADMIN',
      message: REASON_MESSAGES.LAST_ACTIVE_TENANT_ADMIN,
      count: input.activeTenantAdminCount,
    });
  }

  return {
    userId: input.userId,
    canDelete: reasons.length === 0,
    reasons,
    sideEffectsIfDeleted: {
      assignedPropertiesToClear: input.assignedPropertiesCount,
      agentAccessRowsToDelete: input.agentAccessAsUserCount,
      grantedByRowsToNull: input.agentAccessGrantedByCount,
    },
  };
}

export function isForbiddenDeletionReason(
  code: UserDeletionReasonCode,
): boolean {
  return code === 'SELF_DELETE' || code === 'SUPER_ADMIN_FORBIDDEN';
}
