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
import { UserAvatar } from "@/components/user/user-avatar";
import {
  createPlatformTenantAction,
  reactivatePlatformTenantAction,
  suspendPlatformTenantAction,
  updatePlatformTenantAction,
} from "@/lib/api/platform-tenant-actions";
import type {
  CreatePlatformTenantPayload,
  PlatformTenant,
  PlatformTenantStats,
  UpdatePlatformTenantPayload,
} from "@/lib/api/types/platform-tenant";
import {
  getTenantStatusLabel,
  getTenantStatusVariant,
} from "@/lib/api/types/platform-tenant";
import { slugifyTitle } from "@/lib/property/form";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

type PanelMode = "create" | "edit" | "suspend" | "reactivate" | null;

type TenantsManagerProps = {
  tenants: PlatformTenant[];
  stats: PlatformTenantStats;
};

function fieldValue(value?: string | null): string {
  return value ?? "";
}

export function TenantsManager({ tenants, stats }: TenantsManagerProps) {
  const { toast } = useToast();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [tenants],
  );

  function openCreate() {
    setSelectedTenant(null);
    setSlugTouched(false);
    setPanelMode("create");
  }

  function openEdit(tenant: PlatformTenant) {
    setSelectedTenant(tenant);
    setSlugTouched(true);
    setPanelMode("edit");
  }

  function openSuspend(tenant: PlatformTenant) {
    setSelectedTenant(tenant);
    setPanelMode("suspend");
  }

  function openReactivate(tenant: PlatformTenant) {
    setSelectedTenant(tenant);
    setPanelMode("reactivate");
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedTenant(null);
  }

  function handleCreateSubmit(form: FormData) {
    const payload: CreatePlatformTenantPayload = {
      name: String(form.get("name") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim() || undefined,
      logoUrl: String(form.get("logoUrl") ?? "").trim() || undefined,
      email: String(form.get("email") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      whatsapp: String(form.get("whatsapp") ?? "").trim() || undefined,
      domain: String(form.get("domain") ?? "").trim() || undefined,
    };

    startTransition(async () => {
      const result = await createPlatformTenantAction(payload);
      if (result.ok) {
        toast.success("Inmobiliaria creada");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleEditSubmit(form: FormData) {
    if (!selectedTenant) return;

    const payload: UpdatePlatformTenantPayload = {
      name: String(form.get("name") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      logoUrl: String(form.get("logoUrl") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
      domain: String(form.get("domain") ?? "").trim() || null,
    };

    startTransition(async () => {
      const result = await updatePlatformTenantAction(selectedTenant.id, payload);
      if (result.ok) {
        toast.success("Inmobiliaria actualizada");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleSuspendConfirm() {
    if (!selectedTenant) return;

    startTransition(async () => {
      const result = await suspendPlatformTenantAction(selectedTenant.id);
      if (result.ok) {
        toast.success("Inmobiliaria suspendida");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleReactivateConfirm() {
    if (!selectedTenant) return;

    startTransition(async () => {
      const result = await reactivatePlatformTenantAction(selectedTenant.id);
      if (result.ok) {
        toast.success("Inmobiliaria reactivada");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted">Tenants activos</p>
          <p className="text-2xl font-semibold">{stats.activeTenants}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Suspendidos</p>
          <p className="text-2xl font-semibold">{stats.suspendedTenants}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Usuarios</p>
          <p className="text-2xl font-semibold">{stats.totalUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Propiedades</p>
          <p className="text-2xl font-semibold">{stats.totalProperties}</p>
        </Card>
      </div>

      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={openCreate}>
          Nueva inmobiliaria
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-surface-alt/60 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Usuarios</th>
                <th className="px-4 py-3">Propiedades</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <UserAvatar
                      name={tenant.name}
                      avatarUrl={tenant.logoUrl}
                      seed={tenant.id}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/plataforma/tenants/${tenant.id}`}
                      className="font-medium text-brand-green hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {tenant.slug}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getTenantStatusVariant(tenant.status)}>
                      {getTenantStatusLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{tenant.userCount}</td>
                  <td className="px-4 py-3">{tenant.propertyCount}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(tenant.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(tenant)}
                      >
                        Editar
                      </Button>
                      {tenant.status === "ACTIVE" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openSuspend(tenant)}
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openReactivate(tenant)}
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SidePanel open={panelMode === "create" || panelMode === "edit"} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Nueva inmobiliaria" : "Editar inmobiliaria"}
          </SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <form
            id="tenant-form"
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
            <FormField>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={selectedTenant?.name ?? ""}
                disabled={isPending}
                onChange={(event) => {
                  if (panelMode === "create" && !slugTouched) {
                    const slugInput = document.getElementById(
                      "slug",
                    ) as HTMLInputElement | null;
                    if (slugInput) {
                      slugInput.value = slugifyTitle(event.target.value);
                    }
                  }
                }}
              />
            </FormField>
            <FormField>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required={panelMode === "edit"}
                defaultValue={selectedTenant?.slug ?? ""}
                disabled={isPending}
                onChange={() => setSlugTouched(true)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="logoUrl">Logo (URL)</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                defaultValue={fieldValue(selectedTenant?.logoUrl)}
                disabled={isPending}
              />
            </FormField>
            <FormField>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={fieldValue(selectedTenant?.email)}
                disabled={isPending}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={fieldValue(selectedTenant?.phone)}
                  disabled={isPending}
                />
              </FormField>
              <FormField>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={fieldValue(selectedTenant?.whatsapp)}
                  disabled={isPending}
                />
              </FormField>
            </div>
            <FormField>
              <Label htmlFor="domain">Dominio</Label>
              <Input
                id="domain"
                name="domain"
                placeholder="Próximamente — dominio personalizado"
                defaultValue={fieldValue(selectedTenant?.domain)}
                disabled={isPending}
              />
            </FormField>
          </form>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="tenant-form" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </SidePanelFooter>
      </SidePanel>

      <SidePanel open={panelMode === "suspend"} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>Suspender inmobiliaria</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <p className="text-sm text-muted">
            ¿Suspender <strong className="text-foreground">{selectedTenant?.name}</strong>?
            Los usuarios no podrán iniciar sesión ni acceder al admin. Los datos se conservan.
          </p>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSuspendConfirm}
            disabled={isPending}
          >
            {isPending ? "Suspendiendo…" : "Suspender"}
          </Button>
        </SidePanelFooter>
      </SidePanel>

      <SidePanel open={panelMode === "reactivate"} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>Reactivar inmobiliaria</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <p className="text-sm text-muted">
            ¿Reactivar <strong className="text-foreground">{selectedTenant?.name}</strong>?
            Los usuarios podrán volver a acceder al admin.
          </p>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleReactivateConfirm} disabled={isPending}>
            {isPending ? "Reactivando…" : "Reactivar"}
          </Button>
        </SidePanelFooter>
      </SidePanel>
    </>
  );
}
