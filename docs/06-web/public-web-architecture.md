# Public Web Architecture

Versión: v1

Estado: Documentación de diseño — sin implementación en `apps/web`.

---

## Objetivo

Definir la arquitectura técnica de `apps/web`: sitio público white-label multi-tenant que consume la Public Property API ya implementada en `apps/api`.

Referencias:

* `PROJECT_STATE.md`
* `docs/02-architecture/monorepo.md`
* `docs/03-database/current-schema.md`
* `docs/04-modules/properties.md`
* `docs/09-roadmap/property-api-roadmap.md`
* `docs/05-development/conventions.md`

---

## Principios

| Principio | Aplicación |
| --------- | ---------- |
| Document First | Esta documentación precede a cualquier código en `apps/web`. |
| Server First | Preferir React Server Components (RSC) en App Router. |
| Multi-tenant | Toda consulta a la API incluye `tenantId` resuelto server-side. |
| API como fuente de datos | Propiedades vía `/public/properties`; no acceso directo a Prisma desde web. |
| UI en español | Rutas, labels y copy en español; código en inglés. |
| White label | Branding y contacto desde configuración del tenant (fase inicial: variables de entorno). |
| Mobile First | Layouts responsivos desde el primer sprint. |

---

## Stack

| Capa | Tecnología |
| ---- | ---------- |
| Framework | Next.js 16 App Router |
| Lenguaje | TypeScript |
| Estilos | TailwindCSS (pendiente de configurar en `apps/web`) |
| Componentes compartidos | `packages/ui` |
| Tipos compartidos | `packages/shared-types` (DTOs públicos de Property) |
| Datos | Public Property API (`apps/api`) |
| Deploy | Vercel |

---

## Integración con Public Property API

### Endpoints disponibles

| Método | Ruta | Uso en web |
| ------ | ---- | ---------- |
| GET | `/public/properties?tenantId=` | Listado paginado, recientes, relacionadas, categorías |
| GET | `/public/properties/featured?tenantId=` | Home — destacadas |
| GET | `/public/properties/:slug?tenantId=` | Detalle de propiedad |

Sin JWT. Solo lectura.

### Regla de publicación (API)

Una propiedad es publicable cuando cumple **todas** estas condiciones:

* `Property.isActive = true`
* Al menos un `PropertyListing` con `status = ACTIVE`
* Precio principal (`PropertyPrice.isPrimary = true`) en ese listing
* Imagen portada (`PropertyImage.isCover = true`)

La web **no** debe reimplementar esta lógica; confía en los filtros del backend.

### Query params soportados (listado)

| Parámetro API | Tipo | Uso UI |
| ------------- | ---- | ------ |
| `tenantId` | string | Obligatorio — resuelto server-side |
| `listingType` | `SALE` \| `RENT` \| `TEMPORARY_RENT` | Tab buscador / filtros operación |
| `propertyType` | `PropertyType` enum | Filtros y categorías home |
| `city` | string | Filtro ubicación |
| `neighborhood` | string | Filtro ubicación |
| `priceMin` / `priceMax` | number | Rango de precio |
| `currency` | `ARS` \| `USD` | Moneda del filtro de precio |
| `bedrooms` | number (mínimo) | Filtro dormitorios |
| `bathrooms` | number (mínimo) | Filtro baños |
| `page` / `limit` | number | Paginación (default: 1 / 20, max limit: 100) |

Query param adicional en detalle:

| Parámetro | Uso |
| --------- | --- |
| `listingType` | Seleccionar listing activo cuando la propiedad tiene varios (SALE, RENT, TEMPORARY_RENT) |

Prioridad de listing sin filtro (API): `SALE` → `RENT` → `TEMPORARY_RENT`.

### DTOs de respuesta

**Card** (`PublicPropertyCardDto`): `id`, `slug`, `title`, `description`, `propertyType`, `city`, `neighborhood`, `coverImage`, `price`, `currency`, `bedrooms`, `bathrooms`, `totalArea`, `listingType`.

**Detalle** (`PublicPropertyDetailDto`): campos de card ampliados + `listing` (expensas, `publishedAt`, `isFeatured`), `gallery[]`, `features[]`.

**Listado paginado** (`PublicPropertyListResponseDto`): `{ data: PublicPropertyCardDto[], meta: { page, limit, total, totalPages } }`.

Campos **no expuestos** por la API pública (no mostrar ni inferir): `tenantId`, `createdById`, `internalCode`, datos de agentes.

### Mapeo de secciones web → API

