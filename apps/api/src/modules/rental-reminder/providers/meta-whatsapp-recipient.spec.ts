import { normalizeMetaWhatsAppAddress } from '../config/meta-whatsapp.config';
import {
  MetaWhatsAppRecipientError,
  normalizeMetaWhatsAppInboundSender,
  toMetaWhatsAppRecipient,
} from './meta-whatsapp-recipient';

describe('MetaWhatsAppRecipient (provider boundary)', () => {
  describe('outbound: E.164 canonical → Meta recipients', () => {
    it.each([
      // Buenos Aires (área 2 dígitos), móvil: introduce "15" y quita el "9".
      ['+5491131716941', '54111531716941'],
      // Buenos Aires (área 2 dígitos), fijo: conserva la forma sin "15".
      ['+541131716941', '541131716941'],
      // Mendoza (área 3 dígitos) móvil.
      ['+5492615550123', '54261155550123'],
      // Córdoba (área 3 dígitos) móvil.
      ['+5493515550123', '54351155550123'],
      // La Plata (área 3 dígitos) móvil.
      ['+5492215550123', '54221155550123'],
      // Río Gallegos (área 4 dígitos) móvil con local de 7 dígitos.
      ['+5492966555555', '54296615555555'],
    ])('maps %s to %s', (e164, metaRecipient) => {
      expect(toMetaWhatsAppRecipient(e164)).toBe(metaRecipient);
    });

    it('preserves previous behavior for non-AR numbers without new rules', () => {
      expect(toMetaWhatsAppRecipient('+15551234567')).toBe('15551234567');
      expect(toMetaWhatsAppRecipient('+447911123456')).toBe('447911123456');
    });

    it.each([
      // Sintácticamente E.164 pero no validable para AR con libphonenumber.
      '+5411555510001',
      '+5400000000000',
    ])('fails closed for unparseable/invalid AR number %s', (e164) => {
      expect(() => toMetaWhatsAppRecipient(e164)).toThrow(
        MetaWhatsAppRecipientError,
      );
    });
  });

  describe('inbound: Meta sender → canonical E.164', () => {
    it.each([
      // Forma nacional Meta debe correlacionar con el E.164 canónico.
      ['54111531716941', '+5491131716941'],
      ['5491131716941', '+5491131716941'],
      ['+5491131716941', '+5491131716941'],
    ])('maps Meta form %s to %s', (sender, e164) => {
      expect(normalizeMetaWhatsAppInboundSender(sender)).toEqual({
        e164,
        graphRecipient: e164.slice(1),
      });
    });

    it('correlates a Meta Argentine sender with a canonical snapshot', () => {
      const sender = normalizeMetaWhatsAppInboundSender('54111531716941');
      expect(sender.e164).toBe('+5491131716941');
    });
  });

  describe('allowlist continues comparing canonical E.164', () => {
    it('normalizes allowlist entries before the provider transform', () => {
      expect(normalizeMetaWhatsAppAddress('+54 9 11 5555-0000')).toEqual({
        e164: '+5491155550000',
        graphRecipient: '5491155550000',
      });
      expect(normalizeMetaWhatsAppAddress('+54 9 11 3171-6941').e164).toBe(
        '+5491131716941',
      );
    });
  });
});
