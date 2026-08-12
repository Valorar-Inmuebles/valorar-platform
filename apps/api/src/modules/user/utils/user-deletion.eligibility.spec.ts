import {
  evaluateUserDeletionEligibility,
  isForbiddenDeletionReason,
} from './user-deletion.eligibility';

describe('evaluateUserDeletionEligibility', () => {
  const base = {
    userId: 'user-1',
    role: 'AGENT',
    isActive: true,
    actorId: 'actor-1',
    createdPropertiesCount: 0,
    createdDevelopmentsCount: 0,
    activeTenantAdminCount: 2,
    assignedPropertiesCount: 0,
    agentAccessAsUserCount: 0,
    agentAccessGrantedByCount: 0,
  };

  it('allows deletion when there is no business authorship', () => {
    const result = evaluateUserDeletionEligibility(base);

    expect(result.canDelete).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('allows deletion even when the user has logged in before', () => {
    // lastLoginAt is intentionally outside eligibility input — login is not a blocker.
    const result = evaluateUserDeletionEligibility(base);

    expect(result.canDelete).toBe(true);
  });

  it('blocks created properties and developments', () => {
    const result = evaluateUserDeletionEligibility({
      ...base,
      createdPropertiesCount: 2,
      createdDevelopmentsCount: 1,
    });

    expect(result.canDelete).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'HAS_CREATED_PROPERTIES',
      'HAS_CREATED_DEVELOPMENTS',
    ]);
  });

  it('blocks login+created properties via authorship only', () => {
    const result = evaluateUserDeletionEligibility({
      ...base,
      createdPropertiesCount: 1,
    });

    expect(result.canDelete).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'HAS_CREATED_PROPERTIES',
    ]);
  });

  it('blocks login+created developments via authorship only', () => {
    const result = evaluateUserDeletionEligibility({
      ...base,
      createdDevelopmentsCount: 1,
    });

    expect(result.canDelete).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'HAS_CREATED_DEVELOPMENTS',
    ]);
  });

  it('blocks self-delete and super admin with forbidden codes', () => {
    const self = evaluateUserDeletionEligibility({
      ...base,
      actorId: 'user-1',
    });
    const superAdmin = evaluateUserDeletionEligibility({
      ...base,
      role: 'SUPER_ADMIN',
    });

    expect(self.reasons[0]?.code).toBe('SELF_DELETE');
    expect(superAdmin.reasons[0]?.code).toBe('SUPER_ADMIN_FORBIDDEN');
    expect(isForbiddenDeletionReason('SELF_DELETE')).toBe(true);
    expect(isForbiddenDeletionReason('SUPER_ADMIN_FORBIDDEN')).toBe(true);
    expect(isForbiddenDeletionReason('HAS_CREATED_PROPERTIES')).toBe(false);
  });

  it('blocks deleting the last active TENANT_ADMIN but allows inactive admins', () => {
    const lastActive = evaluateUserDeletionEligibility({
      ...base,
      role: 'TENANT_ADMIN',
      isActive: true,
      activeTenantAdminCount: 1,
    });
    const inactiveAdmin = evaluateUserDeletionEligibility({
      ...base,
      role: 'TENANT_ADMIN',
      isActive: false,
      activeTenantAdminCount: 1,
    });

    expect(lastActive.canDelete).toBe(false);
    expect(lastActive.reasons[0]?.code).toBe('LAST_ACTIVE_TENANT_ADMIN');
    expect(inactiveAdmin.canDelete).toBe(true);
  });

  it('reports assigned property side effects without blocking deletion', () => {
    const result = evaluateUserDeletionEligibility({
      ...base,
      assignedPropertiesCount: 3,
      agentAccessAsUserCount: 1,
      agentAccessGrantedByCount: 2,
    });

    expect(result.canDelete).toBe(true);
    expect(result.sideEffectsIfDeleted).toEqual({
      assignedPropertiesToClear: 3,
      agentAccessRowsToDelete: 1,
      grantedByRowsToNull: 2,
    });
  });
});