| Sección web | Estrategia de datos |
| ----------- | ------------------- |
| Destacadas (home) | `GET /public/properties/featured?tenantId=&limit=8` |
| Recientes (home) | `GET /public/properties?tenantId=&limit=8` (orden API: `updatedAt desc`) |
| Categoría Casas | `GET /public/properties?tenantId=&propertyType=HOUSE&limit=4` |
| Categoría Departamentos | `GET /public/properties?tenantId=&propertyType=APARTMENT&limit=4` |
| Listado propiedades | `GET /public/properties` con filtros desde URL searchParams |
| Detalle | `GET /public/properties/:slug?tenantId=` |
| Relacionadas | `GET /public/properties?tenantId=&city=&propertyType=&limit=4` excluyendo slug actual (cliente o server) |
| Buscador tab Alquiler | Redirige a `/propiedades?listingType=RENT` |
| Buscador tab Comprar | Redirige a `/propiedades?listingType=SALE` |
| Buscador tab Emprendimientos | Redirige a `/emprendimientos` (dominio Development — pendiente API) |

### Brechas API documentadas (bloqueantes parciales)

| Necesidad web | Estado API | Workaround MVP | Resolución futura |
| ------------- | ---------- | -------------- | ----------------- |
| Resolución tenant por dominio | Pendiente | `TENANT_ID` en env server-side | Middleware + `TenantSetting.domain` |
| Branding (`logoUrl`, colores, WhatsApp) | Sin endpoint público | Variables de entorno por deploy | `GET /public/tenant` o settings públicos |
| Dirección completa y coordenadas en detalle | Parcial — detalle expone province, country, lat/lng; sin calle/número | Mapa en web cuando haya coords | Extender visibilidad pública según política |
| Filtro por `condition` | No soportado | Omitir filtro UI | Agregar query param en API |
| Filtro por features | No soportado | Omitir filtro UI | Agregar query param en API |
| Propiedades relacionadas | Sin endpoint dedicado | Reutilizar listado con filtros heurísticos | Endpoint `/related` opcional |
| Sitemap | Sin endpoint | Generar en Next.js consultando listado paginado | `GET /public/properties/sitemap` |
| Emprendimientos | Sin entidad `Development` | Placeholder UI + documentación Fase 5 | Public Development API |

Estas brechas **no impiden** iniciar Fases 1–4 del roadmap frontend; sí condicionan mapa completo, emprendimientos y white-label dinámico.

---

## Resolución de tenant

### MVP (Fase 1)

Cada deploy de `apps/web` en Vercel corresponde a **un tenant**. Configuración server-side:

```txt
TENANT_ID=<cuid>
NEXT_PUBLIC_API_URL=https://api.example.com
PUBLIC_WHATSAPP=54911...
PUBLIC_COMPANY_NAME=...
PUBLIC_PRIMARY_COLOR=#...
```

El cliente **nunca** envía `tenantId`; lo inyecta el server en las llamadas a la API.

### Objetivo (post-MVP)

```txt
Request Host → TenantSetting.domain → tenantId
```

Fallback: header `X-Tenant-Slug` en staging.

Implementación prevista en `lib/tenant/resolve-tenant.ts` como Server Function, cacheada por request.

---

## App Router — Route groups y rutas

URLs públicas en **español**, alineadas con `docs/04-modules/properties.md`.

| Ruta | Página | Tipo |
| ---- | ------ | ---- |
| `/` | Home | Dinámica (API) + estática |
| `/propiedades` | Listado propiedades | Dinámica (API + searchParams) |
| `/propiedades/[slug]` | Detalle propiedad | Dinámica (API) |
| `/emprendimientos` | Listado emprendimientos | Placeholder → API futura |
| `/emprendimientos/[slug]` | Detalle emprendimiento | Placeholder → API futura |
| `/servicios` | Servicios | Estática / contenido |
| `/nosotros` | Nosotros | Estática / contenido |
| `/asesoramiento-juridico` | Asesoramiento jurídico | Estática / contenido |
| `/contacto` | Contacto | Estática + formulario lead (futuro) |

### Route groups propuestos

Los route groups **no afectan la URL**; organizan layouts compartidos.

```txt
app/
├── layout.tsx                 # Root: html, lang="es", fonts, metadata base
├── not-found.tsx
├── robots.ts
├── sitemap.ts
├── globals.css
│
├── (site)/                    # Layout público con Header + Footer
│   ├── layout.tsx
│   ├── page.tsx               # Home
│   ├── propiedades/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── emprendimientos/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── servicios/page.tsx
│   ├── nosotros/page.tsx
│   ├── asesoramiento-juridico/page.tsx
│   └── contacto/page.tsx
│
└── api/                       # Route Handlers opcionales (BFF)
    └── revalidate/route.ts    # On-demand ISR (futuro)
```

