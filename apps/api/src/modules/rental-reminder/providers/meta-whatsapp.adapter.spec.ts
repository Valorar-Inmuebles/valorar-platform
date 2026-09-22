jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { WHATSAPP: 'WHATSAPP' },
}));

import { MetaWhatsAppAdapter } from './meta-whatsapp.adapter';

describe('MetaWhatsAppAdapter', () => {
  const original = process.env;
  const snapshot = {
    deliveryId: 'delivery-1',
    channel: 'WHATSAPP' as const,
    destination: '+5491155550000',
    subject: null,
    body: 'Auditable body',
    textBody: 'Auditable body',
    templateKey: 'rental-reminder-whatsapp',
    templateVersion: '1',
    providerTemplateRef: 'rental_due_v1',
    providerTemplate: {
      reference: 'rental_due_v1',
      languageCode: 'es_AR',
      parameters: ['Juan', 'ALQ-1', 'Alquiler: 10/10/2026'],
    },
  };

  beforeEach(() => {
    process.env = {
      ...original,
      META_WHATSAPP_ACCESS_TOKEN: 'secret-token',
      META_WHATSAPP_PHONE_NUMBER_ID: '123456',
      META_WHATSAPP_WABA_ID: '654321',
      META_WHATSAPP_API_VERSION: 'v25.0',
      META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-token',
      META_WHATSAPP_APP_SECRET: 'app-secret',
    };
  });
  afterEach(() => {
    process.env = original;
    jest.restoreAllMocks();
  });

  it('sends a template request and persists the provider message ID', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.123' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      new MetaWhatsAppAdapter().send(snapshot, 'delivery-key'),
    ).resolves.toEqual({ accepted: true, providerMessageId: 'wamid.123' });
    const request = jest.mocked(global.fetch).mock.calls[0]?.[1];
    const rawBody = request?.body;
    expect(typeof rawBody).toBe('string');
    const body = JSON.parse(
      typeof rawBody === 'string' ? rawBody : '{}',
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '54111555550000',
      type: 'template',
    });
    expect(JSON.stringify(body)).not.toContain('secret-token');
  });

  it.each([
    [401, 190, 'AUTHENTICATION', false],
    [429, 4, 'RATE_LIMIT', true],
    [503, undefined, 'PROVIDER_UNAVAILABLE', true],
    [400, 131026, 'RECIPIENT_REJECTED', false],
    [400, 131030, 'VALIDATION', false],
    [400, 132001, 'CONFIGURATION', false],
    [422, undefined, 'VALIDATION', false],
  ])(
    'classifies HTTP %s / code %s',
    async (status, code, category, retryable) => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { code } }), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await expect(
        new MetaWhatsAppAdapter().send(snapshot, 'key'),
      ).resolves.toMatchObject({
        accepted: false,
        errorCategory: category,
        retryable,
      });
    },
  );

  it('normalizes META_131030 to generic validation without unconfirmed semantics', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 131030 } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      new MetaWhatsAppAdapter().send(snapshot, 'key'),
    ).resolves.toEqual({
      accepted: false,
      retryable: false,
      errorCategory: 'VALIDATION',
      errorCode: 'META_131030',
      errorMessage: 'Meta WhatsApp rejected the message request.',
    });
  });

  it('fails closed before fetch for an invalid Argentine recipient', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    await expect(
      // +54 with an unsupported local shape: passes E.164 syntactical checks
      // but cannot be validated by libphonenumber for AR.
      new MetaWhatsAppAdapter().send(
        { ...snapshot, destination: '+5411555510001' },
        'key',
      ),
    ).resolves.toMatchObject({
      accepted: false,
      retryable: false,
      errorCategory: 'VALIDATION',
      errorCode: 'META_WHATSAPP_RECIPIENT_INVALID',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves previous recipient behavior for non-AR numbers', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.us' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      new MetaWhatsAppAdapter().send(
        { ...snapshot, destination: '+15551234567' },
        'key',
      ),
    ).resolves.toEqual({ accepted: true, providerMessageId: 'wamid.us' });
    const request = jest.mocked(global.fetch).mock.calls[0]?.[1];
    const body = JSON.parse(
      typeof request?.body === 'string' ? request.body : '{}',
    ) as Record<string, unknown>;
    expect(body.to).toBe('15551234567');
  });

  it('fails closed before fetch when configuration is missing', async () => {
    delete process.env.META_WHATSAPP_ACCESS_TOKEN;
    const fetch = jest.spyOn(global, 'fetch');
    await expect(
      new MetaWhatsAppAdapter().send(snapshot, 'key'),
    ).resolves.toMatchObject({
      accepted: false,
      errorCategory: 'CONFIGURATION',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('normalizes Retry-After for rate limits', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 4 } }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '90' },
      }),
    );
    await expect(
      new MetaWhatsAppAdapter().send(snapshot, 'key'),
    ).resolves.toMatchObject({
      accepted: false,
      retryable: true,
      retryAfterMs: 90_000,
    });
  });
});
