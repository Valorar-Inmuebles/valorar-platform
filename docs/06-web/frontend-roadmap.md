# Frontend Roadmap — Public Web

Versión: v1

Estado: Plan de implementación para `apps/web`.

Referencias:

* `docs/06-web/public-web-architecture.md`
* `docs/06-web/public-web-ui.md`
* `docs/06-web/component-inventory.md`
* `docs/09-roadmap/property-api-roadmap.md`

---

## Contexto

La Public Property API está implementada (`GET /public/properties`, `/featured`, `/:slug`). Este roadmap define la construcción incremental de `apps/web` sin modificar el schema Prisma.

Dependencias externas identificadas:

| Dependencia | Estado | Impacto |
| ----------- | ------ | ------- |
| Public Property API | ✅ Implementada | Fases 2–4 |
| TailwindCSS en web | ✅ Configurado | Fase 1 |
| `packages/shared-types` DTOs públicos | ⏳ Pendiente | Fase 2+ |
| Public Tenant / branding API | ⏳ Pendiente | Branding dinámico; MVP usa env |
| Extensión DTO detalle (coords, dirección) | ⏳ Pendiente | Mapa en detalle |
| Public Development API | ⏳ Pendiente | Fase 5 completa |
| Lead API | ⏳ Pendiente | Formulario contacto |

---

## Fase 1 — Layout, Header, Footer ✅

Estado: **Completada** (2026-06-15).

### Objetivo

Establecer la estructura base del sitio: App Router, route group `(site)`, layout público con navegación completa y footer, configuración de tenant vía env, primitivos UI mínimos.

### Dependencias

* Documentación `docs/06-web/*` (este paquete)
* Public Property API (no requerida aún para layout estático)
* Configurar TailwindCSS en `apps/web`
* Variables de entorno: `TENANT_ID`, `API_URL`, `NEXT_PUBLIC_SITE_URL`, `PUBLIC_COMPANY_NAME`, `PUBLIC_WHATSAPP`

### Componentes involucrados

**apps/web:**

* `SiteLayout`, `SiteContainer`
* `Header`, `HeaderLogo`, `MainNav`, `MobileNav`, `NavLink`
* `Footer`, `FooterNav`, `FooterContact`, `FooterCopyright`
* `Breadcrumbs` (estructura base)
* Páginas estáticas vacías: `/servicios`, `/nosotros`, `/asesoramiento-juridico`, `/contacto` (shell)

**packages/ui:**

* `Button`, `Card`, `Separator`, `VisuallyHidden`

**lib:**

* `lib/tenant/get-tenant-id.ts`, `lib/tenant/site-config.ts`
* `lib/constants/navigation.ts`

### Entregables

* Estructura de carpetas según `public-web-architecture.md`
* Root layout con `lang="es"`
* Route group `(site)` con Header + Footer en todas las páginas
* Navegación funcional a todas las rutas planificadas
* Mobile nav accesible
* TailwindCSS operativo
* Placeholder home (`page.tsx`) con texto mínimo

### Criterios de aceptación

- [x] `npm run build --workspace=web` completa sin errores
- [x] Header muestra los 7 ítems de navegación definidos
- [x] Menú mobile abre/cierra correctamente en viewport `< 1024px` (hamburguesa; nav horizontal desde `lg`)
- [x] Footer muestra columnas navegación, servicios, contacto y redes sociales
- [x] Todas las rutas planificadas responden 200 (contenido placeholder)
- [x] `lang="es"` en `<html>`
- [x] Sin `tenantId` expuesto al cliente
- [ ] Lighthouse Accessibility ≥ 90 en página shell (verificar manualmente en staging)

---

## Fase 2 — Home

### Objetivo

Implementar la página de inicio completa: hero, buscador con tabs, propiedades destacadas, recientes y categorías, consumiendo la Public Property API.

### Dependencias

* Fase 1 completada
* Public Property API accesible desde entorno dev
* `lib/api/client.ts` y `lib/api/public-property.ts`
* Tipos DTO (mirror local o `packages/shared-types`)

### Componentes involucrados

