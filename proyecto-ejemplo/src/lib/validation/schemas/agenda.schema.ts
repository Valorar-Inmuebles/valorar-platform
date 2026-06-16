import { z } from "zod";

import {
  AGENDA_ENTIDAD_PADRE_FILTER_TIPOS,
  AGENDA_ENTIDAD_TIPOS,
  AGENDA_EVENTO_ESTADOS,
  AGENDA_NOTIFICAR_ANTES_UNIDADES,
} from "@/lib/types/agenda";
import { MESSAGES } from "../common/messages";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, MESSAGES.maxLength(max))
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida. Usá el formato HH:mm");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, MESSAGES.invalidDate);

const participanteIdsSchema = z.array(z.string().uuid("ID de participante inválido"));

const notificarAntesCantidadSchema = z
  .union([
    z.coerce.number().int("Ingresá un número entero").positive("Debe ser mayor a 0"),
    z.null(),
  ])
  .optional();

const notificarAntesUnidadSchema = z
  .enum(AGENDA_NOTIFICAR_ANTES_UNIDADES)
  .nullable()
  .optional();

function refineNotificarAntes(
  data: {
    notificar_antes_cantidad?: number | null;
    notificar_antes_unidad?: (typeof AGENDA_NOTIFICAR_ANTES_UNIDADES)[number] | null;
  },
  ctx: z.RefinementCtx,
) {
  const hasCantidad = data.notificar_antes_cantidad != null;
  const hasUnidad = data.notificar_antes_unidad != null;
  if (hasCantidad === hasUnidad) return;

  ctx.addIssue({
    code: "custom",
    message: "Indicá cantidad y unidad del aviso, o dejá ambos vacíos",
    path: hasCantidad ? ["notificar_antes_unidad"] : ["notificar_antes_cantidad"],
  });
}

export const agendaEventoListByEntidadQuerySchema = z.object({
  entidad_tipo: z.enum(AGENDA_ENTIDAD_TIPOS),
  entidad_id: z.string().uuid("ID de entidad inválido"),
});

export const agendaEntidadesPadreQuerySchema = z.object({
  entidad_tipo: z.enum(AGENDA_ENTIDAD_PADRE_FILTER_TIPOS),
  q: z
    .string()
    .trim()
    .max(200, MESSAGES.maxLength(200))
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const agendaEventoListTenantQuerySchema = z.object({
  desde: z.string().datetime({ offset: true }).optional(),
  hasta: z.string().datetime({ offset: true }).optional(),
  tipo_id: z.string().uuid().optional(),
  entidad_tipo: z.enum(AGENDA_ENTIDAD_TIPOS).optional(),
  entidad_id: z.string().uuid().optional(),
  participante_id: z.string().uuid().optional(),
  creado_por: z.string().uuid().optional(),
  estado: z.enum(AGENDA_EVENTO_ESTADOS).optional(),
});

export const agendaEventoCreateSchema = z
  .object({
    entidad_tipo: z.enum(AGENDA_ENTIDAD_TIPOS).optional(),
    entidad_id: z.string().uuid("ID de entidad inválido").optional(),
    tipo_id: z.string().uuid("Tipo de evento inválido"),
    titulo: z
      .string()
      .trim()
      .min(1, MESSAGES.required)
      .max(500, MESSAGES.maxLength(500)),
    descripcion: optionalText(10000),
    ubicacion: optionalText(500),
    observaciones: optionalText(10000),
    fecha: dateSchema,
    hora_inicio: timeSchema.optional(),
    hora_fin: timeSchema.optional(),
    todo_el_dia: z.boolean().optional().default(false),
    participante_ids: participanteIdsSchema.optional().default([]),
    notificar_antes_cantidad: notificarAntesCantidadSchema,
    notificar_antes_unidad: notificarAntesUnidadSchema,
  })
  .superRefine((data, ctx) => {
    refineNotificarAntes(data, ctx);

    const hasTipo = data.entidad_tipo != null;
    const hasId = data.entidad_id != null;
    if (hasTipo !== hasId) {
      ctx.addIssue({
        code: "custom",
        message: "Tipo de entidad e ID deben indicarse juntos",
        path: hasTipo ? ["entidad_id"] : ["entidad_tipo"],
      });
    }

    if (!data.todo_el_dia && !data.hora_inicio) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de inicio es obligatoria si el evento no es de todo el día",
        path: ["hora_inicio"],
      });
    }
    if (
      data.hora_inicio &&
      data.hora_fin &&
      data.hora_fin <= data.hora_inicio
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de fin debe ser posterior a la hora de inicio",
        path: ["hora_fin"],
      });
    }
  });

export const agendaEventoUpdateSchema = z
  .object({
    tipo_id: z.string().uuid("Tipo de evento inválido").optional(),
    titulo: z
      .string()
      .trim()
      .min(1, MESSAGES.required)
      .max(500, MESSAGES.maxLength(500))
      .optional(),
    descripcion: optionalText(10000).optional(),
    ubicacion: optionalText(500).optional(),
    observaciones: optionalText(10000).optional(),
    fecha: dateSchema.optional(),
    hora_inicio: timeSchema.optional(),
    hora_fin: timeSchema.optional().nullable(),
    todo_el_dia: z.boolean().optional(),
    estado: z.enum(AGENDA_EVENTO_ESTADOS).optional(),
    participante_ids: participanteIdsSchema.optional(),
    notificar_antes_cantidad: notificarAntesCantidadSchema,
    notificar_antes_unidad: notificarAntesUnidadSchema,
  })
  .superRefine((data, ctx) => {
    refineNotificarAntes(data, ctx);

    if (
      data.hora_inicio &&
      data.hora_fin &&
      data.hora_fin <= data.hora_inicio
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de fin debe ser posterior a la hora de inicio",
        path: ["hora_fin"],
      });
    }
  });

export type AgendaEventoCreateInput = z.infer<typeof agendaEventoCreateSchema>;
export type AgendaEventoUpdateInput = z.infer<typeof agendaEventoUpdateSchema>;
