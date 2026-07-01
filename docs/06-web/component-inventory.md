# Component Inventory — Public Web

Versión: v1

Estado: Inventario alineado a `apps/web` — actualizado Fase 4 Web Premium. Ver `docs/06-web/web-premium-fase4.md`.

Referencias:

* `docs/06-web/public-web-architecture.md`
* `docs/06-web/public-web-ui.md`
* `docs/05-development/conventions.md`

---

## Convenciones de ubicación

| Ubicación | Criterio |
| --------- | -------- |
| `packages/ui` | Primitivos UI genéricos, sin lógica de dominio inmobiliario |
| `apps/web/components` | Componentes compuestos de dominio y layout del sitio |
| `packages/shared-types` | Tipos TypeScript compartidos (DTOs públicos) |

Naming: PascalCase en componentes; carpetas kebab-case o agrupadas por dominio.

Leyenda de tipo:

* **SC** — Server Component (default)
* **CC** — Client Component (`"use client"`)
* **Hybrid** — SC wrapper + CC hijo interactivo

---

## 1. Layout

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `SiteLayout` | SC | `apps/web/app/(site)/layout.tsx` | Orquesta Header + main + Footer |
| `SiteContainer` | SC | `components/layout/` | Max-width, padding horizontal responsive |
| `Header` | Hybrid | `components/layout/` | Barra navegación desktop + slot MobileNav |
| `HeaderLogo` | SC | `components/layout/` | Logo tenant con link a `/` |
| `MainNav` | SC | `components/layout/` | Links desktop: Inicio, Propiedades, etc. |
| `MobileNav` | CC | `components/layout/` | Drawer/menú hamburguesa mobile |
| `NavLink` | SC | `components/layout/` | Link con estado activo según pathname |
| `Footer` | SC | `components/layout/` | Footer multi-columna completo |
| `FooterNav` | SC | `components/layout/` | Columna links navegación |
| `FooterContact` | SC | `components/layout/` | Teléfono, email, WhatsApp, dirección |
| `FooterSocial` | SC | `components/layout/` | Iconos redes (cuando existan datos) |
| `FooterCopyright` | SC | `components/layout/` | © año + companyName |
| `Breadcrumbs` | SC | `components/seo/` | Inicio > Propiedades > … |
| `PageHeader` | SC | `components/layout/` | Título H1 + descripción opcional + contador |

---

## 2. Home

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `HomePage` | SC | `app/(site)/page.tsx` | Composición de secciones home |
| `HeroSection` | SC | `components/home/` | Imagen/gradiente + título + subtítulo |
| `SearchTabs` | CC | `components/home/` | Tabs Alquiler / Comprar / Emprendimientos |
| `PropertySearchForm` | CC | `components/home/` | Formulario búsqueda; submit → URL con params |
| `SearchFieldLocation` | CC | `components/home/` | Input ubicación (city/neighborhood) |
| `SearchFieldPropertyType` | CC | `components/home/` | Select tipo inmueble |
| `SearchFieldBedrooms` | CC | `components/home/` | Select dormitorios mínimos |
| `FeaturedPropertiesSection` | SC | `components/home/` | Wrapper sección destacadas + fetch |
| `RecentPropertiesSection` | SC | `components/home/` | Wrapper sección recientes + fetch |
| `PropertySectionHeader` | SC | `components/home/` | Título + link «Ver todas» |
| `CategoryGrid` | SC | `components/home/` | Grid 3 categorías |
| `CategoryCard` | SC | `components/home/` | Card imagen Casas / Deptos / Emprendimientos |
| `HorizontalPropertyScroll` | Hybrid | `components/home/` | Carrusel mobile; grid desktop |

---