* `HeroSection`
* `SearchTabs`, `PropertySearchForm`, campos de búsqueda
* `FeaturedPropertiesSection`, `RecentPropertiesSection`
* `PropertySectionHeader`, `HorizontalPropertyScroll`
* `CategoryGrid`, `CategoryCard`
* `PropertyCard` (+ subcomponentes card)
* `PropertyGrid`, `PropertyGridSkeleton`, `PropertyEmptyState`
* `ListingTypeBadge`, `PropertyImagePlaceholder`

**lib:**

* `formatPrice`, `formatArea`, `getPropertyTypeLabel`, `getListingTypeLabel`
* `buildPropertySearchUrl`

### Entregables

* Home con fetch server-side a `/featured` y `/properties`
* Buscador redirige a `/propiedades` o `/emprendimientos` según tab
* Secciones destacadas y recientes con PropertyCard
* Categorías Casas / Departamentos / Emprendimientos con links correctos
* Empty states si API sin datos
* ISR configurado (`revalidate: 300`)

### Criterios de aceptación

- [ ] Hero visible con buscador funcional en mobile y desktop
- [ ] Tab Alquiler navega a `/propiedades?listingType=RENT` (con filtros del form si aplica)
- [ ] Tab Comprar navega a `/propiedades?listingType=SALE`
- [ ] Tab Emprendimientos navega a `/emprendimientos`
- [ ] Destacadas renderizan datos de `/public/properties/featured`
- [ ] Recientes renderizan datos de `/public/properties?limit=8`
- [ ] Cards muestran imagen, precio, título, ubicación y métricas
- [ ] Links «Ver todas» llevan a `/propiedades`
- [ ] Categorías enlazan con query params correctos
- [ ] Página funciona con API vacía (empty states, sin crash)
- [ ] Precios formateados correctamente ARS y USD

---

## Fase 3 — Listado de propiedades

### Objetivo

Página `/propiedades` con filtros laterales, grid de cards, paginación y sincronización URL ↔ API.

### Dependencias

* Fase 2 (`PropertyCard`, API client, format utils)
* Public Property API listado con todos los filtros documentados

### Componentes involucrados

* `PropertiesListPage`, `PropertiesListLayout`
* `PropertyFilters`, `FiltersDrawer`, `MobileFiltersButton`
* `FilterGroup`, `ListingTypeFilter`, `PropertyTypeFilter`, `LocationFilter`, `PriceRangeFilter`, `BedroomsFilter`, `BathroomsFilter`
* `ActiveFiltersBar`
* `PropertyResultsCount`, `PropertyEmptyState`
* `Pagination` (packages/ui)
* `usePropertyFilters` hook

**lib:**

* `parsePropertyFilters`, `buildPropertySearchUrl`

### Entregables

* Listado paginado conectado a API
* Filtros MVP según params soportados
* Drawer filtros mobile
* Paginación preservando filtros
* Suspense / skeleton loading

### Criterios de aceptación

- [ ] `/propiedades` lista propiedades publicables del tenant
- [ ] Cada filtro UI modifica query string y resultados API
- [ ] Paginación muestra `meta.total`, `meta.page`, `meta.totalPages`
- [ ] Botón «Limpiar filtros» resetea a `/propiedades`
- [ ] Mobile: filtros en drawer; desktop: sidebar visible
- [ ] Grid responsive: 1 / 2 / 3 columnas
- [ ] Empty state cuando `meta.total = 0`
- [ ] URL compartible reproduce mismos resultados
- [ ] Sin filtros no soportados por API en UI (condition, features)

---

## Fase 4 — Detalle de propiedad

### Objetivo

Página `/propiedades/[slug]` con galería, precio, características, descripción, relacionadas y CTA WhatsApp.

### Dependencias

* Fase 3 (`PropertyCard`, listado para relacionadas)
* Public Property API detalle por slug
* Extensión futura API para mapa (MVP: placeholder ubicación)

### Componentes involucrados

