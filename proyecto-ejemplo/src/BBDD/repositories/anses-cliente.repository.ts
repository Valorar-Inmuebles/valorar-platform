// import type { Json } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { queryOne, queryRows } from "@/BBDD/base/query";

export type AnsesClienteRow = {
  id: number;
  cliente_id: string;
  datos: string;
  created_at: string;
  tipo: string;
  datos_ref: string | null;
  version: number;
};

const SELECT_FIELDS = "id, cliente_id, datos, created_at, tipo, datos_ref, version";

export const ansesClienteRepository = {
  async getAllByCliente(
    _ctx: DbContext,
    clienteId: string,
  ): Promise<AnsesClienteRow[]> {
    return queryRows<AnsesClienteRow>(
      `SELECT ${SELECT_FIELDS} FROM anses_cliente WHERE cliente_id = $1 ORDER BY created_at DESC`,
      [clienteId],
    );
  },

  async getById(_ctx: DbContext, id: number): Promise<AnsesClienteRow> {
    const row = await queryOne<AnsesClienteRow>(
      `SELECT ${SELECT_FIELDS} FROM anses_cliente WHERE id = $1`,
      [id],
    );
    if (!row) throw new Error("Registro ANSES no encontrado");
    return row;
  },

  async getAllByClienteAndTipo(
    _ctx: DbContext,
    clienteId: string,
    tipo: string,
  ): Promise<AnsesClienteRow[]> {
    return queryRows<AnsesClienteRow>(
      `SELECT ${SELECT_FIELDS}
       FROM anses_cliente
       WHERE cliente_id = $1 AND tipo = $2
       ORDER BY created_at DESC`,
      [clienteId, tipo],
    );
  },

  async getLatestByClienteAndTipo(
    _ctx: DbContext,
    clienteId: string,
    tipo: string,
  ): Promise<AnsesClienteRow | null> {
    return queryOne<AnsesClienteRow>(
      `SELECT ${SELECT_FIELDS}
       FROM anses_cliente
       WHERE cliente_id = $1 AND tipo = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [clienteId, tipo],
    );
  },

  // async create(
  //   _ctx: DbContext,
  //   clienteId: string,
  //   payload: { datos: Json; tipo: string; datos_ref?: string | null },
  // ): Promise<AnsesClienteRow> {
  //   const row = await queryOne<AnsesClienteRow>(
  //     `INSERT INTO anses_cliente (cliente_id, datos, tipo, datos_ref)
  //      VALUES ($1, $2, $3, $4)
  //      RETURNING ${SELECT_FIELDS}`,
  //     [clienteId, payload.datos, payload.tipo, payload.datos_ref ?? null],
  //   );
  //   if (!row) throw new Error("Error al crear registro ANSES");
  //   return row;
  // },
};
