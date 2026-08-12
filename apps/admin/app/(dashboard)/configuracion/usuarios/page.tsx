import { redirect } from "next/navigation";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { UsersManager } from "@/components/config/users-manager";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { listUsers, getUserDeletionEligibility } from "@/lib/api/users";
import type { UserDeletionEligibility } from "@/lib/api/types/user";
import { mapUnknownError } from "@/lib/api/error-map";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function ConfiguracionUsuariosPage() {
  let session: Awaited<ReturnType<typeof getSession>>;
  let activeTenantId: Awaited<ReturnType<typeof getActiveTenantId>>;

  try {
    [session, activeTenantId] = await Promise.all([
      getSession(),
      getActiveTenantId(),
    ]);
  } catch (error) {
    // Connectivity errors from getSession must not be treated as a null session.
    return (
      <PageShell title="Usuarios" subNav={<ConfigSubNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }

  if (!session) {
    redirect("/login");
  }

  if (!sessionHasPermission(session.user, "user.read")) {
    redirect("/");
  }

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!tenantGate.ok) {
    return (
      <PageShell
        title="Usuarios"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Usuarios" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  try {
    const users = await listUsers();
    const canUpdate = sessionHasPermission(session.user, "user.update");

    const deletionEligibilityByUserId: Record<string, UserDeletionEligibility> =
      {};

    if (canUpdate && users.length > 0) {
      const eligibilityEntries = await Promise.all(
        users.map(async (user) => {
          try {
            const eligibility = await getUserDeletionEligibility(user.id);
            return [user.id, eligibility] as const;
          } catch {
            return [
              user.id,
              {
                userId: user.id,
                canDelete: false,
                reasons: [],
                sideEffectsIfDeleted: {
                  assignedPropertiesToClear: 0,
                  agentAccessRowsToDelete: 0,
                  grantedByRowsToNull: 0,
                },
              } satisfies UserDeletionEligibility,
            ] as const;
          }
        }),
      );

      for (const [userId, eligibility] of eligibilityEntries) {
        deletionEligibilityByUserId[userId] = eligibility;
      }
    }

    return (
      <PageShell
        title="Usuarios"
        description="Equipo de la inmobiliaria, roles y acceso."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Usuarios" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <UsersManager
          users={users}
          sessionUser={session.user}
          deletionEligibilityByUserId={deletionEligibilityByUserId}
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Usuarios" subNav={<ConfigSubNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