## 3. Propiedades — Listado

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `PropertiesListPage` | SC | `app/(site)/propiedades/page.tsx` | Página listado |
| `PropertiesListLayout` | SC | `components/property/` | Sidebar + grid + paginación |
| `PropertyFilters` | CC | `components/property/` | Panel filtros lateral |
| `FiltersDrawer` | CC | `components/property/` | Bottom sheet filtros mobile |
| `FilterGroup` | CC | `components/property/` | Grupo label + control |
| `ListingTypeFilter` | CC | `components/property/` | Chips Venta / Alquiler / Temporario |
| `PropertyTypeFilter` | CC | `components/property/` | Select/checkboxes PropertyType |
| `LocationFilter` | CC | `components/property/` | City + neighborhood inputs |
| `PriceRangeFilter` | CC | `components/property/` | Min/max + currency toggle |
| `BedroomsFilter` | CC | `components/property/` | Select mínimo dormitorios |
| `BathroomsFilter` | CC | `components/property/` | Select mínimo baños |
| `ActiveFiltersBar` | CC | `components/property/` | Chips filtros activos + limpiar |
| `PropertyGrid` | SC | `components/property/` | CSS grid responsive de cards |
| `PropertyGridSkeleton` | SC | `components/property/` | Skeleton loading grid |
| `PropertyEmptyState` | SC | `components/property/` | Sin resultados |
| `PropertyResultsCount` | SC | `components/property/` | «X propiedades encontradas» |
| `Pagination` | SC | `packages/ui` | Links página anterior/siguiente + números |
| `MobileFiltersButton` | CC | `components/property/` | Botón abrir FiltersDrawer |

---

## 4. Propiedades — Card y badges

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `PropertyCard` | SC | `components/property/` | Card listado/home; link a detalle |
| `PropertyCardImage` | SC | `components/property/` | Imagen cover con aspect ratio |
| `PropertyCardPrice` | SC | `components/property/` | Precio formateado |
| `PropertyCardLocation` | SC | `components/property/` | Barrio, ciudad |
| `PropertyCardMetrics` | SC | `components/property/` | Dormitorios, baños, m² |
| `ListingTypeBadge` | SC | `components/property/` | Badge Venta / Alquiler / Temporario |
| `FeaturedBadge` | SC | `components/property/` | Badge «Destacada» |
| `PropertyImagePlaceholder` | SC | `components/property/` | Fallback sin imagen |

---

## 5. Propiedades — Detalle

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `PropertyDetailPage` | SC | `app/(site)/propiedades/[slug]/page.tsx` | Página detalle |
| `PropertyGallery` | CC | `components/property/` | Grid + lightbox carrusel |
| `PropertyGalleryGrid` | CC | `components/property/` | Layout desktop thumbnails |
| `PropertyGalleryLightbox` | CC | `components/property/` | Modal fullscreen imágenes |
| `PropertyGalleryMobileCarousel` | CC | `components/property/` | Swipe mobile |
| `PropertyDetailHeader` | SC | `components/property/` | Título + ubicación + badges |
| `ListingTypeSwitcher` | CC | `components/property/` | Tabs cambio operación (multi-listing) |
| `PropertyPriceCard` | SC | `components/property/` | Precio, expensas, sticky sidebar |
| `PropertyPriceDisplay` | SC | `components/property/` | Formato moneda ARS/USD |
| `PropertyExpenses` | SC | `components/property/` | Línea expensas si existen |
| `PropertyFeatures` | SC | `components/property/` | Grid características por categoría |
| `PropertyFeatureGroup` | SC | `components/property/` | Sección GENERAL / SERVICE / etc. |
| `PropertyFeatureChip` | SC | `components/property/` | Chip nombre + value opcional |
| `PropertyMetricsGrid` | SC | `components/property/` | Iconos dormitorios, baños, m² |
| `PropertyDescription` | SC | `components/property/` | Texto descripción + expand |
| `PropertyMap` | CC | `components/property/` | Mapa (cuando API exponga coords) |
| `PropertyMapPlaceholder` | SC | `components/property/` | MVP: solo texto ubicación |
| `RelatedPropertiesSection` | SC | `components/property/` | Sección similares |
| `RelatedPropertiesGrid` | SC | `components/property/` | Grid/carrusel PropertyCard |
| `PropertyDetailSkeleton` | SC | `components/property/` | Loading detalle |
| `PropertyNotFound` | SC | `app/(site)/propiedades/[slug]/not-found.tsx` | 404 específico |

---

## 6. Emprendimientos