* `PropertyDetailPage`, `PropertyNotFound`
* `PropertyGallery`, `PropertyGalleryGrid`, `PropertyGalleryLightbox`, `PropertyGalleryMobileCarousel`
* `PropertyDetailHeader`, `ListingTypeSwitcher`
* `PropertyPriceCard`, `PropertyPriceDisplay`, `PropertyExpenses`
* `PropertyFeatures`, `PropertyFeatureGroup`, `PropertyFeatureChip`
* `PropertyMetricsGrid`, `PropertyDescription`
* `PropertyMapPlaceholder` (MVP; `PropertyMap` post-API)
* `RelatedPropertiesSection`, `RelatedPropertiesGrid`
* `WhatsAppCTA`, `WhatsAppFloatingBar`
* `PropertyDetailSkeleton`

**lib:**

* `getWhatsAppUrl`

### Entregables

* Detalle completo excepto mapa interactivo
* Galería con lightbox
* Features agrupadas por categoría
* Relacionadas vía heurística city + propertyType
* WhatsApp con mensaje predefinido
* `generateMetadata` por propiedad
* `notFound()` para slug inválido

### Criterios de aceptación

- [ ] `/propiedades/{slug}` muestra datos de `/public/properties/:slug`
- [ ] Galería renderiza todas las imágenes de `gallery[]`
- [ ] Lightbox funciona en desktop y carrusel en mobile
- [ ] Precio principal y expensas (si existen) visibles en PriceCard
- [ ] Features agrupadas en GENERAL, SERVICE, ROOM, AMENITY
- [ ] Descripción completa visible
- [ ] Relacionadas muestra hasta 4 propiedades distintas
- [ ] WhatsApp abre conversación con mensaje incluyendo URL de la propiedad
- [ ] 404 custom para slug inexistente
- [ ] `generateMetadata` produce title y OG image desde cover
- [ ] ListingTypeSwitcher funciona si propiedad tiene múltiples listings (query param)

---

## Fase 5 — Emprendimientos

### Objetivo

Secciones `/emprendimientos` y `/emprendimientos/[slug]` con listado, detalle, unidades disponibles y CTA WhatsApp.

### Dependencias

* Fase 1 (layout)
* Fase 4 (`WhatsAppCTA`, galería patterns)
* **Public Development API** (bloqueante para implementación completa)
* Entidades `Development`, `DevelopmentUnit` en schema (planificadas, no migradas)

### Componentes involucrados

* `DevelopmentsListPage`, `DevelopmentDetailPage`
* `DevelopmentsPlaceholder` (MVP hasta existir API)
* `DevelopmentCard`, `DevelopmentGrid`, `DevelopmentFilters`
* `DevelopmentGallery`, `DevelopmentHeader`, `DevelopmentDescription`, `DevelopmentAmenities`
* `DevelopmentUnitsList`, `DevelopmentUnitCard`, `DevelopmentUnitTable`, `UnitStatusBadge`

### Entregables

**Sub-fase 5a — Placeholder (desbloqueada):**

* Rutas emprendimientos con layout consistente
* Página «Próximamente» + `noindex`
* CategoryCard y SearchTab ya enlazan correctamente

**Sub-fase 5b — Completa (bloqueada por API):**

* Listado y detalle con datos reales
* Tabla/cards unidades disponibles
* WhatsApp contextual por unidad o proyecto

### Criterios de aceptación

**5a (MVP inmediato):**

- [ ] `/emprendimientos` responde 200 con placeholder profesional
- [ ] Navegación Header → Emprendimientos funcional
- [ ] Home categoría Emprendimientos enlaza correctamente
- [ ] `robots` noindex en placeholder

**5b (cuando exista API):**

- [ ] Listado paginado de emprendimientos del tenant
- [ ] Detalle con galería, descripción y amenities
- [ ] Unidades listadas con tipología, m², precio y estado
- [ ] CTA WhatsApp por emprendimiento y por unidad
- [ ] Responsive mobile/tablet/desktop según `public-web-ui.md`

---

## Fase 6 — SEO

### Objetivo

Optimización para motores de búsqueda: metadata completa, sitemap dinámico, robots, JSON-LD y URLs canónicas.

### Dependencias

