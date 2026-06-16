# Valorar Web (`apps/web`)

Sitio público white-label de Valorar Platform. Consume la Public Property API en `apps/api` vía Server Components (sin acceso directo a Prisma).

## Stack

- Next.js 16 (App Router, Server First)
- TypeScript
- Tailwind CSS v4
- `@repo/ui`, `@repo/shared-types`

## Desarrollo local

Convención de puertos del monorepo:

| App | URL |
| --- | --- |
| web | http://localhost:3000 |
| admin | http://localhost:3001 |
| api | http://localhost:3002 |

Desde la raíz del monorepo (levanta web + admin + api):

```bash
npm install
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env
# Completar DATABASE_URL en apps/api/.env y TENANT_ID en apps/web/.env
npm run dev
```

Solo web:

```bash
npm run dev -- --filter=web
```

La app corre en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copiar desde `apps/web/.env.example`:

| Variable | Requerida | Default en código | Uso |
| -------- | --------- | ----------------- | --- |
| `TENANT_ID` | Sí | — | Tenant para llamadas a `/public/properties*` |
| `API_URL` | No | `http://localhost:3002` | Base URL de `apps/api` (server-side) |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | URL canónica (OG, sitemap) |

## Documentación

- `docs/06-web/public-web-architecture.md`
- `docs/06-web/frontend-roadmap.md`
- `PROJECT_STATE.md`
