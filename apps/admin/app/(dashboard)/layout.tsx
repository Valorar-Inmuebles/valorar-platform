import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { listPlatformTenantOptions } from "@/lib/api/platform-tenants";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const activeTenantId = await getActiveTenantId();
  const tenantOptions =
    session.user.role === "SUPER_ADMIN"
      ? await listPlatformTenantOptions().catch(() => [])
      : [];

  return (
    <MainLayout
      session={session}
      activeTenantId={activeTenantId}
      tenantOptions={tenantOptions}
    >
      {children}
    </MainLayout>
  );
}
