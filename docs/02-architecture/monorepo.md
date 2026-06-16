# Monorepo Architecture

## Estructura

```txt
apps/
├── admin
├── api
└── web

packages/
├── ui
├── shared-types
├── eslint-config
└── typescript-config
```

---

## apps/admin

Panel administrativo.

Usuarios:

* SUPER_ADMIN
* TENANT_ADMIN
* AGENT

Responsabilidades:

* Gestión de propiedades.
* Gestión de emprendimientos.
* Gestión de agentes.
* Gestión de leads.
* Configuración del tenant.

---

## apps/api

Backend central.

Tecnología:

* NestJS
* Prisma

Responsabilidades:

* Autenticación.
* Usuarios.
* Tenants.
* Propiedades.
* Emprendimientos.
* Leads.

---

## apps/web

Sitio público.

Responsabilidades:

* Home.
* Listado de propiedades.
* Ficha de propiedad.
* Emprendimientos.
* Servicios.
* Contacto.

---

## packages/ui

Componentes reutilizables.

Ejemplos:

* Button
* Input
* Card
* Modal
* Tabs
* PropertyCard

---

## packages/shared-types

Tipos compartidos entre:

* Admin
* API
* Web

---

## Comunicación

```txt
Admin
   ↓
 API
   ↓
PostgreSQL

Web
   ↓
 API
```

---

## Desarrollo local

Convención de puertos (monorepo):

| App | Puerto | URL |
| --- | ------ | --- |
| `apps/web` | 3000 | http://localhost:3000 |
| `apps/admin` | 3001 | http://localhost:3001 |
| `apps/api` | 3002 | http://localhost:3002 |

Swagger (API): http://localhost:3002/api/docs

### Levantar el stack completo

Desde la raíz:

```bash
npm install
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env
```

Completar al menos:

* `apps/api/.env` → `DATABASE_URL` (**obligatorio**; la API no arranca sin conexión PostgreSQL)
* `apps/web/.env` → `TENANT_ID`
* `apps/admin/.env` → `ADMIN_DEV_TENANT_ID`, `ADMIN_DEV_USER_ID`

```bash
npm run dev
```

Turbo ejecuta el script `dev` de **web**, **admin** y **api** en paralelo.

### URLs de API en frontends

| App | Variable | Default en código |
| --- | -------- | ----------------- |
| web | `API_URL` | `http://localhost:3002` |
| admin | `API_URL` | `http://localhost:3002` |

Los frontends **no** acceden a Prisma; solo consumen HTTP hacia `apps/api`. No hay rewrites ni proxy en Next.js: las llamadas son server-side directas a `API_URL`.
