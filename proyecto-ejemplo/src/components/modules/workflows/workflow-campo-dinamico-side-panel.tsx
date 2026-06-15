"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import { WorkflowCampoDinamicoOpcionesEditor } from "@/components/modules/workflows/workflow-campo-dinamico-opciones-editor";
import { slugifyEtiqueta } from "@/components/modules/campos/slugify-etiqueta";
import {
  WORKFLOW_CAMPO_ANCHO_GRILLA,
  WORKFLOW_CAMPO_TIPOS,
  type WorkflowCampoAnchoGrilla,
  type WorkflowCampoDinamicoDto,
  type WorkflowParteCampoDinamicoDto,
  type WorkflowCampoTipo,
} from "@/lib/types/workflow";
import {
  createWorkflowCampoDinamicoSchema,
  isWorkflowCampoOptionTipo,
  type CreateWorkflowCampoDinamicoSchemaInput,
} from "@/lib/validation/schemas/workflow.schema";

const TIPO_LABELS: Record<WorkflowCampoTipo, string> = {
  text: "Texto",
  date: "Fecha",
  boolean: "Sí/No",
  select: "Lista desplegable",
  multiselect: "Selección múltiple",
};

const ANCHO_GRILLA_LABELS: Record<
  (typeof WORKFLOW_CAMPO_ANCHO_GRILLA)[number],
  string
> = {
  12: "Ancho completo",
  6: "Media fila",
  4: "Un tercio",
  3: "Un cuarto",
};

const TIPO_OPTIONS: SelectOption[] = WORKFLOW_CAMPO_TIPOS.map((tipo) => ({
  value: tipo,
  label: TIPO_LABELS[tipo],
}));

const ANCHO_GRILLA_OPTIONS: SelectOption[] = WORKFLOW_CAMPO_ANCHO_GRILLA.map(
  (value) => ({
    value: String(value),
    label: ANCHO_GRILLA_LABELS[value],
  }),
);

const BOOLEAN_DEFAULT_OPTIONS: SelectOption[] = [
  { value: "", label: "Sin valor por defecto" },
  { value: "true", label: "Sí (true)" },
  { value: "false", label: "No (false)" },
];

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

function campoToFormValues(
  campo?: WorkflowCampoDinamicoDto | WorkflowParteCampoDinamicoDto,
): CreateWorkflowCampoDinamicoSchemaInput {
  return {
    etiqueta: campo?.etiqueta ?? "",
    clave: campo?.clave ?? "",
    tipo: campo?.tipo ?? "text",
    regex: campo?.regex ?? "",
    minimo: campo?.minimo ?? undefined,
    maximo: campo?.maximo ?? undefined,
    longitud_maxima: campo?.longitud_maxima ?? undefined,
    requerido: campo?.requerido ?? false,
    placeholder: campo?.placeholder ?? "",
    ayuda: campo?.ayuda ?? "",
    valor_default: campo?.valor_default ?? "",
    visible_tabla: campo?.visible_tabla ?? false,
    ancho_grilla: (campo?.ancho_grilla ?? 12) as WorkflowCampoAnchoGrilla,
    opciones:
      campo?.opciones.map((opcion) => ({
        etiqueta: opcion.etiqueta,
        valor: opcion.valor,
        orden: opcion.orden,
      })) ?? [],
  };
}

type PanelMode = "create" | "edit";

type Props = {
  open: boolean;
  mode: PanelMode | null;
  campo?: WorkflowCampoDinamicoDto | WorkflowParteCampoDinamicoDto | null;
  disabled?: boolean;
  loading?: boolean;
  apiFieldError?: { field: string; message: string } | null;
  onClose: () => void;
  onSubmit: (values: CreateWorkflowCampoDinamicoSchemaInput) => void;
};

