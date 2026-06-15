"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createCampoDinamico,
  getCampoDinamico,
  updateCampoDinamico,
  CampoDinamicoApiError,
} from "@/lib/api/campos-dinamicos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
import {
  createCampoDinamicoSchema,
  updateCampoDinamicoSchema,
  CAMPO_DINAMICO_TIPOS,
  CAMPO_DINAMICO_TIPO_LABELS,
  ANCHO_GRILLA_VALUES,
  ANCHO_GRILLA_LABELS,
  isCampoDinamicoOptionTipo,
  type CreateCampoDinamicoInput,
} from "@/lib/validation/schemas/campo-dinamico.schema";
import { CampoOpcionesEditor } from "./campo-opciones-editor";
import { slugifyEtiqueta } from "./slugify-etiqueta";

const CASO_CONTEXTO = "caso";
const BASE_PATH = "/configuracion/campos";

const TIPO_OPTIONS = CAMPO_DINAMICO_TIPOS.map((t) => ({
  value: t,
  label: CAMPO_DINAMICO_TIPO_LABELS[t],
}));

const ANCHO_GRILLA_OPTIONS = ANCHO_GRILLA_VALUES.map((v) => ({
  value: String(v),
  label: ANCHO_GRILLA_LABELS[v],
}));

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

const DEFAULT_VALUES: CreateCampoDinamicoInput = {
  etiqueta: "",
  clave: "",
  tipo: "text",
  contexto: CASO_CONTEXTO,
  placeholder: "",
  ayuda: "",
  valor_default: "",
  ancho_grilla: 12,
  requerido: false,
  buscable: false,
  filtrable: false,
  visible_tabla: false,
  activo: true,
  opciones: [],
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; id: string };

type SwitchFieldProps = {
  name: "requerido" | "buscable" | "filtrable" | "visible_tabla" | "activo";
  label: string;
  helper?: string;
  control: ReturnType<typeof useForm<CreateCampoDinamicoInput>>["control"];
};

function SwitchField({ name, label, helper, control }: SwitchFieldProps) {
  return (
    <FormField id={name}>
      <div className="flex items-center gap-2">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
        <Label className="mb-0">{label}</Label>
      </div>
      {helper && <HelperText>{helper}</HelperText>}
    </FormField>
  );
}

