# Properties Module

Versión: v1 (migrada)

## Objetivo

Administrar inmuebles comercializables dentro de un tenant.

---

## Modelo de datos

```txt
Property
│
├── PropertyListing
│      └── PropertyPrice
├── PropertyImage
├── PropertyFeatureAssignment → PropertyFeature (global)
└── PropertyAgentAccess
```

Documentación técnica: `docs/03-database/property-domain.md`

---

## API (NestJS)

Estado: Foundation — entidades `Property`, `PropertyListing`, `PropertyPrice`, `PropertyImage` y Public API implementadas.

### Property

Ruta base admin: `/properties`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/properties` | Crear propiedad |
| GET | `/properties?tenantId=` | Listar por tenant |
| GET | `/properties/:id?tenantId=` | Detalle |
| PATCH | `/properties/:id?tenantId=` | Actualizar |
| DELETE | `/properties/:id?tenantId=` | Archivar (`isActive = false`) |

Reglas implementadas:

* `tenantId` obligatorio en operaciones (query DTOs validados).
* `createdById` obligatorio al crear; debe pertenecer al tenant.
* Existencia de `tenantId` validada antes de crear.
* `slug` único por tenant.
* `internalCode` único por tenant (cuando está definido); `""` → `null`.
* Borrado lógico mediante `isActive = false`.
* Listados filtrados por `tenantId` (opcional `isActive`).
* Escrituras con defensa en profundidad (`tenantId` en `updateMany`).
* Errores Prisma traducidos: `P2002` → 409, `P2003` → 400, `P2025` → 404.
* Respuestas tipadas con `PropertyResponseDto`.

### PropertyListing

Ruta base admin: `/property-listings`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/property-listings` | Crear publicación |
| GET | `/property-listings?tenantId=` | Listar por tenant |
| GET | `/property-listings/:id?tenantId=` | Detalle |
| PATCH | `/property-listings/:id?tenantId=` | Actualizar |
| DELETE | `/property-listings/:id?tenantId=` | Cerrar (`status = CLOSED`) |

Reglas implementadas:

* `tenantId` y `propertyId` obligatorios al crear.
* La Property debe existir y pertenecer al mismo tenant.
* No se puede crear ni activar un listing si `Property.isActive = false` (propiedad archivada).
* Un solo listing por `listingType` (SALE, RENT, TEMPORARY_RENT) por Property (`@@unique([propertyId, listingType])`).
* Listings `CLOSED` no se reemplazan con un registro nuevo: se reactivan (`CLOSED → ACTIVE`).
* `status` default: `DRAFT`.
* Borrado lógico: `DRAFT` / `ACTIVE` / `PAUSED` / `RESERVED` → `CLOSED` (no borrado físico).
* Transiciones de estado validadas en Service (`DRAFT → ACTIVE → PAUSED / RESERVED → CLOSED → ACTIVE`).
* `publishedAt` se asigna en la primera activación; se conserva en reactivaciones.
* `closedAt` se asigna al cerrar; vuelve a `null` al reactivar (`CLOSED → ACTIVE`).
* No se puede activar (`→ ACTIVE`) sin al menos un `PropertyPrice` asociado.
* Listados filtrados por `tenantId` (opcional `propertyId`, `listingType`, `status`).
* Escrituras multi-tenant safe (`updateMany` + `tenantId`).
* Respuestas tipadas con `PropertyListingResponseDto`.

### PropertyPrice

