import type { BadgeVariant } from "@/components/ui/badge";

export type AnsesBadgeStatus = {
  label: string;
  variant: BadgeVariant;
};

export type AnsesCruceRow = {
  id: string;
  periodo: string;
  fechaEjecucion: string;
  clientesProcesados: number;
  estado: AnsesBadgeStatus;
  archivoNombre?: string;
  archivoUrl?: string;
};

export type AnsesCrucesPageDto = {
  titulo: string;
  subtitulo: string;
  // ejecutarCruceLabel: string;
  filas: AnsesCruceRow[];
  total: number;
};

export type ClienteSentencia = {
  nombre: string;
  beneficio: string;
  detalle: string;
  mesanio: string;
};
