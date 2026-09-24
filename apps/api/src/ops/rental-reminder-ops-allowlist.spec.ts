import { checkOperationalRecipientAllowlist } from './rental-reminder-ops-allowlist';

describe('rental reminder operational allowlist', () => {
  it('fails closed when the email allowlist is missing', () => {
    expect(() =>
      checkOperationalRecipientAllowlist({
        channel: 'EMAIL',
        destination: 'pilot@example.test',
        env: {},
      }),
    ).toThrow('MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT');
  });

  it('compares email recipients canonically and case-insensitively', () => {
    expect(
      checkOperationalRecipientAllowlist({
        channel: 'EMAIL',
        destination: 'Pilot@Example.Test',
        env: { MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT: 'pilot@example.test' },
      }),
    ).toEqual({ allowed: true });
  });

  it('rejects an email mismatch without transforming the destination', () => {
    expect(
      checkOperationalRecipientAllowlist({
        channel: 'EMAIL',
        destination: 'other@example.test',
        env: { MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT: 'pilot@example.test' },
      }),
    ).toEqual({ allowed: false, reason: 'DESTINATION_NOT_ALLOWLISTED' });
  });

  it('normalizes WhatsApp allowlist and destination as E.164', () => {
    expect(
      checkOperationalRecipientAllowlist({
        channel: 'WHATSAPP',
        destination: '+5491155550000',
        env: {
          META_WHATSAPP_DEVELOPMENT_ALLOWED_RECIPIENT: '+54 9 11 5555-0000',
        },
      }),
    ).toEqual({ allowed: true });
  });

  it('fails closed when the WhatsApp allowlist is missing', () => {
    expect(() =>
      checkOperationalRecipientAllowlist({
        channel: 'WHATSAPP',
        destination: '+5491155550000',
        env: {},
      }),
    ).toThrow('META_WHATSAPP_DEVELOPMENT_ALLOWED_RECIPIENT');
  });
});
