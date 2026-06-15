"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createPersona, getPersona, updatePersona, PersonaApiError } from "@/lib/api/personas";
import { Input } from "@/components/ui/input";
import { DniInput } from "@/components/ui/dni-input";
import { CuitInput } from "@/components/ui/cuit-input";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
import {
  createPersonaSchema,
  updatePersonaSchema,
  TIPOS,
  TIPO_LABELS,
  SEXOS,
  SEXO_LABELS,
  type CreatePersonaInput,
} from "@/lib/validation/schemas/persona.schema";
import { ContactosCard, type LocalContacto } from "./ContactosCard";
import { DomiciliosCard, type LocalDomicilio } from "./DomiciliosCard";

const TIPO_OPTIONS = TIPOS.map((t) => ({ value: t, label: TIPO_LABELS[t] }));
const SEXO_OPTIONS = SEXOS.map((s) => ({ value: s, label: SEXO_LABELS[s] }));


type FormValues = {
  tipo: string;
  nombre: string;
  apellido: string;
  documento: string;
  cuil: string;
  cuit: string;
  sexo: string;
  fecha_nacimiento: string;
};

const DEFAULT_VALUES: FormValues = {
  tipo: "humana",
  nombre: "",
  apellido: "",
  documento: "",
  cuil: "",
  cuit: "",
  sexo: "",
  fecha_nacimiento: "",
};

type PersonaSubmitPayload = {
  tipo: string;
  nombre: string;
  apellido?: string | null;
  documento?: string | null;
  cuil?: string | null;
  cuit?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  contactos?: LocalContacto[];
  domicilios?: LocalDomicilio[];
};

type PersonaFormExtras = {
  onSuccess?: () => void;
  /** Overrides the default createPersona / updatePersona API call. */
  submitAction?: (payload: PersonaSubmitPayload) => Promise<unknown>;
  /** Href for the "Volver" button. Defaults to "/personas". */
  backHref?: string;
  /** When set, "Volver" calls this instead of navigating. */
  onCancel?: () => void;
  /** Cancel/back button label. Defaults to "Volver". */
  cancelLabel?: string;
  /** Submit button label. Defaults to "Crear persona" / "Guardar cambios". */
  submitLabel?: string;
  /** Toast message on success. Defaults to "Persona creada" / "Persona actualizada". */
  successMessage?: string;
  /** Contenido opcional debajo de la sección Domicilios (p. ej. comentarios del cliente). */
  afterDomicilios?: ReactNode;
};

type Props =
  | ({ mode: "create" } & PersonaFormExtras)
  | ({ mode: "edit"; id: string } & PersonaFormExtras)
  | ({ mode: "view"; id: string } & PersonaFormExtras);

