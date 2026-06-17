# Task Breakdown — Admin Property UX

Versión: 1.0  
Fecha: 2026-06-17  
Estado: Planificación — sin implementación.

Referencias: `docs/implementation/admin-property-ux-implementation-plan.md`

Formato: `EPICA → Historia → Tarea técnica`

---

## EPIC-01 — Shell, consistencia y quick wins

### Historia: Empty state SUPER_ADMIN sin tenant

- Crear componente `SuperAdminTenantEmptyState` en `components/shared/`
- Detectar `activeTenantId === null` + `role === SUPER_ADMIN` en `propiedades/page.tsx`
- Replicar patrón en `[id]/*` pages que llaman API con tenant
- Destacar `TenantSwitcher` con borde/label cuando tenant vacío

### Historia: TenantSwitcher responsive

- Quitar `hidden lg:block` restrictivo en `MainHeader.tsx`
- Ajustar layout header para tablet (`md:flex`, truncate)
- Probar en viewport 768px

### Historia: Loading skeletons

- Crear `PageSkeleton` en `components/shared/page-skeleton.tsx`
- Agregar `loading.tsx` en `propiedades/crear/`, `[id]/`, `[id]/publicaciones/`, `[id]/imagenes/`
- Reemplazar texto plano en `loading.tsx` existentes por skeleton

### Historia: not-found consistente

- Refactor `propiedades/[id]/not-found.tsx` para usar `PropertyPageShell` o `PageShell`
- Agregar breadcrumb mínimo y link «Volver al listado»

### Historia: Restaurar property desde listado

- Verificar `updatePropertyAction` acepta `isActive: true` en `property-actions.ts`
- Agregar botón «Restaurar» en `PropertyTable` cuando `!isActive`
- `ConfirmModal` con copy restauración
- Toast success + `router.refresh()`

### Historia: Copy listing «Cerrar publicación»

- Cambiar label botón en `PropertyListingTable`
- Actualizar `ConfirmModal` title/description
- Ajustar toast message

### Historia: Warning slug publicada

- En `PropertyForm` edit: detectar si property tiene listing publicable (prop o fetch summary)
- `ConfirmModal` al cambiar slug si publicable
- Bloquear submit hasta confirmar o cancelar

### Historia: Feature manager UX

- Remover botón Guardar duplicado inferior en `PropertyFeatureManager`
- Implementar barra sticky inferior con Guardar + contador seleccionados
- Reemplazar banners inline por toast o `ApiErrorPanel`

### Historia: Actualizar documentación drift

- Actualizar `docs/07-admin/admin-modules.md`: publicabilidad ✅, auth ✅, características tab
- Actualizar `docs/07-admin/admin-nav.md`: tab Características en §4.2
- Eliminar referencias «upload pendiente» si EPIC-05 no cerrada aún (mantener nota)

---

## EPIC-02 — Listado de propiedades v2

### Historia: Filtro Activas / Archivadas

- Crear `PropertyListFilters` con tabs Todas / Activas / Archivadas
- Leer `searchParams.isActive` en `propiedades/page.tsx`
- Pasar `isActive` a `listProperties({ isActive })`
- Sync URL con `router.push` o `<Link>`

### Historia: Búsqueda client-side v1

- Agregar input search en `PropertyListFilters`
- Filtrar en `PropertyTable` por `title`, `internalCode`, `city`, `slug`
- Debounce 300ms client component wrapper

### Historia: Badges comerciales en listado

- Crear helper `resolveListItemStatus(property, publishability?)` 
- Opción A: cargar publishability en server page (limitado)
- Opción B: esperar EPIC-08 batch endpoint
- Renderizar `PropertyStatusBadge` con variant correcta en columna Estado

### Historia: Acción Ver en web

- Reutilizar `buildPublicPropertyUrl()` de `publishability.ts`
- Agregar link en `PropertyRowActions` o columna acciones
- Ocultar si no publicable o `PUBLIC_WEB_URL` unset

### Historia: PropertyRowActions

- Crear `property-row-actions.tsx` con menú o botones compactos
- Acciones: Editar, Publicaciones, Imágenes, Ver web, Archivar/Restaurar

### Historia: DataTable compartida

- Crear `components/shared/data-table.tsx` con props: columns, rows, emptyState
- Migrar `PropertyTable` como primer consumidor
- Preservar estilos actuales (headers uppercase, hover row)

### Historia: Extender API listado — query params