**Dependencia:** Public Development API (pendiente).

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `DevelopmentsListPage` | SC | `app/(site)/emprendimientos/page.tsx` | Listado emprendimientos |
| `DevelopmentDetailPage` | SC | `app/(site)/emprendimientos/[slug]/page.tsx` | Detalle emprendimiento |
| `DevelopmentsPlaceholder` | SC | `components/development/` | MVP: mensaje próximamente |
| `DevelopmentCard` | SC | `components/development/` | Card listado emprendimiento |
| `DevelopmentGrid` | SC | `components/development/` | Grid de DevelopmentCard |
| `DevelopmentGallery` | CC | `components/development/` | Galería proyecto |
| `DevelopmentHeader` | SC | `components/development/` | Nombre, ubicación, estado obra |
| `DevelopmentDescription` | SC | `components/development/` | Texto comercial |
| `DevelopmentAmenities` | SC | `components/development/` | Amenities del proyecto |
| `DevelopmentUnitsList` | SC | `components/development/` | Tabla/cards unidades |
| `DevelopmentUnitCard` | SC | `components/development/` | Card unidad mobile |
| `DevelopmentUnitTable` | SC | `components/development/` | Tabla unidades desktop |
| `UnitStatusBadge` | SC | `components/development/` | Disponible / Reservada / Vendida |
| `DevelopmentFilters` | CC | `components/development/` | Filtros listado (futuro) |

---

## 7. CTAs y contacto

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `WhatsAppCTA` | SC | `components/shared/` | Botón/link WhatsApp con mensaje |
| `WhatsAppFloatingBar` | CC | `components/shared/` | Barra fija mobile en detalle |
| `ContactInfo` | SC | `components/shared/` | Bloque tel/email/dirección |
| `ContactForm` | CC | `components/content/` | Formulario contacto (futuro Lead API) |
| `CallToActionBanner` | SC | `components/shared/` | Banner genérico CTA sección |

---

## 8. Páginas estáticas

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `StaticPage` | SC | `components/content/` | Layout genérico página estática |
| `StaticPageHero` | SC | `components/content/` | Hero compacto título |
| `ContentSection` | SC | `components/content/` | Bloque título + párrafo |
| `ServicesGrid` | SC | `components/content/` | Grid servicios |
| `ServiceCard` | SC | `components/content/` | Card servicio individual |
| `TeamGrid` | SC | `components/content/` | Grid equipo (opcional Nosotros) |
| `LegalContent` | SC | `components/content/` | Texto asesoramiento jurídico |

---

## 9. SEO y metadata

| Componente | Tipo | Ubicación | Descripción |
| ---------- | ---- | --------- | ----------- |
| `PropertyJsonLd` | SC | `components/seo/` | JSON-LD RealEstateListing |
| `OrganizationJsonLd` | SC | `components/seo/` | JSON-LD Organization (home) |
| `BreadcrumbJsonLd` | SC | `components/seo/` | JSON-LD BreadcrumbList |
| `JsonLd` | SC | `components/seo/` | Script base JSON-LD |
| `OpenGraphTags` | SC | vía `generateMetadata` | OG tags por página |
| `CanonicalUrl` | SC | vía `generateMetadata` | URL canónica |

---

## 10. Primitivos UI (`packages/ui`)

Componentes genéricos a crear o extender en `packages/ui`:

| Componente | Tipo | Descripción |
| ---------- | ---- | ----------- |
| `Button` | CC | Variantes: primary, secondary, outline, ghost, whatsapp |
| `Input` | CC | Text, number con estilos consistentes |
| `Select` | CC | Select nativo estilizado o headless |
| `Textarea` | CC | Para formularios contacto |
| `Card` | SC | Contenedor con sombra y radius |
| `Badge` | SC | Labels pequeños (operación, estado) |
| `Tabs` | CC | Tabs accesibles (SearchTabs, ListingTypeSwitcher) |
| `Skeleton` | SC | Placeholder loading |
| `Spinner` | CC | Indicador carga inline |
| `Modal` | CC | Base lightbox galería |
| `Drawer` | CC | Panel lateral/bottom mobile |
| `IconButton` | CC | Botones icono (cerrar, filtros) |
| `Pagination` | SC | Controles paginación accesibles |
| `Chip` | CC | Filtros activos removibles |
| `RadioGroup` | CC | Filtro operación |
| `Checkbox` | CC | Filtros multi-select futuros |
| `Separator` | SC | Línea divisoria |
| `AspectRatio` | SC | Wrapper ratio imagen 16:10 |
| `VisuallyHidden` | SC | Texto solo screen readers |

