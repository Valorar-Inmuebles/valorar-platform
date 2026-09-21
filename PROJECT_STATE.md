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

**Rental Management V1 — Migraciones A+B + refinamiento B.1** ✅ (baseline consolidado y versionado)

**Rental Management V1.1 — Fases 1–3 + UI Foundation Fase 4 + Fases 5A–5E** ✅ (wizard completo hasta configuración previa de avisos)

**Rental Communications V1 — C1** ✅ Persistence Foundation implementada en development; C2–C4 pendientes.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/04-modules/rental-communications-v1.md`, `docs/03-database/rental-domain.md`

**Fase 6 — Plataforma (Super Admin)** ✅

Documentación: `docs/07-admin/fase6-plataforma-super-admin.md`

**Fase 5 — Administración Base** ✅ + QA refinamiento (roles UX, permisos legibles, políticas de propiedad configurables, responsable comercial)

Documentación: `docs/07-admin/fase5-admin-base.md`

---

## Geo Catalog (GEO-001 + GEO-002) ✅

Catálogo geográfico global de Argentina alineado al mercado inmobiliario. Documentación: `docs/08-geo/`.

Migraciones: `202607010001_geo_catalog` … `202607010006_property_geo_fks`

Modelo: Country → Province → Locality → Neighborhood (opcional). Barrios CABA = Localities. Campos `slug` + `search` auto-generados vía `@repo/geo-text`.

API pública: `GET /geo/provinces`, `GET /geo/localities/search`, `GET /geo/provinces/:id/localities`, `GET /geo/localities/:id/neighborhoods`

Integración Property (GEO-002): FKs en Property + Admin select/autocomplete + Web hero/filtros. Compatibilidad legacy durante transición.

---

## Estado Actual

Fase: Foundation + **Auth Foundation v1** ✅ + Property API + Admin UI + Web Premium ✅ + **Fase 5 Administración Base** ✅ + **Fase 6 Plataforma (Super Admin)** ✅ + **Rental Management A+B** ✅

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

Public Web: documentación en `docs/06-web/*`. Fases 1–6 ✅. **Web Premium (Fase 4)** ✅ — hero search-first, GEO completo, cards/filtros premium, share, landing SEO `/explorar/`.

Admin UI: documentación en `docs/07-admin/*`. Property Domain v1 ✅. **Comercialización UX unificada** ✅. **Ficha ejecutiva de propiedad (Fase 2)** ✅. **Dashboard operativo (Fase 3)** ✅. **Administración Base (Fase 5)** ✅ — Organización, Usuarios, Roles/permisos, Perfil, `@repo/rbac`, scoping Property por rol. **Plataforma Super Admin (Fase 6)** ✅ — CRUD tenants, suspender/reactivar, área `/plataforma`, KPIs, SidePanels, seguridad API/UI.

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
├── icons
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

* Tenant (`status`: ACTIVE | SUSPENDED)
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
* Admin: login UI, middleware, BFF cookie cross-port, `TenantSwitcher` (SUPER_ADMIN — select de tenants activos)
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
* Regla de publicación web: `Property.isActive = true` + listing `ACTIVE` (con precio `isPrimary`) **o** `RESERVED` (precio opcional → UI “Consultar precio”) + imagen `isCover`
* Listado paginado con filtros: `listingType`, `propertyType`, `city`, `neighborhood`, precio, `currency`, `bedrooms`, `bathrooms`
* Destacadas: `PropertyListing.isFeatured = true`, orden `publishedAt desc` (solo `ACTIVE` con precio)
* Detalle por `slug` con galería, listing visible, precio principal nullable, features activas y `availableListingTypes` (multi-operación)
* Filtro por rango/moneda de precio: excluye listings sin precio primario
* Orden público actual: `Property.updatedAt desc` (no hay sort por precio; si se agrega, nulls last)

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

### Rental Management V1 — Migración fundacional A ✅

* Schema y migración `202609090001_rental_foundation_a`: `Contact`, `ContactPoint`, `RentalConcept`, `RentalContract` y `TenantSetting.timeZone`.
* Conceptos base tenant-scoped con backfill idempotente para tenants existentes y alta automática para tenants nuevos.
* API NestJS con arquitectura Controller → Service → Repository, guards de autenticación/tenant/permisos y validación explícita de referencias cross-tenant.
* RBAC mínimo: lectura, creación/edición/finalización de contratos y gestión contextual de contactos.
* Admin: `/alquileres`, alta/detalle/edición de contratos, contactos dentro del flujo y `/configuracion/conceptos-alquiler`.
* La Migración C (avisos/comunicaciones) permanece pendiente.
* A dejó la activación sin `RENT` hasta B; B ya incorporó esa invariante sin duplicar importe en `RentalContract`.

### Rental Management V1 — Migración B ✅

* Schema y migración `202609090002_rental_obligation_engine_b`: `RentalObligation`, `RentalObligationOccurrence` y `RentalFulfillment`.
* Motor monetario recurrente/único con fechas `@db.Date`, regla 29/30/31, snapshots e idempotencia por `periodKey`.
* Horizonte operativo: mes local actual y dos siguientes; ejecución al crear/editar y endpoint manual, sin scheduler.
* API tenant-scoped para obligaciones, agenda, importes variables, cumplimiento total y reversión auditable/transaccional.
* Activación contractual exige `RENT`; cierre desactiva obligaciones y cancela sólo vencimientos futuros pendientes, preservando historia.
* Admin: obligaciones y agenda en ficha contractual, más vista global `/alquileres/vencimientos`.
* RBAC: `rental.obligation.manage` y `rental.fulfillment.manage`; reversión limitada a manager/admin.
* Migración C (avisos/comunicaciones, planner/dispatcher y canales) permanece pendiente.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`.

### Rental Management V1 — Refinamiento correctivo B.1 ✅

* Schema y migración `202609100001_rental_uat_refinement_b1`: dirección contractual estructurada, `RentalContractParty`, `RentalContractNotificationRoute` y documento opcional de contacto.
* Contratos con múltiples inquilinos y propietarios; activación exige al menos un inquilino con contacto activo.
* Selección persistente de un punto activo y compatible por canal y persona, sin implementar envíos ni automatizaciones.
* Precarga editable desde propiedades activas o archivadas del tenant, sin modificar la propiedad ni resincronizar el snapshot contractual.
* API, aislamiento tenant y formularios admin actualizados. Migración C permanece pendiente.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`.

### Rental Management V1.1 — Fase 1 ✅

* Migración `202609190001_rental_contract_identity_renewal_v1_1`: número interno tenant-scoped, secuencia atómica, documento canónico, renter primary y autorrelación de renovación.
* Backfills determinísticos de `ALQ-000001` y primary por `createdAt ASC, id ASC`, preservando IDs contractuales.
* Edición transaccional diff/upsert que preserva IDs de partes y rutas compatibles.
* Activación con fecha final, duración mínima de un mes calendario, exactamente un renter primary y obligación `RENT` activa.
* Endpoint `POST /rental-contracts/:id/renew`, sucesor único concurrent-safe y copia selectiva sin occurrences, fulfillments ni obligaciones puntuales.
* RBAC `rental.contract.renew` para super admin, tenant admin y manager.
* Migración C permanece pendiente.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`, `docs/03-database/current-schema.md`.

### Rental Management V1.1 — Fase 2 ✅

* Migración `202609190002_rental_rent_revision_obligation_rules_v1_1`: historial append-only `RentalRentValueRevision`, política de vencimiento fija/manual, recurrencia 1–12 y flags previos a avisos.
* Backfill conservador: revisión inicial sólo para `RENT` con importe existente; los `DRAFT` sin importe permanecen incompletos sin inventar valores ni convertir su modalidad.
* `adjustmentIntervalMonths` nullable preserva contratos legacy; nuevas activaciones exigen valor 1–12, `RENT` mensual/fijo e importe con revisión inicial válida.
* Las revisiones recalculan únicamente occurrences futuras aplicables que continúan `PENDING`; preservan cumplidas, canceladas y períodos anteriores.
* Vencimientos manuales usan `dueDate = null` y se muestran como “Fecha pendiente”, sin fechas ficticias.
* API y Admin exponen configuración pendiente, próxima actualización, revisiones y edición manual de vencimiento dentro del flujo existente.
* Se reutiliza `rental.obligation.manage`; no se agregaron permisos ni se inició el refactor visual integral.
* Historial contractual, notificaciones globales y Migración C permanecen pendientes.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`, `docs/03-database/current-schema.md`.

### Rental Management V1.1 — Fase 3 ✅

* Migración `202609190003_rental_history_operational_read_models_v1_1`: `RentalContractEvent` append-only, tenant-scoped e indexado por contrato/fecha y tipo/fecha.
* Los cambios de partes, activación, finalización, cancelación, revisiones de alquiler y renovación registran eventos en la misma transacción; no se fabricó historia previa.
* `GET /rental-contracts/:id/history` unifica eventos contractuales con fulfillment/reversal existentes, con filtros y paginación descendente.
* Listados de contratos y vencimientos operan server-side con búsqueda, filtros, sorting allowlisted y paginación; `OVERDUE` sigue derivado y `dueDate = null` nunca vence.
* Property y Contact disponen de búsquedas Rental tenant-scoped, compactas y paginadas; Property incluye activos e inactivos.
* Read models de General y Dashboard priorizan estado operativo, atención y actividad disponible, sin inventar comunicaciones.
* Se reutiliza `rental.read`; no se agregaron permisos ni cambios visuales Admin.
* Notificaciones internas, refactor visual y Migración C permanecen pendientes.

Documentación: `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`, `docs/03-database/current-schema.md`.

### Rental Management V1.1 — Fase 5A ✅

* `/alquileres` es el Resumen operacional: contratos activos, obligaciones pendientes del período, atención, próximos a vencer, cumplimiento acumulado y actividad contractual real.
* No se muestran avisos/comunicaciones ni gráficos históricos sin datos: Migración C continúa no iniciada y el read model actual no expone una serie mensual.
* `/alquileres/contratos` consume búsqueda, filtros GEO/estado/por vencer, sorting allowlisted y paginación server-side.
* El listado usa la proyección compacta de contratos y un próximo vencimiento resuelto en la misma consulta proyectada, sin requests por fila.
* Navegación Rental distingue Resumen, Contratos y Vencimientos; Fase 5B, detalle, historial visual y refactor de Vencimientos siguen pendientes.
* UI basada en primitives compartidas de Fase 4 (`AdminTable`, `FilterBar`, `Pagination`, `DropdownMenu`, `Tabs`, `Badge`) con estados loading/error/empty/sin resultados.

Documentación: `docs/04-modules/rental-management-v1.md`, `PROJECT_STATE.md`.

### Rental Management V1.1 — Fase 5B ✅

* Alta y edición reutilizan el mismo wizard en `/alquileres/crear` y `/alquileres/:id/editar`; el Stepper deja visibles los cinco pasos y sólo habilita Información básica y Partes.
* Información básica usa búsqueda Property server-side, incluye activas e inactivas, permite contrato sin Property y precarga una dirección contractual que permanece editable e independiente.
* La vigencia usa `DatePicker`, deshabilita la fecha final hasta definir inicio y valida un mínimo de un mes calendario al continuar; el borrador conserva las reglas incompletas admitidas por el dominio.
* Partes admite múltiples inquilinos y propietarios, garantiza una UX de referente principal y persiste mediante el diff/upsert existente sin borrar y recrear asociaciones.
* El `SidePanel` busca Contact server-side por nombre/documento/email/teléfono, permite alta y administración de ContactPoints, principales y capacidades WhatsApp/SMS, sin configurar rutas de aviso del contrato.
* El flujo protege cambios sin guardar, contempla estados de búsqueda/envío/error/empty/disabled y reutiliza primitives compartidas (`Stepper`, `SearchCombobox`, `DatePicker`, `SidePanel`, `Tabs`, `DropdownMenu`, `Toast`, `ConfirmModal`).
* Fase 5C completa Alquiler, Obligaciones y Avisos sin cambios de schema ni inicio de Migración C.

Documentación: `docs/04-modules/rental-management-v1.md`, `PROJECT_STATE.md`.

### Rental Management V1.1 — Fase 5C ✅

* El wizard compartido completa Alquiler, Obligaciones y Avisos para alta y edición, manteniendo IDs estables y guardado de borradores incompletos admitidos por el dominio.
* Alquiler utiliza una experiencia específica para `RENT`: importe localizado, moneda, día mensual, intervalo 1–12, estado legacy pendiente y próxima actualización; los cambios de valor con historial usan revisiones con fecha efectiva.
* Obligaciones adicionales se crean/editan en `SidePanel`, distinguen recurrentes/puntuales, importe fijo/variable, vigencia y vencimiento fijo/manual; `RENT` permanece como obligación principal no desactivable desde el wizard.
* Avisos persiste únicamente rutas por inquilino/canal/ContactPoint y flags `includeInNotice`/`showAmount`; la vista previa es derivada y no se guarda ni representa un envío.
* La activación reutiliza las invariantes backend existentes y orienta al paso asociado cuando la validación falla.
* No se implementaron proveedores, templates, scheduler, planner, dispatch, delivery ni reglas temporales; Migración C continúa no iniciada.
* No hubo cambios de schema ni migraciones.

Documentación: `docs/04-modules/rental-management-v1.md`, `PROJECT_STATE.md`.


### Rental Management V1.1 — Fase 5D ✅

* El detalle `/alquileres/:id` consume el read model General y presenta cabecera operativa, alquiler vigente, información contractual, partes, obligaciones, configuración previa de avisos, observaciones, renovaciones y próximos vencimientos reales.
* La pestaña Historial consume `GET /rental-contracts/:id/history` con tabla, filtros server-side por categoría/tipo/rango y paginación descendente; los eventos sin actor conservan “Sin actor registrado”.
* `/alquileres/vencimientos` usa período mensual, categorías con conteos reales, búsqueda/filtros/sorting/paginación server-side y representa explícitamente fecha o importe pendientes.
* El registro, edición de fecha/importe y consulta/reversión de cumplimiento se realizan en `SidePanel`; las acciones contractuales secundarias usan confirmación y RBAC existente.
* No se fabrican comunicaciones ni actividad, no hubo cambios de schema/API y Migración C continúa no iniciada.
* Renovación visual completa permanece para Fase 5E; Fase 5D únicamente enlaza el borrador generado al wizard existente.

Documentación: `docs/04-modules/rental-management-v1.md`, `PROJECT_STATE.md`.

### Rental Management V1.1 — Fase 5E ✅

* `/alquileres/:id/renovar` presenta la comparación Contrato actual → Nuevo contrato con datos reales del read model General y una composición responsive.
* `Más acciones` respeta `rental.contract.renew`, estados `ACTIVE`/`ENDED` y la existencia de un sucesor; un `DRAFT` existente se continúa sin crear otro.
* `Continuar con renovación` usa `POST /rental-contracts/:id/renew` y navega al wizard compartido sobre el nuevo contrato `DRAFT`; el frontend no replica reglas de copia ni modifica el contrato anterior.
* Los conflictos concurrentes se traducen, refrescan la relación real y ofrecen acceso al sucesor cuando queda disponible.
* Detalle General expone `Renovado como ALQ-xxxxxx` y `Renovación de ALQ-xxxxxx` como relaciones navegables.
* No hubo cambios de schema, migraciones ni dominio; Migración C continúa no iniciada.

Documentación: `docs/04-modules/rental-management-v1.md`, `PROJECT_STATE.md`.

### Rental Communications V1 — C0 ✅

* Arquitectura canónica provider-agnostic: policy tenant-wide → planner → dispatch agrupado → deliveries independientes por canal → attempts → adapters.
* Email/MailerSend y WhatsApp/Meta Cloud API son los canales/providers iniciales planificados; SMS y overrides por contrato quedan diferidos.
* Elegibilidad, bloqueos previos al provider, agrupación, idempotencia DB, leases, revalidación, snapshots y retries quedaron definidos.
* Planner y delivery processing permanecen separados; el repositorio no tiene scheduler/queue/worker versionado y el mecanismo de ejecución desplegado continúa abierto.
* Seguridad multi-tenant, RBAC, secretos, webhooks, observabilidad, Admin y fases C1–C4 quedaron especificados.
* C0 fue exclusivamente documental; su foundation se implementó posteriormente en C1.

Documentación: `docs/04-modules/rental-communications-v1.md`, `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`.

### Rental Communications V1 — C1 ✅

* Migración `202609210001_rental_communications_c1`: policy tenant-wide, planning issues, dispatch N:M occurrences, deliveries, attempts y webhook receipts.
* Backfill determinístico de una policy por tenant con defaults ON/3/ON/ON/3/10:00; no se creó historia de comunicaciones ficticia.
* Idempotencia, rangos, canales operativos, ciclos de estado y relaciones tenant-scoped protegidos por constraints/índices de PostgreSQL además del dominio.
* `rental.reminder.manage` se asigna a Super Admin, Tenant Admin y Manager; API tenant-safe para GET/PUT policy y lectura paginada de issues/dispatches/deliveries/attempts.
* Credenciales MailerSend/Meta son platform-wide y quedan exclusivamente en runtime/secret store. No se persisten secretos ni payloads crudos.
* C1 no incorpora planner, scheduler, workers, providers, templates reales, webhooks HTTP, retry manual, Admin visual ni capacidad de envío. C2–C4 permanecen pendientes.

Documentación: `docs/04-modules/rental-communications-v1.md`, `docs/04-modules/rental-management-v1.md`, `docs/03-database/rental-domain.md`, `docs/03-database/current-schema.md`.

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

Pendiente admin: RBAC API (v1.1), configuración (usuarios/inmobiliaria/tenants), upload storage.

---

## Módulos Pendientes

### Migración Houzez → Valorar — **PUBLISH_MIGRATION_COMPLETED**

* Documentación: `docs/04-modules/houzez-migration.md`
* Rama: `feature/houzez-migration`
* Estado operativo: **`PUBLISH_MIGRATION_COMPLETED`** (ola `publish` del dump actual: **19/19** en production tenant `demo`)
* CLI: `npm run migration:houzez -- audit|dry-run|import` · prep local: `migration:houzez:prepare-images`
* **No ejecutar `import` sin pedido explícito nuevo.** El CLI advierte el cierre operativo; no hard-bloquea futuros borradores/pending.
* Piloto WP `5312` importado (idempotencia vía `MigrationSourceRef`)
* WP `10613` importada como `SALE`/`RESERVED` **sin** `PropertyPrice` → UI **“Consultar precio”**; filtros por precio la excluyen
* Pipeline imágenes: **`houzez-webp-v2`** — EXIF rotate → trim `edge-fill-v1` → fit 1600×1200 → WebP q82/e4
* Presentación: cards/covers/miniaturas 16:9 + `object-cover`; lightbox `object-contain` + fondo oscuro
* Gate localidad: Locality CABA resolved + allowlist (`Parque Avellaneda` CABA, `Ramos Mejía` Buenos Aires)
* `MIGRATION_MAX_PROPERTY_IMAGES=60` **solo** scope `migration-houzez`; producto/admin upload sigue en **30**
* Fuera de alcance ahora: `draft` / `pending` / `expired` del dump — **no** iniciar sin auditoría read-only nueva
* Checkpoint Neon documentado histórico: `checkpoint-pre-houzez-cleanup` (pre-cleanup). **Pendiente manual:** crear/confirmar snapshot Neon **posterior** a las 19 importadas
* Upgrade imágenes piloto: `migration:houzez:upgrade-pilot-images`

### Auth Foundation v1.1 (RBAC API)

* Aplicar `RolesGuard` + `@Roles()` en endpoints admin según matriz RBAC
* `PropertyAccessGuard` (dominio Property) — futuro

### Foundation (campos futuros)

* `TenantSetting.facebookUrl`, `TenantSetting.instagramUrl`, `TenantSetting.linkedinUrl` (redes ya en schema; UI parcial)

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

### Development Domain D1 (Emprendimientos) ✅

* Entidad independiente de Property: `Development`, `DevelopmentImage`, `DevelopmentFeatureAssignment`, `DevelopmentTypology`
* API admin: `/developments`, `/development-images`, `/developments/:id/features`, `/development-typologies`
* API pública: `/public/developments`
* Admin UI: `/emprendimientos` (listado, ficha ejecutiva, tabs Datos/Comercialización/Características/Imágenes/Tipologías)
* Web: `/emprendimientos`, `/emprendimientos/[slug]`
* Orden editorial: `Development.sortOrder` (migración `202608210001_development_sort_order`)
* Migración de datos: `docs/04-modules/developments-data-migration.md` — lote `local-developments-v1` importado (16 emprendimientos / 87 imágenes) con `--target=production` explícito (tenant `demo`, bucket `valorarinmuebles-images-prod`, Neon auditado)
* Migración schema: `202607020004_development_foundation`
* Documentación: `docs/03-database/development-domain.md`, `docs/04-modules/developments.md`

### Lead Domain v1 (lógica de negocio)

* API / Services / Controllers
* UI admin y formularios web
* Consolidación de contactos (`Client`, `LeadInterest`) — futuro

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
