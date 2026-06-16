"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getFueros } from "@/lib/api/fueros";
import { getJurisdicciones } from "@/lib/api/jurisdicciones";
import { getObjetosByFuero } from "@/lib/api/objetos";
import {
  updateWorkflow,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import { getWorkflowRoles } from "@/lib/api/workflow-roles";
import { getWorkflowTipos } from "@/lib/api/workflow-tipos";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import {
  workflowStepClasificacionSchema,
  type WorkflowStepClasificacionInput,
} from "@/lib/validation/schemas/workflow.schema";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

function nullToEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function workflowToFormValues(
  workflow: WorkflowDetailDto,
): WorkflowStepClasificacionInput {
  return {
    workflow_tipo_id: nullToEmpty(workflow.workflow_tipo_id),
    workflow_rol_id: nullToEmpty(workflow.workflow_rol_id),
    jurisdiccion_id: nullToEmpty(workflow.jurisdiccion_id),
    fuero_id: nullToEmpty(workflow.fuero_id),
    objeto_id: nullToEmpty(workflow.objeto_id),
    nombre: workflow.nombre?.trim() || "",
    descripcion: workflow.descripcion ?? "",
  };
}

function getOptionLabel(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

function buildSuggestedName(
  fueroLabel: string,
  objetoLabel: string,
  rolLabel: string,
): string {
  return [fueroLabel, objetoLabel, rolLabel].filter(Boolean).join(" · ");
}

export type WorkflowStepClasificacionHandle = {
  submit: () => Promise<WorkflowDetailDto | null>;
};

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  disabled?: boolean;
};

export const WorkflowStepClasificacion = forwardRef<
  WorkflowStepClasificacionHandle,
  Props
>(function WorkflowStepClasificacion(
  { workflow, readonly = false, disabled = false },
  ref,
) {
  const [tipoOptions, setTipoOptions] = useState<SelectOption[]>([]);
  const [rolOptions, setRolOptions] = useState<SelectOption[]>([]);
  const [jurisdiccionOptions, setJurisdiccionOptions] = useState<
    SelectOption[]
  >([]);
  const [fueroOptions, setFueroOptions] = useState<SelectOption[]>([]);
  const [objetoOptions, setObjetoOptions] = useState<SelectOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<WorkflowStepClasificacionInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(workflowStepClasificacionSchema) as any,
    mode: "onBlur",
    defaultValues: workflowToFormValues(workflow),
  });

  const fueroId = watch("fuero_id");
  const objetoId = watch("objeto_id");
  const rolId = watch("workflow_rol_id");
  const isFieldDisabled = readonly || disabled || catalogsLoading;

  useEffect(() => {
    reset(workflowToFormValues(workflow));
  }, [workflow, reset]);

  useEffect(() => {
    let cancelled = false;
    setCatalogsLoading(true);

    Promise.all([
      getWorkflowTipos(),
      getWorkflowRoles(),
      getJurisdicciones(),
      getFueros(),
    ])
      .then(([tipos, roles, jurisdicciones, fueros]) => {
        if (cancelled) return;
        setTipoOptions(tipos.map((row) => ({ value: row.id, label: row.nombre })));
        setRolOptions(roles.map((row) => ({ value: row.id, label: row.nombre })));
        setJurisdiccionOptions(
          jurisdicciones.map((row) => ({
            value: row.id,
            label: row.nombre?.trim() || row.codigo?.trim() || "Sin nombre",
          })),
        );
        setFueroOptions(fueros.map((row) => ({ value: row.id, label: row.nombre })));
      })
      .catch(() => {
        if (cancelled) return;
        setTipoOptions([]);
        setRolOptions([]);
        setJurisdiccionOptions([]);
        setFueroOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fueroId) {
      setObjetoOptions([]);
      return;
    }

    let cancelled = false;

    getObjetosByFuero(fueroId)
      .then((rows) => {
        if (cancelled) return;
        setObjetoOptions(rows.map((row) => ({ value: row.id, label: row.nombre })));
      })
      .catch(() => {
        if (cancelled) return;
        setObjetoOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fueroId]);

  const suggestedNombre = useMemo(() => {
    return buildSuggestedName(
      getOptionLabel(fueroOptions, fueroId),
      getOptionLabel(objetoOptions, objetoId),
      getOptionLabel(rolOptions, rolId),
    );
  }, [fueroOptions, fueroId, objetoOptions, objetoId, rolOptions, rolId]);

  useImperativeHandle(ref, () => ({
    submit: () =>
      new Promise((resolve, reject) => {
        if (readonly) {
          resolve(null);
          return;
        }

        void handleSubmit(
          async (values) => {
            try {
              const updated = await updateWorkflow(workflow.id, {
                workflow_tipo_id: values.workflow_tipo_id,
                workflow_rol_id: values.workflow_rol_id,
                jurisdiccion_id: values.jurisdiccion_id,
                fuero_id: values.fuero_id,
                objeto_id: values.objeto_id,
                nombre: values.nombre.trim(),
                descripcion: values.descripcion?.trim()
                  ? values.descripcion.trim()
                  : null,
              });
              resolve(updated);
            } catch (error: unknown) {
              if (error instanceof WorkflowApiError) {
                const formFields: Array<keyof WorkflowStepClasificacionInput> = [
                  "workflow_tipo_id",
                  "workflow_rol_id",
                  "jurisdiccion_id",
                  "fuero_id",
                  "objeto_id",
                  "nombre",
                  "descripcion",
                ];
                if (formFields.includes(error.field as keyof WorkflowStepClasificacionInput)) {
                  setError(error.field as keyof WorkflowStepClasificacionInput, {
                    message: error.message,
                  });
                }
              }
              reject(error);
            }
          },
          () => reject(new Error("VALIDATION_FAILED")),
        )();
      }),
  }));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">Clasificación</h2>
        <p className="text-sm text-zinc-500">
          Definí el tipo, jurisdicción, fuero, objeto y nombre del workflow.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="workflow_tipo_id" state={errors.workflow_tipo_id ? "error" : "default"}>
          <Label required>Tipo</Label>
          <Controller
            name="workflow_tipo_id"
            control={control}
            render={({ field }) => (
              <Select
                options={tipoOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Seleccionar tipo…"
                disabled={isFieldDisabled}
              />
            )}
          />
          {errors.workflow_tipo_id ? (
            <ErrorMessage>{errors.workflow_tipo_id.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="jurisdiccion_id" state={errors.jurisdiccion_id ? "error" : "default"}>
          <Label required>Jurisdicción</Label>
          <Controller
            name="jurisdiccion_id"
            control={control}
            render={({ field }) => (
              <Select
                options={jurisdiccionOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Seleccionar jurisdicción…"
                disabled={isFieldDisabled}
              />
            )}
          />
          {errors.jurisdiccion_id ? (
            <ErrorMessage>{errors.jurisdiccion_id.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="fuero_id" state={errors.fuero_id ? "error" : "default"}>
          <Label required>Fuero</Label>
          <Controller
            name="fuero_id"
            control={control}
            render={({ field }) => (
              <Select
                options={fueroOptions}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setValue("objeto_id", "", { shouldValidate: false });
                }}
                placeholder="Seleccionar fuero…"
                disabled={isFieldDisabled}
              />
            )}
          />
          {errors.fuero_id ? (
            <ErrorMessage>{errors.fuero_id.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="objeto_id" state={errors.objeto_id ? "error" : "default"}>
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
                disabled={isFieldDisabled || !fueroId}
              />
            )}
          />
          {errors.objeto_id ? (
            <ErrorMessage>{errors.objeto_id.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="workflow_rol_id" state={errors.workflow_rol_id ? "error" : "default"}>
          <Label required>Rol</Label>
          <Controller
            name="workflow_rol_id"
            control={control}
            render={({ field }) => (
              <Select
                options={rolOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Seleccionar rol…"
                disabled={isFieldDisabled}
              />
            )}
          />
          {errors.workflow_rol_id ? (
            <ErrorMessage>{errors.workflow_rol_id.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="nombre" className="sm:col-span-2" state={errors.nombre ? "error" : "default"}>
          <Label required>Nombre</Label>
          <Input
            {...register("nombre")}
            placeholder="Nombre del workflow"
            disabled={isFieldDisabled}
          />
          {suggestedNombre ? (
            <HelperText>Sugerido: {suggestedNombre}</HelperText>
          ) : null}
          {errors.nombre ? (
            <ErrorMessage>{errors.nombre.message}</ErrorMessage>
          ) : null}
        </FormField>

        <FormField id="descripcion" className="sm:col-span-2" state={errors.descripcion ? "error" : "default"}>
          <Label>Descripción</Label>
          <textarea
            {...register("descripcion")}
            className={textareaClassName}
            placeholder="Descripción opcional del workflow"
            disabled={isFieldDisabled}
          />
          {errors.descripcion ? (
            <ErrorMessage>{errors.descripcion.message}</ErrorMessage>
          ) : null}
        </FormField>
      </div>
      </div>
    </div>
  );
});
