import { UserRole } from '../../../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
};
