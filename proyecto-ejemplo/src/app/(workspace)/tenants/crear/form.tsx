"use client";

import { useActionState } from "react";
import { createTenant, type ActionState } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateTenantForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createTenant,
    null,
  );

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      <Input
        id="nombre"
        name="nombre"
        label="Nombre"
        placeholder="Nombre del tenant"
        required
      />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="contacto@empresa.com"
      />
      <Input
        id="telefono"
        name="telefono"
        label="Teléfono"
        placeholder="+54 11 0000-0000"
      />
      <Input
        id="logo_url"
        name="logo_url"
        label="Logo URL"
        placeholder="https://ejemplo.com/logo.png"
      />
      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
