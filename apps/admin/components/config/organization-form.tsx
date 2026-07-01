"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { updateOrganizationAction } from "@/lib/api/organization-actions";
import type { OrganizationSettings } from "@/lib/api/types/organization";
import type { PropertyEditPolicy, PropertyVisibilityPolicy } from "@/lib/permissions";
import { OrganizationPropertyPermissions } from "@/components/config/organization-property-permissions";

type OrganizationFormProps = {
  organization: OrganizationSettings;
  readOnly?: boolean;
};

function fieldValue(value?: string | null): string {
  return value ?? "";
}

export function OrganizationForm({
  organization,
  readOnly = false,
}: OrganizationFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (readOnly) {
      return;
    }

    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateOrganizationAction({
        companyName: String(form.get("companyName") ?? ""),
        legalName: String(form.get("legalName") ?? ""),
        logoUrl: String(form.get("logoUrl") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        website: String(form.get("website") ?? ""),
        address: String(form.get("address") ?? ""),
        facebookUrl: String(form.get("facebookUrl") ?? ""),
        instagramUrl: String(form.get("instagramUrl") ?? ""),
        linkedinUrl: String(form.get("linkedinUrl") ?? ""),
        primaryColor: String(form.get("primaryColor") ?? ""),
        secondaryColor: String(form.get("secondaryColor") ?? ""),
        shortDescription: String(form.get("shortDescription") ?? ""),
        seoTitle: String(form.get("seoTitle") ?? ""),
        seoDescription: String(form.get("seoDescription") ?? ""),
        propertyVisibilityPolicy: String(
          form.get("propertyVisibilityPolicy") ?? organization.propertyVisibilityPolicy,
        ) as PropertyVisibilityPolicy,
        propertyEditPolicy: String(
          form.get("propertyEditPolicy") ?? organization.propertyEditPolicy,
        ) as PropertyEditPolicy,
      });

      if (result.ok) {
        toast.success("Organización actualizada");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Identidad</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label htmlFor="companyName">Nombre comercial</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={fieldValue(organization.companyName ?? organization.tenantName)}
              disabled={readOnly || isPending}
            />
          </FormField>
          <FormField>
            <Label htmlFor="legalName">Razón social</Label>
            <Input
              id="legalName"
              name="legalName"
              defaultValue={fieldValue(organization.legalName)}
              disabled={readOnly || isPending}
            />
          </FormField>
          <FormField className="md:col-span-2">
            <Label htmlFor="logoUrl">Logo (URL)</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              defaultValue={fieldValue(organization.logoUrl)}
              disabled={readOnly || isPending}
              placeholder="https://..."
            />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Contacto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={fieldValue(organization.email)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" defaultValue={fieldValue(organization.phone)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" defaultValue={fieldValue(organization.whatsapp)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="website">Sitio web</Label>
            <Input id="website" name="website" defaultValue={fieldValue(organization.website)} disabled={readOnly || isPending} />
          </FormField>
          <FormField className="md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" defaultValue={fieldValue(organization.address)} disabled={readOnly || isPending} />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Redes y marca</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input id="facebookUrl" name="facebookUrl" defaultValue={fieldValue(organization.facebookUrl)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input id="instagramUrl" name="instagramUrl" defaultValue={fieldValue(organization.instagramUrl)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <Input id="linkedinUrl" name="linkedinUrl" defaultValue={fieldValue(organization.linkedinUrl)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="primaryColor">Color principal</Label>
            <Input id="primaryColor" name="primaryColor" defaultValue={fieldValue(organization.primaryColor)} disabled={readOnly || isPending} placeholder="#006D5B" />
          </FormField>
          <FormField>
            <Label htmlFor="secondaryColor">Color secundario</Label>
            <Input id="secondaryColor" name="secondaryColor" defaultValue={fieldValue(organization.secondaryColor)} disabled={readOnly || isPending} />
          </FormField>
          <FormField className="md:col-span-2">
            <Label htmlFor="shortDescription">Descripción corta</Label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              defaultValue={fieldValue(organization.shortDescription)}
              disabled={readOnly || isPending}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">SEO básico</h2>
        <div className="grid gap-4">
          <FormField>
            <Label htmlFor="seoTitle">Título SEO</Label>
            <Input id="seoTitle" name="seoTitle" defaultValue={fieldValue(organization.seoTitle)} disabled={readOnly || isPending} />
          </FormField>
          <FormField>
            <Label htmlFor="seoDescription">Descripción SEO</Label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              defaultValue={fieldValue(organization.seoDescription)}
              disabled={readOnly || isPending}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </FormField>
        </div>
      </Card>

      <OrganizationPropertyPermissions
        visibilityPolicy={organization.propertyVisibilityPolicy}
        editPolicy={organization.propertyEditPolicy}
        readOnly={readOnly}
        disabled={isPending}
      />

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
