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

Desde la raíz del monorepo (levanta web + admin + api):

```bash
npm install
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env
# Completar DATABASE_URL en apps/api/.env, ADMIN_DEV_* en apps/admin/.env
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
npm run lint
npm run check-types
```

## Estructura

```txt
apps/admin/
├── app/
│   ├── (auth)/              # Login placeholder
│   └── (dashboard)/         # Shell + módulos operativos
├── components/
│   ├── layout/              # Sidebar, header, nav-config, PageHeader
│   ├── property/            # CRUD Property Domain v1 + publicabilidad
│   └── shared/              # PageShell, ApiErrorPanel, placeholders
├── lib/
│   ├── api/                 # Client, fetchers y server actions
│   ├── property/            # Breadcrumbs, form helpers, publishability
│   ├── format/              # Labels y formato
│   └── tenant/              # Contexto tenant dev
└── providers/               # ToastProvider
```

## Módulos implementados

| Módulo | Rutas | Estado |
| ------ | ----- | ------ |
| Admin Shell | `(dashboard)/layout`, sidebar, nav | ✅ |
| Property | `/propiedades`, `/crear`, `/[id]` | ✅ |
| PropertyListing | `/propiedades/[id]/publicaciones/**` | ✅ |
| PropertyPrice | `/…/publicaciones/[listingId]/precios` | ✅ |
| PropertyImage | `/propiedades/[id]/imagenes` | ✅ |
| Publicabilidad web | Panel en ficha + columna Web en publicaciones | ✅ |

Patrón: Server Components para lecturas → `lib/api/*.ts` → NestJS; mutaciones vía Server Actions en `lib/api/*-actions.ts`.

## Pendiente

- Auth, RBAC, middleware, TenantSwitcher
- Configuración (`/configuracion/**`) — placeholders
- Dashboard operativo (`/`)
- Upload físico de imágenes (metadata manual v1)

## Variables de entorno

Requeridas en desarrollo local (copiar desde `apps/admin/.env.example`):

| Variable | Uso |
| -------- | --- |
| `API_URL` | Base URL de `apps/api` (default `http://localhost:3002`) |
| `ADMIN_DEV_TENANT_ID` | Tenant para queries admin (alternativa: `TENANT_ID`) |
| `ADMIN_DEV_USER_ID` | `createdById` al crear propiedades |
| `PUBLIC_WEB_URL` | Base del sitio público para enlaces «Ver en web» (default sugerido: `http://localhost:3000`) |

Futuro (auth):

| Variable | Uso |
| -------- | --- |
| `ADMIN_DEV_ROLE` | Rol mock — nav aún no filtra por rol real |

## Documentación

- `docs/07-admin/admin-modules.md` — funcionalidad Property Domain admin
- `docs/07-admin/admin-nav.md` — navegación, rutas y RBAC objetivo
- `docs/02-architecture/monorepo.md` — puertos y stack local
- `PROJECT_STATE.md` — estado global del proyecto

## Referencia UI

El directorio `proyecto-ejemplo/` (temporal) sirve solo como referencia visual para layout, tablas y formularios. No copiar módulos de negocio ni código legal.
