import type { FueroRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type { FueroRow };

export const fueroRepository = {
  async getAll(_ctx: DbContext): Promise<FueroRow[]> {
    return queryRows<FueroRow>(
      `SELECT id, nombre, orden FROM fuero ORDER BY orden ASC, nombre ASC`,
    );
  },
};
