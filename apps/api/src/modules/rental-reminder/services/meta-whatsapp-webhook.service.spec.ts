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
jest.mock('./communication-inbound.service', () => ({
  CommunicationInboundService: class {},
}));

import { createHmac } from 'node:crypto';
import { MetaWhatsAppWebhookService } from './meta-whatsapp-webhook.service';

describe('MetaWhatsAppWebhookService', () => {
  const original = process.env;
  beforeEach(() => {
    process.env = {
      ...original,
      META_WHATSAPP_ACCESS_TOKEN: 'access-token',
      META_WHATSAPP_PHONE_NUMBER_ID: 'phone-123'.replace(/\D/g, ''),
      META_WHATSAPP_WABA_ID: 'waba-456'.replace(/\D/g, ''),
      META_WHATSAPP_API_VERSION: 'v25.0',
      META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-token',
      META_WHATSAPP_APP_SECRET: 'app-secret',
    };
  });
  afterEach(() => {
    process.env = original;
    jest.restoreAllMocks();
  });

  it('returns the exact GET challenge only for the configured token', () => {
    const service = new MetaWhatsAppWebhookService({} as never, {} as never);
    expect(
      service.verifySubscription('subscribe', 'verify-token', 'challenge-1'),
    ).toBe('challenge-1');
    expect(() =>
      service.verifySubscription('subscribe', 'wrong', 'challenge-1'),
    ).toThrow('verification failed');
  });

  it('verifies X-Hub-Signature-256 over the raw body and rejects tampering', () => {
    const service = new MetaWhatsAppWebhookService({} as never, {} as never);
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = `sha256=${createHmac('sha256', 'app-secret')
      .update(raw)
      .digest('hex')}`;
    expect(() => service.verifySignature(signature, raw)).not.toThrow();
    expect(() => service.verifySignature(signature, Buffer.from('{}'))).toThrow(
      'Invalid Meta WhatsApp webhook signature',
    );
  });

  it.each([
    ['sent', 'SENT'],
    ['delivered', 'DELIVERED'],
    ['read', 'READ'],
    ['failed', 'FAILED'],
  ])('normalizes status %s to %s', async (status, targetStatus) => {
    const repository = {
      applyProviderWebhook: jest.fn().mockResolvedValue({ status: 'APPLIED' }),
    };
    const service = new MetaWhatsAppWebhookService(
      repository as never,
      { persist: jest.fn() } as never,
    );
    const raw = webhook({
      statuses: [
        {
          id: 'wamid.outbound',
          status,
          timestamp: '1791637200',
          ...(status === 'failed' ? { errors: [{ code: 131026 }] } : {}),
        },
      ],
    });
    await service.handle(raw);
    expect(repository.applyProviderWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providerMessageId: 'wamid.outbound',
        targetStatus,
        providerEventKey: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
        ...(status === 'failed'
          ? { errorCategory: 'RECIPIENT_REJECTED', errorCode: 'META_131026' }
          : {}),
      }),
    );
  });

  it('persists text and media metadata without raw payload or media ID', async () => {
    const persist = jest
      .fn()
      .mockResolvedValueOnce({ status: 'PERSISTED' })
      .mockResolvedValueOnce({ status: 'PERSISTED' });
    const service = new MetaWhatsAppWebhookService(
      { applyProviderWebhook: jest.fn() } as never,
      { persist } as never,
    );
    const raw = webhook({
      messages: [
        {
          from: '5491155550000',
          id: 'wamid.text',
          timestamp: '1791637200',
          type: 'text',
          text: { body: 'Pago mañana' },
        },
        {
          from: '5491155550000',
          id: 'wamid.image',
          timestamp: '1791637201',
          type: 'image',
          image: {
            id: 'media-secret-id',
            mime_type: 'image/jpeg',
            caption: 'Comprobante',
          },
        },
      ],
    });
    await service.handle(raw);
    expect(persist).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ body: 'Pago mañana', messageType: 'text' }),
    );
    const calls = persist.mock.calls as unknown as Array<
      [Record<string, unknown>]
    >;
    const image = calls[1]?.[0];
    expect(image).toMatchObject({
      body: 'Comprobante',
      messageType: 'image',
      metadata: { mimeType: 'image/jpeg' },
    });
    expect(JSON.stringify(image)).not.toContain('media-secret-id');
  });

  it('surfaces duplicate and unmapped outcomes without creating other effects', async () => {
    const service = new MetaWhatsAppWebhookService(
      {
        applyProviderWebhook: jest
          .fn()
          .mockResolvedValue({ status: 'DUPLICATE' }),
      } as never,
      {
        persist: jest.fn().mockResolvedValue({ status: 'UNMAPPED_TENANT' }),
      } as never,
    );
    const result = await service.handle(
      webhook({
        statuses: [
          { id: 'wamid.out', status: 'delivered', timestamp: '1791637200' },
        ],
        messages: [
          {
            from: '5491155550000',
            id: 'wamid.in',
            timestamp: '1791637201',
            type: 'unknown',
          },
        ],
      }),
    );
    expect(result).toMatchObject({
      statuses: { duplicate: 1 },
      inbound: { unmapped: 1 },
    });
  });
});

function webhook(value: Record<string, unknown>) {
  return Buffer.from(
    JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: process.env.META_WHATSAPP_WABA_ID,
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
                },
                ...value,
              },
            },
          ],
        },
      ],
    }),
  );
}
