import {
  getMetaWhatsAppConfig,
  normalizeMetaWhatsAppAddress,
} from './meta-whatsapp.config';

describe('Meta WhatsApp configuration', () => {
  it.each([
    ['+54 9 11 5555-0000', '+5491155550000', '5491155550000'],
    ['005491155550000', '+5491155550000', '5491155550000'],
    ['5491155550000', '+5491155550000', '5491155550000'],
  ])('normalizes %s to E.164', (raw, e164, graphRecipient) => {
    expect(normalizeMetaWhatsAppAddress(raw)).toEqual({
      e164,
      graphRecipient,
    });
  });

  it.each(['abc', '+0123', '+54-ABC-123', '123'])('rejects %s', (raw) => {
    expect(() => normalizeMetaWhatsAppAddress(raw)).toThrow('E.164');
  });

  it('fails closed for an invalid API version', () => {
    expect(() =>
      getMetaWhatsAppConfig({
        META_WHATSAPP_ACCESS_TOKEN: 'token',
        META_WHATSAPP_PHONE_NUMBER_ID: '123',
        META_WHATSAPP_WABA_ID: '456',
        META_WHATSAPP_API_VERSION: 'latest',
        META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify',
        META_WHATSAPP_APP_SECRET: 'secret',
      }),
    ).toThrow('API version');
  });
});
