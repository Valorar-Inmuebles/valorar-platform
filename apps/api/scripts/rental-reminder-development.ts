import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RentalReminderRepository } from '../src/modules/rental-reminder/repositories/rental-reminder.repository';
import { ReminderDeliveryOrchestratorService } from '../src/modules/rental-reminder/services/reminder-delivery-orchestrator.service';
import { ReminderDeliveryRevalidationService } from '../src/modules/rental-reminder/services/reminder-delivery-revalidation.service';
import { ReminderPlannerService } from '../src/modules/rental-reminder/services/reminder-planner.service';

type Command = 'planner' | 'claim';

@Module({
  imports: [PrismaModule],
})
class RentalReminderRunnerModule {}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function option(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv
    .slice(3)
    .find((argument) => argument.startsWith(prefix));
  return value?.slice(prefix.length);
}

function parseNow() {
  const raw = option('now');
  const now = raw ? new Date(raw) : new Date();
  if (Number.isNaN(now.getTime()))
    fail('Invalid --now. Use an ISO-8601 timestamp.');
  return now;
}

async function main() {
  const command = process.argv[2] as Command | undefined;
  if (command !== 'planner' && command !== 'claim')
    fail('Expected planner or claim.');

  const apply = process.argv.includes('--apply');
  if (command === 'claim' && !apply)
    fail('Claim is mutating and requires explicit --apply.');
  const now = parseNow();
  const context = await NestFactory.createApplicationContext(
    RentalReminderRunnerModule,
    { logger: ['error', 'warn'] },
  );
  try {
    const repository = new RentalReminderRepository(context.get(PrismaService));
    const revalidation = new ReminderDeliveryRevalidationService(repository);
    if (command === 'planner') {
      const planner = new ReminderPlannerService(repository);
      const result = await planner.run(now, { dryRun: !apply });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    const orchestrator = new ReminderDeliveryOrchestratorService(
      repository,
      revalidation,
    );
    const result = await orchestrator.claimNext(now, {
      tenantId: option('tenant-id'),
    });
    if (!result) {
      process.stdout.write('No ready delivery.\n');
      return;
    }
    process.stdout.write(
      `${JSON.stringify(
        result.disposition === 'CLAIMED'
          ? {
              disposition: result.disposition,
              deliveryId: result.delivery.id,
              tenantId: result.delivery.tenantId,
              channel: result.delivery.channel,
              lockedUntil: result.lockedUntil,
            }
          : result,
        null,
        2,
      )}\n`,
    );
    if (result.disposition === 'CLAIMED' && !process.argv.includes('--hold')) {
      await orchestrator.release({
        tenantId: result.delivery.tenantId,
        deliveryId: result.delivery.id,
        leaseToken: result.leaseToken,
      });
      process.stdout.write('Lease released (use --hold to retain it).\n');
    }
  } finally {
    await context.close();
  }
}

void main();
