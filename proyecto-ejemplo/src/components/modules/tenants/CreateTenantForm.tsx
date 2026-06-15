"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/lib/api/tenant.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CreateTenantForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      await createTenant({
        nombre,
        email: email || null,
        telefono: telefono || null,
        logo_url: logoUrl || null,
      });

      toast.success("Tenant creado");

      router.push("/tenants?success=create");

    } catch (err: any) {
      toast.error(err.message ?? "Error al crear");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      />

      <Input
        label="Logo URL"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
      />

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Guardando…" : "Crear"}
      </Button>
    </form>
  );
}