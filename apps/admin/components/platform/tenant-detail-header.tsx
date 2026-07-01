"use client";

import { useState, useTransition } from "react";
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
  reactivatePlatformTenantAction,
  suspendPlatformTenantAction,
  updatePlatformTenantAction,
} from "@/lib/api/platform-tenant-actions";
import type {
  PlatformTenant,
  UpdatePlatformTenantPayload,
} from "@/lib/api/types/platform-tenant";
import {
  getTenantStatusLabel,
  getTenantStatusVariant,
} from "@/lib/api/types/platform-tenant";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function fieldValue(value?: string | null): string {
  return value ?? "";
}

type TenantDetailHeaderProps = {
  tenant: PlatformTenant;
};

type PanelMode = "edit" | "suspend" | "reactivate" | null;

export function TenantDetailHeader({ tenant }: TenantDetailHeaderProps) {
  const { toast } = useToast();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isPending, startTransition] = useTransition();

  function closePanel() {
    setPanelMode(null);
  }

  function handleEditSubmit(form: FormData) {
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
      const result = await updatePlatformTenantAction(tenant.id, payload);
      if (result.ok) {
        toast.success("Inmobiliaria actualizada");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleSuspendConfirm() {
    startTransition(async () => {
      const result = await suspendPlatformTenantAction(tenant.id);
      if (result.ok) {
        toast.success("Inmobiliaria suspendida");
        closePanel();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleReactivateConfirm() {
    startTransition(async () => {
      const result = await reactivatePlatformTenantAction(tenant.id);
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
      <Card className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <UserAvatar
              name={tenant.name}
              avatarUrl={tenant.logoUrl}
              seed={tenant.id}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{tenant.name}</h2>
                <Badge variant={getTenantStatusVariant(tenant.status)}>
                  {getTenantStatusLabel(tenant.status)}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-sm text-muted">{tenant.slug}</p>
              <p className="mt-2 text-xs text-muted">
                Alta: {formatDate(tenant.createdAt)} · Actualizado: {formatDate(tenant.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setPanelMode("edit")}>
              Editar
            </Button>
            {tenant.status === "ACTIVE" ? (
              <Button type="button" variant="ghost" onClick={() => setPanelMode("suspend")}>
                Suspender
              </Button>
            ) : (
              <Button type="button" onClick={() => setPanelMode("reactivate")}>
                Reactivar
              </Button>
            )}
            <Link
              href="/plataforma/tenants"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-alt hover:text-foreground"
            >
              Volver al listado
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-alt/40 px-4 py-3">
            <p className="text-xs text-muted">Usuarios</p>
            <p className="text-2xl font-semibold">{tenant.userCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-alt/40 px-4 py-3">
            <p className="text-xs text-muted">Propiedades</p>
            <p className="text-2xl font-semibold">{tenant.propertyCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-alt/40 px-4 py-3">
            <p className="text-xs text-muted">Email</p>
            <p className="truncate text-sm font-medium">{tenant.email ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-alt/40 px-4 py-3">
            <p className="text-xs text-muted">Teléfono / WhatsApp</p>
            <p className="truncate text-sm font-medium">
              {[tenant.phone, tenant.whatsapp].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>

        {tenant.domain ? (
          <p className="mt-4 text-xs text-muted">
            Dominio reservado: <span className="font-mono">{tenant.domain}</span>
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted">
            Dominio personalizado — disponible en una próxima versión.
          </p>
        )}
      </Card>

      <SidePanel open={panelMode === "edit"} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>Editar inmobiliaria</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <form
            id="tenant-detail-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleEditSubmit(new FormData(event.currentTarget));
            }}
          >
            <FormField>
              <Label htmlFor="detail-name">Nombre</Label>
              <Input id="detail-name" name="name" required defaultValue={tenant.name} disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="detail-slug">Slug</Label>
              <Input id="detail-slug" name="slug" required defaultValue={tenant.slug} disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="detail-logoUrl">Logo (URL)</Label>
              <Input id="detail-logoUrl" name="logoUrl" defaultValue={fieldValue(tenant.logoUrl)} disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="detail-email">Email</Label>
              <Input id="detail-email" name="email" type="email" defaultValue={fieldValue(tenant.email)} disabled={isPending} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <Label htmlFor="detail-phone">Teléfono</Label>
                <Input id="detail-phone" name="phone" defaultValue={fieldValue(tenant.phone)} disabled={isPending} />
              </FormField>
              <FormField>
                <Label htmlFor="detail-whatsapp">WhatsApp</Label>
                <Input id="detail-whatsapp" name="whatsapp" defaultValue={fieldValue(tenant.whatsapp)} disabled={isPending} />
              </FormField>
            </div>
            <FormField>
              <Label htmlFor="detail-domain">Dominio</Label>
              <Input id="detail-domain" name="domain" defaultValue={fieldValue(tenant.domain)} disabled={isPending} />
            </FormField>
          </form>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="tenant-detail-form" disabled={isPending}>
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
            Los usuarios de esta inmobiliaria no podrán acceder al admin hasta que la reactives.
          </p>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSuspendConfirm} disabled={isPending}>
            Suspender
          </Button>
        </SidePanelFooter>
      </SidePanel>

      <SidePanel open={panelMode === "reactivate"} onClose={closePanel}>
        <SidePanelHeader>
          <SidePanelTitle>Reactivar inmobiliaria</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelContent>
          <p className="text-sm text-muted">
            Los usuarios podrán volver a iniciar sesión y operar en el admin.
          </p>
        </SidePanelContent>
        <SidePanelFooter>
          <Button type="button" variant="ghost" onClick={closePanel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleReactivateConfirm} disabled={isPending}>
            Reactivar
          </Button>
        </SidePanelFooter>
      </SidePanel>
    </>
  );
}
