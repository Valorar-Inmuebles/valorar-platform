# Valorar Admin (`apps/admin`)

Panel administrativo de Valorar Platform. Toda operación de negocio pasa por la API NestJS (`apps/api`); este frontend **no** accede a Prisma ni a PostgreSQL.

## Stack

- Next.js 16 (App Router, Server First)
- TypeScript
- Tailwind CSS v4
- `@repo/ui` — componentes compartidos del monorepo
- `@repo/eslint-config` / `@repo/typescript-config` — configuración compartida

## Desarrollo local

Desde la raíz del monorepo:

```bash
npm install
npm run dev -- --filter=admin
```

La app corre en [http://localhost:3001](http://localhost:3001) (puerto distinto de `apps/web`).

Comandos desde `apps/admin`:

```bash
npm run dev
npm run build
npm run lint
npm run check-types
```

## Estructura (Fase 0)

```txt
apps/admin/
├── app/              # App Router (layout raíz, globals.css)
├── components/       # UI específica del admin
├── lib/              # Utilidades (API client en fases posteriores)
└── providers/        # Client providers (toast, auth, etc.)
```

La estructura de rutas `(auth)` / `(dashboard)` y el shell (sidebar, topbar) se implementan en fases posteriores. Ver `docs/07-admin/admin-nav.md`.

## Variables de entorno

Fase 0 no requiere variables. En fases futuras:

| Variable | Uso |
| -------- | --- |
| `API_URL` | Base URL de `apps/api` |
| `ADMIN_DEV_ROLE` | Rol mock en desarrollo sin auth |
| `ADMIN_DEV_TENANT_ID` | Tenant mock para `SUPER_ADMIN` en dev |

## Documentación

- `docs/07-admin/admin-nav.md` — navegación, rutas y RBAC
- `PROJECT_STATE.md` — estado global del proyecto

## Referencia UI

El directorio `proyecto-ejemplo/` (temporal) sirve solo como referencia visual para layout, tablas y formularios. No copiar módulos de negocio ni código legal.
