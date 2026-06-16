import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyFeatureAssignment,
  ReplacePropertyFeatureAssignmentsPayload,
} from "@/lib/api/types/property-feature";

export async function listPropertyFeatureAssignments(
  propertyId: string,
): Promise<AdminPropertyFeatureAssignment[]> {
  return apiFetch<AdminPropertyFeatureAssignment[]>(
    `/properties/${propertyId}/features`,
    { cache: "no-store" },
  );
}

export async function replacePropertyFeatureAssignments(
  propertyId: string,
  payload: ReplacePropertyFeatureAssignmentsPayload,
): Promise<AdminPropertyFeatureAssignment[]> {
  return apiFetch<AdminPropertyFeatureAssignment[]>(
    `/properties/${propertyId}/features`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}
