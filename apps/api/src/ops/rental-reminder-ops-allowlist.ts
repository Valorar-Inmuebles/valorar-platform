import { normalizeMetaWhatsAppAddress } from '../modules/rental-reminder/config/meta-whatsapp.config';

export type RentalReminderOpsChannel = 'EMAIL' | 'WHATSAPP';

export type RentalReminderOpsAllowlistResult = {
  allowed: boolean;
  reason?: 'ALLOWLIST_MISSING' | 'DESTINATION_NOT_ALLOWLISTED';
};

function requiredAllowlist(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for operational sending.`);
  return value;
}

export function checkOperationalRecipientAllowlist(input: {
  channel: RentalReminderOpsChannel;
  destination: string;
  env?: NodeJS.ProcessEnv;
}): RentalReminderOpsAllowlistResult {
  const env = input.env ?? process.env;

  if (input.channel === 'EMAIL') {
    const allowed = requiredAllowlist(
      'MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT',
      env,
    );
    return allowed.toLowerCase() === input.destination.trim().toLowerCase()
      ? { allowed: true }
      : { allowed: false, reason: 'DESTINATION_NOT_ALLOWLISTED' };
  }

  const allowed = normalizeMetaWhatsAppAddress(
    requiredAllowlist('META_WHATSAPP_DEVELOPMENT_ALLOWED_RECIPIENT', env),
  ).e164;
  const destination = normalizeMetaWhatsAppAddress(input.destination).e164;

  return allowed === destination
    ? { allowed: true }
    : { allowed: false, reason: 'DESTINATION_NOT_ALLOWLISTED' };
}
