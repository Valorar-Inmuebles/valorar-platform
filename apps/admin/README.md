# Valorar Admin (`apps/admin`)

Panel administrativo de Valorar Platform. Toda operación de negocio pasa por la API NestJS (`apps/api`); este frontend **no** accede a Prisma ni a PostgreSQL.

## Stack

- Next.js 16 (App Router, Server First)
- TypeScript
- Tailwind CSS v4
- `@repo/ui` — componentes compartidos del monorepo
- `@repo/eslint-config` / `@repo/typescript-config` — configuración compartida

## Desarrollo local

Convención de puertos del monorepo:

| App | URL |
| --- | --- |
| web | http://localhost:3000 |
| admin | http://localhost:3001 |
| api | http://localhost:3002 (Swagger: `/api/docs`) |

Desde la raíz del monorepo:

```bash
npm install
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env
# Completar DATABASE_URL, JWT_SECRET y SEED_DEFAULT_PASSWORD en apps/api/.env
npx prisma db seed --schema apps/api/prisma/schema.prisma
npm run dev
```

Solo admin:

```bash
npm run dev -- --filter=admin
```

La app corre en [http://localhost:3001](http://localhost:3001).

Comandos desde `apps/admin`:

```bash
npm run dev
npm run build
npm run check-types
npm run lint
```

## Autenticación (Auth Foundation v1)

- Login en `/login` — formulario real vía BFF (`POST /api/auth/login` → API NestJS)
- Cookie `access_token` httpOnly en dominio admin
- Middleware protege rutas `(dashboard)/*` (redirect a `/login` sin cookie)
- Layout dashboard valida sesión con `GET /auth/me`
- Logout desde sidebar → `POST /api/auth/logout`
- Nav filtra ítems por rol del usuario (`sessionToNavContext`)
- `SUPER_ADMIN`: selector de tenant en header (`TenantSwitcher` + cookie `active_tenant_id`)

### Credenciales dev

Tras ejecutar el seed de API (ver `apps/api/README.md`):

| Rol | Email | Contraseña |
| --- | ----- | ---------- |
| `TENANT_ADMIN` | `admin@demo.valorar.dev` | `SEED_DEFAULT_PASSWORD` del `.env` de API |
| `AGENT` | `agent@demo.valorar.dev` | idem |
| `SUPER_ADMIN` | `super@valorar.dev` | idem |

Sugerencia dev: `SEED_DEFAULT_PASSWORD=ValorarDev2026!` en `apps/api/.env`.

**RBAC API:** no aplicado en v1 — todos los roles autenticados acceden a Property admin API. Diferido a Auth Foundation v1.1.

## Estructura

```txt
apps/admin/
├── app/
│   ├── (auth)/              # Login
│   ├── (dashboard)/         # Shell + módulos operativos
│   └── api/auth/            # BFF login, logout, active-tenant
├── components/
│   ├── auth/                # LoginForm
│   ├── layout/              # Sidebar, header, nav-config, TenantSwitcher
│   ├── property/            # CRUD Property Domain v1
│   └── shared/
├── lib/
│   ├── api/                 # Client con cookie JWT + X-Tenant-Id
│   ├── auth/                # Sesión, nav context, active tenant
│   └── property/
└── middleware.ts            # Protección dashboard
```

## Módulos implementados

| Módulo | Rutas | Estado |
| ------ | ----- | ------ |
| Auth + Shell | `/login`, middleware, sesión | ✅ |
| Property | `/propiedades`, `/crear`, `/[id]` | ✅ |
| PropertyListing | `/propiedades/[id]/publicaciones/**` | ✅ |
| PropertyPrice | `/…/publicaciones/[listingId]/precios` | ✅ |
| PropertyImage | `/propiedades/[id]/imagenes` | ✅ |
| Publicabilidad web | Panel en ficha + columna Web | ✅ |

Patrón: Server Components → `lib/api/*.ts` → NestJS; mutaciones vía Server Actions.

## Pendiente

- RBAC API (`@Roles` en endpoints) — Auth Foundation v1.1
- Configuración (`/configuracion/**`) — placeholders UI
- Dashboard operativo (`/`)
- Upload físico de imágenes

## Variables de entorno

Copiar desde `apps/admin/.env.example`:

| Variable | Uso |
| -------- | --- |
| `API_URL` | Base URL de `apps/api` (default `http://localhost:3002`) |
| `PUBLIC_WEB_URL` | Sitio público para enlaces «Ver en web» (default `http://localhost:3000`) |
| `REVALIDATE_SECRET` | Secreto compartido con `apps/web` para invalidar ISR tras cambios comerciales |

Las variables `ADMIN_DEV_*` están **deprecated** — el flujo principal usa login + JWT.

## Documentación

- `docs/04-modules/auth.md` — Auth Foundation v1
- `docs/07-admin/admin-modules.md` — Property Domain admin
- `docs/07-admin/admin-nav.md` — navegación y RBAC UI
- `docs/02-architecture/monorepo.md` — puertos y stack local
- `PROJECT_STATE.md` — estado global
