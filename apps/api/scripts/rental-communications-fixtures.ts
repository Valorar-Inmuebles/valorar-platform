import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { validateDevelopmentDatabaseTarget } from '../src/common/safety/development-database-safety';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RentalCommunicationsFixtureService } from '../src/modules/rental-reminder/dev/rental-communications-fixture.service';

const apiDirectory = resolve(__dirname, '..');
const developmentEnvPath = resolve(apiDirectory, '.env.development.local');
const baselineEnvPath = resolve(apiDirectory, '.env');

@Module({
  imports: [PrismaModule],
})
class RentalCommunicationsFixtureRunnerModule {}

function fail(messages: string[]): never {
  process.stderr.write(
    `${messages.map((message) => `- ${message}`).join('\n')}\n`,
  );
  process.exit(1);
}

function option(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv
    .slice(3)
    .find((argument) => argument.startsWith(prefix));
  return value?.slice(prefix.length);
}

function readEnvironmentFile(path: string): Record<string, string> {
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

async function main() {
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
    fail(['Development database target rejected.', ...safety.errors]);
  }

  const apply = process.argv.includes('--apply');
  const rawNow = option('now');
  const now = rawNow ? new Date(rawNow) : new Date();
  if (Number.isNaN(now.getTime()))
    fail(['Invalid --now. Use an ISO-8601 timestamp.']);

  process.env.DATABASE_URL = developmentEnvironment.DATABASE_URL;
  process.env.NODE_ENV = 'development';
  process.env.VALORAR_DATABASE_ENV = 'development';

  const context = await NestFactory.createApplicationContext(
    RentalCommunicationsFixtureRunnerModule,
    { logger: ['error', 'warn'] },
  );
  try {
    const service = new RentalCommunicationsFixtureService(
      context.get(PrismaService),
    );
    const result = await service.run({
      apply,
      now,
      environment: process.env,
      baselineDatabaseUrl: baselineEnvironment.DATABASE_URL,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) {
      process.exitCode = 1;
    }
  } finally {
    await context.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `Rental communications fixture runner failed: ${message}\n`,
  );
  process.exit(1);
});
