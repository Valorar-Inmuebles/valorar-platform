import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../../prisma/migrations/202609210001_rental_communications_c1/migration.sql',
  ),
  'utf8',
);
const c3bMigration = readFileSync(
  resolve(
    __dirname,
    '../../../prisma/migrations/202609210002_rental_communications_c3b/migration.sql',
  ),
  'utf8',
);

describe('Rental Communications C1 migration contract', () => {
  it('creates the policy default without synthesizing communication history', () => {
    expect(migration).toContain('INSERT INTO "RentalReminderPolicy"');
    expect(migration).toContain('ON CONFLICT ("tenantId") DO NOTHING');
    expect(migration).not.toMatch(
      /INSERT INTO "RentalReminder(?:Dispatch|Delivery|DeliveryAttempt)"/,
    );
  });

  it('protects idempotency and tenant-scoped relations in the database', () => {
    for (const expected of [
      'RentalReminderDispatch_tenantId_groupKey_key',
      'RentalReminderDispatchOccurrence_pkey',
      'RentalReminderDelivery_dispatchId_channel_key',
      'RentalReminderDelivery_tenantId_deliveryKey_key',
      'RentalReminderDeliveryAttempt_deliveryId_attemptNumber_key',
      'RentalReminderDeliveryAttempt_tenantId_attemptKey_key',
      'RentalReminderWebhookReceipt_providerKey_providerAccountKey_key',
      'RentalReminderDelivery_provider_message_key',
      'RentalReminderDispatchOccurrence_tenantId_occurrenceId_fkey',
      'RentalReminderWebhookReceipt_tenantId_attemptId_fkey',
    ]) {
      expect(migration).toContain(expected);
    }
  });

  it('keeps provider secrets and raw payloads out of persistence', () => {
    expect(migration).not.toMatch(
      /apiKey|accessToken|secret|rawPayload|providerPayload/i,
    );
    expect(migration).toContain('"payloadDigest" TEXT NOT NULL');
    expect(migration).toContain(
      'RentalReminderDelivery_operationalChannel_check',
    );
  });

  it('adds the canonical ranges, attempt limit and state checks', () => {
    expect(migration).toContain('"preDueDays" BETWEEN 1 AND 30');
    expect(migration).toContain('"postDueDays" BETWEEN 1 AND 30');
    expect(migration).toContain('"sendTimeMinutes" BETWEEN 0 AND 1439');
    expect(migration).toContain('"attemptNumber" BETWEEN 1 AND 4');
    expect(migration).toContain(
      'RentalReminderDelivery_status_timestamp_check',
    );
  });
});

describe('Rental Communications C3B migration contract', () => {
  it('creates a tenant-scoped inbound message without a synthetic backfill', () => {
    expect(c3bMigration).toContain(
      'CREATE TABLE "CommunicationInboundMessage"',
    );
    expect(c3bMigration).toContain(
      'CommunicationInboundMessage_tenantId_contractId_fkey',
    );
    expect(c3bMigration).toContain(
      'CommunicationInboundMessage_tenantId_deliveryId_fkey',
    );
    expect(c3bMigration).not.toMatch(
      /INSERT INTO "CommunicationInboundMessage"/,
    );
  });

  it('deduplicates provider messages and enforces WhatsApp E.164 input', () => {
    expect(c3bMigration).toContain(
      'CommunicationInboundMessage_provider_message_key',
    );
    expect(c3bMigration).toContain(
      'CommunicationInboundMessage_senderAddress_check',
    );
    expect(c3bMigration).toContain('"channel" = \'WHATSAPP\'');
  });

  it('never adds raw provider payload or secret columns', () => {
    expect(c3bMigration).not.toMatch(
      /apiKey|accessToken|secret|rawPayload|providerPayload/i,
    );
  });
});

describe('Rental Communications C4B migration contract', () => {
  const c4bMigration = readFileSync(
    resolve(
      __dirname,
      '../../../prisma/migrations/202609220001_rental_communications_c4b_inbound_attention/migration.sql',
    ),
    'utf8',
  );

  it('adds the inbound attention state columns', () => {
    for (const column of [
      '"readAt"',
      '"acknowledgedAt"',
      '"acknowledgedById"',
    ]) {
      expect(c4bMigration).toContain(column);
    }
    expect(c4bMigration).toContain('ALTER TABLE "CommunicationInboundMessage"');
  });

  it('leaves existing inbound rows unread and unacknowledged (no backfill)', () => {
    expect(c4bMigration).not.toMatch(
      /INSERT INTO "CommunicationInboundMessage"/,
    );
    expect(c4bMigration).not.toMatch(/UPDATE "CommunicationInboundMessage"/);
    expect(c4bMigration).not.toMatch(
      /readAt\s*=\s*\S+\s*WHERE|acknowledgedAt\s*=\s*\S+\s*WHERE/i,
    );
  });

  it('indexes the pending-queue query and links the acknowledging user with SET NULL', () => {
    expect(c4bMigration).toContain(
      'CommunicationInboundMessage_tenantId_acknowledgedAt_idx',
    );
    expect(c4bMigration).toContain(
      'CommunicationInboundMessage_acknowledgedById_fkey',
    );
    expect(c4bMigration).toContain('REFERENCES "User"("id")');
    expect(c4bMigration).toMatch(/ON DELETE SET NULL/);
  });

  it('touches no delivery, dispatch, fulfillment or contract entity', () => {
    expect(c4bMigration).not.toMatch(
      /ALTER TABLE "(RentalReminderDelivery|RentalReminderDispatch|RentalFulfillment|RentalContract)"/,
    );
  });
});
