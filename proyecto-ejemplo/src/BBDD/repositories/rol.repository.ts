import { queryRows } from "@/BBDD/base/query";

export type RolListItem = {
  id: string;
  nombre: string;
};

export const rolRepository = {
  async listAll(): Promise<RolListItem[]> {
    return queryRows<RolListItem>(
      `SELECT id, nombre FROM rol ORDER BY nombre ASC`
    );
  },

  async findIds(rolIds: string[]): Promise<string[]> {
    if (rolIds.length === 0) return [];
    const rows = await queryRows<{ id: string }>(
      `SELECT id FROM rol WHERE id = ANY($1::uuid[])`,
      [rolIds],
    );
    return rows.map((r) => r.id);
  },
};
