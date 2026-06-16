export type CasoTramiteCampoOpcionDto = {
  id: string;
  etiqueta: string;
  valor: string;
  orden: number;
};

export type CasoTramiteCampoDto = {
  campo_id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  obligatorio: boolean;
  orden: number;
  placeholder: string | null;
  valor_default: string | null;
  ayuda: string | null;
  ancho_grilla: number;
  minimo: number | null;
  maximo: number | null;
  longitud_maxima: number | null;
  regex: string | null;
  opciones: CasoTramiteCampoOpcionDto[];
};

export type CasoTramitePlantillaCamposResponse = {
  suggested_plantilla_id: string | null;
  effective_plantilla_id: string | null;
  campos: CasoTramiteCampoDto[];
};

export type CasoTramiteWithValoresResponse = CasoTramitePlantillaCamposResponse & {
  valores: Record<string, unknown>;
};
