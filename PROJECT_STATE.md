# PROJECT_STATE

## Proyecto

Valorar Platform

Plataforma SaaS inmobiliaria multi-tenant orientada a:

* Sitios web inmobiliarios.
* Gestión de propiedades.
* Gestión de emprendimientos.
* Gestión de agentes.
* Gestión de leads.
* CRM inmobiliario.

---

## Estado Actual

Fase: Foundation

Infraestructura inicial:

* GitHub
* Vercel
* Railway
* Neon PostgreSQL

Dominio Property v1: documentado y congelado. Pendiente de migración Prisma.

---

## Arquitectura

Monorepo Turborepo.

```txt
apps/
├── web
├── admin
└── api

packages/
├── ui
├── shared-types
├── eslint-config
└── typescript-config
```

---

## Stack Tecnológico

Frontend:

* Next.js
* TypeScript
* TailwindCSS

Backend:

* NestJS
* Prisma ORM

Base de datos:

* PostgreSQL

Infraestructura:

* Vercel
* Railway
* Neon

---

## Módulos Implementados

* Tenant
* User
* TenantSetting

---

## Módulos Pendientes

### Property Domain v1 (documentado)

* Property
* PropertyListing
* PropertyPrice
* PropertyImage
* PropertyFeature
* PropertyFeatureAssignment
* PropertyAgentAccess

Documentación: `docs/03-database/property-domain.md`

### Otros módulos

* Development
* DevelopmentUnit
* Lead

---

## Convenciones

* Base de datos en inglés.
* Código en inglés.
* Interfaz de usuario en español.
* Arquitectura multi-tenant desde el inicio.
* Todo cambio estructural debe documentarse.
