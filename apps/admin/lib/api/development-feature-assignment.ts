import { apiFetch } from "@/lib/api/client";
import type { AdminPropertyFeatureAssignment } from "@/lib/api/types/property-feature";
import type { ReplacePropertyFeatureAssignmentsPayload } from "@/lib/api/types/property-feature";

export async function listDevelopmentFeatureAssignments(
  developmentId: string,
): Promise<AdminPropertyFeatureAssignment[]> {
  return apiFetch<AdminPropertyFeatureAssignment[]>(
    `/developments/${developmentId}/features`,
    { cache: "no-store" },
  );
}

export async function replaceDevelopmentFeatureAssignments(
  developmentId: string,
  payload: ReplacePropertyFeatureAssignmentsPayload,
): Promise<AdminPropertyFeatureAssignment[]> {
  return apiFetch<AdminPropertyFeatureAssignment[]>(
    `/developments/${developmentId}/features`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}
