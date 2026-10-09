import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  assertRealdataIdentity,
  REALDATA_ENDPOINT,
  REALDATA_HOST,
  realdataAllowsRequest,
  realdataCommand,
  realdataEnvironment,
  validateRealdataConfig,
  validateRealdataFile,
} from './realdata-safety';
import { getMailerSendConfig } from '../../modules/rental-reminder/config/mailersend.config';
import { getMetaWhatsAppConfig } from '../../modules/rental-reminder/config/meta-whatsapp.config';

const input = {
  DATABASE_URL: `postgresql://local:local@${REALDATA_HOST}/neondb?sslmode=require&channel_binding=require`,
  REALDATA_NEON_PROJECT_ID: 'test-project-123',
  REALDATA_NEON_BRANCH_ID: 'br-test-realdata',
  JWT_SECRET: 'test-only-local-secret-with-more-than-32-characters',
};

describe('RealData fail-closed profile (no connections)', () => {
  it('normalizes SSL and PostgreSQL read-only without accepting another endpoint', () => {
    const url = new URL(validateRealdataConfig(input).DATABASE_URL);
    expect(url.hostname).toBe(REALDATA_HOST);
    expect(url.searchParams.get('sslmode')).toBe('verify-full');
    expect(url.searchParams.get('options')).toBe(
      '-c default_transaction_read_only=on',
    );
  });
  it.each([
    'ep-mute-sun-ac6nva0v.sa-east-1.aws.neon.tech',
    'ep-mute-sun-ac6nva0v-pooler.sa-east-1.aws.neon.tech',
    'ep-super-glade-ac3ywgv7.sa-east-1.aws.neon.tech',
    `${REALDATA_ENDPOINT}-pooler.sa-east-1.aws.neon.tech`,
    `${REALDATA_HOST}.example.com`,
    'localhost',
  ])('rejects unauthorized host %s', (host) => {
    expect(() =>
      validateRealdataConfig({
        ...input,
        DATABASE_URL: input.DATABASE_URL.replace(REALDATA_HOST, host),
      }),
    ).toThrow();
  });
  it.each([
    ['DATABASE_URL', input.DATABASE_URL.replace('/neondb?', '/other?')],
    [
      'DATABASE_URL',
      input.DATABASE_URL.replace('sslmode=require', 'sslmode=disable'),
    ],
    ['DATABASE_URL', `${input.DATABASE_URL}&host=production`],
    ['DATABASE_URL', `${input.DATABASE_URL}&sslmode=disable`],
    [
      'DATABASE_URL',
      `${input.DATABASE_URL}&options=-c%20default_transaction_read_only=off`,
    ],
    ['REALDATA_NEON_BRANCH_ID', 'br-rapid-bread-acsu0836'],
    ['REALDATA_NEON_BRANCH_ID', 'br-hidden-mud-ach3itrr'],
    ['REALDATA_NEON_BRANCH_ID', 'dev-valorar-realdata'],
    ['REALDATA_NEON_PROJECT_ID', ''],
    ['JWT_SECRET', 'short'],
  ])('rejects unsafe %s', (key, value) => {
    expect(() => validateRealdataConfig({ ...input, [key]: value })).toThrow();
  });
  it('requires all five identity facts including read-only', () => {
    const config = validateRealdataConfig(input);
    const identity = {
      project: input.REALDATA_NEON_PROJECT_ID,
      branch: input.REALDATA_NEON_BRANCH_ID,
      endpoint: REALDATA_ENDPOINT,
      database: 'neondb',
      readonly: 'on',
    };
    expect(() => assertRealdataIdentity(identity, config)).not.toThrow();
    for (const key of Object.keys(identity)) {
      expect(() =>
        assertRealdataIdentity({ ...identity, [key]: 'wrong' }, config),
      ).toThrow();
    }
    expect(() => assertRealdataIdentity(undefined, config)).toThrow();
  });
  it('drops inherited external credentials and rejects them in the file', () => {
    const parent = {
      PATH: 'system',
      DATABASE_URL: 'production',
      NODE_OPTIONS: '--require evil',
      STORAGE_ACCESS_KEY_ID: 'production',
      MAILERSEND_API_TOKEN: 'production',
      META_WHATSAPP_ACCESS_TOKEN: 'production',
      AWS_SECRET_ACCESS_KEY: 'production',
      TWILIO_AUTH_TOKEN: 'production',
      SMS_API_KEY: 'production',
      PGHOST: 'production',
      DOTENV_CONFIG_OVERRIDE: 'true',
    };
    const env = realdataEnvironment(validateRealdataConfig(input), parent);
    expect(env.PATH).toBe('system');
    expect(Object.values(env)).not.toContain('production');
    expect(env.NODE_OPTIONS).toBeUndefined();
    expect(env.PGHOST).toBeUndefined();
    expect(() => getMailerSendConfig(env)).toThrow();
    expect(() => getMetaWhatsAppConfig(env)).toThrow();
    for (const key of [
      'STORAGE_BUCKET',
      'MAILERSEND_API_TOKEN',
      'META_WHATSAPP_ACCESS_TOKEN',
      'SMS_API_KEY',
    ]) {
      expect(() =>
        validateRealdataFile({ ...input, [key]: 'production' }),
      ).toThrow();
    }
    // API dotenv/config sees only the validated file; it cannot undo forced read-only URL.
    const loaded = execFileSync(
      process.execPath,
      [
        '-r',
        require.resolve('dotenv/config'),
        '-e',
        'process.stdout.write(JSON.stringify({url:process.env.DATABASE_URL,storage:process.env.STORAGE_ACCESS_KEY_ID,email:process.env.MAILERSEND_API_TOKEN}))',
      ],
      {
        env: {
          ...env,
          DOTENV_CONFIG_PATH: resolve(
            __dirname,
            '../../../.env.realdata.local.example',
          ),
        },
        encoding: 'utf8',
      },
    );
    expect(JSON.parse(loaded)).toEqual({
      url: env.DATABASE_URL,
      storage: '',
      email: '',
    });
  });
  it.each([
    'seed',
    'migrate-deploy',
    'fixtures',
    'reminder-email',
    'reminder-whatsapp',
    'reset',
  ])('rejects command %s before any connection', (command) => {
    expect(() => realdataCommand([command])).toThrow();
  });
  it('rejects extra command arguments', () => {
    expect(() => realdataCommand(['api', '--env', '.env'])).toThrow();
    expect(realdataCommand(['check'])).toBe('check');
  });
  it('allows reads and authentication, blocks mutations, storage and communications', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS'])
      expect(realdataAllowsRequest(method, '/properties')).toBe(true);
    expect(realdataAllowsRequest('POST', '/auth/login')).toBe(true);
    expect(realdataAllowsRequest('POST', '/auth/logout')).toBe(true);
    for (const path of [
      '/properties',
      '/property-listings/1',
      '/storage/upload-url',
      '/rental-reminders',
      '/auth/login/other',
    ]) {
      for (const method of ['POST', 'PATCH', 'DELETE', 'PUT'])
        expect(realdataAllowsRequest(method, path)).toBe(false);
    }
  });
});
