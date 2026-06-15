/**
 * Resolves the tenant identifier for server-side API calls.
 * Never expose this value to the client.
 */
export function getTenantId(): string {
  const tenantId = process.env.TENANT_ID;

  if (!tenantId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TENANT_ID environment variable is required in production");
    }

    return "";
  }

  return tenantId;
}