- Agregar `q`, `propertyType`, `city`, `page`, `limit` a `ListPropertiesQueryDto`
- Implementar filtros en `property.repository.ts` (ILIKE title, internalCode, slug)
- Agregar paginación `{ data, total, page, limit, totalPages }` response wrapper
- Actualizar Swagger

### Historia: Paginación UI

- Crear `Pagination` en `components/shared/` o `@repo/ui`
- Wire en `propiedades/page.tsx` con searchParams `page`, `limit`
- Preservar filtros en links de página

### Historia: Columna thumbnail y precio

- Extender list response DTO con `coverImageUrl?`, `primaryPrice?`, `activeListingType?`
- Join en repository o query separada optimizada
- Renderizar thumbnail 48px en `PropertyTable`

### Historia: Migrar ListingTable y PriceTable a DataTable

- Refactor `PropertyListingTable`
- Refactor `PropertyPriceTable`

---

## EPIC-03 — Dashboard Home

### Historia: Módulo API admin-dashboard

- Crear `apps/api/src/modules/admin-dashboard/admin-dashboard.module.ts`
- Crear `AdminDashboardController` con `GET /admin/dashboard/summary`
- Crear `AdminDashboardService` + `AdminDashboardRepository`
- Registrar en `app.module.ts`
- Guards: `JwtAuthGuard`, `TenantGuard`

### Historia: DTO dashboard summary

- Crear `dashboard-summary-response.dto.ts` con kpis, publishAlerts, recentActivity
- Documentar Swagger

### Historia: Query KPIs

- Count properties `isActive = true` por tenant
- Count published (lógica 4 rules — reutilizar EPIC-08)
- Count listings ACTIVE por `listingType`
- Count `isFeatured = true` + ACTIVE

### Historia: Query publish alerts

- Count properties sin cover image
- Count listings DRAFT con al menos 1 precio
- Count properties activas sin listing ACTIVE

### Historia: Query activity feed heurístico

- Union top 10 por `updatedAt` de Property, PropertyListing, PropertyPrice, PropertyImage
- Mapear a `recentActivity[]` con type + href admin

### Historia: Client API admin

- Crear `lib/api/dashboard.ts` con `getDashboardSummary()`
- Crear `lib/api/types/dashboard.ts`

### Historia: Componentes dashboard

- `DashboardKpiGrid` + `DashboardKpiCard`
- `DashboardQuickActions` (Nueva propiedad, Ver web)
- `DashboardPublishAlerts`
- `DashboardActivityFeed`

### Historia: Página inicio

- Reemplazar `PlaceholderPanel` en `app/(dashboard)/page.tsx`
- `PageShell` con saludo usuario + tenant name
- Fetch `getDashboardSummary()` server-side
- `ApiErrorPanel` fallback
- `SuperAdminTenantEmptyState` si aplica

### Historia: PropertyPickerModal

- Modal buscar property por título (lista reciente o search)
- CTA «Nueva publicación» → seleccionar → redirect `/propiedades/[id]/publicaciones/crear`

---

## EPIC-04 — Navegación y detalle v2

### Historia: Extender modelo de tabs

- Agregar tabs `resumen`, `datos`, `ubicacion`, `seo` en `lib/property/navigation.ts`
- Actualizar `PropertySubNavTab` type
- Actualizar `resolvePropertySubNavTab()` y `propertySubNavHref()`
- Actualizar `TABS` array en `property-sub-nav.tsx`

### Historia: Layout anidado property (opcional)

- Crear `app/(dashboard)/propiedades/[id]/layout.tsx`
- Cargar property + publishability una vez
- Pasar context via React context o solo shell común

### Historia: Tab Resumen

- Crear `app/(dashboard)/propiedades/[id]/page.tsx` como resumen (mover form out)
- Mover `PropertyPublishabilityPanel` como bloque principal
- Crear `PropertySummaryCards` (imágenes count, listings count, features count)
- Crear `PublicationNextStep` CTA dinámico

### Historia: Tab Datos generales

- Crear ruta `[id]/datos/page.tsx`
- Extraer secciones Identificación + Ficha técnica + Descripción de `PropertyForm`
- Crear `PropertyDataForm` component

### Historia: Tab Ubicación

- Crear ruta `[id]/ubicacion/page.tsx`
- Extraer sección Ubicación de `PropertyForm`
- Crear `PropertyLocationForm` component

### Historia: Redirect compatibilidad

- `/propiedades/[id]` = Resumen (default)
- Opcional: redirect viejo bookmark si se usaba como «datos»

