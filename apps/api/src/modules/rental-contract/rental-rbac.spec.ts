import { getPermissionsForRole } from '../../../../../packages/rbac/src';

describe('Rental Management V1 RBAC', () => {
  it('grants complete foundation access to tenant admins and managers', () => {
    for (const role of ['TENANT_ADMIN', 'MANAGER'] as const) {
      expect(getPermissionsForRole(role)).toEqual(
        expect.arrayContaining([
          'rental.read',
          'rental.contract.create',
          'rental.contract.update',
          'rental.contract.end',
          'rental.contract.renew',
          'rental.contact.manage',
          'rental.obligation.manage',
          'rental.fulfillment.manage',
          'rental.reminder.manage',
        ]),
      );
    }
  });

  it('allows agents to operate contracts but not end them', () => {
    const permissions = getPermissionsForRole('AGENT');
    expect(permissions).toEqual(
      expect.arrayContaining([
        'rental.read',
        'rental.contract.create',
        'rental.contract.update',
        'rental.contact.manage',
        'rental.obligation.manage',
        'rental.fulfillment.manage',
      ]),
    );
    expect(permissions).not.toContain('rental.contract.end');
    expect(permissions).not.toContain('rental.contract.renew');
    expect(permissions).not.toContain('rental.reminder.manage');
  });

  it('does not expose rentals to collaborators', () => {
    expect(getPermissionsForRole('COLLABORATOR')).not.toContain('rental.read');
    expect(getPermissionsForRole('COLLABORATOR')).not.toContain(
      'rental.contract.renew',
    );
    expect(getPermissionsForRole('COLLABORATOR')).not.toContain(
      'rental.reminder.manage',
    );
  });
});
