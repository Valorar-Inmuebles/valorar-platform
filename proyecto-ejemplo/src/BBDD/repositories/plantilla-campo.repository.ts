import type { CasoTramiteCampoDto } from "@/lib/server/services/caso-tramite.types";
import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import sql from "@/BBDD/base/db";

type OpcionRow = {
  id: string;
  etiqueta: string;
  valor: string;
  orden: number;
  activo: boolean;
};

type PlantillaCampoQueryRow = {
  orden: number;
  requerido: boolean;
  campo: {
    id: string;
    clave: string;
    etiqueta: string;
    tipo: string;
    placeholder: string | null;
    valor_default: string | null;
    ayuda: string | null;
    activo: boolean;
    ancho_grilla: number;
    minimo: number | null;
    maximo: number | null;
    longitud_maxima: number | null;
    regex: string | null;
    opciones: OpcionRow[] | null;
  } | null;
};

function mapOpciones(opciones: OpcionRow[] | null | undefined) {
  return (opciones ?? [])
    .filter((o) => o.activo)
    .sort((a, b) => a.orden - b.orden)
    .map((o) => ({
      id: o.id,
      etiqueta: o.etiqueta,
      valor: o.valor,
      orden: o.orden,
    }));
}

export const plantillaCampoRepository = {
  async getCamposByPlantillaId(
    _ctx: DbContext,
    plantillaId: string,
  ): Promise<CasoTramiteCampoDto[]> {
    const rows = await queryRows<PlantillaCampoQueryRow>(
      `SELECT
         pc.orden,
         pc.requerido,
         json_build_object(
           'id', cd.id,
           'clave', cd.clave,
           'etiqueta', cd.etiqueta,
           'tipo', cd.tipo,
           'placeholder', cd.placeholder,
           'valor_default', cd.valor_default,
           'ayuda', cd.ayuda,
           'activo', cd.activo,
           'ancho_grilla', cd.ancho_grilla,
           'minimo', cd.minimo,
           'maximo', cd.maximo,
           'longitud_maxima', cd.longitud_maxima,
           'regex', cd.regex,
           'opciones', COALESCE(
             (
               SELECT json_agg(json_build_object(
                 'id', o.id, 'etiqueta', o.etiqueta, 'valor', o.valor,
                 'orden', o.orden, 'activo', o.activo
               ) ORDER BY o.orden)
               FROM campo_dinamico_opciones o
               WHERE o.campo_dinamico_id = cd.id
             ),
             '[]'::json
           )
         ) AS campo
       FROM plantilla_campos pc
       INNER JOIN campos_dinamicos cd ON cd.id = pc.campo_dinamico_id
       WHERE pc.plantilla_id = $1
       ORDER BY pc.orden ASC`,
      [plantillaId],
    );

    const campos: CasoTramiteCampoDto[] = [];
    for (const row of rows) {
      const campo = row.campo;
      if (!campo?.activo) continue;
      campos.push({
        campo_id: campo.id,
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        obligatorio: row.requerido,
        orden: row.orden,
        placeholder: campo.placeholder,
        valor_default: campo.valor_default,
        ayuda: campo.ayuda,
        ancho_grilla: campo.ancho_grilla,
        minimo: campo.minimo,
        maximo: campo.maximo,
        longitud_maxima: campo.longitud_maxima,
        regex: campo.regex,
        opciones: mapOpciones(campo.opciones),
      });
    }
    return campos;
  },

  async insertMany(
    _ctx: DbContext,
    plantillaId: string,
    campos: Array<{
      campo_dinamico_id: string;
      orden: number;
      requerido: boolean;
    }>,
  ) {
    if (campos.length === 0) return;
    for (const c of campos) {
      await pgQuery(
        `INSERT INTO plantilla_campos (plantilla_id, campo_dinamico_id, orden, requerido)
         VALUES ($1, $2, $3, $4)`,
        [plantillaId, c.campo_dinamico_id, c.orden, c.requerido],
      );
    }
  },

  async replaceForPlantilla(
    _ctx: DbContext,
    plantillaId: string,
    campos: Array<{
      campo_dinamico_id: string;
      orden: number;
      requerido: boolean;
    }>,
  ) {
    await sql.begin(async (tx) => {
      await tx.unsafe(`DELETE FROM plantilla_campos WHERE plantilla_id = $1`, [
        plantillaId,
      ]);
      for (const c of campos) {
        await tx.unsafe(
          `INSERT INTO plantilla_campos (plantilla_id, campo_dinamico_id, orden, requerido)
           VALUES ($1, $2, $3, $4)`,
          [plantillaId, c.campo_dinamico_id, c.orden, c.requerido],
        );
      }
    });
  },

  async getSetupLinksByPlantillaId(_ctx: DbContext, plantillaId: string) {
    const rows = await queryRows<{
      orden: number;
      requerido: boolean;
      campo: { id: string; etiqueta: string; tipo: string } | null;
    }>(
      `SELECT
         pc.orden,
         pc.requerido,
         json_build_object('id', cd.id, 'etiqueta', cd.etiqueta, 'tipo', cd.tipo) AS campo
       FROM plantilla_campos pc
       LEFT JOIN campos_dinamicos cd ON cd.id = pc.campo_dinamico_id
       WHERE pc.plantilla_id = $1
       ORDER BY pc.orden ASC`,
      [plantillaId],
    );

    const links: Array<{
      campo_dinamico_id: string;
      etiqueta: string;
      tipo: string;
      orden: number;
      requerido: boolean;
    }> = [];

    for (const row of rows) {
      if (!row.campo) continue;
      links.push({
        campo_dinamico_id: row.campo.id,
        etiqueta: row.campo.etiqueta,
        tipo: row.campo.tipo,
        orden: row.orden,
        requerido: row.requerido,
      });
    }
    return links;
  },
};