---

## Layouts

### Root layout (`app/layout.tsx`)

Responsabilidades:

* `<html lang="es">`
* Fuentes y variables CSS globales
* Metadata por defecto del sitio
* Providers globales mínimos (solo si se requieren en Fase 7)

No incluye Header/Footer (pertenecen al layout del route group `(site)`).

### Site layout (`app/(site)/layout.tsx`)

Responsabilidades:

* `Header` (navegación principal)
* `Footer`
* Contenedor principal (`<main>`)
* Opcional: inyección de CSS variables de branding del tenant

Server Component. El menú móvil delega interactividad a un Client Component hijo (`MobileNav`).

---

## Server Components vs Client Components

### Server Components (default)

Usar para:

* Páginas (`page.tsx`)
* Layouts
* Fetch de datos a la Public Property API
* `generateMetadata`
* Listados y grids renderizados desde datos del server
* Footer, Hero estático, secciones de contenido estático
* Paginación basada en `<Link>` + searchParams (sin estado local)

### Client Components (`"use client"`)

Usar **solo** cuando haya interactividad del browser:

| Componente | Motivo |
| ---------- | ------ |
| `MobileNav` | Toggle menú hamburguesa |
| `SearchTabs` | Tabs del buscador home (estado UI antes de submit) |
| `PropertySearchForm` | Formulario buscador con validación client-side |
| `PropertyFilters` | Sidebar de filtros con controles interactivos |
| `FiltersDrawer` | Panel filtros en mobile/tablet |
| `PropertyGallery` | Carrusel, lightbox, gestos touch |
| `PropertyMap` | Mapa interactivo (Leaflet / Mapbox) |
| `ImageCarousel` | Navegación de imágenes en cards (opcional) |
| `ShareButton` | Web Share API / clipboard |

Regla: mantener Client Components en hojas del árbol; pasar datos serializables como props desde Server Components padre.

---

## Data Fetching

### Capa de servicios

```txt
apps/web/lib/api/
├── client.ts              # fetch wrapper, base URL, error handling
├── public-property.ts     # getProperties, getFeatured, getPropertyBySlug
└── types.ts               # Re-export o mirror de DTOs públicos
```

### Patrón de fetch (Server Component)

```ts
// Pseudocódigo — no implementar aún
const tenantId = getTenantId();
const properties = await getPublicProperties({ tenantId, ...filters });
```

### Configuración de cache

| Recurso | Estrategia | Revalidación |
| ------- | ---------- | ------------ |
| Home destacadas / recientes | ISR | `revalidate: 300` (5 min) |
| Listado propiedades | Dinámico + ISR | `revalidate: 60` o `cache: 'no-store'` con filtros |
| Detalle propiedad | ISR | `revalidate: 300`; tag por `slug` |
| Páginas estáticas | Static | Build time |
| Sitemap | ISR | `revalidate: 3600` |

Señal de invalidación futura: webhook desde admin al publicar/archivar propiedad → `/api/revalidate`.

### Sincronización filtros ↔ URL

El listado de propiedades usa **URL searchParams** como fuente de verdad:

```txt
/propiedades?listingType=RENT&propertyType=APARTMENT&city=Buenos+Aires&page=2
```

* Server Component lee `searchParams` y llama a la API.
* Client Component `PropertyFilters` actualiza la URL con `useRouter` + `useSearchParams`.
* Paginación con links (`<Link href="?page=2">`) sin JavaScript obligatorio.

### Manejo de errores

| Caso | Comportamiento |
| ---- | -------------- |
| API 404 en detalle | `notFound()` → página 404 del sitio |
| API 5xx / timeout | Página de error con reintento; log server-side |
| Listado vacío | Empty state UI (no error) |
| Propiedad no publicable | Tratada como 404 por la API |

---

## SEO

### Metadata (`generateMetadata`)

Por página:

| Página | `title` | `description` | `openGraph` |
| ------ | ------- | ------------- | ----------- |
| Home | `{companyName} — Inmobiliaria` | Copy del tenant | Logo + imagen hero |
| Listado | `Propiedades en {city}` o genérico | Filtros activos resumidos | — |
| Detalle | `{title} — {operación} en {neighborhood}` | `description` truncada o generada | `coverImage.url` |
| Estáticas | Título por sección | Copy específico | Logo |

Convenciones:

* `metadataBase` desde URL del tenant
* `alternates.canonical` en detalle: `/propiedades/{slug}`
* `robots`: index en páginas publicables; noindex en placeholders de emprendimientos hasta tener contenido real

