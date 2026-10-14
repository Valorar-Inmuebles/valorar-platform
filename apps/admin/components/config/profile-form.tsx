"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { UserAvatar, getRoleLabel } from "@/components/user/user-avatar";
import { updateProfileAction } from "@/lib/api/user-actions";
import type { AdminUser } from "@/lib/api/types/user";

export function ProfileForm({ profile }: { profile: AdminUser }) {
  const { toast } = useToast();
  const [isPending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setPending(true);
    try {
      const result = await updateProfileAction({
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        avatarUrl: String(form.get("avatarUrl") ?? "").trim() || undefined,
      });
      if (result.ok) toast.success("Perfil actualizado");
      else toast.error(result.message);
    } catch {
      toast.error("No se pudo guardar el perfil. Intentá nuevamente.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Card className="min-w-0" aria-labelledby="profile-title">
      <CardHeader>
        <CardTitle id="profile-title">Información personal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            seed={profile.id}
            size="lg"
          />
          <div className="min-w-0">
            <p className="break-words font-semibold">{profile.name}</p>
            <p className="break-all text-sm text-muted">{profile.email}</p>
            <p className="text-sm text-muted">{getRoleLabel(profile.role)}</p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="profile-title"
          aria-busy={isPending}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={profile.firstName}
                required
                disabled={isPending}
              />
            </FormField>
            <FormField>
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={profile.lastName}
                required
                disabled={isPending}
              />
            </FormField>
          </div>
          <FormField>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile.phone ?? ""}
              disabled={isPending}
            />
          </FormField>
          <FormField>
            <Label htmlFor="avatarUrl">Avatar (URL)</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              defaultValue={profile.avatarUrl ?? ""}
              disabled={isPending}
              placeholder="https://..."
            />
          </FormField>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
