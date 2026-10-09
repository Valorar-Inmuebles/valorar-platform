export const REALDATA_ENDPOINT = 'ep-orange-resonance-acqkorp6';
export const REALDATA_HOST = `${REALDATA_ENDPOINT}.sa-east-1.aws.neon.tech`;
export const REALDATA_FILE_KEYS = [
  'DATABASE_URL',
  'REALDATA_NEON_PROJECT_ID',
  'REALDATA_NEON_BRANCH_ID',
  'JWT_SECRET',
] as const;
const forbiddenBranches = ['br-rapid-bread-acsu0836', 'br-hidden-mud-ach3itrr'];

export function realdataCommand(
  args: string[],
): 'check' | 'inspect' | 'api' | 'admin' {
  const command = args[0];
  if (
    args.length !== 1 ||
    !['check', 'inspect', 'api', 'admin'].includes(command)
  ) {
    throw new Error(
      'Comandos permitidos: check, inspect, api, admin. Sin argumentos extra.',
    );
  }
  return command as 'check' | 'inspect' | 'api' | 'admin';
}

export function validateRealdataFile(
  env: Record<string, string>,
): RealdataConfig {
  if (
    Object.keys(env).some(
      (key) => !(REALDATA_FILE_KEYS as readonly string[]).includes(key),
    )
  ) {
    throw new Error(
      'El archivo RealData sólo admite las cuatro claves del ejemplo; no agregar credenciales externas.',
    );
  }
  return validateRealdataConfig(env);
}

export type RealdataConfig = {
  DATABASE_URL: string;
  REALDATA_NEON_PROJECT_ID: string;
  REALDATA_NEON_BRANCH_ID: string;
  JWT_SECRET: string;
};

/** No I/O, no raw URL/secret in errors. Endpoint allowlist, not just a prod denylist. */
export function validateRealdataConfig(
  env: Record<string, string | undefined>,
): RealdataConfig {
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL ?? '');
  } catch {
    throw new Error('RealData: DATABASE_URL PostgreSQL requerida.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hostname !== REALDATA_HOST ||
    url.pathname !== '/neondb' ||
    (url.port && url.port !== '5432') ||
    !url.username ||
    !url.password ||
    url.hash
  ) {
    throw new Error(
      'RealData: sólo se admite el endpoint directo autorizado y neondb.',
    );
  }
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'channel_binding', 'options'].includes(key)) {
      throw new Error('RealData: parámetro de conexión no admitido.');
    }
    if (url.searchParams.getAll(key).length !== 1)
      throw new Error('RealData: parámetro duplicado.');
  }
  if (
    !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
  ) {
    throw new Error('RealData: SSL require/verify-full es obligatorio.');
  }
  if (
    url.searchParams.has('options') &&
    url.searchParams.get('options') !== '-c default_transaction_read_only=on'
  ) {
    throw new Error('RealData: no se admiten opciones PostgreSQL externas.');
  }
  const project = env.REALDATA_NEON_PROJECT_ID ?? '';
  const branch = env.REALDATA_NEON_BRANCH_ID ?? '';
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(project) ||
    !/^br-[a-z0-9]+(?:-[a-z0-9]+)+$/.test(branch) ||
    forbiddenBranches.includes(branch)
  ) {
    throw new Error(
      'RealData: completar project ID y branch ID autorizados del panel Neon.',
    );
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32)
    throw new Error(
      'RealData: JWT_SECRET local debe tener al menos 32 caracteres.',
    );
  url.searchParams.set('sslmode', 'verify-full');
  url.searchParams.set('options', '-c default_transaction_read_only=on');
  return {
    DATABASE_URL: url.toString(),
    REALDATA_NEON_PROJECT_ID: project,
    REALDATA_NEON_BRANCH_ID: branch,
    JWT_SECRET: env.JWT_SECRET,
  };
}

export type RealdataIdentity = {
  project: string;
  branch: string;
  endpoint: string;
  database: string;
  readonly: string;
};
export const REALDATA_IDENTITY_SQL = `SELECT
  current_setting('neon.project_id', true) AS project,
  current_setting('neon.branch_id', true) AS branch,
  current_setting('neon.endpoint_id', true) AS endpoint,
  current_database() AS database,
  current_setting('transaction_read_only') AS readonly`;

export function assertRealdataIdentity(
  identity: RealdataIdentity | undefined,
  config: RealdataConfig,
): void {
  if (
    !identity ||
    identity.project !== config.REALDATA_NEON_PROJECT_ID ||
    identity.branch !== config.REALDATA_NEON_BRANCH_ID ||
    identity.endpoint !== REALDATA_ENDPOINT ||
    identity.database !== 'neondb' ||
    identity.readonly !== 'on'
  ) {
    throw new Error(
      'RealData: identidad remota o modo read-only no coincide; inicio abortado.',
    );
  }
}

/** Deliberately excludes NODE_OPTIONS, PG*, AWS*, provider credentials and shell DATABASE_URL. */
export function realdataEnvironment(
  config: RealdataConfig,
  parent: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(parent)) {
    if (
      /^(path|systemroot|windir|comspec|pathext|temp|tmp|home|userprofile|appdata|localappdata|lang|term)$/i.test(
        key,
      )
    )
      env[key] = value;
  }
  return {
    ...env,
    ...config,
    NODE_ENV: 'development',
    VALORAR_DATABASE_ENV: 'realdata',
    PORT: '3202',
    CORS_ORIGIN: 'http://127.0.0.1:3201',
    COOKIE_SECURE: 'false',
    SWAGGER_ENABLED: 'false',
    PUBLIC_WEB_URL: '',
    REVALIDATE_SECRET: '',
    STORAGE_ENDPOINT: '',
    STORAGE_ACCESS_KEY_ID: '',
    STORAGE_SECRET_ACCESS_KEY: '',
    STORAGE_BUCKET: '',
    STORAGE_PUBLIC_URL: '',
    MAILERSEND_API_TOKEN: '',
    META_WHATSAPP_ACCESS_TOKEN: '',
  };
}

export function realdataAllowsRequest(method: string, path: string): boolean {
  return (
    ['GET', 'HEAD', 'OPTIONS'].includes(method) ||
    (method === 'POST' && ['/auth/login', '/auth/logout'].includes(path))
  );
}
