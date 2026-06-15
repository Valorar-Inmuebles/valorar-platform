"use client";

import { useState } from "react";
import { updateTenant } from "@/lib/api/tenant.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  defaultNombre: string;
  defaultEmail: string;
  defaultTelefono: string;
  defaultLogoUrl: string;
};

export function EditTenantForm({
  id,
  defaultNombre,
  defaultEmail,
  defaultTelefono,
  defaultLogoUrl,
}: Props) {
  const [nombre, setNombre] = useState(defaultNombre);
  const [email, setEmail] = useState(defaultEmail);
  const [telefono, setTelefono] = useState(defaultTelefono);
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      await updateTenant(id, {
        nombre,
        email: email || null,
        telefono: telefono || null,
        logo_url: logoUrl || null,
      });

      // redirección igual que antes
      window.location.href = "/tenants?success=update";

    } catch (err: any) {
      setError(err.message ?? "Error al guardar");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
      <Input
        id="nombre"
        name="nombre"
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="contacto@empresa.com"
        value={email ?? ""}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        id="telefono"
        name="telefono"
        label="Teléfono"
        placeholder="+54 11 0000-0000"
        value={telefono ?? ""}
        onChange={(e) => setTelefono(e.target.value)}
      />

      <Input
        id="logo_url"
        name="logo_url"
        label="Logo URL"
        placeholder="https://ejemplo.com/logo.png"
        value={logoUrl ?? ""}
        onChange={(e) => setLogoUrl(e.target.value)}
      />

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}