export function PersonaForm(props: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const isView = props.mode === "view";
  const isEdit = props.mode === "edit";
  const loadsExisting = isEdit || isView;
  const readOnly = isView;

  const [loading, setLoading] = useState(loadsExisting);
  const [isPending, setIsPending] = useState(false);
  const [localContactos, setLocalContactos] = useState<LocalContacto[]>([]);
  const [localDomicilios, setLocalDomicilios] = useState<LocalDomicilio[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? updatePersonaSchema : createPersonaSchema) as any,
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const tipo = watch("tipo");
  const isHumana = tipo === "humana";
  const isJuridica = tipo === "juridica";

  // Clear fields that become irrelevant when tipo changes
  function handleTipoChange(value: string) {
    setValue("tipo", value, { shouldValidate: false });
    if (value === "juridica") {
      setValue("apellido", "", { shouldValidate: false });
      setValue("documento", "", { shouldValidate: false });
      setValue("cuil", "", { shouldValidate: false });
      setValue("sexo", "", { shouldValidate: false });
      setValue("fecha_nacimiento", "", { shouldValidate: false });
    } else {
      setValue("cuit", "", { shouldValidate: false });
    }
  }

  // Edit / view: fetch existing data and populate the form
  useEffect(() => {
    if (!loadsExisting) return;

    const id = (props as { mode: "edit" | "view"; id: string }).id;
    setLoading(true);

    async function load() {
      try {
        const data = await getPersona(id);
        reset({
          tipo: data?.tipo ?? "humana",
          nombre: data?.nombre ?? "",
          apellido: data?.apellido ?? "",
          documento: data?.documento ?? "",
          cuil: data?.cuil ?? "",
          cuit: data?.cuit ?? "",
          sexo: data?.sexo ?? "",
          fecha_nacimiento: data?.fecha_nacimiento ?? "",
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al cargar persona");
      } finally {
        setLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadsExisting]);

  async function onSubmit(data: CreatePersonaInput) {
    if (readOnly) return;

    setIsPending(true);

    const back = props.backHref ?? "/personas";

    try {
      const isHumanaSubmit = data.tipo === "humana";

      const payload: PersonaSubmitPayload = {
        tipo: data.tipo,
        nombre: data.nombre!,
        apellido: isHumanaSubmit ? (data.apellido ?? null) : null,
        documento: isHumanaSubmit ? (data.documento ?? null) : null,
        cuil: isHumanaSubmit ? (data.cuil ?? null) : null,
        cuit: !isHumanaSubmit ? (data.cuit ?? null) : null,
        sexo: isHumanaSubmit ? (data.sexo ?? null) : null,
        fecha_nacimiento: isHumanaSubmit ? (data.fecha_nacimiento ?? null) : null,
      };

      if (!isEdit) {
        const fullPayload = { ...payload, contactos: localContactos, domicilios: localDomicilios };

        if (props.submitAction) {
          await props.submitAction(fullPayload);
        } else {
          await createPersona(fullPayload);
        }

        toast.success(props.successMessage ?? "Persona creada");

        if (props.onSuccess) {
          props.onSuccess();
          return;
        }

        router.replace(back);
        return;
      }

      const id = (props as { mode: "edit"; id: string }).id;

      if (props.submitAction) {
        await props.submitAction(payload);
      } else {
        await updatePersona(id, payload);
      }

      toast.success(props.successMessage ?? "Persona actualizada");

      if (props.onSuccess) {
        props.onSuccess();
        return;
      }

      router.replace(back);
    } catch (err: unknown) {
      if (err instanceof PersonaApiError) {
        setError(err.field as keyof FormValues, { message: err.message });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsPending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">

      {/* ── Información ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {isJuridica ? "Información de la empresa" : "Información personal"}
            </CardTitle>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isJuridica
                ? "Nombre tal como figura en el registro comercial."
                : "Nombre y apellido tal como figuran en documentos oficiales."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">

          {/* Row 1: tipo siempre visible */}
          <FormField id="tipo" state={errors.tipo ? "error" : "default"}>
            <Label required>Tipo</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select
                  options={TIPO_OPTIONS}
                  value={field.value as string}
                  onChange={(v) => handleTipoChange(v as string)}
                  state={errors.tipo ? "error" : "default"}
                  disabled={readOnly}
                />
              )}
            />
            {errors.tipo && (
              <ErrorMessage>{errors.tipo.message}</ErrorMessage>
            )}
          </FormField>

          {/* Row 1, col 2: sexo (humana) | nombre (jurídica) */}
          {isHumana && (
            <FormField id="sexo" state={errors.sexo ? "error" : "default"}>
              <Label>Sexo</Label>
              <Controller
                name="sexo"
                control={control}
                render={({ field }) => (
                  <Select
                    options={SEXO_OPTIONS}
                    value={field.value as string}
                    onChange={field.onChange}
                    placeholder="Seleccionar…"
                    state={errors.sexo ? "error" : "default"}
                    disabled={readOnly}
                  />
                )}
              />
              {errors.sexo && (
                <ErrorMessage>{errors.sexo.message}</ErrorMessage>
              )}
            </FormField>
          )}

          {isJuridica && (
            <FormField id="nombre" state={errors.nombre ? "error" : "default"}>
              <Label required>Nombre</Label>
              <Input
                {...register("nombre")}
                placeholder="Razón social"
                disabled={readOnly}
              />
              {errors.nombre ? (
                <ErrorMessage>{errors.nombre.message}</ErrorMessage>
              ) : (
                <HelperText>Solo letras y caracteres válidos.</HelperText>
              )}
            </FormField>
          )}

          {/* Row 2 (humana): apellido + nombre en la misma fila */}
          {isHumana && (
            <>
              <FormField id="apellido" state={errors.apellido ? "error" : "default"}>
                <Label required>Apellido</Label>
                <Input
                  {...register("apellido")}
                  placeholder="García"
                  disabled={readOnly}
                />
                {errors.apellido ? (
                  <ErrorMessage>{errors.apellido.message}</ErrorMessage>
                ) : (
                  <HelperText>Solo letras y caracteres válidos.</HelperText>
                )}
              </FormField>

              <FormField id="nombre" state={errors.nombre ? "error" : "default"}>
                <Label required>Nombre</Label>
                <Input
                  {...register("nombre")}
                  placeholder="José"
                  disabled={readOnly}
                />
                {errors.nombre ? (
                  <ErrorMessage>{errors.nombre.message}</ErrorMessage>
                ) : (
                  <HelperText>Solo letras y caracteres válidos.</HelperText>
                )}
              </FormField>

              {/* Row 3 (humana): fecha de nacimiento */}
              <FormField id="fecha_nacimiento" state={errors.fecha_nacimiento ? "error" : "default"}>
                <Label>Fecha de nacimiento</Label>
                <Controller
                  name="fecha_nacimiento"
                  control={control}
                  render={({ field, fieldState }) => (
                    <DateInputPicker
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v ?? "")}
                      onBlur={field.onBlur}
                      state={fieldState.error ? "error" : "default"}
                      disabled={readOnly}
                    />
                  )}
                />
                {errors.fecha_nacimiento ? (
                  <ErrorMessage>{errors.fecha_nacimiento.message}</ErrorMessage>
                ) : (
                  <HelperText>Escribí o elegí desde el calendario.</HelperText>
                )}
              </FormField>
            </>
          )}

        </CardContent>
      </Card>

      {/* ── Documentación ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Documentación</CardTitle>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isJuridica
                ? "CUIT de la persona jurídica."
                : "Identificación fiscal y tributaria de la persona física."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">

          {isHumana && (
            <>
              <FormField id="documento" state={errors.documento ? "error" : "default"}>
                <Label required>DNI</Label>
                <Controller
                  name="documento"
                  control={control}
                  render={({ field, fieldState }) => (
                    <DniInput
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v ?? "")}
                      onBlur={field.onBlur}
                      state={fieldState.error ? "error" : "default"}
                      disabled={readOnly}
                    />
                  )}
                />
                {errors.documento ? (
                  <ErrorMessage>{errors.documento.message}</ErrorMessage>
                ) : (
                  <HelperText>Sin puntos. Ejemplo: 12.345.678</HelperText>
                )}
              </FormField>

              <FormField id="cuil" state={errors.cuil ? "error" : "default"}>
                <Label>CUIL</Label>
                <Controller
                  name="cuil"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CuitInput
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v ?? "")}
                      onBlur={field.onBlur}
                      state={fieldState.error ? "error" : "default"}
                      disabled={readOnly}
                    />
                  )}
                />
                {errors.cuil ? (
                  <ErrorMessage>{errors.cuil.message}</ErrorMessage>
                ) : (
                  <HelperText>Con guiones automáticos. Ej: 20-12345678-0</HelperText>
                )}
              </FormField>
            </>
          )}

          {isJuridica && (
            <FormField id="cuit" state={errors.cuit ? "error" : "default"}>
              <Label required>CUIT</Label>
              <Controller
                name="cuit"
                control={control}
                render={({ field, fieldState }) => (
                  <CuitInput
                    value={field.value || undefined}
                    onChange={(v) => field.onChange(v ?? "")}
                    onBlur={field.onBlur}
                    state={fieldState.error ? "error" : "default"}
                    disabled={readOnly}
                  />
                )}
              />
              {errors.cuit ? (
                <ErrorMessage>{errors.cuit.message}</ErrorMessage>
              ) : (
                <HelperText>Con guiones automáticos. Ej: 30-12345678-9</HelperText>
              )}
            </FormField>
          )}

        </CardContent>
      </Card>

      {/* ── Contactos ────────────────────────────────────────────────────── */}
      {loadsExisting ? (
        <ContactosCard
          mode="edit"
          personaId={(props as { mode: "edit" | "view"; id: string }).id}
          readOnly={readOnly}
        />
      ) : (
        <ContactosCard
          mode="create"
          contactos={localContactos}
          onChange={setLocalContactos}
        />
      )}

      {/* ── Domicilios ───────────────────────────────────────────────────── */}
      {loadsExisting ? (
        <DomiciliosCard
          mode="edit"
          personaId={(props as { mode: "edit" | "view"; id: string }).id}
          readOnly={readOnly}
        />
      ) : (
        <DomiciliosCard
          mode="create"
          domicilios={localDomicilios}
          onChange={setLocalDomicilios}
        />
      )}

      {props.afterDomicilios}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="mt-8 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (props.onCancel) {
                props.onCancel();
                return;
              }
              router.push(props.backHref ?? "/personas");
            }}
          >
            {props.cancelLabel ?? "Volver"}
          </Button>

          <Button type="submit" loading={isPending}>
            {props.submitLabel ?? (isEdit ? "Guardar cambios" : "Crear persona")}
          </Button>
        </div>
      )}

    </form>
  );
}
