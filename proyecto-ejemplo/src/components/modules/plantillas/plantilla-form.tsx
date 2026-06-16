"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  createPlantillaAdmin,
  getPlantillaAdmin,
  updatePlantillaAdmin,
} from "@/lib/api/plantillas-admin";
import { getPracticas } from "@/lib/api/practicas";
import { getFueros } from "@/lib/api/fueros";
import { getObjetosByFuero } from "@/lib/api/objetos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
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
  createPlantillaAdminCasoSchema,
  createPlantillaAdminExpedienteSchema,
  PLANTILLA_CONTEXTO_OPTIONS,
  type CreatePlantillaAdminInput,
} from "@/lib/validation/schemas/plantilla-admin.schema";
import {
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
} from "@/lib/validation/schemas/plantilla-setup.schema";
import {
  PlantillaCamposEditor,
  type PlantillaCampoLink,
} from "./plantilla-campos-editor";

const BASE_PATH = "/configuracion/plantillas";

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

type FormValues = {
  nombre: string;
  descripcion?: string;
  contexto: typeof PLANTILLA_CONTEXTO_CASO | typeof PLANTILLA_CONTEXTO_EXPEDIENTE;
  activo: boolean;
  practica_id: string;
  fuero_id: string;
  objeto_id: string;
  prioridad: number;
};

const DEFAULT_VALUES: FormValues = {
  nombre: "",
  descripcion: "",
  contexto: PLANTILLA_CONTEXTO_CASO,
  activo: true,
  practica_id: "",
  fuero_id: "",
  objeto_id: "",
  prioridad: 100,
};

type CreateDefaults = Partial<{
  contexto: string;
  practica_id: string;
}>;

type Props =
  | { mode: "create"; defaults?: CreateDefaults }
  | { mode: "edit"; id: string };

