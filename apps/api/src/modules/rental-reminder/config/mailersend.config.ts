export const MAILERSEND_PROVIDER_KEY = 'mailersend';
export const MAILERSEND_PROVIDER_ACCOUNT_KEY = 'platform-default';
export const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email';

export type MailerSendConfig = {
  apiToken: string;
  fromEmail: string;
  fromName: string;
  webhookSigningSecret: string | null;
};

function required(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for MailerSend email.`);
  return value;
}

export function getMailerSendConfig(
  env: NodeJS.ProcessEnv = process.env,
): MailerSendConfig {
  return {
    apiToken: required('MAILERSEND_API_TOKEN', env),
    fromEmail: required('MAILERSEND_FROM_EMAIL', env),
    fromName: required('MAILERSEND_FROM_NAME', env),
    webhookSigningSecret: env.MAILERSEND_WEBHOOK_SIGNING_SECRET?.trim() || null,
  };
}

export function getMailerSendWebhookSigningSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return required('MAILERSEND_WEBHOOK_SIGNING_SECRET', env);
}

export function mailerSendConfigurationPresence(
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    apiToken: Boolean(env.MAILERSEND_API_TOKEN?.trim()),
    fromEmail: Boolean(env.MAILERSEND_FROM_EMAIL?.trim()),
    fromName: Boolean(env.MAILERSEND_FROM_NAME?.trim()),
    webhookSigningSecret: Boolean(
      env.MAILERSEND_WEBHOOK_SIGNING_SECRET?.trim(),
    ),
    developmentAllowedRecipient: Boolean(
      env.MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT?.trim(),
    ),
  };
}
