import { apiFetch } from "@/lib/api/client";
import type {
  AdminDevelopmentTypologyFeatureAssignment,
  ReplaceDevelopmentTypologyFeatureAssignmentsPayload,
} from "@/lib/api/types/development-typology-feature";

export async function listDevelopmentTypologyFeatureAssignments(
  typologyId: string,
): Promise<AdminDevelopmentTypologyFeatureAssignment[]> {
  return apiFetch<AdminDevelopmentTypologyFeatureAssignment[]>(
    `/development-typologies/${typologyId}/features`,
    { cache: "no-store" },
  );
}

export async function replaceDevelopmentTypologyFeatureAssignments(
  typologyId: string,
  payload: ReplaceDevelopmentTypologyFeatureAssignmentsPayload,
): Promise<AdminDevelopmentTypologyFeatureAssignment[]> {
  return apiFetch<AdminDevelopmentTypologyFeatureAssignment[]>(
    `/development-typologies/${typologyId}/features`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}
