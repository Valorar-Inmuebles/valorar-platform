import { apiFetch } from "@/lib/api/client";
import type {
  OrganizationSettings,
  UpdateOrganizationPayload,
} from "@/lib/api/types/organization";

export function getOrganization(): Promise<OrganizationSettings> {
  return apiFetch<OrganizationSettings>("/organization", { cache: "no-store" });
}

export function updateOrganization(
  payload: UpdateOrganizationPayload,
): Promise<OrganizationSettings> {
  return apiFetch<OrganizationSettings>("/organization", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
