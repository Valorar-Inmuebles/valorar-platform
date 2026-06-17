# Plan de Implementación Técnica — Admin Property UX

Versión: 1.0  
Fecha: 2026-06-17  
Branch base: `feature/admin-property-ux`  
Estado: Planificación — sin implementación.

Referencias:

* `docs/audits/admin-property-ux-audit.md`
* `docs/proposals/admin-property-ux-roadmap.md`
* `docs/implementation/property-navigation-v2.md`
* `docs/implementation/mvp-comercial-v1.md`

---

## Resumen ejecutivo

Este plan traduce el roadmap UX en **9 épicas** ejecutables sobre el código existente. Cada épica indica archivos, componentes, endpoints, dependencias, complejidad y riesgo.

**Estado verificado del código (disco):**

| Capacidad | Estado |
| --------- | ------ |
| CRUD Property domain (API + admin) | ✅ |
| Auth JWT + TenantGuard | ✅ |
| Publicabilidad panel (4 reglas, admin-only TS) | ✅ |
| Storage module (`apps/api/src/modules/storage`) | ❌ no en disco |
| Upload UI en admin | ❌ metadata manual (`storageKey`) |
| Dashboard operativo | ❌ placeholder |
| Endpoint agregación / KPIs | ❌ |
| Endpoint publishability | ❌ |
| Paginación / búsqueda properties API | ❌ (`isActive` solo) |

**Duración estimada total:** 10-14 semanas (1 dev full-time), asumiendo Storage como épica paralela o merge previo.

---

## Mapa de épicas

```txt
EPIC-01 Shell & Quick Wins ──────────────┐
EPIC-02 Listado Propiedades v2 ──────────┤ Fase 1-2
EPIC-03 Dashboard Home ──────────────────┤
EPIC-04 Navegación Detalle v2 ───────────┤
EPIC-05 Galería & Storage ───────────────┤ Fase 2-3 (bloqueante comercial)
EPIC-06 Publicación & Checklist ─────────┤ Fase 3
EPIC-07 SEO Tab ─────────────────────────┤ Fase 2-4
EPIC-08 Infra API compartida ────────────┤ Transversal
EPIC-09 Documentación & Hardening ───────┘
```

---

## EPIC-01 — Shell, consistencia y quick wins

### Objetivo

Corregir fricciones visibles de bajo riesgo sin nuevos módulos API: loading, empty states, copy, tenant UX y alineación doc/código.

### Alcance

* SUPER_ADMIN empty state en páginas de datos
* TenantSwitcher visible en tablet
* Loading skeletons en rutas property
* `not-found.tsx` con shell consistente
* Copy: «Cerrar publicación» vs «Archivar» listing
* Feature manager: un Guardar sticky + feedback unificado
* Warning slug en property publicada (client-side)
* Restaurar property desde listado
* Actualizar `admin-modules.md` y `admin-nav.md`