### Historia: PropertyDetailHeader

- Crear `property-detail-header.tsx`
- Meta línea: tipo · ciudad · código interno
- Slot acciones: Ver web, Archivar, Volver

### Historia: Acciones globales archivar

- `archivePropertyAction` desde header con ConfirmModal
- Deshabilitar si ya archivada; mostrar Restaurar

### Historia: ListingSubNav

- Crear `listing-sub-nav.tsx` con tabs Datos | Precios
- Integrar en `[listingId]/page.tsx` y `precios/page.tsx`
- Actualizar breadcrumbs si necesario

### Historia: Breadcrumbs nuevas rutas

- Agregar trails en `lib/property/breadcrumbs.ts`: Resumen, Datos, Ubicación, SEO
- Eliminar `DEMO_PROPERTY_ID`, `getMockPropertyTitle` dead code

---

## EPIC-05 — Galería y Storage

### Historia: StorageModule API

- Crear `storage.module.ts`, `storage.config.ts`, `storage.interface.ts`
- Implementar `S3CompatibleStorageService` (R2)
- Variables env en `apps/api/.env.example`
- Registrar módulo en `app.module.ts`

### Historia: Endpoint signed upload URL

- Crear DTO `CreatePropertyImageUploadUrlDto` (mimeType, fileName, propertyId)
- Endpoint `POST /property-images/upload-url` en controller
- Service: generar `storageKey` via `storage-key.util.ts`, firmar PUT URL
- Response: `{ uploadUrl, storageKey, publicUrl?, expiresAt }`

### Historia: Endpoint reorder

- Crear `ReorderPropertyImagesDto` (`{ items: [{ id, sortOrder }] }`)
- Endpoint `PATCH /property-images/reorder`
- Transacción Prisma en repository

### Historia: Admin client upload

- Crear `lib/property/image-upload.ts` con `uploadPropertyImage(file, propertyId)`
- Flujo: request signed URL → PUT R2 → POST metadata `createPropertyImage`

### Historia: PropertyImageUploader UI

- Crear `property-image-uploader.tsx` (dropzone, progress, error)
- Integrar en `PropertyImageManager` reemplazando SidePanel create manual
- Mantener SidePanel solo para edit metadata (altText, sortOrder)

### Historia: Actualizar PropertyImageForm

- Modo create: ocultar input `storageKey`
- Modo edit: `storageKey` readonly
- Actualizar `image-form.ts` validaciones

### Historia: Grid cover hero (opcional)

- Destacar cover image arriba del grid en `PropertyImageManager`
- Badge portada más prominente

### Historia: Drag reorder UI

- Integrar `@dnd-kit` o similar en `PropertyImageGrid`
- Llamar `reorder` API on drop
- Optimistic UI + toast error rollback

---

## EPIC-06 — Publicación y checklist

### Historia: Shared property-rules package

- Crear `packages/property-rules/package.json`
- Mover lógica de `publishability.ts` a package
- Exportar `evaluateListingPublishability`, `evaluatePropertySummary`
- Tests unitarios Vitest/Jest

### Historia: Endpoint GET publishability

- `PropertyController.GET :id/publishability`
- `PropertyPublishabilityService` usa package rules
- Response DTO con hardChecks, softWarnings, progressPercent, listings

### Historia: Bloqueo activación backend

- En `property-listing.service.ts`: `assertPropertyHasPublishableImages()` antes de ACTIVE
- Error 400 con code `PUBLICATION_CHECKLIST_INCOMPLETE` y `missing[]`

### Historia: Slug inmutability

- En `property.service.ts` update: si slug cambia, verificar listings ACTIVE
- Reject con mensaje claro

### Historia: Admin consume endpoint publishability

- Refactor `load-publishability-context.ts` a single fetch
- Deprecar N+1 price calls

### Historia: PublicationGateModal

- Crear `publication-gate-modal.tsx`
- Integrar en `PropertyListingForm` al seleccionar status ACTIVE
- Listar checks faltantes con links
- Bloquear submit si hard rules fallan

### Historia: Manejo error API en actions

- Parse `PUBLICATION_CHECKLIST_INCOMPLETE` en `property-listing-actions.ts`
- Toast con mensaje + links renderizados

### Historia: Progress bar checklist

- Crear `publication-progress-bar.tsx`
- Integrar en `PropertyPublishabilityPanel`
- Calcular % = met hard checks / total hard checks

### Historia: Soft warnings

- Extender rules con checks opcionales (description, min 3 photos, ficha)
- Renderizar con icono ⚠ en checklist