Ruta base admin: `/property-prices`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/property-prices` | Crear precio |
| GET | `/property-prices?tenantId=&listingId=` | Listar por tenant y listing |
| GET | `/property-prices/:id?tenantId=` | Detalle |
| PATCH | `/property-prices/:id?tenantId=` | Actualizar |
| DELETE | `/property-prices/:id?tenantId=` | Eliminar (borrado físico) |

Reglas implementadas:

* `tenantId` y `listingId` obligatorios al crear.
* El `PropertyListing` debe existir y pertenecer al mismo tenant.
* Múltiples precios por listing (ARS/USD); varios en la misma moneda permitidos con `label` distinto (ej. contado / financiado).
* Exactamente un `isPrimary = true` por listing cuando existen precios; al marcar uno como principal, los demás pasan a `isPrimary = false` (transacción Prisma).
* El primer precio del listing queda automáticamente como `isPrimary = true`.
* Al desmarcar el principal (`isPrimary: false`): promoción automática de otro precio si existen alternativas; rechazado si es el único precio.
* `amount` debe ser mayor que 0; `currency` obligatorio (`ARS` o `USD`).
* Borrado físico permitido en Foundation.
* No se puede eliminar el único precio si el listing está `ACTIVE`, `PAUSED` o `RESERVED`.
* Permitido eliminar el único precio si el listing está `DRAFT` o `CLOSED`.
* Al eliminar el precio principal, se promueve automáticamente otro del mismo listing (transacción Prisma).
* DELETE devuelve snapshot del precio eliminado (estado pre-borrado).
* Listados filtrados por `tenantId` y `listingId`.
* Escrituras multi-tenant safe (`updateMany` / `deleteMany` + `tenantId`).
* Respuestas tipadas con `PropertyPriceResponseDto`.

### PropertyImage

Ruta base admin: `/property-images`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/property-images` | Crear imagen (solo metadata) |
| GET | `/property-images?tenantId=&propertyId=` | Listar por tenant y propiedad |
| GET | `/property-images/:id?tenantId=` | Detalle |
| PATCH | `/property-images/:id?tenantId=` | Actualizar metadata |
| DELETE | `/property-images/:id?tenantId=` | Eliminar (borrado físico) |

Reglas implementadas:

* `tenantId` y `propertyId` obligatorios al crear.
* La Property debe existir y pertenecer al mismo tenant.
* No se puede crear imagen si `Property.isActive = false` (propiedad archivada).
* `storageKey` obligatorio al crear (storage agnóstico; sin upload físico en Foundation).
* Una sola `isCover = true` por Property; al marcar una como portada, las demás pasan a `isCover = false` (transacción Prisma).
* La primera imagen de la Property queda automáticamente como `isCover = true`.
* Al eliminar la portada, se promueve automáticamente la imagen más antigua restante; si no quedan imágenes, ninguna portada.
* `sortOrder` persistido; reordenamiento drag & drop pendiente.
* Borrado físico permitido en Foundation.
* DELETE devuelve snapshot de la imagen eliminada (estado pre-borrado).
* Listados filtrados por `tenantId` y `propertyId`.
* Escrituras multi-tenant safe (`updateMany` / `deleteMany` + `tenantId`).
* Respuestas tipadas con `PropertyImageResponseDto`.

Pendiente: upload físico, storage providers (R2/S3/Supabase), signed URLs, compartición, guards JWT, slug autogenerado.

### Public API

