import { queryOne } from "@/BBDD/base/query";

export type ErrorLogInsert = {
  url: string | null;
  error: string;
  info_adicional: string | null;
};

export const errorLogRepository = {
  async create(payload: ErrorLogInsert): Promise<{ id: string }> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO error (url, error, info_adicional)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [payload.url, payload.error, payload.info_adicional],
    );
    if (!row) throw new Error("Error al registrar log de error");
    return row;
  },
};
