import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
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

  return (
    <MainLayout session={session} activeTenantId={activeTenantId}>
      {children}
    </MainLayout>
  );
}
