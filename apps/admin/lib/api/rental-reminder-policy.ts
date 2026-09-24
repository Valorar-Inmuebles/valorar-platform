import { apiFetch } from "@/lib/api/client";
import type {
  RentalReminderPolicy,
  UpdateRentalReminderPolicy,
} from "@repo/shared-types";

export function getRentalReminderPolicy() {
  return apiFetch<RentalReminderPolicy>("/rental-reminder-policy", {
    cache: "no-store",
  });
}

export function updateRentalReminderPolicy(
  payload: UpdateRentalReminderPolicy,
) {
  return apiFetch<RentalReminderPolicy>("/rental-reminder-policy", {
    method: "PUT",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}
