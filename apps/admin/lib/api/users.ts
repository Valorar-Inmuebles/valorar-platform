import { apiFetch } from "@/lib/api/client";
import type {
  AdminUser,
  CreateUserPayload,
  UpdateProfilePayload,
  UpdateUserPayload,
} from "@/lib/api/types/user";

export function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>("/users", { cache: "no-store" });
}

export function getUser(id: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${id}`, { cache: "no-store" });
}

export function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  return apiFetch<AdminUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateProfile(
  payload: UpdateProfilePayload,
): Promise<AdminUser> {
  return apiFetch<AdminUser>("/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getProfile(): Promise<AdminUser> {
  return apiFetch<AdminUser>("/users/me/profile", { cache: "no-store" });
}