**Fuera de alcance:** nuevos endpoints, migraciones, tabs nuevas.

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Admin pages | `app/(dashboard)/propiedades/page.tsx`, `app/(dashboard)/propiedades/[id]/not-found.tsx`, rutas property sin `loading.tsx` |
| Layout | `components/layout/MainHeader.tsx`, `components/layout/tenant-switcher.tsx` |
| Property | `property-table.tsx`, `property-listing-table.tsx`, `property-form.tsx`, `property-feature-manager.tsx` |
| Shared | Nuevos: `components/shared/page-skeleton.tsx` (opcional) |
| Actions | `lib/api/property-actions.ts` (restore action si no existe) |
| Docs | `docs/07-admin/admin-modules.md`, `docs/07-admin/admin-nav.md` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyTable` | Acción restaurar; preparar slot badges (EPIC-02) |
| `PropertyListingTable` | Rename copy archivar → cerrar |
| `PropertyForm` | ConfirmModal slug si publicable |
| `PropertyFeatureManager` | Sticky save, unificar error/success |
| `TenantSwitcher` | Responsive visibility |
| `PlaceholderPanel` | Reutilizar patrón para SUPER_ADMIN sin tenant |
| **Nuevo** `SuperAdminTenantEmptyState` | Empty state guiado |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `PATCH /properties/:id` | Ya soporta `isActive: true` — solo consumir desde listado |
| Resto | Sin cambios |

### Dependencias

* Ninguna épica previa
* Sesión + `activeTenantId` en `(dashboard)/layout.tsx` (ya existe)

### Complejidad

**Baja** — 2-3 semanas

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Restore desde listado sin validar listings activos | Bajo | Toast informativo; reglas API existentes |
| Doc drift persiste si no se actualiza en mismo PR | Medio | Checklist DoD por épica |

---

## EPIC-02 — Listado de propiedades v2

### Objetivo

Transformar `/propiedades` en listado operativo: estado comercial visible, filtros, búsqueda y base para paginación.

### Alcance

* Badges `published` / `commercial-draft` / `archived`
* Filtro Activas / Archivadas / Todas (`?isActive=`)
* Búsqueda (client v1 → server v2)
* Acción «Ver en web» por fila
* Filtros adicionales: `propertyType`, `city` (cuando API listo)
* Paginación server-side (fase 2 de épica)
* Columna thumbnail + precio (depende EPIC-08)
* `DataTable` compartida (extracción de 3 tablas)

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Page | `app/(dashboard)/propiedades/page.tsx` |
| Components | `property-table.tsx`, **nuevo** `property-list-filters.tsx`, **nuevo** `property-row-actions.tsx`, **nuevo** `components/shared/data-table.tsx` |
| Lib | `lib/api/property.ts`, `lib/api/types/property.ts`, `lib/property/publishability.ts` |
| API | `property-query.dto.ts`, `property.repository.ts`, `property.service.ts`, `property.controller.ts`, `property-response.dto.ts` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyTable` | Refactor a `DataTable`; columnas enriquecidas |
| `PropertyStatusBadge` | Usar en listado con variantes derivadas |
| **Nuevo** `PropertyListFilters` | Tabs isActive + search + query sync |
| **Nuevo** `PropertyListStatusBadge` | Wrapper publishability para fila |
| **Nuevo** `PropertyRowActions` | Menú Editar / Ver web / Publicaciones / Archivar |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `GET /properties` | Extender query: `q`, `propertyType`, `city`, `page`, `limit`, `include=publishabilitySummary` |
| Ninguno nuevo obligatorio en v1 | Badges v1: calcular en server page con batch limitado |

### Dependencias

* EPIC-01 (restore, loading)
* EPIC-08 para batch publishability eficiente (recomendado antes de escala)
* `PUBLIC_WEB_URL` / `NEXT_PUBLIC_SITE_URL` para «Ver en web»

### Complejidad

**Media** — 2-3 semanas (v1 filtros + badges); +1 semana (paginación + thumbnail)

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| N+1 publishability por fila | Alto sin EPIC-08 | Endpoint batch o límite 50 properties |
| Filtros client-side no escalan | Medio | Paginación en misma épica fase 2 |
| Query URL sync rompe back nav | Bajo | `useSearchParams` + defaults |

---

## EPIC-03 — Dashboard Home

### Objetivo

Reemplazar placeholder `/` con centro operativo: KPIs, acciones rápidas, alertas de publicación y actividad reciente.

### Alcance

