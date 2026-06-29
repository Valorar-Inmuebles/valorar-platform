# Valorar API (`apps/api`)

Backend NestJS de Valorar Platform. Expone la API REST admin y pública; accede a PostgreSQL vía Prisma.

## Stack

- NestJS
- Prisma ORM
- PostgreSQL (Neon en remoto)
- Passport JWT + bcrypt (Auth Foundation v1)
- Swagger en `/api/docs`

## Desarrollo local

Puerto por defecto: **3002** — Swagger: http://localhost:3002/api/docs

Desde la raíz del monorepo:

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Completar DATABASE_URL y JWT_SECRET (mín. 32 caracteres)
npm run dev
```

Solo API:

```bash
npm run dev -- --filter=api
```

Comandos desde `apps/api`:

```bash
npm run dev          # watch mode
npm run build
npm run check-types
npm run lint
```

## Variables de entorno

Copiar desde `apps/api/.env.example`:

| Variable | Obligatorio | Descripción |
| -------- | ----------- | ----------- |
| `DATABASE_URL` | Sí | PostgreSQL |
| `JWT_SECRET` | Sí | Secreto de firma JWT (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `CORS_ORIGIN` | No | Origen admin (default `http://localhost:3001`) |
| `COOKIE_SECURE` | No | `false` en dev HTTP local |
| `SEED_DEFAULT_PASSWORD` | Solo seed | Contraseña de usuarios demo (dev) |
| `SEED_DEMO_PROPERTIES` | No | `true` para cargar 30 propiedades demo publicables |

## Seed de desarrollo (Auth Foundation v1)

Crea tenant demo y tres usuarios (uno por rol). **Solo desarrollo** — el script aborta en `NODE_ENV=production`.

```bash
cd apps/api
# En .env:
# SEED_DEFAULT_PASSWORD=ValorarDev2026!
npx prisma db seed
```

### Datos creados

| Rol | Email | Tenant |
| --- | ----- | ------ |
| `SUPER_ADMIN` | `super@valorar.dev` | — (sin tenant; usa `X-Tenant-Id` en API) |
| `TENANT_ADMIN` | `admin@demo.valorar.dev` | Demo Inmobiliaria (`slug: demo`) |
| `AGENT` | `agent@demo.valorar.dev` | Demo Inmobiliaria (`slug: demo`) |

Contraseña: valor de `SEED_DEFAULT_PASSWORD` en `.env`. Sugerencia documentada para dev local: `ValorarDev2026!` (no commitear `.env`).

### Propiedades demo (opt-in)

Con `SEED_DEMO_PROPERTIES=true` se cargan 30 propiedades publicables para el tenant demo. Ver `docs/seed-demo-properties-plan.md`.

```bash
# En .env además de SEED_DEFAULT_PASSWORD:
# SEED_DEMO_PROPERTIES=true
npx prisma db seed
```

## Auth Foundation v1 (implementado)

| Endpoint | Descripción |
| -------- | ----------- |
| `POST /auth/login` | Email + password → JWT en cookie `access_token` |
| `POST /auth/logout` | Limpia cookie |
| `GET /auth/me` | Usuario autenticado (requiere cookie) |

Endpoints admin Property (`/properties`, etc.) requieren cookie JWT + tenant resuelto por `TenantGuard`.

**Fuera de alcance v1:** RBAC API con `@Roles()` / `RolesGuard` en endpoints — diferido a Auth Foundation v1.1. Ver `docs/04-modules/auth.md`.

## Documentación

- `docs/04-modules/auth.md` — especificación Auth
- `docs/02-architecture/monorepo.md` — puertos y stack local
- `PROJECT_STATE.md` — estado global del proyecto
