"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createUsuario,
  getUsuario,
  getUsuarioFotoUrl,
  getUsuarioRoles,
  getUsuarioTenants,
  updateUsuario,
  uploadUsuarioFoto,
  UsuarioApiError,
  type RolOption,
  type TenantOption,
} from "@/lib/api/usuarios";
import { prepareProfileImageFile } from "@/lib/client/profile-image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Select } from "@/components/ui/select";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  type CreateUsuarioOutput,
  type UpdateUsuarioOutput,
} from "@/lib/validation/schemas/usuario.schema";

const BASE_PATH = "/configuracion/usuarios";

type FormValues = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol_ids: string[];
  activo: boolean;
  tenant_id: string;
};

const DEFAULT_VALUES: FormValues = {
  email: "",
  password: "",
  nombre: "",
  apellido: "",
  rol_ids: [],
  activo: true,
  tenant_id: "",
};

type Props =
  | { mode: "create"; isSuperUsuario?: boolean }
  | { mode: "edit"; id: string; isSuperUsuario?: boolean };

export function UsuarioForm(props: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const isSuperUsuario = Boolean(props.isSuperUsuario);
  const editId = isEdit ? props.id : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [isPending, setIsPending] = useState(false);
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadedValues, setLoadedValues] = useState<FormValues | null>(null);
  const [hasExistingFoto, setHasExistingFoto] = useState(false);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [pendingFotoFile, setPendingFotoFile] = useState<File | null>(null);
  const [fotoVersion, setFotoVersion] = useState(0);
  const [fotoError, setFotoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isEdit ? updateUsuarioSchema : createUsuarioSchema,
    ) as never,
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
    values: isEdit ? (loadedValues ?? undefined) : undefined,
  });

  useEffect(() => {
    return () => {
      if (fotoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(fotoPreviewUrl);
      }
    };
  }, [fotoPreviewUrl]);

  useEffect(() => {
    if (isEdit) return;

    async function loadCreate() {
      try {
        const [rolesData, tenantsData] = await Promise.all([
          getUsuarioRoles(),
          isSuperUsuario ? getUsuarioTenants() : Promise.resolve([]),
        ]);
        setRoles(rolesData);
        setTenants(tenantsData);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al cargar el formulario",
        );
      }
    }

    loadCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast intentionally omitted
  }, [isEdit, isSuperUsuario]);

  useEffect(() => {
    if (!isEdit || !editId) return;

    let cancelled = false;

    async function loadEdit() {
      setLoading(true);
      try {
        const [rolesData, tenantsData, data] = await Promise.all([
          getUsuarioRoles(),
          isSuperUsuario
            ? getUsuarioTenants({ includeSuper: true })
            : Promise.resolve([]),
          getUsuario(editId!),
        ]);
        if (cancelled) return;

        setRoles(rolesData);
        setTenants(tenantsData);
        setLoadedValues({
          email: data.email,
          password: "",
          nombre: data.nombre,
          apellido: data.apellido,
          rol_ids: data.rol_ids,
          activo: data.activo,
          tenant_id: data.tenant_id ?? "",
        });
        setHasExistingFoto(Boolean(data.has_foto));
        setFotoVersion(Date.now());
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Error al cargar el formulario",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEdit();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast intentionally omitted
  }, [isEdit, editId, isSuperUsuario]);

  function toggleRol(rolId: string, checked: boolean) {
    const current = getValues("rol_ids");
    const next = checked
      ? [...current, rolId]
      : current.filter((id) => id !== rolId);
    setValue("rol_ids", next, { shouldValidate: true });
  }

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setFotoError(null);

    if (!file) return;

    try {
      const prepared = await prepareProfileImageFile(file);

      if (fotoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(fotoPreviewUrl);
      }

      setPendingFotoFile(prepared);
      setFotoPreviewUrl(URL.createObjectURL(prepared));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo procesar la imagen";
      setFotoError(message);
      setPendingFotoFile(null);
    }
  }

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    setFotoError(null);

    try {
      let usuarioId = editId;

      if (!isEdit) {
        const payload: CreateUsuarioOutput = {
          ...(data as CreateUsuarioOutput),
          ...(isSuperUsuario && data.tenant_id
            ? { tenant_id: data.tenant_id }
            : {}),
        };
        const created = await createUsuario(payload);
        usuarioId = created.id as string;
      } else if (usuarioId) {
        const payload: UpdateUsuarioOutput = {
          email: data.email,
          nombre: data.nombre,
          apellido: data.apellido,
          rol_ids: data.rol_ids,
          activo: data.activo,
          ...((data.password && data.password.trim())
            ? { password: data.password }
            : {}),
          ...(isSuperUsuario ? { tenant_id: data.tenant_id } : {}),
        };

        await updateUsuario(usuarioId, payload);
      }

      if (pendingFotoFile && usuarioId) {
        await uploadUsuarioFoto(usuarioId, pendingFotoFile);
      }

      toast.success(isEdit ? "Usuario actualizado" : "Usuario creado");
      router.replace(BASE_PATH);
    } catch (err: unknown) {
      if (err instanceof UsuarioApiError) {
        if (err.field === "foto") {
          setFotoError(err.message);
          return;
        }
        setError(err.field as keyof FormValues, { message: err.message });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsPending(false);
    }
  }

  const fotoPreviewSrc =
    fotoPreviewUrl ??
    (isEdit && editId && hasExistingFoto
      ? getUsuarioFotoUrl(editId, fotoVersion)
      : null);

  if (loading || (isEdit && !loadedValues)) {
    return (
      <p className="text-sm text-zinc-500">Cargando formulario…</p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="email" state={errors.email ? "error" : "default"}>
            <Label required>Email</Label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  type="email"
                  autoComplete="username"
                  {...field}
                />
              )}
            />
            {errors.email ? (
              <ErrorMessage>{errors.email.message}</ErrorMessage>
            ) : (
              <HelperText>Email de inicio de sesión.</HelperText>
            )}
          </FormField>

          <FormField id="password" state={errors.password ? "error" : "default"}>
            <Label required={!isEdit}>
              {isEdit ? "Nueva contraseña" : "Contraseña"}
            </Label>
            <Input
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <ErrorMessage>{errors.password.message}</ErrorMessage>
            ) : (
              <HelperText>
                {isEdit
                  ? "Dejá vacío para mantener la contraseña actual."
                  : "Mínimo 8 caracteres."}
              </HelperText>
            )}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="nombre" state={errors.nombre ? "error" : "default"}>
            <Label required>Nombre</Label>
            <Input {...register("nombre")} />
            {errors.nombre && (
              <ErrorMessage>{errors.nombre.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="apellido" state={errors.apellido ? "error" : "default"}>
            <Label required>Apellido</Label>
            <Input {...register("apellido")} />
            {errors.apellido && (
              <ErrorMessage>{errors.apellido.message}</ErrorMessage>
            )}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Foto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="foto" state={fotoError ? "error" : "default"}>
            <Label>Imagen de perfil</Label>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
                {fotoPreviewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoPreviewSrc}
                    alt="Foto del usuario"
                    className="size-24 object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-xs text-zinc-400">
                    Sin foto
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fotoPreviewSrc ? "Cambiar foto" : "Subir foto"}
                </Button>
                <HelperText>
                  JPEG, PNG o WebP. Máximo 1 MB. Se guarda como JPG.
                </HelperText>
              </div>
            </div>
            {fotoError && <ErrorMessage>{fotoError}</ErrorMessage>}
          </FormField>
        </CardContent>
      </Card>

      {isSuperUsuario && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              id="tenant_id"
              state={errors.tenant_id ? "error" : "default"}
            >
              <Label required>Tenant</Label>
              <Controller
                name="tenant_id"
                control={control}
                render={({ field }) => (
                  <Select
                    options={tenants.map((tenant) => ({
                      value: tenant.id,
                      label: tenant.nombre,
                    }))}
                    value={field.value || undefined}
                    onChange={field.onChange}
                    placeholder="Seleccioná un tenant…"
                  />
                )}
              />
              {errors.tenant_id ? (
                <ErrorMessage>{errors.tenant_id.message}</ErrorMessage>
              ) : (
                <HelperText>
                  {isEdit
                    ? "Tenant al que pertenece el usuario."
                    : "El usuario se creará en el tenant seleccionado."}
                </HelperText>
              )}
            </FormField>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay roles configurados.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {roles.map((rol) => (
                <Controller
                  key={rol.id}
                  name="rol_ids"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      label={rol.nombre}
                      checked={field.value.includes(rol.id)}
                      onChange={(e) => toggleRol(rol.id, e.target.checked)}
                    />
                  )}
                />
              ))}
            </div>
          )}
          {errors.rol_ids && (
            <ErrorMessage className="mt-2">{errors.rol_ids.message}</ErrorMessage>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField id="activo">
            <div className="flex items-center gap-2">
              <Controller
                name="activo"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Label>Usuario activo</Label>
            </div>
            <HelperText>
              Los usuarios inactivos no pueden iniciar sesión.
            </HelperText>
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(BASE_PATH)}
        >
          Volver
        </Button>
        <Button type="submit" loading={isPending}>
          {isEdit ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
