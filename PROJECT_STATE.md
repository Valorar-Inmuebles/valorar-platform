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

Fase: Foundation + Property Foundation

Infraestructura inicial:

* GitHub
* Vercel
* Railway
* Neon PostgreSQL

Dominio Property v1: migrado (`202606150001_property_foundation`).

Roadmap Property API: `docs/09-roadmap/property-api-roadmap.md`

Lead Domain v1: documentado y congelado (inquiry-centric). `docs/03-database/lead-domain.md`

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

### Foundation (schema + migración)

* Tenant
* User
* UserRole
* TenantSetting

Documentación: `docs/03-database/current-schema.md`

### Property Domain v1 (schema + migración)

* Property
* PropertyListing
* PropertyPrice
* PropertyImage
* PropertyFeature
* PropertyFeatureAssignment
* PropertyAgentAccess

Documentación: `docs/03-database/property-domain.md`

Migración: `202606150001_property_foundation`

### Lead Domain v1 (documentado)

* Lead (inquiry-centric — consulta capturada)
* LeadStatus
* LeadSource
* LeadAssignment
* LeadActivity
* LeadTag
* LeadTagAssignment

Documentación: `docs/03-database/lead-domain.md`

Modelo: cada lead es una consulta individual; no representa un contacto único.

---

## Módulos Pendientes

### Foundation (campos futuros)

* `Tenant.isActive`
* `User.passwordHash`, `User.isActive`, `User.lastLoginAt`
* `TenantSetting.facebookUrl`, `TenantSetting.instagramUrl`, `TenantSetting.linkedinUrl`

### Property Domain v1 (lógica de negocio)

* API / Services / Controllers
* UI admin y web pública

Roadmap: `docs/09-roadmap/property-api-roadmap.md`

### Lead Domain v1 (lógica de negocio)

* API / Services / Controllers
* UI admin y formularios web
* Consolidación de contactos (`Client`, `LeadInterest`) — futuro

### Otros módulos

* Development
* DevelopmentUnit

---

## Convenciones

* Base de datos en inglés.
* Código en inglés.
* Interfaz de usuario en español.
* Arquitectura multi-tenant desde el inicio.
* Todo cambio estructural debe documentarse.