Ruta base: `/public/properties`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/public/properties?tenantId=` | Listado público paginado |
| GET | `/public/properties/featured?tenantId=` | Destacadas (`isFeatured = true`) |
| GET | `/public/properties/:slug?tenantId=` | Detalle por slug |

Sin JWT. Solo lectura.

Regla de publicación (todas las rutas):

* `Property.isActive = true`
* Al menos un `PropertyListing` con `status = ACTIVE`
* Precio principal (`PropertyPrice.isPrimary = true`) en ese listing
* Imagen portada (`PropertyImage.isCover = true`)

Filtros en listado:

* `tenantId`, `listingType`, `propertyType`, `city`, `neighborhood`
* `priceMin`, `priceMax`, `currency`
* `bedrooms`, `bathrooms` (mínimo)
* `page`, `limit`

Respuesta pública (`PublicPropertyCardDto` / `PublicPropertyDetailDto`):

* Expone: `id`, `slug`, `title`, `description`, `propertyType`, `city`, `neighborhood`, `coverImage`, `price`, `currency`, `bedrooms`, `bathrooms`, `totalArea`, `listingType`
* Detalle incluye además: listing activo, galería completa, features asignadas activas
* No expone: `tenantId`, `createdById`, `internalCode`, datos de agentes

Pendiente: resolución de tenant por dominio/header, sitemap, SEO metadata, frontend Next.js.

Documentación técnica API: `docs/09-roadmap/property-api-roadmap.md`

---

## Publicaciones soportadas

| UI                  | listingType    |
| ------------------- | -------------- |
| Venta               | SALE           |
| Alquiler            | RENT           |
| Alquiler temporario | TEMPORARY_RENT |

Una propiedad puede tener varias publicaciones simultáneas (una por tipo).

---

## Información física (Property)

| Campo UI            | Campo DB        |
| ------------------- | --------------- |
| Tipo de inmueble    | propertyType    |
| Condición           | condition       |
| Activa              | isActive        |
| URL pública         | slug            |
| Código interno      | internalCode    |
| Dirección           | street, streetNumber, floor, apartment |
| Ubicación           | neighborhood, city, state, country, postalCode, latitude, longitude |
| Metros totales      | totalArea       |
| Metros cubiertos    | coveredArea     |
| Metros descubiertos | uncoveredArea   |
| Frente del terreno  | lotFront        |
| Fondo del terreno   | lotDepth        |
| Ambientes           | rooms           |
| Dormitorios         | bedrooms        |
| Baños               | bathrooms       |
| Toilettes           | halfBathrooms   |
| Cocheras            | parkingSpaces   |
| Antigüedad          | yearBuilt       |
| Orientación         | orientation     |
| Disposición         | layout          |
| Luminosidad         | brightness      |

### Tipos de inmueble (UI → propertyType)

| UI              | propertyType  |
| --------------- | ------------- |
| Casa            | HOUSE         |
| Departamento    | APARTMENT     |
| PH              | PH            |
| Oficina         | OFFICE        |
| Local           | COMMERCIAL    |
| Galpón          | WAREHOUSE     |
| Industrial      | INDUSTRIAL    |
| Terreno         | LAND          |
| Campo           | FIELD         |
| Cochera         | GARAGE        |
| Casa quinta     | COUNTRY_HOUSE |
| Otro            | OTHER         |

### Condición (UI → condition)

| UI               | condition           |
| ---------------- | ------------------- |
| A estrenar       | NEW                 |
| En construcción  | UNDER_CONSTRUCTION  |
| Excelente estado | EXCELLENT           |
| Muy bueno        | VERY_GOOD           |
| Bueno            | GOOD                |
| Regular          | REGULAR             |
| A refaccionar    | TO_RENOVATE         |

---

## Información comercial (PropertyListing + PropertyPrice)

| Campo UI  | Campo DB                         |
| --------- | -------------------------------- |
| Operación | listingType                      |
| Estado    | status                           |
| Precio    | PropertyPrice.amount             |
| Moneda    | PropertyPrice.currency           |
| Expensas  | expensesAmount, expensesCurrency |
| Destacado | isFeatured                       |

Múltiples precios por publicación (ARS/USD). Uno marcado como `isPrimary`. Varios precios en la misma moneda son válidos con `label` diferenciador (contado, financiado, etc.).

---

## URLs públicas (SEO)

Patrón: `/propiedades/{slug}`

* `slug` único por tenant.
* Generado automáticamente al crear la propiedad.
* Estable tras publicación.

---

## Imágenes (PropertyImage)

* Portada (`isCover`)
* Galería con orden manual (`sortOrder`)
* Storage agnóstico (R2, S3, Supabase)

---

## Características

Catálogo global (`PropertyFeature`). El tenant asigna vía `PropertyFeatureAssignment`.

### Generales (`GENERAL`)

Apto crédito, Apto profesional, Uso comercial

### Servicios (`SERVICE`)

Agua corriente, Gas natural, Cloacas, Internet

### Ambientes (`ROOM`)

Living, Comedor, Jardín, Patio, Lavadero

### Amenities (`AMENITY`)

Pileta, Parrilla, Quincho, Seguridad, Aire acondicionado

Solo `SUPER_ADMIN` gestiona el catálogo global.

---

## Ownership y compartición

**Creador:** `createdById` en cada propiedad.

**Compartición:** `PropertyAgentAccess` con `canView` / `canEdit`. Otorgado por `TENANT_ADMIN`.

---

## Permisos

### AGENT

* Crear propiedades.
* Ver y editar propias.
* Ver y editar compartidas según `PropertyAgentAccess`.

### TENANT_ADMIN

* Ver todas las propiedades del tenant.
* Administrar agentes.
* Compartir propiedades (`PropertyAgentAccess`).

### SUPER_ADMIN

* Acceso global.
* Gestionar catálogo `PropertyFeature`.

---

## Web pública

* Lista propiedades con `isActive = true` y `PropertyListing` con `status = ACTIVE` a nivel tenant.
* Detalle por `slug` de la propiedad.
* Filtros por tipo, condición, operación, ubicación, precio y características.
* Listados recientes, sitemap e ISR ordenados por `updatedAt`.
* No depende del agente creador.
