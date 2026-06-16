export function getAdminTenantId(): string {
  return (
    process.env.ADMIN_DEV_TENANT_ID ??
    process.env.TENANT_ID ??
    ""
  );
}

export function getAdminUserId(): string {
  return process.env.ADMIN_DEV_USER_ID ?? "";
}

export function requireAdminTenantId(): string {
  const tenantId = getAdminTenantId();
  if (!tenantId) {
    throw new Error(
      "Configurá ADMIN_DEV_TENANT_ID o TENANT_ID para conectar con la API.",
    );
  }
  return tenantId;
}

export function requireAdminUserId(): string {
  const userId = getAdminUserId();
  if (!userId) {
    throw new Error(
      "Configurá ADMIN_DEV_USER_ID para crear propiedades hasta implementar auth.",
    );
  }
  return userId;
}
