"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import type { AuthUser } from "@/lib/auth/types";

type TenantSwitcherProps = {
  user: AuthUser;
  activeTenantId: string | null;
};

export function TenantSwitcher({ user, activeTenantId }: TenantSwitcherProps) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(activeTenantId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (user.role !== "SUPER_ADMIN") {
    return user.tenantId ? (
      <p className="truncate text-xs text-muted">Tenant activo</p>
    ) : null;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/active-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenantId.trim() }),
      });

      if (!response.ok) {
        let message = "No se pudo seleccionar el tenant.";

        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // keep default
        }

        setError(message);
        return;
      }

      router.refresh();
    } catch {
      setError("Error de conexión al guardar tenant.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <Input
        id="active-tenant-id"
        label="Tenant activo (SUPER_ADMIN)"
        value={tenantId}
        onChange={(event) => setTenantId(event.target.value)}
        placeholder="ID del tenant"
        className="h-8 text-xs"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" variant="secondary" disabled={isSaving}>
        {isSaving ? "Guardando…" : "Aplicar tenant"}
      </Button>
    </form>
  );
}