---

## 11. Utilidades y hooks (no componentes visuales)

| Nombre | Ubicación | Descripción |
| ------ | --------- | ----------- |
| `formatPrice` | `lib/format/price.ts` | Formateo ARS / USD |
| `formatArea` | `lib/format/area.ts` | m² con sufijo |
| `getPropertyTypeLabel` | `lib/format/labels.ts` | Enum → español |
| `getListingTypeLabel` | `lib/format/labels.ts` | SALE → Venta |
| `buildPropertySearchUrl` | `lib/url/search-params.ts` | Construir URL filtros |
| `parsePropertyFilters` | `lib/url/search-params.ts` | searchParams → query API |
| `getWhatsAppUrl` | `lib/tenant/site-config.ts` | URL wa.me con mensaje |
| `usePropertyFilters` | `hooks/use-property-filters.ts` | Sync filtros ↔ URL |
| `useMediaQuery` | `hooks/use-media-query.ts` | Breakpoints client |
| `getPublicProperties` | `lib/api/public-property.ts` | Fetch listado |
| `getFeaturedProperties` | `lib/api/public-property.ts` | Fetch destacadas |
| `getPropertyBySlug` | `lib/api/public-property.ts` | Fetch detalle |

---

## 12. Matriz componente → página

| Página | Componentes principales |
| ------ | ----------------------- |
| Home | Header, HeroSection, SearchTabs, PropertySearchForm, FeaturedPropertiesSection, RecentPropertiesSection, CategoryGrid, Footer |
| Listado | Header, Breadcrumbs, PropertyFilters, PropertyGrid, PropertyCard, Pagination, Footer |
| Detalle | Header, Breadcrumbs, PropertyGallery, PropertyDetailHeader, PropertyPriceCard, PropertyFeatures, PropertyDescription, PropertyMapPlaceholder, RelatedPropertiesSection, WhatsAppCTA, Footer |
| Emprendimientos | Header, DevelopmentGrid, DevelopmentCard, Footer (+ placeholder MVP) |
| Detalle emprendimiento | DevelopmentGallery, DevelopmentHeader, DevelopmentUnitsList, WhatsAppCTA |
| Estáticas | StaticPageHero, ContentSection, ContactInfo, Footer |

---

## 13. Prioridad de implementación

Orden sugerido alineado con `frontend-roadmap.md`:

1. **Layout:** SiteContainer, Header, MobileNav, Footer, Breadcrumbs
2. **Primitivos UI:** Button, Card, Badge, Skeleton, Input, Select, Tabs, Pagination
3. **Property domain:** PropertyCard, PropertyGrid, format utils
4. **Home:** HeroSection, SearchTabs, secciones destacadas/recientes, CategoryGrid
5. **Listado:** PropertyFilters, FiltersDrawer, ActiveFiltersBar, Pagination
6. **Detalle:** PropertyGallery, PropertyPriceCard, PropertyFeatures, WhatsAppCTA, RelatedPropertiesSection
7. **SEO:** PropertyJsonLd, metadata helpers
8. **Emprendimientos:** Placeholder → componentes completos cuando exista API
9. **Estáticas:** StaticPage, ContentSection, ContactForm (futuro)

---

## 14. Conteo resumen

| Categoría | Cantidad aprox. |
| --------- | --------------- |
| Layout | 14 |
| Home | 13 |
| Listado propiedades | 18 |
| Card / badges | 8 |
| Detalle propiedad | 20 |
| Emprendimientos | 14 |
| CTAs / contacto | 5 |
| Páginas estáticas | 7 |
| SEO | 4 |
| Primitivos UI | 18 |
| Utilidades / hooks | 11 |

**Total componentes UI planificados:** ~130 entradas (incluye primitivos y wrappers pequeños).

Componentes **MVP mínimo** para propiedades end-to-end (Fases 1–4): ~35 componentes.