* 5 KPI cards
* Acciones rápidas (Nueva propiedad, Nueva publicación, Ver sitio)
* Bloque publish alerts
* Activity feed (heurístico v1)
* SUPER_ADMIN empty state

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Admin page | `app/(dashboard)/page.tsx` |
| **Nuevo** components | `components/dashboard/dashboard-kpi-grid.tsx`, `dashboard-kpi-card.tsx`, `dashboard-quick-actions.tsx`, `dashboard-activity-feed.tsx`, `dashboard-publish-alerts.tsx`, `property-picker-modal.tsx` |
| **Nuevo** lib | `lib/api/dashboard.ts`, `lib/api/types/dashboard.ts` |
| API **nuevo módulo** | `apps/api/src/modules/admin-dashboard/` (controller, service, repository, dto, module) |
| API bootstrap | `apps/api/src/app.module.ts` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PlaceholderPanel` | Dejar de usarse en `/` |
| `PageShell` | Wrapper dashboard con saludo |
| `PropertyEmptyState` | Reutilizar si sin tenant |

### Endpoints afectados

| Endpoint | Tipo | Descripción |
| -------- | ---- | ----------- |
| `GET /admin/dashboard/summary` | **Nuevo** | KPIs + alerts + recentActivity |

**Nota:** requiere nuevo módulo NestJS; no existe hoy ningún controller bajo `/admin/*`.

### Dependencias

* EPIC-08 (lógica publishability compartida para KPI «Publicadas»)
* EPIC-02 (filtros clickeables desde KPIs — opcional v1)
* `getSession()` + tenant activo

### Complejidad

**Media-Alta** — 2-3 semanas

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Activity feed impreciso sin audit log | Medio | Heurística `updatedAt`; documentar |
| Query pesada en summary | Medio | Índices existentes `tenantId`; cache corto |
| «Nueva publicación» sin property context | Medio | `PropertyPickerModal` |

---

## EPIC-04 — Navegación y detalle de propiedad v2

### Objetivo

Reorganizar `/propiedades/[id]` con tabs, header enriquecido, tab Resumen y split del formulario monolítico.

### Alcance

* Nueva estructura de tabs (ver `property-navigation-v2.md`)
* Tab Resumen con checklist + cards + next step
* Split `PropertyForm` → Datos / Ubicación (rutas o tabs)
* Header con acciones globales (Ver web, Archivar, menú)
* `ListingSubNav` en contexto listing
* Layout opcional `propiedades/[id]/layout.tsx` para sub-nav persistente

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Navigation | `lib/property/navigation.ts`, `property-sub-nav.tsx`, `breadcrumbs.ts` |
| Pages **nuevas/refactor** | `[id]/page.tsx` → resumen; `[id]/datos/page.tsx`; `[id]/ubicacion/page.tsx`; `[id]/seo/page.tsx` (preview, EPIC-07) |
| Components | `property-page-shell.tsx`, `property-form.tsx` → split; **nuevo** `property-summary-cards.tsx`, `property-detail-header.tsx`, `listing-sub-nav.tsx` |
| Form libs | `lib/property/form.ts` — split payloads datos/ubicación |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyPageShell` | Header enriquecido + slot acciones globales |
| `PropertySubNav` | 6-7 tabs |
| `PropertyPublishabilityPanel` | Mover a tab Resumen; sticky opcional |
| `PropertyForm` | Dividir en `PropertyDataForm`, `PropertyLocationForm` |
| **Nuevo** `PropertyDetailHeader` | Meta línea + acciones |
| **Nuevo** `ListingSubNav` | Datos \| Precios |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `GET /properties/:id` | Sin cambio estructural |
| `PATCH /properties/:id` | Parcial por sección (mismo endpoint) |

### Dependencias

* EPIC-01 (slug warning)
* EPIC-06 (checklist en Resumen — puede ser paralelo)
* EPIC-02 (enlaces desde listado)

### Complejidad

**Alta** — 3-4 semanas

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Breaking URLs bookmarks | Medio | Redirect `/propiedades/[id]` → resumen; datos en `/datos` |
| Duplicar carga publishability por tab | Medio | Layout `[id]/layout.tsx` con contexto server |
| Form split rompe validación | Medio | Validadores por sección en `form.ts` |

---

## EPIC-05 — Galería de imágenes y Storage

### Objetivo

Eliminar ingreso manual de `storageKey`; habilitar upload directo a R2 y reorder de galería.

### Alcance

* Módulo `StorageModule` en API (S3-compatible / R2)
* `POST /property-images/upload-url` (signed URL)
* `PATCH /property-images/reorder`
* UI: `PropertyImageUploader` drag & drop
* Integrar en `PropertyImageManager`
* Eliminar campo manual `storageKey` del form create

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| API **nuevo** | `modules/storage/*` (module, controller, service, config, dto) |
| API property-image | `property-image.controller.ts`, `property-image.service.ts`, `property-image.module.ts`, DTOs upload-url + reorder |
| API bootstrap | `app.module.ts`, `.env.example` |
| Admin | `property-image-manager.tsx`, `property-image-form.tsx`, `property-image-grid.tsx`, `lib/api/property-image.ts`, `lib/api/property-image-actions.ts`, **nuevo** `lib/property/image-upload.ts`, **nuevo** `property-image-uploader.tsx` |
| Docs | `docs/03-database/property-domain.md`, `property-complete-mvp.md` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyImageManager` | Upload zone + grid; quitar copy «fase posterior» |
| `PropertyImageForm` | Create vía upload; edit solo metadata |
| **Nuevo** `PropertyImageUploader` | Signed URL flow |
| `PropertyImageGrid` | Drag reorder (fase 2) |

### Endpoints afectados

| Endpoint | Tipo |
| -------- | ---- |
| `POST /storage/upload-url` o `POST /property-images/upload-url` | **Nuevo** |
| `PATCH /property-images/reorder` | **Nuevo** |
| `POST /property-images` | Existente — recibe `storageKey` generado server-side |

### Dependencias

* Variables entorno R2 (`STORAGE_*`) en API
* CORS R2 configurado (mencionado en contexto sprint; **no verificado en repo**)
* EPIC-06 bloqueo activación requiere imágenes (lógica posterior)

### Complejidad

**Alta** — 2-3 semanas

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Storage no configurado en dev | Alto | Mock provider local documentado |
| CORS / signed URL expiry | Medio | Retry + mensajes claros en UI |
| **Bloqueante MVP comercial** | Alto | Priorizar antes de producción real |

---

## EPIC-06 — Publicación, checklist y gates

### Objetivo

Alinear activación de listings con Public API; checklist estilo Airbnb con bloqueos reales.

### Alcance

* Backend: bloquear `→ ACTIVE` sin imágenes + portada
* `GET /properties/:id/publishability`
* Shared rules package (admin + API)
* `PublicationGateModal` en listing form
* Progress bar + soft warnings
* Badge «Activa (no visible)»
* Slug inmutability si listing ACTIVE
* Empty states orientados a publicación

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| API listing | `property-listing.service.ts` |
| API property | `property.service.ts` (slug lock) |
| API **nuevo** | `property-publishability.service.ts` o método en `property.service.ts` |
| API public | `public-property.repository.ts` — extraer reglas compartidas |
| **Nuevo package** | `packages/property-rules/` o `packages/shared-types` extensión |
| Admin | `publishability.ts`, `load-publishability-context.ts`, `property-publishability-panel.tsx`, `property-listing-form.tsx`, `property-listing-table.tsx`, `property-empty-state.tsx`, managers de imágenes/publicaciones |
| **Nuevos** | `publication-checklist.tsx`, `publication-gate-modal.tsx`, `publication-progress-bar.tsx`, `publication-next-step.tsx` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyPublishabilityPanel` | Progress + soft warnings |
| `PropertyListingForm` | Gate modal pre-ACTIVE |
| `PropertyListingTable` | Badge activa-no-visible |
| `PropertyListingStatusBadge` | Nueva variante o badge compuesto |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `PATCH /property-listings/:id` | Validación imágenes en `status: ACTIVE` |
| `PATCH /properties/:id` | Rechazar `slug` change si listing ACTIVE |
| `GET /properties/:id/publishability` | **Nuevo** |
| `GET /properties?include=publishabilitySummary` | **Nuevo** (EPIC-08) |

### Dependencias

* EPIC-05 (upload para cumplir regla imágenes en producción)
* EPIC-04 (tab Resumen muestra checklist)
* EPIC-08 (shared rules)

### Complejidad

**Media** — 2-3 semanas

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Listings ACTIVE legacy sin portada | Alto | Script data fix + banner |
| Reglas divergen admin/API | Alto | Shared package + tests unitarios |
| Error `PUBLICATION_CHECKLIST_INCOMPLETE` no manejado en UI | Medio | Mapping en `property-listing-actions.ts` |

---

## EPIC-07 — Tab SEO

### Objetivo

Exponer control y preview SEO por propiedad; fases: preview-only → campos editables.

### Alcance

**Fase A (sin migración):**

* Ruta `/propiedades/[id]/seo`
* Preview Google + OG derivado
* Warnings (descripción vacía, slug editable, alt portada)

**Fase B (con migración):**

* Campos `metaTitle`, `metaDescription`, `noIndex`, OG overrides en `Property`
* Web consume overrides

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Admin | `navigation.ts`, `property-sub-nav.tsx`, `breadcrumbs.ts`, **nuevo** `[id]/seo/page.tsx`, **nuevo** `property-seo-preview.tsx`, `property-seo-form.tsx`, `property-seo-warnings.tsx` |
| API | `schema.prisma`, migración, `create-property.dto.ts`, `update-property.dto.ts`, `property-response.dto.ts` |
| Web | `apps/web/app/(site)/propiedades/[slug]/page.tsx`, `lib/seo/metadata.ts`, sitemap |
| Docs | `docs/03-database/property-domain.md` |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertySubNav` | Tab SEO |
| **Nuevo** `PropertySeoPreview` | Mock snippet |
| **Nuevo** `PropertySeoForm` | Fase B |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `PATCH /properties/:id` | Campos SEO (Fase B) |
| `GET /public/properties/:slug` | Incluir `seo` resuelto (Fase B) |

### Dependencias

* EPIC-04 (tab en sub-nav)
* EPIC-06 (slug inmutability relacionado)
* Ciclo migración documentado (Fase B)

### Complejidad

**Media (A)** / **Alta (B)** — 1 semana preview; +2 semanas editable + web

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Migración no documentada | Alto | Pre-requisito docs `property-domain.md` |
| Canonical multi-listing | Medio | Mantener v1 un SEO por property |

---

## EPIC-08 — Infraestructura API y componentes compartidos

### Objetivo

Extraer lógica duplicada, abstraer UI repetida y habilitar escalabilidad del listado y dashboard.

### Alcance

* Package `property-rules` o extensión `shared-types`
* Endpoint batch publishability en listado
* `DataTable` shared
* `PageSkeleton` / loading patterns
* Reducir N+1 en `load-publishability-context.ts`

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| **Nuevo** `packages/property-rules/` | `publishability.ts`, tests |
| API | `property.service.ts`, `property.repository.ts`, `public-property.repository.ts` — consumir package |
| Admin | `lib/property/publishability.ts` — delegar a API o import package |
| Shared UI | `components/shared/data-table.tsx`, `page-skeleton.tsx` |
| Turbo | `turbo.json`, `package.json` workspace |

### Componentes afectados

| Componente | Cambio |
| ---------- | ------ |
| `PropertyTable` | Usa `DataTable` |
| `PropertyListingTable` | Usa `DataTable` |
| `PropertyPriceTable` | Usa `DataTable` |

### Endpoints afectados

| Endpoint | Cambio |
| -------- | ------ |
| `GET /properties/:id/publishability` | Nuevo (EPIC-06) |
| `GET /properties?include=publishabilitySummary` | Nuevo query param |

### Dependencias

* Ninguna para `DataTable` (puede empezar en EPIC-02)
* EPIC-06 para package rules completo

### Complejidad

**Media** — 1-2 semanas (transversal)

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| Package no consumible desde NestJS | Medio | Build step o duplicación mínima temporal |
| Over-engineering | Medio | Solo extraer publishability primero |

---

## EPIC-09 — Hardening, RBAC y documentación

### Objetivo

Cerrar deuda de seguridad UX, actualizar documentación y preparar operación multi-tenant real.

### Alcance

* Route guards config (`/configuracion/*`)
* Eliminar dead code (`DEV_NAV_CONTEXT`, mocks breadcrumbs)
* Guards RBAC API (`@Roles`) — **solo si auth v1.1 en scope**
* Actualizar `PROJECT_STATE.md` por épica completada
* README admin con flujo publicación

### Archivos afectados

| Área | Archivos |
| ---- | -------- |
| Admin | `app/(dashboard)/configuracion/**/page.tsx`, `lib/auth/nav-context.ts`, `nav-config.ts`, `breadcrumbs.ts` |
| API | Controllers con `@Roles()` si aplica |
| Docs | `PROJECT_STATE.md`, `admin-modules.md`, `admin-nav.md`, `property-complete-mvp.md` |

### Endpoints afectados

* Opcional: ninguno si RBAC API queda fuera de scope UX

### Dependencias

* EPIC-01 para doc drift base

### Complejidad

**Baja-Media** — 1 semana

### Riesgo

| Riesgo | Nivel | Mitigación |
| ------ | ----- | ---------- |
| RBAC API scope creep | Medio | Mantener fuera de MVP comercial UX |

---

## Orden de ejecución recomendado

```txt
Sprint 1-2:  EPIC-01 + EPIC-09 (docs)
Sprint 3-4:  EPIC-08 (DataTable) + EPIC-02 v1
Sprint 5-6:  EPIC-05 Storage (paralelo) + EPIC-03 Dashboard
Sprint 7-8:  EPIC-04 Navegación v2
Sprint 9-10: EPIC-06 Publicación
Sprint 11+:  EPIC-07 SEO B + EPIC-02 paginación + polish
```

---

## Criterios de done globales (por PR)

1. UI en español; código en inglés.
2. Multi-tenant: `tenantId` del JWT, sin query manual.
3. Sin migración sin actualización `docs/03-database/*`.
4. Swagger actualizado si endpoint nuevo.
5. `PROJECT_STATE.md` actualizado al cerrar épica.
6. Tests unitarios en `property-rules` si EPIC-08/06.

---

## Endpoints nuevos — resumen consolidado

| Método | Ruta | Épica | Prioridad |
| ------ | ---- | ----- | --------- |
| GET | `/admin/dashboard/summary` | EPIC-03 | P0 |
| GET | `/properties/:id/publishability` | EPIC-06 | P0 |
| GET | `/properties?include=publishabilitySummary` | EPIC-08 | P0 |
| POST | `/property-images/upload-url` | EPIC-05 | P0 |
| PATCH | `/property-images/reorder` | EPIC-05 | P1 |
| GET | `/properties` (extendido: q, page, limit, filters) | EPIC-02 | P1 |

**Nota:** este documento planifica endpoints; no los implementa.
