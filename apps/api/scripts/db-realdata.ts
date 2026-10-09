import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { Client } from 'pg';
import {
  assertRealdataIdentity,
  REALDATA_FILE_KEYS,
  REALDATA_HOST,
  REALDATA_IDENTITY_SQL,
  realdataEnvironment,
  realdataCommand,
  validateRealdataFile,
  type RealdataIdentity,
} from '../src/common/safety/realdata-safety';

const apiDirectory = resolve(__dirname, '..');
const adminDirectory = resolve(apiDirectory, '../admin');
const envPath = resolve(apiDirectory, '.env.realdata.local');

async function main() {
  const command = realdataCommand(process.argv.slice(2));
  if (!existsSync(envPath))
    throw new Error(
      'Copiar apps/api/.env.realdata.local.example a .env.realdata.local y completar sus cuatro claves.',
    );
  const file = parse(readFileSync(envPath));
  const config = validateRealdataFile(file);
  const env = realdataEnvironment(config, process.env);
  // dotenv/config in API must never fall back to apps/api/.env.
  env.DOTENV_CONFIG_PATH = envPath;
  // dotenv 16 treats even the string "false" as truthy. Leave override absent.
  console.log(
    `RealData preflight offline OK: ${REALDATA_HOST}/neondb; read-only, servicios externos sin credenciales.`,
  );
  if (command === 'check') return;

  if (command !== 'admin') {
    const client = new Client({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    });
    try {
      await client.connect();
      await client.query(
        'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
      const identity = (
        await client.query<RealdataIdentity>(REALDATA_IDENTITY_SQL)
      ).rows[0];
      assertRealdataIdentity(identity, config);
      console.log(JSON.stringify({ identity }));
      if (command === 'inspect') {
        const counts: Record<string, string> = {};
        for (const table of [
          'Property',
          'PropertyImage',
          'Development',
          'DevelopmentImage',
          'DevelopmentTypology',
        ]) {
          const result = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM "${table}"`,
          );
          counts[table] = result.rows[0].count;
        }
        console.log(JSON.stringify({ counts }));
      }
      await client.query('ROLLBACK');
    } catch {
      // Never emit driver errors: they can include connection strings or credentials.
      throw new Error(
        'RealData: conexión/identidad read-only falló; ningún proceso API iniciado. Revisar endpoint, IDs y acceso SSL.',
      );
    } finally {
      await client.end();
    }
  }
  if (command === 'inspect') return;
  if (command === 'admin') {
    // Next loads its own .env* files. Shadow every defined key, then supply only local settings.
    for (const name of [
      '.env',
      '.env.local',
      '.env.development',
      '.env.development.local',
    ]) {
      const path = resolve(adminDirectory, name);
      if (existsSync(path))
        for (const key of Object.keys(parse(readFileSync(path)))) env[key] = '';
    }
    // Admin never receives DB credentials or JWT signing secret.
    for (const key of [
      ...REALDATA_FILE_KEYS,
      'DOTENV_CONFIG_PATH',
      'DOTENV_CONFIG_OVERRIDE',
    ])
      delete env[key];
    Object.assign(env, {
      DATABASE_URL: '',
      JWT_SECRET: '',
      NODE_ENV: 'development',
      VALORAR_DATABASE_ENV: 'realdata',
      API_URL: 'http://127.0.0.1:3202',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3202',
      REVALIDATE_SECRET: '',
      PUBLIC_WEB_URL: '',
      NEXT_PUBLIC_SITE_URL: '',
      PORT: '3201',
    });
  }
  const cli =
    command === 'api'
      ? require.resolve('@nestjs/cli/bin/nest.js')
      : require.resolve('next/dist/bin/next', { paths: [adminDirectory] });
  const args =
    command === 'api'
      ? ['start', '--watch']
      : ['dev', '--hostname', '127.0.0.1', '--port', '3201'];
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: command === 'api' ? apiDirectory : adminDirectory,
    env,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'RealData: inicio abortado.',
  );
  process.exitCode = 1;
});
