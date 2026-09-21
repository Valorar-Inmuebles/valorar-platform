import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RentalReminderRepository } from '../src/modules/rental-reminder/repositories/rental-reminder.repository';
import { ReminderDeliveryOrchestratorService } from '../src/modules/rental-reminder/services/reminder-delivery-orchestrator.service';
import { ReminderDeliveryRevalidationService } from '../src/modules/rental-reminder/services/reminder-delivery-revalidation.service';
import { ReminderPlannerService } from '../src/modules/rental-reminder/services/reminder-planner.service';
import { ReminderEmailProcessorService } from '../src/modules/rental-reminder/services/reminder-email-processor.service';
import { RentalReminderEmailRenderer } from '../src/modules/rental-reminder/templates/rental-reminder-email.renderer';
import { MailerSendAdapter } from '../src/modules/rental-reminder/providers/mailersend.adapter';
import { mailerSendConfigurationPresence } from '../src/modules/rental-reminder/config/mailersend.config';

type Command = 'planner' | 'claim' | 'email';

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
  if (!command || !['planner', 'claim', 'email'].includes(command))
    fail('Expected planner, claim or email.');

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
    if (command === 'email') {
      const tenantId = option('tenant-id');
      const deliveryId = option('delivery-id');
      if (!tenantId || !deliveryId)
        fail('Email requires --tenant-id and --delivery-id.');
      const processor = new ReminderEmailProcessorService(
        repository,
        orchestrator,
        new RentalReminderEmailRenderer(),
        new MailerSendAdapter(),
      );
      const preview = await processor.preview(tenantId, deliveryId);
      if (!preview)
        fail('No pending EMAIL delivery matched the requested IDs.');
      const destination = preview.destinationSnapshot;
      const masked = destination.replace(/^(.{2}).*(@.*)$/, '$1***$2');
      process.stdout.write(
        `${JSON.stringify(
          {
            mode: apply ? 'send' : 'dry-run',
            tenantId,
            deliveryId,
            dispatchId: preview.dispatchId,
            contractId: preview.dispatch.contractId,
            contractNumber: preview.dispatch.contract.internalNumber,
            channel: preview.channel,
            destination: masked,
          },
          null,
          2,
        )}\n`,
      );
      if (!process.argv.includes('--send')) return;
      if (!apply) fail('Real email requires both --apply and --send.');
      const presence = mailerSendConfigurationPresence();
      if (!presence.apiToken || !presence.fromEmail || !presence.fromName)
        fail('MailerSend provider configuration is incomplete.');
      const allowed =
        process.env.MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT?.trim();
      if (!allowed || allowed.toLowerCase() !== destination.toLowerCase())
        fail('Destination is not MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT.');
      const result = await processor.processOne(tenantId, deliveryId, now);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
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