### JSON-LD (Fase 6)

Detalle de propiedad: schema.org `RealEstateListing` con precio, ubicación (ciudad/barrio disponibles), imagen.

### Sitemap (`app/sitemap.ts`)

Generación dinámica:

1. Resolver `tenantId`
2. Paginar `GET /public/properties` hasta obtener todos los slugs
3. Emitir URLs `/propiedades/{slug}` con `lastModified` derivado de `updatedAt` (requiere campo en DTO o usar fecha de fetch)

Páginas estáticas incluidas manualmente: `/`, `/propiedades`, `/servicios`, `/nosotros`, `/contacto`, etc.

### Robots (`app/robots.ts`)

```txt
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://{domain}/sitemap.xml
```

---

## Estructura completa propuesta de `apps/web`

```txt
apps/web/
├── app/
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── globals.css
│   ├── (site)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── propiedades/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── emprendimientos/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── servicios/page.tsx
│   │   ├── nosotros/page.tsx
│   │   ├── asesoramiento-juridico/page.tsx
│   │   └── contacto/page.tsx
│   └── api/
│       └── revalidate/route.ts
│
├── components/
│   ├── layout/           # Header, Footer, MobileNav, SiteContainer
│   ├── home/             # HeroSection, SearchTabs, FeaturedSection, etc.
│   ├── property/         # PropertyCard, PropertyGrid, PropertyFilters, etc.
│   ├── development/      # DevelopmentCard, UnitsList (Fase 5)
│   ├── content/          # StaticPageHero, ContentSection
│   └── seo/              # JsonLd, Breadcrumbs
│
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   └── public-property.ts
│   ├── tenant/
│   │   ├── get-tenant-id.ts
│   │   └── site-config.ts
│   ├── format/
│   │   ├── price.ts
│   │   ├── area.ts
│   │   └── labels.ts      # propertyType, listingType → español
│   ├── url/
│   │   └── search-params.ts
│   └── constants/
│       └── navigation.ts
│
├── hooks/
│   ├── use-property-filters.ts
│   └── use-media-query.ts
│
├── config/
│   └── site.ts
│
├── public/
│   └── ...                # Assets estáticos del tenant (fase branding)
│
├── next.config.ts
├── tailwind.config.ts     # Pendiente
├── tsconfig.json
└── package.json
```

### Relación con `packages/`

| Ubicación | Contenido |
| --------- | --------- |
| `packages/ui` | Primitivos UI: Button, Input, Card, Tabs, Badge, Skeleton, Pagination |
| `packages/shared-types` | Tipos `PublicPropertyCard`, `PublicPropertyDetail`, enums Prisma exportados |
| `apps/web/components` | Componentes de dominio compuestos (PropertyCard, HeroSection) |

---

## Seguridad

* `tenantId` y API keys **nunca** expuestos al browser.
* Validar y sanitizar searchParams antes de enviarlos a la API.
* No confiar en precios o slugs del cliente para lógica de negocio.
* CORS: la web llama a la API server-side; el browser no necesita acceso directo en MVP.
* Formulario contacto (futuro): validación server-side + rate limiting en API Lead.

---

## Variables de entorno

| Variable | Scope | Descripción |
| -------- | ----- | ----------- |
| `TENANT_ID` | Server | ID del tenant del deploy |
| `API_URL` | Server | Base URL de `apps/api` |
| `NEXT_PUBLIC_SITE_URL` | Client | URL canónica del sitio (OG, sitemap) |
| `PUBLIC_WHATSAPP` | Server → props | Número WhatsApp CTA |
| `PUBLIC_COMPANY_NAME` | Server → metadata | Nombre comercial |
| `REVALIDATE_SECRET` | Server | Token para on-demand revalidation |

---

## Diagrama de flujo de datos

```txt
Browser
   │
   ▼
Next.js (apps/web)
   │
   ├── Server Component (page.tsx)
   │        │
   │        ▼
   │   lib/api/public-property.ts
   │        │
   │        ▼
   └── apps/api  GET /public/properties*
              │
              ▼
         PostgreSQL (Neon)
```

---

## Criterios de arquitectura cumplidos

* App Router con route groups y layouts anidados.
* Server Components como default; Client Components acotados.
* Integración explícita con endpoints y DTOs existentes.
* SEO planificado (metadata, sitemap, robots).
* Multi-tenant con frontera server-side.
* Sin entidades inventadas; emprendimientos marcados como dependencia futura.
* Brechas API identificadas con workarounds MVP documentados.
