import { z } from "zod";
import { MESSAGES } from "../common/messages";
import {
  WORKFLOW_CAMPO_ANCHO_GRILLA,
  WORKFLOW_CAMPO_TIPOS,
  WORKFLOW_ESTADO,
  WORKFLOW_ETAPA_COLORES,
  WORKFLOW_ORIGEN,
} from "@/lib/types/workflow";

export const WORKFLOW_CAMPO_CLAVE_REGEX = /^[a-z][a-z0-9_]*$/;

const WORKFLOW_CAMPO_CLAVE_MESSAGE =
  "La clave debe empezar con una letra minúscula y usar solo letras, números y guiones bajos";

export function isWorkflowCampoOptionTipo(
  tipo: string,
): tipo is "select" | "multiselect" {
  return tipo === "select" || tipo === "multiselect";
}

function emptyToNull(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const uuidSchema = z.string().uuid(MESSAGES.required);

const workflowClassificationSchema = z.object({
  workflow_tipo_id: uuidSchema,
  workflow_rol_id: uuidSchema,
  jurisdiccion_id: uuidSchema,
  fuero_id: uuidSchema,
  objeto_id: uuidSchema,
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
});

export const workflowStepClasificacionSchema = workflowClassificationSchema;

export type WorkflowStepClasificacionInput = z.output<
  typeof workflowStepClasificacionSchema
>;

export const createWorkflowSchema = workflowClassificationSchema;

export type CreateWorkflowSchemaInput = z.output<typeof createWorkflowSchema>;

export const createDraftWorkflowSchema = z.object({
  nombre: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(1, MESSAGES.required)
      .max(200, MESSAGES.maxLength(200))
      .optional(),
  ),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
});

export type CreateDraftWorkflowSchemaInput = z.output<
  typeof createDraftWorkflowSchema
>;

// Clasificación atómica (0 o 5 campos): ver workflowService.update().
export const updateWorkflowSchema = workflowClassificationSchema.partial();

export type UpdateWorkflowSchemaInput = z.output<typeof updateWorkflowSchema>;

export const workflowListQuerySchema = z.object({
  origen: z.enum(WORKFLOW_ORIGEN).optional(),
  estado: z.enum(WORKFLOW_ESTADO).optional(),
  workflow_tipo_id: z.preprocess(
    emptyToUndefined,
    uuidSchema.optional(),
  ),
  q: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(200).optional(),
  ),
});

export type WorkflowListQueryInput = z.output<typeof workflowListQuerySchema>;

export const cloneWorkflowBodySchema = z.object({
  nombre: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(1, MESSAGES.required)
      .max(200, MESSAGES.maxLength(200))
      .optional(),
  ),
});

export type CloneWorkflowBodyInput = z.output<typeof cloneWorkflowBodySchema>;

export const createWorkflowEtapaSchema = z.object({
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
  color: z.enum(WORKFLOW_ETAPA_COLORES).default("primary"),
});

export type CreateWorkflowEtapaSchemaInput = z.output<
  typeof createWorkflowEtapaSchema
>;

export const updateWorkflowEtapaSchema = createWorkflowEtapaSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se enviaron campos para actualizar",
  });

export type UpdateWorkflowEtapaSchemaInput = z.output<
  typeof updateWorkflowEtapaSchema
>;

export const reorderWorkflowEtapasSchema = z
  .object({
    etapa_ids: z
      .array(z.string().uuid(MESSAGES.required))
      .min(1, MESSAGES.required),
  })
  .superRefine((data, ctx) => {
    const ids = data.etapa_ids;
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La lista de IDs no puede contener repetidos",
        path: ["etapa_ids"],
      });
    }
  });

export type ReorderWorkflowEtapasSchemaInput = z.output<
  typeof reorderWorkflowEtapasSchema
>;

export const createWorkflowParteSchema = z.object({
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  es_principal: z.boolean().optional().default(false),
  obligatoria: z.boolean().optional().default(false),
});

export type CreateWorkflowParteSchemaInput = z.output<
  typeof createWorkflowParteSchema
>;

export const updateWorkflowParteSchema = createWorkflowParteSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se enviaron campos para actualizar",
  });

export type UpdateWorkflowParteSchemaInput = z.output<
  typeof updateWorkflowParteSchema
>;

export const reorderWorkflowPartesSchema = z.object({
  parte_ids: z
    .array(z.string().uuid(MESSAGES.required))
    .min(1, MESSAGES.required),
});

export type ReorderWorkflowPartesSchemaInput = z.output<
  typeof reorderWorkflowPartesSchema
>;

