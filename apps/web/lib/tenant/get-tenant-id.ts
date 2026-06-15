/**
 * Resolves the tenant identifier for server-side API calls.
 * Never expose this value to the client.
 */
export function getTenantId(): string {
  return process.env.TENANT_ID ?? "";
}
