import { parsePhoneNumber, type PhoneNumber } from 'libphonenumber-js';
import { normalizeMetaWhatsAppAddress } from '../config/meta-whatsapp.config';

export type MetaWhatsAppInboundSender = {
  e164: string;
  graphRecipient: string;
};

/**
 * Raised when an Argentine number cannot be parsed/validated with certainty.
 * The adapter treats this as a fail-closed, non-retryable failure and never
 * falls back to the pre-transform behavior.
 */
export class MetaWhatsAppRecipientError extends Error {
  constructor() {
    super('Meta WhatsApp recipient is not a valid E.164 address.');
    this.name = 'MetaWhatsAppRecipientError';
  }
}

/**
 * Converts a canonical E.164 address into the recipients representation
 * Meta/WhatsApp expects when sending templates.
 *
 * The domain keeps E.164 as its canonical representation. Argentina requires a
 * provider boundary transform because Meta maps mobile E.164 (`+54 9 NDC ...`)
 * to the national dialing form without the trunk prefix `0`
 * (`54 NDC 15 ...` for mobiles; fixed lines keep `54 NDC ...`). The exact
 * transformation is derived from libphonenumber metadata instead of
 * positional rules:
 *
 *   +54 9 11 3171-6941  ->  national "011 15-3171-6941"  ->  54111531716941
 *   +54 11 3171-6941    ->  national "011 3171-6941"     ->  541131716941
 *
 * For non-AR numbers the previous behavior (`E.164` minus `+`) is preserved;
 * no new rules are introduced for BR/MX or other countries.
 *
 * If an Argentine number cannot be parsed/validated with certainty this throws
 * `MetaWhatsAppRecipientError` (fail closed) instead of sending a fallback.
 */
export function toMetaWhatsAppRecipient(value: string): string {
  const base = normalizeMetaWhatsAppAddress(value);
  if (!base.e164.startsWith('+54')) return base.graphRecipient;
  let parsed: PhoneNumber | undefined;
  try {
    parsed = parsePhoneNumber(base.e164);
  } catch {
    throw new MetaWhatsAppRecipientError();
  }
  if (!parsed?.isValid() || parsed.country !== 'AR')
    throw new MetaWhatsAppRecipientError();
  const nationalDigits = parsed.formatNational().replace(/\D/g, '');
  const withoutTrunkPrefix = nationalDigits.startsWith('0')
    ? nationalDigits.slice(1)
    : nationalDigits;
  return `${parsed.countryCallingCode}${withoutTrunkPrefix}`;
}

/**
 * Inverse of {@link toMetaWhatsAppRecipient}: normalizes a Meta `from`/`wa_id`
 * (national Meta form such as `54111531716941`, E.164 with or without `+`,
 * etc.) back into the canonical E.164 used for `sameAddress`, ContactPoint
 * lookup and `destinationSnapshot` correlation.
 *
 * Meta's Argentine form `54111531716941` must correlate with the canonical
 * `+5491131716941` without modifying historical snapshots.
 */
export function normalizeMetaWhatsAppInboundSender(
  value: string,
): MetaWhatsAppInboundSender {
  const trimmed = value.trim();
  const attempts: Array<() => PhoneNumber | undefined> = [];
  if (trimmed.startsWith('+')) {
    attempts.push(() => parsePhoneNumber(trimmed));
  } else {
    attempts.push(() => parsePhoneNumber(trimmed, 'AR'));
    attempts.push(() => parsePhoneNumber(`+${trimmed}`));
  }
  for (const attempt of attempts) {
    try {
      const parsed = attempt();
      if (parsed?.isValid()) {
        const e164 = parsed.number ?? parsed.format('E.164');
        return { e164, graphRecipient: e164.slice(1) };
      }
    } catch {
      // try the next interpretation
    }
  }
  return normalizeMetaWhatsAppAddress(trimmed);
}
