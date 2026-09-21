export const META_WHATSAPP_PROVIDER_KEY = 'meta-whatsapp';
export const META_WHATSAPP_PROVIDER_ACCOUNT_KEY = 'platform-default';

export type MetaWhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  apiVersion: string;
  webhookVerifyToken: string;
  appSecret: string;
};

function required(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Meta WhatsApp.`);
  return value;
}

export function normalizeMetaWhatsAppAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /[^\d+\s().-]/.test(trimmed))
    throw new Error('WhatsApp recipient is not a valid E.164 address.');
  let compact = trimmed.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith('+')) compact = `+${compact}`;
  if (!/^\+[1-9]\d{7,14}$/.test(compact))
    throw new Error('WhatsApp recipient is not a valid E.164 address.');
  return { e164: compact, graphRecipient: compact.slice(1) };
}

export function getMetaWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): MetaWhatsAppConfig {
  const config = {
    accessToken: required('META_WHATSAPP_ACCESS_TOKEN', env),
    phoneNumberId: required('META_WHATSAPP_PHONE_NUMBER_ID', env),
    wabaId: required('META_WHATSAPP_WABA_ID', env),
    apiVersion: required('META_WHATSAPP_API_VERSION', env),
    webhookVerifyToken: required('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN', env),
    appSecret: required('META_WHATSAPP_APP_SECRET', env),
  };
  if (!/^\d+$/.test(config.phoneNumberId) || !/^\d+$/.test(config.wabaId))
    throw new Error('Meta WhatsApp resource identifiers are invalid.');
  if (!/^v\d+\.\d+$/.test(config.apiVersion))
    throw new Error('Meta WhatsApp API version is invalid.');
  return config;
}

export function metaWhatsAppConfigurationPresence(
  env: NodeJS.ProcessEnv = process.env,
) {
  const keys = [
    'META_WHATSAPP_ACCESS_TOKEN',
    'META_WHATSAPP_PHONE_NUMBER_ID',
    'META_WHATSAPP_WABA_ID',
    'META_WHATSAPP_API_VERSION',
    'META_WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    'META_WHATSAPP_APP_SECRET',
    'META_WHATSAPP_DEVELOPMENT_ALLOWED_RECIPIENT',
  ] as const;
  return Object.fromEntries(
    keys.map((key) => [key, Boolean(env[key]?.trim())]),
  ) as Record<(typeof keys)[number], boolean>;
}
