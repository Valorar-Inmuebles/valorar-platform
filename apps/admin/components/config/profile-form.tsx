"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { UserAvatar, getRoleLabel } from "@/components/user/user-avatar";
import { updateProfileAction } from "@/lib/api/user-actions";
import type { AdminUser } from "@/lib/api/types/user";

type ProfileFormProps = {
  profile: AdminUser;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProfileAction({
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        avatarUrl: String(form.get("avatarUrl") ?? "").trim() || undefined,
        password: String(form.get("password") ?? "") || undefined,
      });

      if (result.ok) {
        toast.success("Perfil actualizado");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4 p-6">
        <UserAvatar name={profile.name} avatarUrl={profile.avatarUrl} seed={profile.id} size="lg" />
        <div>
          <p className="text-lg font-semibold">{profile.name}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          <p className="text-sm text-muted">{getRoleLabel(profile.role)}</p>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" name="firstName" defaultValue={profile.firstName} required disabled={isPending} />
            </FormField>
            <FormField>
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" name="lastName" defaultValue={profile.lastName} required disabled={isPending} />
            </FormField>
          </div>
          <FormField>
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} disabled={isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="avatarUrl">Avatar (URL)</Label>
            <Input id="avatarUrl" name="avatarUrl" defaultValue={profile.avatarUrl ?? ""} disabled={isPending} placeholder="https://..." />
          </FormField>
          <FormField>
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input id="password" name="password" type="password" minLength={8} disabled={isPending} />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
