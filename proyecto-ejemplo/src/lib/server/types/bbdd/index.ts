import type { TableInsert, TableRow, TableUpdate } from "./helpers";

export type PersonaRow = TableRow<"persona">;
export type PersonaInsert = TableInsert<"persona">;
export type PersonaUpdate = TableUpdate<"persona">;

export type ClienteRow = TableRow<"cliente">;
export type ClienteInsert = TableInsert<"cliente">;
export type ClienteUpdate = TableUpdate<"cliente">;

export type CasoRow = TableRow<"caso">;
export type CasoInsert = TableInsert<"caso">;
export type CasoUpdate = TableUpdate<"caso">;

export type ExpedienteRow = TableRow<"expediente">;
export type ExpedienteInsert = TableInsert<"expediente">;
export type ExpedienteUpdate = TableUpdate<"expediente">;

export type UsuarioRow = TableRow<"usuario">;
export type UsuarioInsert = TableInsert<"usuario">;
export type UsuarioUpdate = TableUpdate<"usuario">;

export type TenantRow = TableRow<"tenant">;
export type TenantInsert = TableInsert<"tenant">;
export type TenantUpdate = TableUpdate<"tenant">;

export type FueroRow = TableRow<"fuero">;
export type ObjetoRow = TableRow<"objeto">;
export type PracticaRow = TableRow<"practica">;
export type RolRow = TableRow<"rol">;
export type JurisdiccionRow = TableRow<"jurisdiccion">;

export type ProvinciaRow = TableRow<"provincias">;
export type LocalidadRow = TableRow<"localidades">;
export type CodigoPostalRow = TableRow<"codigos_postales">;

export type PersonaContactoRow = TableRow<"persona_contacto">;
export type PersonaContactoInsert = TableInsert<"persona_contacto">;
export type PersonaContactoUpdate = TableUpdate<"persona_contacto">;

export type PersonaDomicilioRow = TableRow<"persona_domicilio">;
export type PersonaDomicilioInsert = TableInsert<"persona_domicilio">;
export type PersonaDomicilioUpdate = TableUpdate<"persona_domicilio">;

export type PersonaPrevisionalRow = TableRow<"persona_previsional">;
export type PersonaPrevisionalInsert = TableInsert<"persona_previsional">;
export type PersonaPrevisionalUpdate = TableUpdate<"persona_previsional">;

export type AnsesLogRow = TableRow<"anses_log">;
export type AnsesLogInsert = TableInsert<"anses_log">;

export type AnsesClienteRow = TableRow<"anses_cliente">;
export type AnsesClienteInsert = TableInsert<"anses_cliente">;

export type NotificacionRow = TableRow<"notificacion">;
export type NotificacionInsert = TableInsert<"notificacion">;
export type NotificacionUpdate = TableUpdate<"notificacion">;

export type ComentarioRow = TableRow<"comentario">;
export type ComentarioInsert = TableInsert<"comentario">;
export type ComentarioUpdate = TableUpdate<"comentario">;

export type ComentarioMencionRow = TableRow<"comentario_mencion">;
export type ComentarioEdicionRow = TableRow<"comentario_edicion">;

export type AuditoriaRow = TableRow<"auditoria">;
export type AuditoriaInsert = TableInsert<"auditoria">;

export type UsuarioRolRow = TableRow<"usuario_rol">;
export type UsuarioRolInsert = TableInsert<"usuario_rol">;

export type PlantillaEntidadRow = TableRow<"plantillas_entidades">;
export type PlantillaEntidadInsert = TableInsert<"plantillas_entidades">;
export type PlantillaEntidadUpdate = TableUpdate<"plantillas_entidades">;

export type PlantillaCampoRow = TableRow<"plantilla_campos">;
export type PlantillaCampoInsert = TableInsert<"plantilla_campos">;

export type ReglaPlantillaRow = TableRow<"reglas_plantillas">;
export type ReglaPlantillaInsert = TableInsert<"reglas_plantillas">;
export type ReglaPlantillaUpdate = TableUpdate<"reglas_plantillas">;

export type CampoDinamicoRow = TableRow<"campos_dinamicos">;
export type CampoDinamicoInsert = TableInsert<"campos_dinamicos">;
export type CampoDinamicoUpdate = TableUpdate<"campos_dinamicos">;

export type CampoDinamicoOpcionRow = TableRow<"campo_dinamico_opciones">;
export type CampoDinamicoOpcionInsert = TableInsert<"campo_dinamico_opciones">;
export type CampoDinamicoOpcionUpdate = TableUpdate<"campo_dinamico_opciones">;

export type ValorDinamicoRow = TableRow<"valores_dinamicos">;
export type ValorDinamicoInsert = TableInsert<"valores_dinamicos">;

export type LegajoRow = TableRow<"legajo">;

export type AgendaEventoTipoRow = TableRow<"agenda_evento_tipo">;
export type AgendaEventoRow = TableRow<"agenda_evento">;
export type AgendaEventoParticipanteRow = TableRow<"agenda_evento_participante">;
export type AgendaEventoHistorialRow = TableRow<"agenda_evento_historial">;

export type { Json } from "./common";
export type { TableRow, TableInsert, TableUpdate } from "./helpers";
