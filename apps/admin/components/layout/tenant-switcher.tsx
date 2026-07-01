"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import type { PlatformTenantOption } from "@/lib/api/types/platform-tenant";
import type { AuthUser } from "@/lib/auth/types";

type TenantSwitcherProps = {
  user: AuthUser;
  activeTenantId: string | null;
  tenantOptions: PlatformTenantOption[];
  highlighted?: boolean;
  compact?: boolean;
};

export function TenantSwitcher({
  user,
  activeTenantId,
  tenantOptions,
  highlighted = false,
  compact = false,
}: TenantSwitcherProps) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(activeTenantId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTenantId(activeTenantId ?? "");
  }, [activeTenantId]);

  if (user.role !== "SUPER_ADMIN") {
    return null;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!tenantId) {
      setError("Seleccioná una inmobiliaria activa.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/active-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        let message = "No se pudo seleccionar la inmobiliaria.";

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
      setError("Error de conexión al guardar inmobiliaria.");
    } finally {
      setIsSaving(false);
    }
  }

  const activeTenant = tenantOptions.find((option) => option.id === activeTenantId);

  return (
    <form
      onSubmit={handleSave}
      className={`rounded-lg p-2 ${
        highlighted
          ? "border border-amber-300 bg-amber-50/80 ring-2 ring-amber-200/60"
          : "border border-border bg-surface"
      } space-y-2`}
    >
      <label
        htmlFor={compact ? "active-tenant-select-header" : "active-tenant-select"}
        className="block text-[11px] font-medium text-muted"
      >
        {compact ? "Inmobiliaria" : "Inmobiliaria activa"}
      </label>
      <select
        id={compact ? "active-tenant-select-header" : "active-tenant-select"}
        value={tenantId}
        onChange={(event) => setTenantId(event.target.value)}
        className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs"
      >
        <option value="">Seleccionar…</option>
        {tenantOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {activeTenant ? (
        <p className="truncate text-[11px] text-muted">{activeTenant.slug}</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={isSaving || !tenantId}
        className={compact ? "w-full" : undefined}
      >
        {isSaving ? "Aplicando…" : "Aplicar"}
      </Button>
    </form>
  );
}
