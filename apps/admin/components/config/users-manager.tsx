"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
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
import { createUserAction, updateUserAction } from "@/lib/api/user-actions";
import type { AdminUser, CreateUserPayload } from "@/lib/api/types/user";
import type { AuthUser } from "@/lib/auth/types";
import { sessionHasPermission } from "@/lib/auth/types";
import type { PlatformRole } from "@/lib/permissions";
import { PLATFORM_ROLES } from "@/lib/permissions";

const ASSIGNABLE_ROLES: PlatformRole[] = PLATFORM_ROLES.filter(
  (role) => role !== "SUPER_ADMIN",
);

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
};

type PanelMode = "create" | "edit" | null;

export function UsersManager({ users, sessionUser }: UsersManagerProps) {
  const { toast } = useToast();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = sessionHasPermission(sessionUser, "user.create");
  const canUpdate = sessionHasPermission(sessionUser, "user.update");

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
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                  <td className="px-4 py-3">{getRoleLabel(user.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {canUpdate ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        Editar
                      </Button>
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
              ))}
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
    </>
  );
}
