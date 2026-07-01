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

## Foco actual del producto

**Property Complete MVP** — cerrar el flujo de negocio end-to-end de propiedades para operación inmobiliaria real.

Documentación: `docs/04-modules/property-complete-mvp.md`

Branch: `feature/property-complete-mvp`

Roadmap: Fase A (Features) → Fase B (Ficha técnica) → Fase C (Storage + galería) → Fase D (Publicación) → Fase E (Buscador avanzado, P2).

Sin migraciones Prisma nuevas salvo necesidad estricta documentada (excepción: **Geo Catalog** — `202607010001` … `202607010006_property_geo_fks`).

---

## Geo Catalog (GEO-001 + GEO-002) ✅

Catálogo geográfico global de Argentina alineado al mercado inmobiliario. Documentación: `docs/08-geo/`.

Migraciones: `202607010001_geo_catalog` … `202607010006_property_geo_fks`

Modelo: Country → Province → Locality → Neighborhood (opcional). Barrios CABA = Localities. Campos `slug` + `search` auto-generados vía `@repo/geo-text`.

API pública: `GET /geo/provinces`, `GET /geo/localities/search`, `GET /geo/provinces/:id/localities`, `GET /geo/localities/:id/neighborhoods`

Integración Property (GEO-002): FKs en Property + Admin select/autocomplete + Web hero/filtros. Compatibilidad legacy durante transición.

---

## Estado Actual

Fase: Foundation + **Auth Foundation v1** ✅ + Property API Foundation + Public API Foundation + Public Web Foundation (Fase 1–6) + Admin UI Foundation (Property Domain v1 + Auth v1) → **Property Complete MVP en implementación**

Infraestructura inicial:

* GitHub
* Vercel
* Railway
* Neon PostgreSQL

Dominio Property v1: migrado (`202606150001_property_foundation`, `202606150002_property_location_v1_1`).

Auth Foundation v1: ✅ implementado (migración `20260616125024_auth_foundation`, AuthModule, JWT cookie, TenantGuard, admin login/middleware, seeds). Documentación: `docs/04-modules/auth.md`. RBAC API (`@Roles`) diferido v1.1.

Roadmap Property API: `docs/09-roadmap/property-api-roadmap.md`

Property Complete MVP: `docs/04-modules/property-complete-mvp.md`

Lead Domain v1: documentado y congelado (inquiry-centric). `docs/03-database/lead-domain.md`

Public Web: documentación en `docs/06-web/*`. Fases 1–6 ✅ (layout, home, listado, detalle, SEO & production hardening).

Admin UI: documentación en `docs/07-admin/*`. Property Domain v1 ✅. **Comercialización UX unificada** ✅. **Ficha ejecutiva de propiedad (Fase 2)** ✅ — cabecera + KPIs sticky, publicabilidad compacta.

Desarrollo local: convención de puertos web **3000** / admin **3001** / api **3002**; `npm run dev` levanta las tres apps con guard `verify:workspace` (`predev`). Ver `docs/02-architecture/monorepo.md`.

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
* User (`passwordHash`, `isActive`, `lastLoginAt`, índice `User_tenantId_idx`)
* UserRole
* TenantSetting

Migración auth: `20260616125024_auth_foundation`.

Documentación: `docs/03-database/current-schema.md`, `docs/04-modules/auth.md`

### Auth Foundation v1 (API + Admin) ✅

