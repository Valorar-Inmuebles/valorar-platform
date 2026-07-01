import type { AuthUserRole } from "@/lib/auth/types";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AuthUserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: AuthUserRole;
  password: string;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<
  Omit<CreateUserPayload, "password"> & { password?: string; isActive?: boolean }
>;

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  password?: string;
};
