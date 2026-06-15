import { finishActivity, startActivity } from "@/lib/activity/activity-store";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  startActivity();
  try {
    return await fetch(input, init);
  } finally {
    finishActivity();
  }
}
