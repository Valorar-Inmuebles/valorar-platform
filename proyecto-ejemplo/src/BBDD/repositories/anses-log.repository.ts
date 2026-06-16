import type { DbContext } from "@/BBDD/base/types";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export type AnsesLogRow = {
  id: number;
  cliente_id: string;
  status: number;
  log: string;
  created_at: string;
};

const SELECT_FIELDS = "id, cliente_id, status, log, created_at";

export const ansesLogRepository = {
  async getAllByCliente(_ctx: DbContext, clienteId: string): Promise<AnsesLogRow[]> {
    return queryRows<AnsesLogRow>(
      `SELECT ${SELECT_FIELDS} FROM anses_log WHERE cliente_id = $1 ORDER BY created_at DESC`,
      [clienteId],
    );
  },

  async getById(_ctx: DbContext, id: number): Promise<AnsesLogRow> {
    const row = await queryOne<AnsesLogRow>(
      `SELECT ${SELECT_FIELDS} FROM anses_log WHERE id = $1`,
      [id],
    );
    if (!row) throw new Error("Log ANSES no encontrado");
    return row;
  },

  async getLatestByCliente(
    _ctx: DbContext,
    clienteId: string,
  ): Promise<AnsesLogRow | null> {
    return queryOne<AnsesLogRow>(
      `SELECT ${SELECT_FIELDS} FROM anses_log WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clienteId],
    );
  },

  async create(
    _ctx: DbContext,
    clienteId: string,
    payload: { status: number; log: string },
  ): Promise<AnsesLogRow> {
    const row = await queryOne<AnsesLogRow>(
      `INSERT INTO anses_log (cliente_id, status, log)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_FIELDS}`,
      [clienteId, payload.status, payload.log],
    );
    if (!row) throw new Error("Error al crear log ANSES");
    return row;
  },
};
