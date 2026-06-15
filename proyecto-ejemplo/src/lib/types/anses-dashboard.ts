import type { BadgeVariant } from "@/components/ui/badge";

export type AnsesBadgeStatus = {
  label: string;
  variant: BadgeVariant;
  tooltip?: string;
};

export type AnsesClienteResumen = {
  id: string;
  nombre: string;
  iniciales: string;
  tienePassword: boolean;
  estadoPassword: boolean;
  passwordAnterior: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  edad: number;
  nacionalidad: string;
  estadoCivil: string;
  chipLabel: string;
};

export type AnsesInfoCampo = {
  label: string;
  value: string;
};

export type AnsesRelacionFamiliar = {
  id: string;
  tipo: string;
  nombre: string;
  cuil: string;
  fecha?: string;
};

export type AnsesBeneficio = {
  id: string;
  numero: string;
  descripcion: string;
  estado: AnsesBadgeStatus;
};

export type AnsesExpedienteVinculado = {
  id: string;
  numero: string;
  tramite: string;
  estado: AnsesBadgeStatus;
  expedienteJurilexiaId?: string;
  tooltip?: string;
  tieneArchivo: boolean;
  archivoUrl?: string;
  archivoNombre?: string;
};

export type AnsesHistoriaLaboralRow = {
  cuit: string;
  desde: string;
  hasta: string;
  razonSocial: string;
};

export type AnsesSelectOption = {
  value: string;
  label: string;
};

export type AnsesReciboDetalle = {
  beneficioId: string;
  periodoId: string;
  haberBruto: string;
  descuentos: string;
  haberNeto: string;
  fechaPago: string;
};

export type AnsesLogEntry = {
  id: string;
  mensaje: string;
  timestamp: string;
  dotColor: "green" | "orange" | "red" | "blue";
};

export type AnsesDashboardDto = {
  personaId: string;
  cliente: AnsesClienteResumen;
  sincronizacion: {
    ultima: string;
    estado: AnsesBadgeStatus;
    activa: boolean;
  };
  links: {
    verEnCliente: string;
  };
  informacionPersonal: {
    campos: AnsesInfoCampo[];
  };
  relacionesFamiliares: {
    items: AnsesRelacionFamiliar[];
  };
  beneficios: {
    items: AnsesBeneficio[];
  };
  expedientesVinculados: {
    total: number;
    items: AnsesExpedienteVinculado[];
    itemsCerrados: AnsesExpedienteVinculado[];
  };
  historiaLaboral: {
    filas: AnsesHistoriaLaboralRow[];
  };
  recibos: {
    beneficios: AnsesSelectOption[];
    periodos: AnsesSelectOption[];
    beneficioSeleccionado: string;
    periodoSeleccionado: string;
    items: AnsesReciboDetalle[];
  };
};

export type AnsesOverviewDto = {
  integracion: {
    activa: boolean;
    ultimaSyncClientes: string;
    proximaSyncClientes: string;
    ultimaSyncSentencias: string;
    proximaSyncSentencias: string;
    corriendo: boolean;
  };
  metricas: {
    titulo: string;
    items: Array<{ label: string; value: string | number }>;
  };
  logs: {
    items: AnsesLogEntry[];
    verTodoLabel: string;
  };
};
