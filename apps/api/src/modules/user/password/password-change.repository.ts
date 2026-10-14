import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type PasswordAdmission =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

@Injectable()
export class PasswordChangeRepository {
  constructor(private readonly prisma: PrismaService) {}

  consume(userId: string): Promise<PasswordAdmission> {
    return this.prisma.$transaction(
      async (tx) => {
        // Transaction-local only: safe with PgBouncer transaction pooling.
        await tx.$executeRaw`SET LOCAL lock_timeout = '1s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '2s'`;
        await tx.$executeRaw`
        INSERT INTO "PasswordChangeRateLimit" ("userId", "expiresAt")
        VALUES (${userId}, clock_timestamp()) ON CONFLICT ("userId") DO NOTHING
      `;
        const rows = await tx.$queryRaw<{ userId: string }[]>`
        SELECT "userId" FROM "PasswordChangeRateLimit"
        WHERE "userId" = ${userId} FOR UPDATE
      `;
        // A concurrent maintenance delete must never grant an unrecorded admission.
        if (rows.length !== 1) throw new Error('Rate limit state unavailable');
        const result = await tx.$queryRaw<
          { allowed: boolean; retryAfterSeconds: number }[]
        >`
        WITH instant AS MATERIALIZED (
          SELECT clock_timestamp()::timestamptz(3) AS now
        ), active AS MATERIALIZED (
          SELECT ARRAY(
            SELECT attempt FROM unnest(r."attemptedAt") AS attempt
            WHERE attempt > instant.now - interval '15 minutes' ORDER BY attempt
          ) AS attempts, instant.now
          FROM "PasswordChangeRateLimit" r CROSS JOIN instant
          WHERE r."userId" = ${userId}
        )
        UPDATE "PasswordChangeRateLimit" r
        SET "attemptedAt" = CASE WHEN cardinality(active.attempts) < 5
              THEN array_append(active.attempts, active.now) ELSE active.attempts END,
            "expiresAt" = CASE WHEN cardinality(active.attempts) < 5
              THEN active.now + interval '15 minutes' ELSE r."expiresAt" END
        FROM active WHERE r."userId" = ${userId}
        RETURNING cardinality(active.attempts) < 5 AS allowed,
          GREATEST(1, ceil(extract(epoch FROM
            (active.attempts[1] + interval '15 minutes' - active.now))))::int AS "retryAfterSeconds"
      `;
        if (!result[0]) throw new Error('Rate limit decision unavailable');
        return result[0].allowed
          ? { allowed: true }
          : {
              allowed: false,
              retryAfterSeconds: result[0].retryAfterSeconds,
            };
      },
      { isolationLevel: 'ReadCommitted', maxWait: 2000, timeout: 5000 },
    );
  }

  async credentials(
    userId: string,
  ): Promise<{ passwordHash: string; isActive: boolean } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, isActive: true },
    });
  }

  async replacePassword(
    userId: string,
    previousHash: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, passwordHash: previousHash, isActive: true },
      data: { passwordHash },
    });
    return result.count === 1;
  }
}
