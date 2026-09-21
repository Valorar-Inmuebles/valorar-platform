import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { validateDevelopmentDatabaseTarget } from '../src/common/safety/development-database-safety';

const apiDirectory = resolve(__dirname, '..');
const developmentEnvPath = resolve(apiDirectory, '.env.development.local');
const baselineEnvPath = resolve(apiDirectory, '.env');

type SupportedCommand =
  | 'check'
  | 'inspect'
  | 'migrate-deploy'
  | 'migrate-status'
  | 'seed'
  | 'api'
  | 'reminder-planner'
  | 'reminder-claim'
  | 'reminder-email'
  | 'reminder-whatsapp';

function readEnvironmentFile(path: string): Record<string, string> {
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

function fail(messages: string[]): never {
  process.stderr.write(
    `Development database preflight ABORTED:\n${messages.map((message) => `- ${message}`).join('\n')}\n`,
  );
  process.exit(1);
}

function resolveCommand(command: string | undefined): SupportedCommand {
  const supported: SupportedCommand[] = [
    'check',
    'inspect',
    'migrate-deploy',
    'migrate-status',
    'seed',
    'api',
    'reminder-planner',
    'reminder-claim',
    'reminder-email',
    'reminder-whatsapp',
  ];
  if (!command || !supported.includes(command as SupportedCommand)) {
    fail([
      `Expected one command: ${supported.join(', ')}.`,
      'No database process was started.',
    ]);
  }
  return command as SupportedCommand;
}

function runNodeCli(
  moduleId: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
): never {
  const cliPath = require.resolve(moduleId);
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: apiDirectory,
    env: environment,
    stdio: 'inherit',
  });

  if (result.error) {
    process.stderr.write(
      `Could not start child process: ${result.error.message}\n`,
    );
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const command = resolveCommand(process.argv[2]);
if (!existsSync(developmentEnvPath)) {
  fail([
    'apps/api/.env.development.local does not exist.',
    'Copy .env.development.local.example and add the isolated development connection string.',
  ]);
}

const developmentEnvironment = readEnvironmentFile(developmentEnvPath);
const baselineEnvironment = readEnvironmentFile(baselineEnvPath);
const safety = validateDevelopmentDatabaseTarget({
  databaseUrl: developmentEnvironment.DATABASE_URL,
  databaseEnvironment: developmentEnvironment.VALORAR_DATABASE_ENV,
  nodeEnvironment: developmentEnvironment.NODE_ENV,
  baselineDatabaseUrl: baselineEnvironment.DATABASE_URL,
});

if (!safety.ok) {
  fail(safety.errors);
}

process.stdout.write(
  [
    'Development database preflight OK',
    `source=${developmentEnvPath}`,
    `host=${safety.target.host}`,
    `database=${safety.target.database}`,
    `endpoint=${safety.target.endpoint}`,
    'protected_endpoint_check=passed',
  ].join('\n') + '\n',
);

if (command === 'check') {
  process.exit(0);
}

const childEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  ...developmentEnvironment,
  DATABASE_URL: developmentEnvironment.DATABASE_URL,
  NODE_ENV: 'development',
  VALORAR_DATABASE_ENV: 'development',
};

if (command === 'inspect') {
  runNodeCli(
    'tsx/cli',
    [resolve(apiDirectory, 'scripts', 'db-development-inspect.ts')],
    childEnvironment,
  );
}

if (command === 'migrate-deploy') {
  runNodeCli('prisma/build/index.js', ['migrate', 'deploy'], childEnvironment);
}
if (command === 'migrate-status') {
  runNodeCli('prisma/build/index.js', ['migrate', 'status'], childEnvironment);
}
if (command === 'seed') {
  runNodeCli('prisma/build/index.js', ['db', 'seed'], childEnvironment);
}
if (command === 'api') {
  runNodeCli('@nestjs/cli/bin/nest.js', ['start', '--watch'], childEnvironment);
}
if (
  command === 'reminder-planner' ||
  command === 'reminder-claim' ||
  command === 'reminder-email' ||
  command === 'reminder-whatsapp'
) {
  runNodeCli(
    'tsx/cli',
    [
      resolve(apiDirectory, 'scripts', 'rental-reminder-development.ts'),
      command === 'reminder-planner'
        ? 'planner'
        : command === 'reminder-claim'
          ? 'claim'
          : command === 'reminder-email'
            ? 'email'
            : 'whatsapp',
      ...process.argv.slice(3),
    ],
    childEnvironment,
  );
}

process.exit(0);
