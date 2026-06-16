import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __jurilexiaPgSql: Sql | undefined;
}

function parsePoolSettings(connectionString: string) {
  let hostname = "";
  let port = 5432;

  try {
    const url = new URL(connectionString);
    hostname = url.hostname;
    port = url.port ? Number.parseInt(url.port, 10) : 5432;
  } catch {
    /* ignore */
  }

  const isSupabasePooler = hostname.includes("pooler.supabase.com");
  const isTransactionPooler = isSupabasePooler && port === 6543;
  const isSessionPooler = isSupabasePooler && port === 5432;

  const ssl =
    hostname.includes("supabase.co") || process.env.DATABASE_SSL === "true"
      ? ("require" as const)
      : false;

  const maxFromEnv = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  const defaultMax = isTransactionPooler ? 3 : 1;
  const max =
    Number.isFinite(maxFromEnv) && maxFromEnv > 0 ? maxFromEnv : defaultMax;

  return {
    ssl,
    max,
    isSupabasePooler,
    isTransactionPooler,
    isSessionPooler,
  };
}

function createClient(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL para conectar con PostgreSQL");
  }

  const settings = parsePoolSettings(connectionString);

  if (settings.isSessionPooler && process.env.NODE_ENV !== "production") {
    console.warn(
      "[BBDD] DATABASE_URL usa Supavisor en session mode (puerto 5432). " +
        "El pool del proyecto suele ser ~15 conexiones. Preferí transaction pooler " +
        "(puerto 6543) o mantené DATABASE_POOL_MAX=1.",
    );
  }

  const clientOptions = {
    ssl: settings.ssl,
    max: settings.max,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: settings.isTransactionPooler ? false : true,
    ...(settings.isSupabasePooler ? { max_pipeline: 1 } : {}),
  };

  return postgres(connectionString, clientOptions as Parameters<typeof postgres>[1]);
}

function getSql(): Sql {
  if (!globalThis.__jurilexiaPgSql) {
    globalThis.__jurilexiaPgSql = createClient();
  }
  return globalThis.__jurilexiaPgSql;
}

const sql = new Proxy({} as Sql, {
  get(_target, prop, receiver) {
    const client = getSql();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default sql;
