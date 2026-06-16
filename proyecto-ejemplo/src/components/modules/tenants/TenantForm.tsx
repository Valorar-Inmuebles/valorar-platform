"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createTenant,
  getTenant,
  getTenantLogoUrl,
  TenantApiError,
  updateTenant,
  uploadTenantLogo,
} from "@/lib/api/tenant.api";
import { prepareProfileImageFile } from "@/lib/client/profile-image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { tenantFormSchema } from "@/lib/validation/schemas/tenant.schema";

const DEFAULT_BASE_PATH = "/configuracion/tenants";

type FormValues = {
  nombre: string;
  email: string;
  telefono: string;
};

const DEFAULT_VALUES: FormValues = {
  nombre: "",
  email: "",
  telefono: "",
};

type Props =
  | { mode: "create"; basePath?: string }
  | { mode: "edit"; id: string; basePath?: string };

export function TenantForm(props: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const editId = isEdit ? props.id : undefined;
  const basePath = props.basePath ?? DEFAULT_BASE_PATH;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [isPending, setIsPending] = useState(false);
  const [loadedValues, setLoadedValues] = useState<FormValues | null>(null);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoError, setLogoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(tenantFormSchema) as never,
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
    values: isEdit ? (loadedValues ?? undefined) : undefined,
  });

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    if (!isEdit || !editId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getTenant(editId!);
        if (cancelled) return;

        setLoadedValues({
          nombre: data.nombre ?? "",
          email: data.email ?? "",
          telefono: data.telefono ?? "",
        });
        setHasExistingLogo(Boolean(data.has_logo));
        setLogoVersion(Date.now());
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Error al cargar tenant";
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast intentionally omitted
  }, [isEdit, editId]);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setLogoError(null);

    if (!file) return;

    try {
      const prepared = await prepareProfileImageFile(file);

      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }

      setPendingLogoFile(prepared);
      setLogoPreviewUrl(URL.createObjectURL(prepared));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo procesar la imagen";
      setLogoError(message);
      setPendingLogoFile(null);
    }
  }

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    setLogoError(null);

    try {
      const payload = tenantFormSchema.parse(data);
      let tenantId = editId;

      if (!isEdit) {
        const created = await createTenant(payload);
        tenantId = created.id as string;
      } else if (tenantId) {
        await updateTenant(tenantId, payload);
      }

      if (pendingLogoFile && tenantId) {
        await uploadTenantLogo(tenantId, pendingLogoFile);
      }

      toast.success(isEdit ? "Tenant actualizado" : "Tenant creado");
      router.replace(basePath);
    } catch (err: unknown) {
      if (err instanceof TenantApiError && err.field === "logo") {
        setLogoError(err.message);
        return;
      }
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  const previewSrc =
    logoPreviewUrl ??
    (isEdit && editId && hasExistingLogo
      ? getTenantLogoUrl(editId, logoVersion)
      : null);

  if (loading || (isEdit && !loadedValues)) {
    return <p className="text-sm text-zinc-400">Cargando…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField>
            <Label htmlFor="nombre" required>
              Nombre
            </Label>
            <Input
              id="nombre"
              {...register("nombre")}
              aria-invalid={Boolean(errors.nombre)}
            />
            {errors.nombre ? (
              <ErrorMessage>{errors.nombre.message}</ErrorMessage>
            ) : (
              <HelperText>Nombre visible del estudio u organización.</HelperText>
            )}
          </FormField>

          <FormField>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <ErrorMessage>{errors.email.message}</ErrorMessage>
            )}
          </FormField>

          <FormField>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              {...register("telefono")}
              aria-invalid={Boolean(errors.telefono)}
            />
            {errors.telefono && (
              <ErrorMessage>{errors.telefono.message}</ErrorMessage>
            )}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="logo" state={logoError ? "error" : "default"}>
            <Label>Imagen</Label>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="Logo del tenant"
                    className="max-h-24 max-w-24 object-contain"
                  />
                ) : (
                  <span className="px-2 text-center text-xs text-zinc-400">
                    Sin logo
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewSrc ? "Cambiar logo" : "Subir logo"}
                </Button>
                <HelperText>
                  JPEG, PNG o WebP. Máximo 1 MB. Se guarda como logo.jpg.
                </HelperText>
              </div>
            </div>
            {logoError && <ErrorMessage>{logoError}</ErrorMessage>}
          </FormField>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando…" : isEdit ? "Guardar" : "Crear tenant"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => router.push(basePath)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
