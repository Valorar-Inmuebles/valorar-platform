jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { EMAIL: 'EMAIL' },
}));

import { MailerSendAdapter } from './mailersend.adapter';

describe('MailerSendAdapter', () => {
  const original = process.env;
  const snapshot = {
    deliveryId: 'd1',
    channel: 'EMAIL' as const,
    destination: 'allowed@example.com',
    subject: 'Subject',
    body: '<p>Body</p>',
    textBody: 'Body',
    templateKey: 'rental-reminder-email',
    templateVersion: '1',
    providerTemplateRef: null,
  };
  beforeEach(() => {
    process.env = {
      ...original,
      MAILERSEND_API_TOKEN: 'secret',
      MAILERSEND_FROM_EMAIL: 'avisos@example.com',
      MAILERSEND_FROM_NAME: 'Valorar Inmuebles',
    };
  });
  afterEach(() => {
    process.env = original;
    jest.restoreAllMocks();
  });

  it('normalizes accepted responses without exposing the token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 202,
        headers: { 'x-message-id': 'provider-123' },
      }),
    );
    await expect(
      new MailerSendAdapter().send(snapshot, 'key'),
    ).resolves.toEqual({ accepted: true, providerMessageId: 'provider-123' });
    const request = jest.mocked(global.fetch).mock.calls[0]?.[1];
    expect(typeof request?.body).toBe('string');
    if (typeof request?.body === 'string')
      expect(request.body).not.toContain('secret');
  });

  it.each([
    [401, 'AUTHENTICATION', false],
    [429, 'RATE_LIMIT', true],
    [503, 'PROVIDER_UNAVAILABLE', true],
    [422, 'VALIDATION', false],
  ])('classifies HTTP %s', async (status, category, retryable) => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status }));
    await expect(
      new MailerSendAdapter().send(snapshot, 'key'),
    ).resolves.toMatchObject({
      accepted: false,
      errorCategory: category,
      retryable,
    });
  });

  it('fails closed when configuration is missing', async () => {
    delete process.env.MAILERSEND_API_TOKEN;
    await expect(
      new MailerSendAdapter().send(snapshot, 'key'),
    ).resolves.toMatchObject({
      accepted: false,
      errorCategory: 'CONFIGURATION',
      retryable: false,
    });
  });
});
