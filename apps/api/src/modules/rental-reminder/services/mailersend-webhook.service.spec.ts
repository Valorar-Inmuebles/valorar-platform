jest.mock('../../../../generated/prisma/client', () => ({
  RentalReminderDeliveryStatus: {
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
  },
}));
jest.mock('../repositories/rental-reminder.repository', () => ({
  RentalReminderRepository: class {},
}));

import { createHmac } from 'node:crypto';
import { MailerSendWebhookService } from './mailersend-webhook.service';

describe('MailerSendWebhookService', () => {
  afterEach(() => delete process.env.MAILERSEND_WEBHOOK_SIGNING_SECRET);

  it('verifies HMAC and normalizes a delivered event without raw payload', async () => {
    process.env.MAILERSEND_WEBHOOK_SIGNING_SECRET = 'webhook-secret';
    const applyProviderWebhook = jest
      .fn<Promise<{ status: 'APPLIED' }>, [Record<string, unknown>]>()
      .mockResolvedValue({ status: 'APPLIED' });
    const repository = { applyProviderWebhook };
    const service = new MailerSendWebhookService(repository as never);
    const raw = Buffer.from(
      JSON.stringify({
        type: 'activity.delivered',
        created_at: '2026-10-10T13:01:00Z',
        data: { id: 'event-1', message_id: 'message-1' },
      }),
    );
    const signature = createHmac('sha256', 'webhook-secret')
      .update(raw)
      .digest('hex');
    expect(() => service.verify(signature, raw)).not.toThrow();
    await service.handle(raw, new Date('2026-10-10T13:02:00Z'));
    expect(repository.applyProviderWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providerEventKey: 'activity.delivered:event-1',
        providerMessageId: 'message-1',
        targetStatus: 'DELIVERED',
        payloadDigest: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
      }),
    );
    expect(
      JSON.stringify(applyProviderWebhook.mock.calls[0]?.[0]),
    ).not.toContain('recipient');
  });

  it('fails closed when webhook configuration is missing', () => {
    const service = new MailerSendWebhookService({} as never);
    expect(() => service.verify('0'.repeat(64), Buffer.from('{}'))).toThrow(
      'MailerSend webhook is not configured',
    );
  });

  it('accepts the official signed URL-validation event before the individual secret exists', async () => {
    const service = new MailerSendWebhookService({} as never);
    const raw = Buffer.from(
      JSON.stringify({
        type: 'webhook.test',
        message: 'This is a ping test message',
      }),
    );
    const signature = createHmac(
      'sha256',
      'test_Am3L1GuOIc4blLUuHqAPxxwkZaJyEk8G',
    )
      .update(raw)
      .digest('hex');
    expect(() => service.verify(signature, raw)).not.toThrow();
    await expect(service.handle(raw)).resolves.toEqual({ status: 'TEST' });
  });
  it('rejects a URL-validation event without the official test signature', () => {
    const service = new MailerSendWebhookService({} as never);
    const raw = Buffer.from(
      JSON.stringify({
        type: 'webhook.test',
        message: 'This is a ping test message',
      }),
    );
    const signature = createHmac('sha256', 'not-the-official-test-secret')
      .update(raw)
      .digest('hex');
    expect(() => service.verify(signature, raw)).toThrow(
      'Invalid MailerSend webhook signature',
    );
  });
});