* `AuthModule` — `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
* JWT stateless en cookie httpOnly `access_token` (bcrypt, Passport JWT)
* `JwtAuthGuard`, `TenantGuard` en Property admin API (4 módulos)
* `RolesGuard` + `@Roles()` implementados en código — **no aplicados** (v1.1)
* Admin: login UI, middleware, BFF cookie cross-port, `TenantSwitcher` (SUPER_ADMIN)
* Nav admin filtra por rol (UI); sesión vía `GET /auth/me`
* Seed dev: tenant `demo` + 3 usuarios (`super@valorar.dev`, `admin@demo.valorar.dev`, `agent@demo.valorar.dev`)

Documentación: `docs/04-modules/auth.md`, `docs/09-roadmap/auth-implementation-plan.md`

### Geo Catalog (GEO-001 + GEO-002) ✅

* Catálogo global: `Country`, `Province`, `Locality`, `Neighborhood`
* `GeoModule` — endpoints públicos, cache, autocomplete localidades
* Property: FKs geo + compatibilidad legacy
* Admin + Web integrados con catálogo
* Seeds opt-in: `SEED_GEO_CATALOG=true`
* Migraciones: `202607010001_geo_catalog` … `202607010006_property_geo_fks`
* Documentación: `docs/08-geo/`

### Property Domain v1 (API — Property entity)

* `PropertyModule` en `apps/api/src/modules/property`
* CRUD admin protegido con `JwtAuthGuard` + `TenantGuard`; `tenantId` / `createdById` inferidos del JWT
* Arquitectura: Controller → Service → Repository → Prisma
* `PrismaService` global
* `PrismaExceptionFilter` global (P2002, P2003, P2025)
* Swagger en `/api/docs` con request/response DTOs
* Soft delete vía `isActive = false`
* Slug e `internalCode` únicos por tenant
* Validación de existencia de tenant al crear
* Escrituras multi-tenant safe (`updateMany` con `tenantId`)
* Query DTOs con `class-validator` (`ListPropertiesQueryDto`; `tenantId` removido — resuelto por TenantGuard)

### Property Domain v1 (API — PropertyListing entity)

* `PropertyListingModule` en `apps/api/src/modules/property-listing`
* CRUD admin: `POST/GET/PATCH/DELETE /property-listings`
* Arquitectura: Controller → Service → Repository → Prisma
* Soft delete vía `status = CLOSED` (no borrado físico); reactivación `CLOSED → ACTIVE`
* Un listing por `listingType` (SALE, RENT, TEMPORARY_RENT) por Property; listings cerrados se reactivan
* Validación: Property existe, pertenece al tenant y `isActive = true` al crear/activar
* `status` default: `DRAFT`
* Transiciones de estado validadas en Service (incluye `CLOSED → ACTIVE`)
* Activación (`→ ACTIVE`) requiere al menos un `PropertyPrice`
* `publishedAt` en primera activación; `closedAt` al cerrar, `null` al reactivar
* Escrituras multi-tenant safe (`updateMany` con `tenantId`)

### Property Domain v1 (API — PropertyPrice entity)

* `PropertyPriceModule` en `apps/api/src/modules/property-price`
* CRUD admin: `POST/GET/PATCH/DELETE /property-prices`
* Arquitectura: Controller → Service → Repository → Prisma
* Borrado físico en Foundation
* Validación: PropertyListing existe y pertenece al tenant
* Un solo `isPrimary = true` por listing; exactamente uno cuando hay precios; transacciones Prisma al crear/actualizar/eliminar principal
* Primer precio del listing auto `isPrimary = true`
* `amount > 0`; `currency` obligatorio (`ARS` | `USD`)
* Múltiples precios misma moneda permitidos con `label` distinto
* No eliminar único precio si listing `ACTIVE`, `PAUSED` o `RESERVED`; permitido en `DRAFT` / `CLOSED`
* Promoción automática al eliminar o desmarcar precio principal (si hay alternativas)
* DELETE devuelve snapshot pre-borrado; Swagger con `@ApiQuery`
* Escrituras multi-tenant safe (`updateMany` / `deleteMany` con `tenantId`)

### Property Domain v1 (API — PropertyImage entity)

* `PropertyImageModule` en `apps/api/src/modules/property-image`
* CRUD admin: `POST/GET/PATCH/DELETE /property-images`
* Arquitectura: Controller → Service → Repository → Prisma
* Metadata only en Foundation (sin upload físico ni storage providers)
* Validación: Property existe, pertenece al tenant y `isActive = true` al crear
* Una sola `isCover = true` por Property; transacciones Prisma al crear/actualizar/eliminar portada
* Primera imagen de la Property auto `isCover = true`
* Promoción automática al eliminar portada (imagen más antigua restante)
* `sortOrder` persistido; drag & drop pendiente
* Borrado físico en Foundation
* DELETE devuelve snapshot pre-borrado; Swagger con `@ApiQuery`
* Escrituras multi-tenant safe (`updateMany` / `deleteMany` con `tenantId`)

### Property Domain v1 (API — Public Property)

* `PublicPropertyModule` en `apps/api/src/modules/public-property`
* Solo lectura, sin JWT: `GET /public/properties`, `GET /public/properties/featured`, `GET /public/properties/:slug`
* Arquitectura: Controller → Service → Repository → Prisma
* Regla de publicación: `Property.isActive = true` + listing `ACTIVE` + precio `isPrimary` + imagen `isCover`
* Listado paginado con filtros: `listingType`, `propertyType`, `city`, `neighborhood`, precio, `currency`, `bedrooms`, `bathrooms`
* Destacadas: `PropertyListing.isFeatured = true`, orden `publishedAt desc`
* Detalle por `slug` con galería, listing activo, precio principal, features activas y `availableListingTypes` (multi-operación)
* DTOs públicos sin datos internos (`tenantId`, `createdById`, `internalCode`)
* Swagger tag `Public Properties` con `@ApiQuery`

Pendiente en Property API (Property Complete MVP): features admin, storage upload, resolución tenant por dominio. Ver `docs/04-modules/property-complete-mvp.md`.

### Property Domain v1 (schema + migración)

* Property
* PropertyListing
* PropertyPrice
* PropertyImage
* PropertyFeature
* PropertyFeatureAssignment
* PropertyAgentAccess

Documentación: `docs/03-database/property-domain.md`

Migración: `202606150001_property_foundation`, `202606150002_property_location_v1_1`

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

### Admin UI (`apps/admin`) — Property Domain v1

Documentación: `docs/07-admin/admin-modules.md`, `docs/07-admin/admin-nav.md`

* Shell: `(auth)` / `(dashboard)`, `MainLayout`, sidebar colapsable, `nav-config.ts`, `PageShell`, `PropertyPageShell`, `PropertySubNav`, `ToastProvider`
* Auth v1: login `/login`, middleware, sesión JWT, logout, `TenantSwitcher`
* Toda operación vía NestJS API con cookie reenviada — sin acceso directo a Prisma

**Property CRUD** ✅

* Rutas: `/propiedades`, `/propiedades/crear`, `/propiedades/[id]`
* Server Actions + revalidación; archivar vía `isActive = false`

**PropertyListing CRUD** ✅

* Rutas: `/propiedades/[id]/publicaciones`, `/crear`, `/[listingId]`
* Transiciones de estado; cierre lógico (`CLOSED`)

**PropertyPrice CRUD** ✅

* Ruta: `/propiedades/[id]/publicaciones/[listingId]/precios`
* Tabla + SidePanel; badge «Principal» + acción «Marcar principal»

**PropertyImage CRUD** ✅

* Ruta: `/propiedades/[id]/imagenes`
* Grid + SidePanel; badge «Portada» + acción «Usar como portada»
* Metadata manual (`storageKey`, `url`, `altText`, `sortOrder`) — sin upload físico

**Publicabilidad web** ✅

* Panel checklist en `/propiedades/[id]` (regla espejo de Public API)
* Badges derivados: Publicada / Borrador comercial / Archivada
* Columna Web en publicaciones + enlaces «Ver en web» por operación

Pendiente admin: RBAC API (v1.1), configuración (usuarios/inmobiliaria/tenants), dashboard operativo, upload storage.

---

## Módulos Pendientes

### Auth Foundation v1.1 (RBAC API)

* Aplicar `RolesGuard` + `@Roles()` en endpoints admin según matriz RBAC
* `PropertyAccessGuard` (dominio Property) — futuro

### Foundation (campos futuros)

* `Tenant.isActive`
* `TenantSetting.facebookUrl`, `TenantSetting.instagramUrl`, `TenantSetting.linkedinUrl`

### Public Web (`apps/web`)

* Documentación: `docs/06-web/public-web-architecture.md`, `public-web-ui.md`, `component-inventory.md`, `frontend-roadmap.md`
* Fase 1 ✅: App Router `(site)`, Header (7 ítems + menú hamburguesa), Footer, TailwindCSS v4, Geist, metadata/OG/robots, branding vía env, placeholders de rutas
* Fase 2 ✅: Home (hero, buscador UI, destacadas/recientes vía Public Property API, categorías), `PublicPropertyCard`, branding real (`public/brand/`), `@repo/shared-types`
* Fase 3 ✅: Listado `/propiedades` (filtros sidebar/drawer, URL sync, paginación, empty/loading states, SEO dinámico)
* Fase 4 ✅: Detalle `/propiedades/[slug]` (galería, precio, features, descripción, mapa placeholder, relacionadas, `ListingTypeSwitcher`, metadata dinámica)
* Fase 6 ✅: SEO & production hardening (sitemap dinámico, robots, JSON-LD Organization/RealEstateListing/BreadcrumbList, metadata OG/canonical por página, manifest, security headers, error boundary global)
* Pendiente Fase 5+: Emprendimientos completos, performance (Fase 7)

Roadmap frontend: `docs/06-web/frontend-roadmap.md`

### Property Complete MVP (foco actual)

Documentación: `docs/04-modules/property-complete-mvp.md`

| Fase | Alcance | Prioridad | Estado |
| ---- | ------- | --------- | ------ |
| A | Features end-to-end (seed, CRUD, assignment, admin tab, web) | P0 | ⏳ |
| B | Ficha técnica completa (admin + public DTO + web) | P0 | ⏳ |
| C | Storage + galería (upload, portada, reorder, delete) | P0 | ⏳ |
| D | Publicación (checklist, validaciones soft, slug server-side) | P1 | ⏳ |
| E | Buscador avanzado (features, condition, más filtros) | P2 | ⏳ |

Foundation ya implementado: Property, PropertyListing, PropertyPrice, PropertyImage API; Public API; admin CRUD + publicabilidad; web Fases 1–6.

### Property Domain v1 (Foundation — completado)

* Property API Foundation — ✅
* PropertyListing API Foundation — ✅
* PropertyPrice API Foundation — ✅
* PropertyImage API Foundation (metadata) — ✅
* Public Property API — ✅
* UI admin Property Domain v1 — ✅ (shell + CRUD + publicabilidad + multi-operación + auth v1)

Pendiente post-MVP: RBAC API, configuración admin, dashboard, `PropertyAgentAccess`.

Roadmap técnico API: `docs/09-roadmap/property-api-roadmap.md`

### Lead Domain v1 (lógica de negocio)

* API / Services / Controllers
* UI admin y formularios web
* Consolidación de contactos (`Client`, `LeadInterest`) — futuro

### Otros módulos

* Development
* DevelopmentUnit

### Infraestructura de desarrollo local ✅

* Puertos: web **3000**, admin **3001**, api **3002**
* `npm run dev` (Turbo) levanta web + admin + api
* Frontends: default `API_URL=http://localhost:3002`
* API: `DATABASE_URL` obligatorio; `import "dotenv/config"` en bootstrap; Swagger en `/api/docs`
* Plantillas: `apps/*/.env.example`

Documentación: `docs/02-architecture/monorepo.md`, READMEs de cada app.

---

## Convenciones

* Base de datos en inglés.
* Código en inglés.
* Interfaz de usuario en español.
* Arquitectura multi-tenant desde el inicio.
* Todo cambio estructural debe documentarse.
