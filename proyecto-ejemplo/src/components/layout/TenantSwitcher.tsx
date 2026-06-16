"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchableSelect, type SelectOption } from "@/components/ui/select";
import { setViewTenant } from "@/lib/api/me.api";
import { getTenants } from "@/lib/api/tenant.api";

type TenantSwitcherProps = {
  viewTenantId?: string | null;
};

export function TenantSwitcher({ viewTenantId = null }: TenantSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [value, setValue] = useState(viewTenantId ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setValue(viewTenantId ?? "");
  }, [viewTenantId]);

  useEffect(() => {
    let cancelled = false;

    getTenants()
      .then((tenants: Array<{ id: string; nombre: string }>) => {
        if (cancelled) return;
        setOptions([
          { value: "", label: "Sin tenant" },
          ...tenants.map((tenant) => ({
            value: tenant.id,
            label: tenant.nombre,
          })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = useCallback(
    (nextValue: string) => {
      const tenantId = nextValue || null;
      setValue(nextValue);

      startTransition(async () => {
        try {
          await setViewTenant(tenantId);
          router.refresh();
        } catch {
          setValue(viewTenantId ?? "");
        }
      });
    },
    [router, viewTenantId],
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={loading ? "Cargando tenants…" : "Ver como tenant…"}
      disabled={loading || isPending}
      className="w-44 shrink-0 sm:w-52"
      aria-label="Seleccionar tenant para vista"
    />
  );
}