export function PlantillaForm(props: Props) {
  const isEdit = props.mode === "edit";
  const plantillaId = props.mode === "edit" ? props.id : undefined;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [isPending, setIsPending] = useState(false);
  const [linkedCampos, setLinkedCampos] = useState<PlantillaCampoLink[]>([]);
  const [camposError, setCamposError] = useState<string | null>(null);

  const [practicaOptions, setPracticaOptions] = useState<SelectOption[]>([]);
  const [fueroOptions, setFueroOptions] = useState<SelectOption[]>([]);
  const [objetoOptions, setObjetoOptions] = useState<SelectOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const contexto = watch("contexto");
  const fueroId = watch("fuero_id");
  const isCaso = contexto === PLANTILLA_CONTEXTO_CASO;

  useEffect(() => {
    if (props.mode === "create" && props.defaults) {
      const d = props.defaults;
      reset({
        ...DEFAULT_VALUES,
        contexto:
          d.contexto === PLANTILLA_CONTEXTO_EXPEDIENTE
            ? PLANTILLA_CONTEXTO_EXPEDIENTE
            : PLANTILLA_CONTEXTO_CASO,
        practica_id: d.practica_id ?? "",
      });
    }
  }, [props, reset]);

  useEffect(() => {
    getPracticas()
      .then((rows) =>
        setPracticaOptions(rows.map((p) => ({ value: p.id, label: p.nombre }))),
      )
      .catch(() => setPracticaOptions([]));

    getFueros()
      .then((rows) =>
        setFueroOptions(rows.map((f) => ({ value: f.id, label: f.nombre }))),
      )
      .catch(() => setFueroOptions([]));
  }, []);

  useEffect(() => {
    if (!fueroId) {
      setObjetoOptions([]);
      return;
    }
    getObjetosByFuero(fueroId)
      .then((rows) =>
        setObjetoOptions(rows.map((o) => ({ value: o.id, label: o.nombre }))),
      )
      .catch(() => setObjetoOptions([]));
  }, [fueroId]);

  useEffect(() => {
    if (!plantillaId) return;

    let cancelled = false;
    setLoading(true);

    getPlantillaAdmin(plantillaId)
      .then((detail) => {
        if (cancelled) return;
        reset({
          nombre: detail.nombre,
          descripcion: detail.descripcion ?? "",
          contexto:
            detail.contexto === PLANTILLA_CONTEXTO_EXPEDIENTE
              ? PLANTILLA_CONTEXTO_EXPEDIENTE
              : PLANTILLA_CONTEXTO_CASO,
          activo: detail.activo,
          practica_id: detail.practica_id ?? "",
          fuero_id: detail.fuero_id ?? "",
          objeto_id: detail.objeto_id ?? "",
          prioridad: detail.prioridad,
        });
        setLinkedCampos(
          detail.campos.map((c) => ({
            campo_dinamico_id: c.campo_dinamico_id,
            etiqueta: c.etiqueta,
            tipo: c.tipo,
            orden: c.orden,
            requerido: c.requerido,
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Error al cargar plantilla",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plantillaId]);

  function buildPayload(values: FormValues): CreatePlantillaAdminInput {
    const campos = linkedCampos.map((c) => ({
      campo_dinamico_id: c.campo_dinamico_id,
      orden: c.orden,
      requerido: c.requerido,
    }));

    if (values.contexto === PLANTILLA_CONTEXTO_CASO) {
      return {
        contexto: PLANTILLA_CONTEXTO_CASO,
        nombre: values.nombre,
        descripcion: values.descripcion,
        activo: values.activo,
        practica_id: values.practica_id,
        prioridad: values.prioridad,
        campos,
      };
    }

    return {
      contexto: PLANTILLA_CONTEXTO_EXPEDIENTE,
      nombre: values.nombre,
      descripcion: values.descripcion,
      activo: values.activo,
      fuero_id: values.fuero_id,
      objeto_id: values.objeto_id,
      prioridad: values.prioridad,
      campos,
    };
  }

  async function onSubmit(values: FormValues) {
    setCamposError(null);

    const payload = buildPayload(values);
    const schema =
      payload.contexto === PLANTILLA_CONTEXTO_CASO
        ? createPlantillaAdminCasoSchema
        : createPlantillaAdminExpedienteSchema;

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "campos") {
        setCamposError(issue.message);
      }
      toast.error(issue?.message ?? "Revisá los datos del formulario");
      return;
    }

    setIsPending(true);
    try {
      if (isEdit) {
        await updatePlantillaAdmin(props.id, parsed.data);
        toast.success("Plantilla actualizada");
      } else {
        await createPlantillaAdmin(parsed.data);
        toast.success("Plantilla creada");
      }
      router.push(BASE_PATH);
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar plantilla",
      );
    } finally {
      setIsPending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando plantilla…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plantilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField id="nombre" state={errors.nombre ? "error" : "default"}>
            <Label required>Nombre</Label>
            <Input
              {...register("nombre")}
              placeholder="Ej. Legajo despido laboral"
              state={errors.nombre ? "error" : "default"}
            />
            {errors.nombre && (
              <ErrorMessage>{errors.nombre.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="descripcion">
            <Label>Descripción</Label>
            <textarea
              {...register("descripcion")}
              className={textareaClassName}
              placeholder="Opcional"
            />
          </FormField>

          <FormField id="contexto">
            <Label required>Contexto</Label>
            <Controller
              name="contexto"
              control={control}
              render={({ field }) => (
                <Select
                  options={[...PLANTILLA_CONTEXTO_OPTIONS]}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isEdit}
                  placeholder="Seleccionar contexto…"
                />
              )}
            />
            {isEdit && (
              <HelperText>El contexto no se puede modificar.</HelperText>
            )}
          </FormField>

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
              <Label>Activo</Label>
            </div>
            <HelperText>
              Las plantillas inactivas no aparecen en selectores operativos.
            </HelperText>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regla automática</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isCaso ? (
            <FormField id="practica_id">
              <Label required>Práctica</Label>
              <Controller
                name="practica_id"
                control={control}
                render={({ field }) => (
                  <Select
                    options={practicaOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Seleccionar práctica…"
                  />
                )}
              />
            </FormField>
          ) : (
            <>
              <FormField id="fuero_id">
                <Label required>Fuero</Label>
                <Controller
                  name="fuero_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={fueroOptions}
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("objeto_id", "");
                      }}
                      placeholder="Seleccionar fuero…"
                    />
                  )}
                />
              </FormField>
              <FormField id="objeto_id">
                <Label required>Objeto</Label>
                <Controller
                  name="objeto_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={objetoOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={
                        !fueroId ? "Seleccioná un fuero primero" : "Seleccionar objeto…"
                      }
                      disabled={!fueroId}
                    />
                  )}
                />
              </FormField>
            </>
          )}

          <FormField id="prioridad" className="sm:col-span-2">
            <Label>Prioridad</Label>
            <Input
              type="number"
              {...register("prioridad", { valueAsNumber: true })}
            />
            <HelperText>
              Valor por defecto: 100. Mayor prioridad gana en la resolución automática.
            </HelperText>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <PlantillaCamposEditor
            contexto={contexto}
            campos={linkedCampos}
            onChange={setLinkedCampos}
            error={camposError}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(BASE_PATH)}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isPending}>
          {isEdit ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </div>
    </form>
  );
}
