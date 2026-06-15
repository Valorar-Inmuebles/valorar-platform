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
