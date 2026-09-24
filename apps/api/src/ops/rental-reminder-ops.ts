import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { RentalReminderRepository } from '../modules/rental-reminder/repositories/rental-reminder.repository';
import { ReminderDeliveryOrchestratorService } from '../modules/rental-reminder/services/reminder-delivery-orchestrator.service';
import { ReminderDeliveryRevalidationService } from '../modules/rental-reminder/services/reminder-delivery-revalidation.service';
import { ReminderPlannerService } from '../modules/rental-reminder/services/reminder-planner.service';
import { ReminderEmailProcessorService } from '../modules/rental-reminder/services/reminder-email-processor.service';
import { ReminderWhatsAppProcessorService } from '../modules/rental-reminder/services/reminder-whatsapp-processor.service';
import { RentalReminderEmailRenderer } from '../modules/rental-reminder/templates/rental-reminder-email.renderer';
import { RentalReminderWhatsAppRenderer } from '../modules/rental-reminder/templates/rental-reminder-whatsapp.renderer';
import { MailerSendAdapter } from '../modules/rental-reminder/providers/mailersend.adapter';
import { MetaWhatsAppAdapter } from '../modules/rental-reminder/providers/meta-whatsapp.adapter';
import {
  checkOperationalRecipientAllowlist,
  type RentalReminderOpsChannel,
} from './rental-reminder-ops-allowlist';

@Module({ imports: [PrismaModule] })
class RentalReminderOpsModule {}

type Command = 'planner' | 'email' | 'whatsapp';

const HELP = `
Operational Rental Reminders runner

Commands:
  planner  --tenant-id=<id> [--apply]
  email    --tenant-id=<id> --delivery-id=<id> --apply --send
  whatsapp --tenant-id=<id> --delivery-id=<id> --template-name=<name> --template-language=<code> --template-parameters=<none|rental-v1> --apply --send

Planner is dry-run by default. Provider commands require both --apply and --send.
This runner is tenant-scoped and must run inside the approved operational runtime.
`;

function fail(message: string): never {
  throw new Error(message);
}

function hasFlag(args: string[], name: string) {
  return args.includes(`--${name}`);
}

function option(args: string[], name: string) {
  const prefix = `--${name}=`;
  const value = args.find((argument) => argument.startsWith(prefix));
  return value?.slice(prefix.length).trim();
}

function assertAllowedOptions(args: string[], allowed: Set<string>) {
  for (const argument of args) {
    if (!argument.startsWith('--')) fail(`Invalid argument: ${argument}`);
    const name = argument.slice(2).split('=', 1)[0];
    if (!allowed.has(name)) fail(`Invalid option for this command: --${name}`);
  }
}

function requiredOption(args: string[], name: string) {
  const value = option(args, name);
  if (!value) fail(`--${name}=... is required.`);
  return value;
}

function parseCommand(value: string | undefined): Command {
  if (value === 'planner' || value === 'email' || value === 'whatsapp')
    return value;
  fail('Expected planner, email or whatsapp.');
}

function maskDestination(channel: RentalReminderOpsChannel, value: string) {
  if (channel === 'EMAIL') return value.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  return `${value.slice(0, 3)}${'*'.repeat(Math.max(4, value.length - 7))}${value.slice(-4)}`;
}

function assertProviderFlags(args: string[]) {
  if (!hasFlag(args, 'apply') || !hasFlag(args, 'send'))
    fail('Provider commands require both --apply and --send.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    process.stdout.write(`${HELP.trimStart()}\n`);
    return;
  }

  const command = parseCommand(args[0]);
  const commandArgs = args.slice(1);
  const tenantId = requiredOption(commandArgs, 'tenant-id');

  if (command === 'planner') {
    assertAllowedOptions(commandArgs, new Set(['tenant-id', 'apply']));
  } else if (command === 'email') {
    assertAllowedOptions(
      commandArgs,
      new Set(['tenant-id', 'delivery-id', 'apply', 'send']),
    );
    assertProviderFlags(commandArgs);
  } else {
    assertAllowedOptions(
      commandArgs,
      new Set([
        'tenant-id',
        'delivery-id',
        'template-name',
        'template-language',
        'template-parameters',
        'apply',
        'send',
      ]),
    );
    assertProviderFlags(commandArgs);
  }

  const context = await NestFactory.createApplicationContext(
    RentalReminderOpsModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const repository = new RentalReminderRepository(context.get(PrismaService));
    const revalidation = new ReminderDeliveryRevalidationService(repository);
    const orchestrator = new ReminderDeliveryOrchestratorService(
      repository,
      revalidation,
    );
    const now = new Date();

    if (command === 'planner') {
      const planner = new ReminderPlannerService(repository);
      const result = await planner.runForTenant(tenantId, now, {
        dryRun: !hasFlag(commandArgs, 'apply'),
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    const deliveryId = requiredOption(commandArgs, 'delivery-id');
    if (command === 'email') {
      const processor = new ReminderEmailProcessorService(
        repository,
        orchestrator,
        new RentalReminderEmailRenderer(),
        new MailerSendAdapter(),
      );
      const preview = await processor.preview(tenantId, deliveryId);
      if (!preview) fail('Delivery not found for the requested tenant.');
      const destination = preview.destinationSnapshot;
      const allowlist = checkOperationalRecipientAllowlist({
        channel: 'EMAIL',
        destination,
      });
      if (!allowlist.allowed)
        fail('Delivery destination is not the operational email allowlist.');
      const result = await processor.processOne(tenantId, deliveryId, now);
      process.stdout.write(
        `${JSON.stringify(
          {
            command,
            tenantId,
            deliveryId,
            destination: maskDestination('EMAIL', destination),
            result,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const templateName = requiredOption(commandArgs, 'template-name');
    const templateLanguage = requiredOption(commandArgs, 'template-language');
    const templateParameters = requiredOption(
      commandArgs,
      'template-parameters',
    );
    if (templateParameters !== 'none' && templateParameters !== 'rental-v1')
      fail('--template-parameters must be none or rental-v1.');

    const processor = new ReminderWhatsAppProcessorService(
      repository,
      orchestrator,
      new RentalReminderWhatsAppRenderer(),
      new MetaWhatsAppAdapter(),
    );
    const preview = await processor.preview(tenantId, deliveryId, {
      name: templateName,
      languageCode: templateLanguage,
      parameterMode: templateParameters === 'rental-v1' ? 'RENTAL_V1' : 'NONE',
    });
    if (!preview) fail('Delivery not found for the requested tenant.');
    const destination = preview.delivery.destinationSnapshot;
    const normalized = checkOperationalRecipientAllowlist({
      channel: 'WHATSAPP',
      destination,
    });
    if (!normalized.allowed)
      fail('Delivery destination is not the operational WhatsApp allowlist.');
    const result = await processor.processOne(tenantId, deliveryId, now, {
      name: templateName,
      languageCode: templateLanguage,
      parameterMode: templateParameters === 'rental-v1' ? 'RENTAL_V1' : 'NONE',
    });
    process.stdout.write(
      `${JSON.stringify(
        {
          command,
          tenantId,
          deliveryId,
          destination: maskDestination('WHATSAPP', destination),
          result,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await context.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Operational runner failed.'}\n`,
  );
  process.exitCode = 1;
});
