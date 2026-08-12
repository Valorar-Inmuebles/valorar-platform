"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import {
  SidePanel,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { UserAvatar, getRoleLabel } from "@/components/user/user-avatar";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "@/lib/api/user-actions";
import type {
  AdminUser,
  CreateUserPayload,
  UserDeletionEligibility,
} from "@/lib/api/types/user";
import type { AuthUser } from "@/lib/auth/types";
import { sessionHasPermission } from "@/lib/auth/types";
import type { PlatformRole } from "@/lib/permissions";
import { PLATFORM_ROLES, ROLE_LABELS, TENANT_ROLES } from "@/lib/permissions";

const ASSIGNABLE_ROLES: PlatformRole[] = TENANT_ROLES;

const DELETE_BLOCKED_EXPLANATION =
  "Este usuario tiene contenido o actividad de negocio asociada y no puede eliminarse. Podés desactivarlo para impedir su acceso conservando el historial.";

/** Discrete variants — role meaning comes from the label text, not color alone. */
const ROLE_BADGE_VARIANT: Record<PlatformRole, BadgeVariant> = {
  SUPER_ADMIN: "warning",
  TENANT_ADMIN: "info",
  MANAGER: "info",
  AGENT: "neutral",
  COLLABORATOR: "neutral",
};

function isPlatformRole(role: string): role is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

/** V1 model: one role per user. Normalized to an array for wrap-ready badges. */
function getUserRoles(user: AdminUser): string[] {
  return user.role ? [user.role] : [];
}

function resolveRoleLabel(role: string): string {
  if (isPlatformRole(role)) {
    return ROLE_LABELS[role];
  }

  return role;
}