* Fases 2–4 (páginas con contenido real)
* Listado API para enumerar slugs (sitemap)
* `NEXT_PUBLIC_SITE_URL` configurado

### Componentes involucrados

* `app/sitemap.ts`, `app/robots.ts`
* `PropertyJsonLd`, `OrganizationJsonLd`
* `generateMetadata` en home, listado, detalle, estáticas
* `Breadcrumbs` con schema BreadcrumbList (opcional)

### Entregables

* Sitemap XML con todas las propiedades publicables
* Robots.txt con referencia a sitemap
* OG tags por página
* JSON-LD en home (Organization) y detalle (RealEstateListing)
* Canonical URLs en detalle

### Criterios de aceptación

- [ ] `/sitemap.xml` accesible e incluye URLs `/propiedades/{slug}`
- [ ] `/robots.txt` permite indexación y apunta al sitemap
- [ ] Detalle incluye `og:title`, `og:description`, `og:image`
- [ ] Home incluye metadata de tenant (companyName)
- [ ] JSON-LD valida en Google Rich Results Test (detalle)
- [ ] Páginas placeholder (emprendimientos MVP) excluidas o noindex
- [ ] Canonical correcto en detalle sin duplicar por query params de listingType

---

## Fase 7 — Performance

### Objetivo

Optimizar Core Web Vitals, caching, imágenes y experiencia de carga.

### Dependencias

* Fases 1–6 completadas
* Contenido real en staging/producción

### Componentes / trabajo involucrado

* `next/image` en PropertyCard, galería, hero, categorías
* ISR tuning por tipo de página
* Route Handler `/api/revalidate` + webhook admin (opcional)
* Font optimization (subset, display swap)
* Lazy load galería lightbox y mapa
* Prefetch links PropertyCard en viewport
* Bundle analysis; reducir Client Components
* Suspense boundaries granulares

### Entregables

* Imágenes optimizadas con sizes responsive
* Estrategia cache documentada en código
* On-demand revalidation (si webhook disponible)
* Informe Lighthouse staging

### Criterios de aceptación

- [ ] LCP `< 2.5s` en mobile simulado (detalle y home)
- [ ] CLS `< 0.1` en listado y detalle
- [ ] INP `< 200ms` en filtros y galería
- [ ] Lighthouse Performance ≥ 85 mobile en home y detalle
- [ ] Imágenes servidas vía `next/image` con `sizes` apropiados
- [ ] Client JS bundle acotado; sin librerías de mapa hasta necesitarlas
- [ ] ISR verificado: cambio en API reflejado tras revalidate

---

## Orden de ejecución

```txt
Fase 1 (Layout)
    ↓
Fase 2 (Home)
    ↓
Fase 3 (Listado)
    ↓
Fase 4 (Detalle)
    ↓
├── Fase 5a (Emprendimientos placeholder) — paralelo tras Fase 1
├── Fase 6 (SEO) — tras Fase 4
└── Fase 7 (Performance) — tras Fase 6

Fase 5b (Emprendimientos completo) — tras Public Development API
```

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| API sin datos en dev | Seed documentado; empty states |
| DTO detalle incompleto para mapa | PropertyMapPlaceholder en Fase 4 |
| Sin branding API | Env vars por deploy white-label |
| Relacionadas imprecisas | Heurística city + type; endpoint futuro |
| Emprendimientos bloqueados | Placeholder 5a + noindex |
| Sitemap lento con muchas props | Paginar fetch en sitemap.ts; cache 1h |

---

## Actualización post-implementación

Al completar cada fase, actualizar:

* `PROJECT_STATE.md` — sección web pública
* Este roadmap — marcar fase completada
* `docs/06-web/*` — ajustar si diverge implementación

---

## Estimación relativa

| Fase | Complejidad | Notas |
| ---- | ----------- | ----- |
| 1 | Baja | Fundación ✅ |
| 2 | Media | Integración API + card |
| 3 | Alta | Filtros + URL sync |
| 4 | Alta | Galería + detalle |
| 5a | Baja | Placeholder |
| 5b | Alta | Depende API nueva |
| 6 | Media | Sitemap + metadata |
| 7 | Media | Tuning iterativo |