export const workflowCampoDinamicoOpcionSchema = z.object({
  etiqueta: z
    .string()
    .min(1, MESSAGES.required)
    .max(255, MESSAGES.maxLength(255)),
  valor: z
    .string()
    .min(1, MESSAGES.required)
    .max(255, MESSAGES.maxLength(255)),
  orden: z.coerce.number().int().min(0).default(0),
});

export type WorkflowCampoDinamicoOpcionSchemaInput = z.output<
  typeof workflowCampoDinamicoOpcionSchema
>;

function workflowCampoOpcionesRules(
  data: {
    tipo?: string;
    opciones?: WorkflowCampoDinamicoOpcionSchemaInput[];
  },
  ctx: z.RefinementCtx,
) {
  if (!data.tipo || !isWorkflowCampoOptionTipo(data.tipo)) {
    return;
  }

  const opciones = data.opciones ?? [];
  if (opciones.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Agregá al menos una opción para este tipo de campo",
      path: ["opciones"],
    });
    return;
  }

  const valores = opciones.map((o) => o.valor.trim().toLowerCase());
  const seen = new Set<string>();
  for (let i = 0; i < valores.length; i++) {
    const v = valores[i];
    if (seen.has(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los valores de las opciones deben ser únicos",
        path: ["opciones", i, "valor"],
      });
    }
    seen.add(v);
  }
}

function workflowCampoValidationRangeRules(
  data: { minimo?: number | null; maximo?: number | null },
  ctx: z.RefinementCtx,
) {
  if (
    data.minimo != null &&
    data.maximo != null &&
    data.minimo > data.maximo
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["maximo"],
    });
  }
}

function workflowCampoValorDefaultRules(
  data: {
    tipo?: string;
    valor_default?: string | null;
    opciones?: WorkflowCampoDinamicoOpcionSchemaInput[];
  },
  ctx: z.RefinementCtx,
) {
  const valorDefault = data.valor_default;
  if (valorDefault == null || valorDefault === "") {
    return;
  }

  if (data.tipo === "multiselect") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El valor por defecto no está soportado para selección múltiple",
      path: ["valor_default"],
    });
    return;
  }

  if (data.tipo === "boolean") {
    if (valorDefault !== "true" && valorDefault !== "false") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El valor por defecto debe ser "true" o "false"',
        path: ["valor_default"],
      });
    }
    return;
  }

  if (data.tipo === "date") {
    const parsed = Date.parse(valorDefault);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá una fecha válida en formato ISO",
        path: ["valor_default"],
      });
    }
    return;
  }

  if (data.tipo === "select") {
    const valores = (data.opciones ?? []).map((o) => o.valor.trim());
    if (!valores.includes(valorDefault.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El valor por defecto debe existir entre las opciones",
        path: ["valor_default"],
      });
    }
  }
}

const workflowCampoDinamicoBaseFields = {
  etiqueta: z
    .string()
    .min(1, MESSAGES.required)
    .max(255, MESSAGES.maxLength(255)),
  clave: z
    .string()
    .min(1, MESSAGES.required)
    .max(100, MESSAGES.maxLength(100))
    .regex(WORKFLOW_CAMPO_CLAVE_REGEX, WORKFLOW_CAMPO_CLAVE_MESSAGE),
  tipo: z.enum(WORKFLOW_CAMPO_TIPOS),
  regex: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).nullable().optional(),
  ),
  minimo: z.preprocess(emptyToUndefined, z.coerce.number().nullable().optional()),
  maximo: z.preprocess(emptyToUndefined, z.coerce.number().nullable().optional()),
  longitud_maxima: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).nullable().optional(),
  ),
  requerido: z.boolean().default(false),
  placeholder: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
  ayuda: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
  valor_default: z.preprocess(
    emptyToNull,
    z.string().max(500, MESSAGES.maxLength(500)).nullable().optional(),
  ),
  visible_tabla: z.boolean().default(false),
  ancho_grilla: z.coerce
    .number()
    .int()
    .refine(
      (value): value is (typeof WORKFLOW_CAMPO_ANCHO_GRILLA)[number] =>
        (WORKFLOW_CAMPO_ANCHO_GRILLA as readonly number[]).includes(value),
      { message: "Ancho de grilla inválido" },
    )
    .default(12),
  opciones: z.array(workflowCampoDinamicoOpcionSchema).optional(),
};

export const createWorkflowCampoDinamicoSchema = z
  .object(workflowCampoDinamicoBaseFields)
  .superRefine(workflowCampoOpcionesRules)
  .superRefine(workflowCampoValidationRangeRules)
  .superRefine(workflowCampoValorDefaultRules);