function resolveRoleBadgeVariant(role: string): BadgeVariant {
  if (isPlatformRole(role)) {
    return ROLE_BADGE_VARIANT[role];
  }

  return "neutral";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type UsersManagerProps = {
  users: AdminUser[];
  sessionUser: AuthUser;
  deletionEligibilityByUserId?: Record<string, UserDeletionEligibility>;
};

type PanelMode = "create" | "edit" | null;

export function UsersManager({
  users,
  sessionUser,
  deletionEligibilityByUserId = {},
}: UsersManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [lifecycleUser, setLifecycleUser] = useState<AdminUser | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<
    "deactivate" | "reactivate" | "delete" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = sessionHasPermission(sessionUser, "user.create");
  const canUpdate = sessionHasPermission(sessionUser, "user.update");

  const activeTenantAdmins = useMemo(
    () =>
      users.filter(
        (user) => user.role === "TENANT_ADMIN" && user.isActive,
      ).length,
    [users],
  );

  const activeCount = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users],
  );

  function openCreate() {
    setSelectedUser(null);
    setPanelMode("create");
  }

  function openEdit(user: AdminUser) {
    setSelectedUser(user);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedUser(null);
  }

  function closeLifecycleModal() {
    setLifecycleUser(null);
    setLifecycleAction(null);
  }

  function canDeactivateUser(user: AdminUser): { ok: true } | { ok: false; reason: string } {
    if (user.id === sessionUser.id) {
      return { ok: false, reason: "No podés desactivar tu propia cuenta." };
    }

    if (user.role === "SUPER_ADMIN") {
      return {
        ok: false,
        reason: "No se puede modificar un superadministrador de plataforma.",
      };
    }

    if (user.role === "TENANT_ADMIN" && activeTenantAdmins <= 1) {
      return {
        ok: false,
        reason: "No podés desactivar al único administrador activo del tenant.",
      };
    }

    return { ok: true };
  }

  function openDeactivate(user: AdminUser) {
    const gate = canDeactivateUser(user);
    if (!gate.ok) {
      toast.error(gate.reason);
      return;
    }

    setLifecycleUser(user);
    setLifecycleAction("deactivate");
  }

  function openReactivate(user: AdminUser) {
    if (user.role === "SUPER_ADMIN") {
      toast.error("No se puede modificar un superadministrador de plataforma.");
      return;
    }

    setLifecycleUser(user);
    setLifecycleAction("reactivate");
  }

  function openDelete(user: AdminUser) {
    const eligibility = deletionEligibilityByUserId[user.id];
    if (!eligibility?.canDelete) {
      toast.error(
        eligibility?.reasons[0]?.message ?? DELETE_BLOCKED_EXPLANATION,
      );
      return;
    }

    setLifecycleUser(user);
    setLifecycleAction("delete");
  }

  function handleLifecycleConfirm() {
    if (!lifecycleUser || !lifecycleAction) return;

    if (lifecycleAction === "delete") {
      startTransition(async () => {
        const result = await deleteUserAction(lifecycleUser.id);
        closeLifecycleModal();

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success("Usuario eliminado definitivamente");
        router.refresh();
      });
      return;
    }

    const nextActive = lifecycleAction === "reactivate";

    startTransition(async () => {
      const result = await updateUserAction(lifecycleUser.id, {
        isActive: nextActive,
      });
      closeLifecycleModal();

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        nextActive ? "Usuario reactivado" : "Usuario desactivado",
      );
      router.refresh();
    });
  }

  function handleCreateSubmit(form: FormData) {
    const payload: CreateUserPayload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      role: String(form.get("role") ?? "AGENT") as PlatformRole,
      password: String(form.get("password") ?? ""),
      isActive: form.get("isActive") === "on",
    };

    startTransition(async () => {
      const result = await createUserAction(payload);
      if (result.ok) {
        toast.success("Usuario creado");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleEditSubmit(form: FormData) {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await updateUserAction(selectedUser.id, {
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        role: String(form.get("role") ?? selectedUser.role) as PlatformRole,
        isActive: form.get("isActive") === "on",
        password: String(form.get("password") ?? "") || undefined,
      });

      if (result.ok) {
        toast.success("Usuario actualizado");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Usuarios</p>
          <p className="text-2xl font-semibold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Activos</p>
          <p className="text-2xl font-semibold">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Invitaciones</p>
          <p className="text-sm text-muted">Próximamente — envío por email</p>
        </Card>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        {canCreate ? (
          <Button type="button" onClick={openCreate}>
            Nuevo usuario
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-surface-alt/60 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Propiedades</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const deactivateGate = canDeactivateUser(user);
                const deletionEligibility = deletionEligibilityByUserId[user.id];
                const canDelete = deletionEligibility?.canDelete === true;
                const deleteTitle = canDelete
                  ? undefined
                  : (deletionEligibility?.reasons[0]?.message ??
                    DELETE_BLOCKED_EXPLANATION);
                const assignedCount = user.assignedPropertiesCount ?? 0;
                const createdCount = user.createdPropertiesCount ?? 0;
                const propertiesTitle = `${assignedCount} propiedades asignadas · ${createdCount} propiedades creadas`;

                return (
                <tr key={user.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} seed={user.id} size="sm" />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[16rem] flex-wrap gap-1.5">
                      {getUserRoles(user).map((role) => (
                        <Badge
                          key={role}
                          variant={resolveRoleBadgeVariant(role)}
                          title={role}
                        >
                          {resolveRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td
                    className="px-4 py-3 tabular-nums text-muted"
                    title={propertiesTitle}
                  >
                    {assignedCount}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {canUpdate ? (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                          disabled={isPending}
                        >
                          Editar
                        </Button>
                        {user.isActive ? (
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled={isPending || !deactivateGate.ok}
                            title={
                              deactivateGate.ok ? undefined : deactivateGate.reason
                            }
                            onClick={() => openDeactivate(user)}
                          >
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled={isPending || user.role === "SUPER_ADMIN"}
                            onClick={() => openReactivate(user)}
                          >
                            Reactivar
                          </Button>
                        )}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled={isPending}
                            onClick={() => openDelete(user)}
                          >
                            Eliminar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            disabled
                            title={deleteTitle}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={`/configuracion/usuarios/${user.id}`}
                        className="text-sm font-medium text-brand-green hover:underline"
                      >
                        Ver
                      </Link>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <SidePanel open={panelMode !== null} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Nuevo usuario" : "Editar usuario"}
          </SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <form
            id="user-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (panelMode === "create") {
                handleCreateSubmit(form);
              } else {
                handleEditSubmit(form);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" name="firstName" required defaultValue={selectedUser?.firstName ?? ""} disabled={isPending} />
              </FormField>
              <FormField>
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" name="lastName" required defaultValue={selectedUser?.lastName ?? ""} disabled={isPending} />
              </FormField>
            </div>
            <FormField>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue={selectedUser?.email ?? ""} disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={selectedUser?.phone ?? ""} disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                name="role"
                defaultValue={selectedUser?.role ?? "AGENT"}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="password">
                {panelMode === "create" ? "Contraseña" : "Nueva contraseña (opcional)"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required={panelMode === "create"}
                disabled={isPending}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={selectedUser?.isActive ?? true}
                disabled={isPending}
              />
              Usuario activo
            </label>
            {panelMode === "create" ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
                Invitación por email — disponible en una próxima versión.
              </p>
            ) : null}
          </form>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </SidePanelFooter>
      </SidePanel>

      <ConfirmModal
        open={lifecycleAction !== null && lifecycleUser !== null}
        onClose={closeLifecycleModal}
        onConfirm={handleLifecycleConfirm}
        title={
          lifecycleAction === "delete"
            ? "Eliminar usuario"
            : lifecycleAction === "reactivate"
              ? "Reactivar usuario"
              : "Desactivar usuario"
        }
        description={
          lifecycleAction === "delete" ? (
            lifecycleUser?.lastLoginAt ? (
              <>
                Este usuario inició sesión anteriormente, pero no posee
                contenido ni actividad de negocio asociada. Su cuenta será
                eliminada definitivamente.
              </>
            ) : (
              <>
                El usuario será eliminado definitivamente. Esta acción está
                disponible porque no posee propiedades, emprendimientos ni
                actividad de negocio asociada.
              </>
            )
          ) : lifecycleAction === "reactivate" ? (
            <>
              ¿Reactivar a <strong>{lifecycleUser?.name}</strong>? Volverá a
              poder iniciar sesión en el panel.
            </>
          ) : (
            <>
              ¿Desactivar a <strong>{lifecycleUser?.name}</strong>? No podrá
              iniciar sesión. Se conservan sus propiedades e historial.
            </>
          )
        }
        confirmLabel={
          lifecycleAction === "delete"
            ? "Eliminar definitivamente"
            : lifecycleAction === "reactivate"
              ? "Reactivar"
              : "Desactivar"
        }
        cancelLabel="Cancelar"
        loading={isPending}
      />
    </>
  );
}