### Historia: Badge Activa (no visible)

- En `PropertyListingTable`: si status ACTIVE && !isPublishable → badge warning
- Tooltip explicativo

### Historia: Empty states publicación

- Actualizar copy `PropertyEmptyState` en imágenes, publicaciones, precios
- Links directos al paso anterior del checklist

### Historia: Celebración al publicar

- Detectar transición a isPublishable en client
- Toast success + link Ver en web

### Historia: Dashboard publish alerts

- Consumir `publishAlerts` de dashboard summary (EPIC-03)
- Links a listados filtrados

---

## EPIC-07 — Tab SEO

### Historia: Tab SEO preview (sin migración)

- Crear `[id]/seo/page.tsx`
- Crear `PropertySeoPreview` (Google snippet + OG mock)
- Derivar valores como `apps/web` `generateMetadata`
- Crear `PropertySeoWarnings` (descripción vacía, slug, alt)

### Historia: Breadcrumb y sub-nav SEO

- Tab en `PropertySubNav`
- Trail en `breadcrumbs.ts`

### Historia: Migración campos SEO (Fase B)

- Documentar en `docs/03-database/property-domain.md`
- Agregar campos a `schema.prisma`
- Crear migración Prisma
- Extender DTOs create/update/response

### Historia: PropertySeoForm

- Form con metaTitle, metaDescription, noIndex, OG fields
- Character counters
- Guardar via `updatePropertyAction`

### Historia: Web consume SEO overrides

- Extender Public API DTO
- Actualizar `apps/web/.../[slug]/page.tsx` generateMetadata
- Sitemap excluir noIndex

---

## EPIC-08 — Infraestructura compartida

### Historia: DataTable (ver EPIC-02)

### Historia: PageSkeleton (ver EPIC-01)

### Historia: Batch publishability list

- Extender `GET /properties` con `include=publishabilitySummary`
- Repository: subquery o batch post-fetch
- Tipos admin `AdminPropertyListItem` extendido

### Historia: Integrar property-rules en Public API

- Refactor `public-property.repository.ts` usar package
- Eliminar duplicación filtros Prisma vs TS

### Historia: Turbo workspace package

- Agregar `packages/property-rules` a `pnpm-workspace` / package.json root
- Configurar build si necesario

---

## EPIC-09 — Hardening y documentación

### Historia: Route guard configuración

- Crear `lib/auth/require-role.ts` server helper
- Aplicar en `configuracion/usuarios/page.tsx` (TENANT_ADMIN, SUPER_ADMIN)
- Aplicar en `configuracion/tenants/page.tsx` (SUPER_ADMIN)
- Redirect `/` o 403 page

### Historia: Limpiar dead code

- Remover `DEV_NAV_CONTEXT` de `nav-config.ts`
- Remover mocks en `breadcrumbs.ts`
- Remover `visibleNavChildren` si sigue sin uso

### Historia: PROJECT_STATE actualización

- Sección Admin UX por épica completada
- Reflejar storage, dashboard, checklist cuando aplique

### Historia: README admin flujo publicación

- Documentar en `apps/admin/README.md` flujo crear → fotos → listing → precio → activar

---

## Estimación de tareas por épica

| EPIC | Historias | Tareas técnicas | Semanas est. |
| ---- | --------- | --------------- | ------------ |
| EPIC-01 | 8 | ~35 | 2-3 |
| EPIC-02 | 9 | ~40 | 3-4 |
| EPIC-03 | 8 | ~35 | 2-3 |
| EPIC-04 | 9 | ~40 | 3-4 |
| EPIC-05 | 8 | ~35 | 2-3 |
| EPIC-06 | 11 | ~45 | 2-3 |
| EPIC-07 | 5 | ~20 | 2-3 |
| EPIC-08 | 4 | ~15 | 1-2 |
| EPIC-09 | 4 | ~15 | 1 |
| **Total** | **66** | **~280** | **10-14** |

---

## Dependencias críticas entre historias

```txt
EPIC-08 property-rules
    → EPIC-06 endpoint publishability
    → EPIC-06 bloqueo activación
    → EPIC-03 KPI publicadas
    → EPIC-02 badges listado

EPIC-05 upload
    → EPIC-06 regla imágenes cumplible en producción
    → MVP comercial (ver mvp-comercial-v1.md)

EPIC-04 tab Resumen
    → EPIC-06 checklist prominente
    → EPIC-07 tab SEO en sub-nav
```
