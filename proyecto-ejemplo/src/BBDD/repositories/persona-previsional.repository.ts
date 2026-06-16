import type { PersonaPrevisionalRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { queryOne } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import { encrypt } from "@/lib/server/services/anses-crypt";

export type { PersonaPrevisionalRow };

const SELECT_FIELDS =
  "persona_id, numero_beneficio, secret, estado_anses, sincronizar_anses";

export const personaPrevisionalRepository = {
  async getByPersonaId(
    _ctx: DbContext,
    personaId: string,
  ): Promise<PersonaPrevisionalRow | null> {
    return queryOne<PersonaPrevisionalRow>(
      `SELECT ${SELECT_FIELDS} FROM persona_previsional WHERE persona_id = $1`,
      [personaId],
    );
  },

  async upsertSecretByPersonaId(
    _ctx: DbContext,
    personaId: string,
    secret: string,
  ): Promise<void> {
    const secretEncrypted = JSON.stringify(encrypt(secret));
    await pgQuery(
      `INSERT INTO persona_previsional (persona_id, secret, estado_anses)
       VALUES ($1, $2, NULL)
       ON CONFLICT (persona_id)
       DO UPDATE SET secret = EXCLUDED.secret, estado_anses = NULL`,
      [personaId, secretEncrypted],
    );
  },

  async updateSincronizarAnsesByPersonaId(
    _ctx: DbContext,
    personaId: string,
    sincronizarAnses: 0 | 1,
  ): Promise<void> {
    await pgQuery(
      `UPDATE persona_previsional SET sincronizar_anses = $1 WHERE persona_id = $2`,
      [sincronizarAnses, personaId],
    );
  },
};