export function WorkflowCampoDinamicoSidePanel({
  open,
  mode,
  campo,
  disabled = false,
  loading = false,
  apiFieldError = null,
  onClose,
  onSubmit,
}: Props) {
  const claveTouchedRef = useRef(false);
  const isBusy = disabled || loading;

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
  } = useForm<CreateWorkflowCampoDinamicoSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createWorkflowCampoDinamicoSchema) as any,
    mode: "onBlur",
    defaultValues: campoToFormValues(),
  });

  const tipo = watch("tipo");
  const etiqueta = watch("etiqueta");
  const opciones = watch("opciones") ?? [];
  const showOpciones = isWorkflowCampoOptionTipo(tipo);
  const showValorDefault = tipo !== "multiselect";

  useEffect(() => {
    if (!open || !mode) return;
    claveTouchedRef.current = mode === "edit";
    reset(campoToFormValues(mode === "edit" ? (campo ?? undefined) : undefined));
  }, [open, mode, campo, reset]);

  useEffect(() => {
    if (!apiFieldError) return;
    const field = apiFieldError.field as keyof CreateWorkflowCampoDinamicoSchemaInput;
    setError(field, { message: apiFieldError.message });
  }, [apiFieldError, setError]);

  useEffect(() => {
    if (claveTouchedRef.current) return;
    const next = slugifyEtiqueta(etiqueta ?? "");
    if (next) {
      setValue("clave", next, { shouldValidate: false });
    }
  }, [etiqueta, setValue]);

  function handleTipoChange(value: string) {
    const nextTipo = value as WorkflowCampoTipo;
    setValue("tipo", nextTipo, { shouldValidate: true });

    if (isWorkflowCampoOptionTipo(nextTipo)) {
      const current = getValues("opciones");
      if (!current?.length) {
        setValue("opciones", [{ etiqueta: "", valor: "", orden: 0 }], {
          shouldValidate: false,
        });
      }
    } else {
      setValue("opciones", [], { shouldValidate: false });
    }

    if (nextTipo === "multiselect") {
      setValue("valor_default", "", { shouldValidate: false });
    }
  }

  const selectDefaultOptions: SelectOption[] = [
    { value: "", label: "Sin valor por defecto" },
    ...opciones
      .filter((opcion) => opcion.valor.trim())
      .map((opcion) => ({
        value: opcion.valor.trim(),
        label: opcion.etiqueta.trim() || opcion.valor.trim(),
      })),
  ];

  return (
    <SidePanel open={open} onClose={onClose} width="md">
      <SidePanelHeader>
        <SidePanelTitle>
          {mode === "create" ? "Agregar campo" : "Editar campo"}
        </SidePanelTitle>
        <SidePanelDescription>
          Definí los datos adicionales que se solicitarán en el expediente.
        </SidePanelDescription>
      </SidePanelHeader>

      <form
        onSubmit={handleSubmit((values) => {
          onSubmit({
            ...values,
            placeholder: values.placeholder?.trim() || null,
            ayuda: values.ayuda?.trim() || null,
            regex: values.regex?.trim() || null,
            valor_default: values.valor_default?.trim() || null,
            opciones: showOpciones ? values.opciones : [],
          });
        })}
      >
        <SidePanelContent className="space-y-4">
          <FormField>
            <Label htmlFor="campo-etiqueta" required>
              Etiqueta
            </Label>
            <Input
              id="campo-etiqueta"
              disabled={isBusy}
              {...register("etiqueta")}
            />
            {errors.etiqueta ? (
              <ErrorMessage>{errors.etiqueta.message}</ErrorMessage>
            ) : (
              <HelperText>Nombre visible del campo.</HelperText>
            )}
          </FormField>

          <FormField>
            <Label htmlFor="campo-clave" required>
              Clave
            </Label>
            <Input
              id="campo-clave"
              disabled={isBusy}
              className="font-mono"
              {...register("clave", {
                onChange: () => {
                  claveTouchedRef.current = true;
                },
              })}
            />
            {errors.clave ? (
              <ErrorMessage>{errors.clave.message}</ErrorMessage>
            ) : (
              <HelperText>
                Identificador técnico único en el workflow.
              </HelperText>
            )}
          </FormField>

          <FormField>
            <Label htmlFor="campo-tipo" required>
              Tipo
            </Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select
                  id="campo-tipo"
                  options={TIPO_OPTIONS}
                  value={field.value}
                  disabled={isBusy}
                  onChange={(value) => handleTipoChange(value as string)}
                  state={errors.tipo ? "error" : "default"}
                />
              )}
            />
            {errors.tipo ? (
              <ErrorMessage>{errors.tipo.message}</ErrorMessage>
            ) : null}
          </FormField>

          {tipo === "text" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField>
                  <Label htmlFor="campo-longitud">Longitud máxima</Label>
                  <Input
                    id="campo-longitud"
                    type="number"
                    min={1}
                    disabled={isBusy}
                    {...register("longitud_maxima")}
                  />
                  {errors.longitud_maxima ? (
                    <ErrorMessage>{errors.longitud_maxima.message}</ErrorMessage>
                  ) : null}
                </FormField>
                <FormField>
                  <Label htmlFor="campo-regex">Regex</Label>
                  <Input
                    id="campo-regex"
                    disabled={isBusy}
                    className="font-mono text-sm"
                    {...register("regex")}
                  />
                  {errors.regex ? (
                    <ErrorMessage>{errors.regex.message}</ErrorMessage>
                  ) : (
                    <HelperText>Texto libre; no se valida la sintaxis.</HelperText>
                  )}
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField>
                  <Label htmlFor="campo-minimo">Mínimo</Label>
                  <Input
                    id="campo-minimo"
                    type="number"
                    disabled={isBusy}
                    {...register("minimo")}
                  />
                  {errors.minimo ? (
                    <ErrorMessage>{errors.minimo.message}</ErrorMessage>
                  ) : null}
                </FormField>
                <FormField>
                  <Label htmlFor="campo-maximo">Máximo</Label>
                  <Input
                    id="campo-maximo"
                    type="number"
                    disabled={isBusy}
                    {...register("maximo")}
                  />
                  {errors.maximo ? (
                    <ErrorMessage>{errors.maximo.message}</ErrorMessage>
                  ) : null}
                </FormField>
              </div>
            </>
          ) : null}

          <FormField>
            <Label htmlFor="campo-placeholder">Placeholder</Label>
            <Input
              id="campo-placeholder"
              disabled={isBusy}
              {...register("placeholder")}
            />
          </FormField>

          <FormField>
            <Label htmlFor="campo-ayuda">Ayuda</Label>
            <textarea
              id="campo-ayuda"
              disabled={isBusy}
              className={textareaClassName}
              {...register("ayuda")}
            />
          </FormField>

          {showValorDefault ? (
            <FormField>
              <Label htmlFor="campo-valor-default">Valor por defecto</Label>
              {tipo === "boolean" ? (
                <Controller
                  name="valor_default"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="campo-valor-default"
                      options={BOOLEAN_DEFAULT_OPTIONS}
                      value={field.value ?? ""}
                      disabled={isBusy}
                      onChange={(value) => field.onChange(value)}
                      state={errors.valor_default ? "error" : "default"}
                    />
                  )}
                />
              ) : tipo === "date" ? (
                <Input
                  id="campo-valor-default"
                  type="date"
                  disabled={isBusy}
                  {...register("valor_default")}
                />
              ) : tipo === "select" ? (
                <Controller
                  name="valor_default"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="campo-valor-default"
                      options={selectDefaultOptions}
                      value={field.value ?? ""}
                      disabled={isBusy}
                      onChange={(value) => field.onChange(value)}
                      state={errors.valor_default ? "error" : "default"}
                    />
                  )}
                />
              ) : (
                <Input
                  id="campo-valor-default"
                  disabled={isBusy}
                  {...register("valor_default")}
                />
              )}
              {errors.valor_default ? (
                <ErrorMessage>{errors.valor_default.message}</ErrorMessage>
              ) : (
                <HelperText>
                  {tipo === "date"
                    ? "Formato ISO (YYYY-MM-DD)."
                    : tipo === "select"
                      ? "Debe coincidir con el valor de una opción."
                      : tipo === "boolean"
                        ? "true, false o vacío."
                        : "Opcional."}
                </HelperText>
              )}
            </FormField>
          ) : null}

          <FormField>
            <Label htmlFor="campo-ancho">Ancho en grilla</Label>
            <Controller
              name="ancho_grilla"
              control={control}
              render={({ field }) => (
                <Select
                  id="campo-ancho"
                  options={ANCHO_GRILLA_OPTIONS}
                  value={String(field.value)}
                  disabled={isBusy}
                  onChange={(value) => field.onChange(Number(value))}
                />
              )}
            />
          </FormField>

          <FormField>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="campo-requerido">Requerido</Label>
                <HelperText>El campo será obligatorio en el expediente.</HelperText>
              </div>
              <Controller
                name="requerido"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="campo-requerido"
                    size="sm"
                    checked={field.value}
                    disabled={isBusy}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
            </div>
          </FormField>

          <FormField>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="campo-visible-tabla">Visible en tabla</Label>
                <HelperText>Mostrar el campo en listados del expediente.</HelperText>
              </div>
              <Controller
                name="visible_tabla"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="campo-visible-tabla"
                    size="sm"
                    checked={field.value}
                    disabled={isBusy}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
            </div>
          </FormField>

          {showOpciones ? (
            <FormField>
              <Label>Opciones</Label>
              <WorkflowCampoDinamicoOpcionesEditor
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                getValues={getValues}
                disabled={isBusy}
              />
            </FormField>
          ) : null}
        </SidePanelContent>

        <SidePanelFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "create" ? "Agregar campo" : "Guardar cambios"}
          </Button>
        </SidePanelFooter>
      </form>
    </SidePanel>
  );
}
