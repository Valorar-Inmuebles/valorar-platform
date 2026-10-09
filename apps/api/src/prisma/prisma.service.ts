import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client';
import {
  assertRealdataIdentity,
  REALDATA_IDENTITY_SQL,
  validateRealdataConfig,
  type RealdataIdentity,
} from '../common/safety/realdata-safety';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const realdata =
      process.env.VALORAR_DATABASE_ENV === 'realdata'
        ? validateRealdataConfig(process.env)
        : null;
    const pool = new Pool({
      connectionString: realdata?.DATABASE_URL ?? process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    if (process.env.VALORAR_DATABASE_ENV === 'realdata') {
      const config = validateRealdataConfig(process.env);
      const identity = await this.pool.query<RealdataIdentity>(
        REALDATA_IDENTITY_SQL,
      );
      assertRealdataIdentity(identity.rows[0], config);
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
