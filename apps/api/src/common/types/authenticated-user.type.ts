import { UserRole } from '../../../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: Date | null;
  role: UserRole;
  tenantId: string | null;
};