export function CampoForm(props: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [loading, setLoading] = useState(isEdit);
  const [isPending, setIsPending] = useState(false);
  const claveTouchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<
    CreateCampoDinamicoInput,
    unknown,
    CreateCampoDinamicoInput
  >({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(
      isEdit ? updateCampoDinamicoSchema : createCampoDinamicoSchema,
    ) as any,
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const tipo = watch("tipo");
  const etiqueta = watch("etiqueta");
  const showOpciones = isCampoDinamicoOptionTipo(tipo);

  useEffect(() => {
    if (claveTouchedRef.current) return;
    const next = slugifyEtiqueta(etiqueta ?? "");
    if (next) {
      setValue("clave", next, { shouldValidate: false });
    }
  }, [etiqueta, setValue]);

  function handleTipoChange(value: string) {
    setValue("tipo", value as CreateCampoDinamicoInput["tipo"], {
      shouldValidate: true,
    });
    if (isCampoDinamicoOptionTipo(value)) {
      const current = getValues("opciones");
      if (!current?.length) {
        setValue(
          "opciones",
          [{ etiqueta: "", valor: "", orden: 0, activo: true }],
          { shouldValidate: false },
        );
      }
    } else {
      setValue("opciones", [], { shouldValidate: false });
    }
  }

  useEffect(() => {
    if (!isEdit) return;

    const id = props.id;
    setLoading(true);

    async function load() {
      try {
        const data = await getCampoDinamico(id);
        claveTouchedRef.current = true;
        reset({
          etiqueta: data.etiqueta,
          clave: data.clave,
          tipo: data.tipo as CreateCampoDinamicoInput["tipo"],
          contexto: data.contexto,
          placeholder: data.placeholder ?? "",
          ayuda: data.ayuda ?? "",
          valor_default: data.valor_default ?? "",
          ancho_grilla: data.ancho_grilla,
          requerido: data.requerido,
          minimo: data.minimo ?? undefined,
          maximo: data.maximo ?? undefined,
          longitud_maxima: data.longitud_maxima ?? undefined,
          regex: data.regex ?? "",
          buscable: data.buscable,
          filtrable: data.filtrable,
          visible_tabla: data.visible_tabla,
          activo: data.activo,
          opciones: data.opciones.map((o) => ({
            id: o.id,
            etiqueta: o.etiqueta,
            valor: o.valor,
            orden: o.orden,
            activo: o.activo,
          })),
        });
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al cargar el campo",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, props.mode === "edit" ? props.id : null]);

  async function onSubmit(data: CreateCampoDinamicoInput) {
    setIsPending(true);

    const payload: CreateCampoDinamicoInput = {
      ...data,
      contexto: CASO_CONTEXTO,
      placeholder: data.placeholder?.trim() || undefined,
      ayuda: data.ayuda?.trim() || undefined,
      valor_default: data.valor_default?.trim() || undefined,
      regex: data.regex?.trim() || undefined,
      opciones: showOpciones ? data.opciones : undefined,
    };

    try {
      if (!isEdit) {
        const { id } = await createCampoDinamico(payload);
        toast.success("Campo creado");
        router.replace(`${BASE_PATH}/${id}`);
        return;
      }

      await updateCampoDinamico(props.id, payload);
      toast.success("Campo actualizado");
      router.replace(BASE_PATH);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof CampoDinamicoApiError) {
        setError(err.field as keyof CreateCampoDinamicoInput, {
          message: err.message,
        });
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 1. Identidad */}
      <Card>
        <CardHeader>
          <CardTitle>Identidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">
          <FormField
            id="etiqueta"
            state={errors.etiqueta ? "error" : "default"}
          >
            <Label required>Etiqueta</Label>
            <Input {...register("etiqueta")} placeholder="Ej. Monto reclamado" />
            {errors.etiqueta ? (
              <ErrorMessage>{errors.etiqueta.message}</ErrorMessage>
            ) : (
              <HelperText>Nombre visible del campo en formularios.</HelperText>
            )}
          </FormField>

          <FormField id="clave" state={errors.clave ? "error" : "default"}>
            <Label required>Clave</Label>
            <Input
              {...register("clave", {
                onChange: () => {
                  claveTouchedRef.current = true;
                },
              })}
              className="font-mono"
              placeholder="monto_reclamado"
            />
            {errors.clave ? (
              <ErrorMessage>{errors.clave.message}</ErrorMessage>
            ) : (
              <HelperText>
                Identificador técnico. Se genera desde la etiqueta y podés
                editarla.
              </HelperText>
            )}
          </FormField>

          <FormField id="tipo" state={errors.tipo ? "error" : "default"}>
            <Label required>Tipo</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select
                  options={TIPO_OPTIONS}
                  value={field.value}
                  onChange={(v) => handleTipoChange(v as string)}
                  state={errors.tipo ? "error" : "default"}
                />
              )}
            />
            {errors.tipo && (
              <ErrorMessage>{errors.tipo.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="contexto">
            <Label>Contexto</Label>
            <Input value={CASO_CONTEXTO} disabled readOnly className="font-mono" />
            <HelperText>Contexto fijo en esta versión.</HelperText>
          </FormField>
        </CardContent>
      </Card>

      {/* 2. Presentación */}
      <Card>
        <CardHeader>
          <CardTitle>Presentación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">
          <FormField
            id="placeholder"
            state={errors.placeholder ? "error" : "default"}
          >
            <Label>Placeholder</Label>
            <Input {...register("placeholder")} placeholder="Texto de ayuda…" />
            {errors.placeholder && (
              <ErrorMessage>{errors.placeholder.message}</ErrorMessage>
            )}
          </FormField>

          <FormField
            id="valor_default"
            state={errors.valor_default ? "error" : "default"}
          >
            <Label>Valor por defecto</Label>
            <Input {...register("valor_default")} />
            {errors.valor_default && (
              <ErrorMessage>{errors.valor_default.message}</ErrorMessage>
            )}
          </FormField>

          <FormField
            id="ancho_grilla"
            state={errors.ancho_grilla ? "error" : "default"}
          >
            <Label>Ancho en formulario</Label>
            <Controller
              name="ancho_grilla"
              control={control}
              render={({ field }) => (
                <Select
                  options={ANCHO_GRILLA_OPTIONS}
                  value={String(field.value)}
                  onChange={(v) => field.onChange(Number(v))}
                  state={errors.ancho_grilla ? "error" : "default"}
                />
              )}
            />
            {errors.ancho_grilla ? (
              <ErrorMessage>{errors.ancho_grilla.message}</ErrorMessage>
            ) : (
              <HelperText>
                Columnas semánticas sobre una grilla de 12 (no clases CSS).
              </HelperText>
            )}
          </FormField>

          <FormField
            id="ayuda"
            state={errors.ayuda ? "error" : "default"}
            className="col-span-2"
          >
            <Label>Texto de ayuda</Label>
            <textarea
              className={textareaClassName}
              {...register("ayuda")}
              rows={3}
              placeholder="Instrucciones para quien completa el campo…"
            />
            {errors.ayuda && (
              <ErrorMessage>{errors.ayuda.message}</ErrorMessage>
            )}
          </FormField>
        </CardContent>
      </Card>

      {/* 3. Validaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Validaciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">
          <SwitchField
            name="requerido"
            label="Requerido por defecto"
            helper="Recomendación del catálogo. La plantilla puede sobreescribirlo."
            control={control}
          />

          <div className="hidden sm:block" />

          <FormField id="minimo" state={errors.minimo ? "error" : "default"}>
            <Label>Mínimo</Label>
            <Input type="number" step="any" {...register("minimo")} />
            {errors.minimo && (
              <ErrorMessage>{errors.minimo.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="maximo" state={errors.maximo ? "error" : "default"}>
            <Label>Máximo</Label>
            <Input type="number" step="any" {...register("maximo")} />
            {errors.maximo && (
              <ErrorMessage>{errors.maximo.message}</ErrorMessage>
            )}
          </FormField>

          <FormField
            id="longitud_maxima"
            state={errors.longitud_maxima ? "error" : "default"}
          >
            <Label>Longitud máxima</Label>
            <Input type="number" min={1} {...register("longitud_maxima")} />
            {errors.longitud_maxima && (
              <ErrorMessage>{errors.longitud_maxima.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="regex" state={errors.regex ? "error" : "default"}>
            <Label>Validación avanzada</Label>
            <Input
              {...register("regex")}
              className="font-mono text-sm"
              placeholder="Patrón opcional"
            />
            {errors.regex ? (
              <ErrorMessage>{errors.regex.message}</ErrorMessage>
            ) : (
              <HelperText>Patrón de validación opcional.</HelperText>
            )}
          </FormField>
        </CardContent>
      </Card>

      {/* 4. Comportamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Comportamiento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">
          <SwitchField
            name="buscable"
            label="Incluir en búsquedas"
            helper="Disponible para futuros motores de búsqueda."
            control={control}
          />
          <SwitchField
            name="filtrable"
            label="Permitir filtros"
            helper="Disponible para futuros filtros dinámicos."
            control={control}
          />
          <SwitchField
            name="visible_tabla"
            label="Mostrar en tablas"
            helper="Disponible para columnas dinámicas en listados."
            control={control}
          />
          <SwitchField
            name="activo"
            label="Campo activo"
            helper="Los campos inactivos no aparecen al armar plantillas."
            control={control}
          />
        </CardContent>
      </Card>

      {/* 5. Opciones */}
      {showOpciones && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Opciones</CardTitle>
              <p className="mt-0.5 text-sm text-zinc-500">
                Valores disponibles para selección.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <CampoOpcionesEditor
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              getValues={getValues}
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(BASE_PATH)}
        >
          Volver
        </Button>
        <Button type="submit" loading={isPending}>
          {isEdit ? "Guardar cambios" : "Crear campo"}
        </Button>
      </div>
    </form>
  );
}
