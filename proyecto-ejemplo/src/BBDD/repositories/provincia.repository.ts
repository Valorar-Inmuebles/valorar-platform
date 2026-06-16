import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type ProvinciaRow = {
  id: string;
  nombre: string;
  codigo_iso: string | null;
  codigo_afip: string | null;
};

export const provinciaRepository = {
  async getAll(_ctx: DbContext): Promise<ProvinciaRow[]> {
    const provincias = await queryRows<ProvinciaRow>(
      `SELECT id, nombre, codigo_iso, codigo_afip
       FROM provincias
       ORDER BY nombre ASC`,
    );

    const caba = provincias.find(
      (p) => p.nombre === "Ciudad Autónoma de Buenos Aires",
    );
    const resto = provincias.filter(
      (p) => p.nombre !== "Ciudad Autónoma de Buenos Aires",
    );

    return caba ? [caba, ...resto] : resto;
  },
};