export type CreateWorkflowCampoDinamicoSchemaInput = z.output<
  typeof createWorkflowCampoDinamicoSchema
>;

export const updateWorkflowCampoDinamicoSchema = z
  .object(workflowCampoDinamicoBaseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se enviaron campos para actualizar",
  });

export type UpdateWorkflowCampoDinamicoSchemaInput = z.output<
  typeof updateWorkflowCampoDinamicoSchema
>;

export const reorderWorkflowCamposDinamicosSchema = z
  .object({
    campo_dinamico_ids: z
      .array(z.string().uuid(MESSAGES.required))
      .min(1, MESSAGES.required),
  })
  .superRefine((data, ctx) => {
    const ids = data.campo_dinamico_ids;
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La lista de IDs no puede contener repetidos",
        path: ["campo_dinamico_ids"],
      });
    }
  });

export type ReorderWorkflowCamposDinamicosSchemaInput = z.output<
  typeof reorderWorkflowCamposDinamicosSchema
>;

export const copyWorkflowCamposFromWorkflowSchema = z.object({
  source_workflow_id: uuidSchema,
  campo_dinamico_ids: z
    .array(z.string().uuid(MESSAGES.required))
    .min(1, MESSAGES.required)
    .optional(),
});

export type CopyWorkflowCamposFromWorkflowSchemaInput = z.output<
  typeof copyWorkflowCamposFromWorkflowSchema
>;

export const COPY_WORKFLOW_CAMPOS_CATALOG_CONTEXTOS = [
  "caso",
  "expediente",
] as const;

export const copyWorkflowCamposFromCatalogSchema = z.object({
  contexto: z.enum(COPY_WORKFLOW_CAMPOS_CATALOG_CONTEXTOS),
  campo_dinamico_ids: z
    .array(z.string().uuid(MESSAGES.required))
    .min(1, MESSAGES.required),
});

export type CopyWorkflowCamposFromCatalogSchemaInput = z.output<
  typeof copyWorkflowCamposFromCatalogSchema
>;

export const createWorkflowParteCampoDinamicoSchema = z
  .object(workflowCampoDinamicoBaseFields)
  .superRefine(workflowCampoOpcionesRules)
  .superRefine(workflowCampoValidationRangeRules)
  .superRefine(workflowCampoValorDefaultRules);

export type CreateWorkflowParteCampoDinamicoSchemaInput = z.output<
  typeof createWorkflowParteCampoDinamicoSchema
>;

export const updateWorkflowParteCampoDinamicoSchema = z
  .object(workflowCampoDinamicoBaseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se enviaron campos para actualizar",
  });

export type UpdateWorkflowParteCampoDinamicoSchemaInput = z.output<
  typeof updateWorkflowParteCampoDinamicoSchema
>;

export const reorderWorkflowParteCamposDinamicosSchema = z
  .object({
    campo_dinamico_ids: z
      .array(z.string().uuid(MESSAGES.required))
      .min(1, MESSAGES.required),
  })
  .superRefine((data, ctx) => {
    const ids = data.campo_dinamico_ids;
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La lista de IDs no puede contener repetidos",
        path: ["campo_dinamico_ids"],
      });
    }
  });

export type ReorderWorkflowParteCamposDinamicosSchemaInput = z.output<
  typeof reorderWorkflowParteCamposDinamicosSchema
>;

export const copyWorkflowParteCamposFromParteSchema = z.object({
  sourceParteId: uuidSchema,
});

export type CopyWorkflowParteCamposFromParteSchemaInput = z.output<
  typeof copyWorkflowParteCamposFromParteSchema
>;

export const createWorkflowTareaSchema = z.object({
  titulo: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).nullable().optional(),
  ),
  obligatoria: z.boolean().optional().default(false),
});

export type CreateWorkflowTareaSchemaInput = z.output<
  typeof createWorkflowTareaSchema
>;

export const updateWorkflowTareaSchema = createWorkflowTareaSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se enviaron campos para actualizar",
  });

export type UpdateWorkflowTareaSchemaInput = z.output<
  typeof updateWorkflowTareaSchema
>;

export const reorderWorkflowTareasSchema = z
  .object({
    tarea_ids: z
      .array(z.string().uuid(MESSAGES.required))
      .min(1, MESSAGES.required),
  })
  .superRefine((data, ctx) => {
    const ids = data.tarea_ids;
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La lista de IDs no puede contener repetidos",
        path: ["tarea_ids"],
      });
    }
  });

export type ReorderWorkflowTareasSchemaInput = z.output<
  typeof reorderWorkflowTareasSchema
>;
