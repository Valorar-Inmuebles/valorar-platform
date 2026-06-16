import type { CampoDinamicoDetail } from "@/BBDD/repositories/campos-dinamicos.repository";

/**
 * Runtime-oriented metadata for dynamic fields.
 * Prepared for future consumers: validation, search, filters, table columns, layouts.
 * Does NOT include template-level overrides (e.g. plantilla_campos.requerido).
 */
export type CampoDinamicoRuntimeMetadata = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  contexto: string;
  presentation: {
    placeholder: string | null;
    ayuda: string | null;
    valor_default: string | null;
    ancho_grilla: number;
  };
  validation: {
    /** Catalog default; plantilla_campos.requerido overrides at runtime. */
    requerido_default: boolean;
    minimo: number | null;
    maximo: number | null;
    longitud_maxima: number | null;
    regex: string | null;
  };
  behavior: {
    buscable: boolean;
    filtrable: boolean;
    visible_tabla: boolean;
    activo: boolean;
  };
  opciones: Array<{
    id: string;
    etiqueta: string;
    valor: string;
    orden: number;
    activo: boolean;
  }>;
};

export function mapCampoDinamicoToRuntimeMetadata(
  detail: CampoDinamicoDetail,
): CampoDinamicoRuntimeMetadata {
  return {
    id: detail.id,
    clave: detail.clave,
    etiqueta: detail.etiqueta,
    tipo: detail.tipo,
    contexto: detail.contexto,
    presentation: {
      placeholder: detail.placeholder,
      ayuda: detail.ayuda,
      valor_default: detail.valor_default,
      ancho_grilla: detail.ancho_grilla,
    },
    validation: {
      requerido_default: detail.requerido,
      minimo: detail.minimo,
      maximo: detail.maximo,
      longitud_maxima: detail.longitud_maxima,
      regex: detail.regex,
    },
    behavior: {
      buscable: detail.buscable,
      filtrable: detail.filtrable,
      visible_tabla: detail.visible_tabla,
      activo: detail.activo,
    },
    opciones: detail.opciones.map((o) => ({
      id: o.id,
      etiqueta: o.etiqueta,
      valor: o.valor,
      orden: o.orden,
      activo: o.activo,
    })),
  };
}
