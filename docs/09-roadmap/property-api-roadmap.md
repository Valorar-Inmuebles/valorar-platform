# Property API Roadmap

Versión: v1

Estado: Fase 1 parcialmente completada. `Property`, `PropertyListing`, `PropertyPrice`, `PropertyImage` y Public API Foundation implementados en `apps/api`.

Implementado:

* `PrismaService` + `PrismaModule` global.
* `PropertyModule` en `apps/api/src/modules/property`.
* `PropertyListingModule` en `apps/api/src/modules/property-listing`.
* `PropertyPriceModule` en `apps/api/src/modules/property-price`.
* `PropertyImageModule` en `apps/api/src/modules/property-image`.
* `PublicPropertyModule` en `apps/api/src/modules/public-property`.
* `PropertyController`, `PropertyService`, `PropertyRepository`.
* `PropertyListingController`, `PropertyListingService`, `PropertyListingRepository`.
* `PropertyPriceController`, `PropertyPriceService`, `PropertyPriceRepository`.
* `PropertyImageController`, `PropertyImageService`, `PropertyImageRepository`.
* `PublicPropertyController`, `PublicPropertyService`, `PublicPropertyRepository`.
* DTOs Property: `CreatePropertyDto`, `UpdatePropertyDto`, `PropertyResponseDto`, `PropertyTenantQueryDto`, `ListPropertiesQueryDto`.
* DTOs PropertyListing: `CreatePropertyListingDto`, `UpdatePropertyListingDto`, `PropertyListingResponseDto`, `PropertyListingTenantQueryDto`, `ListPropertyListingsQueryDto`.
* DTOs PropertyPrice: `CreatePropertyPriceDto`, `UpdatePropertyPriceDto`, `PropertyPriceResponseDto`, `PropertyPriceTenantQueryDto`, `ListPropertyPricesQueryDto`.
* DTOs PropertyImage: `CreatePropertyImageDto`, `UpdatePropertyImageDto`, `PropertyImageResponseDto`, `PropertyImageTenantQueryDto`, `ListPropertyImagesQueryDto`.
* DTOs Public API: `ListPublicPropertiesQueryDto`, `PublicPropertySlugQueryDto`, `FeaturedPublicPropertiesQueryDto`, `PublicPropertyCardDto`, `PublicPropertyDetailDto`, `PublicPropertyListResponseDto`.
* `ValidationPipe` global.
* `PrismaExceptionFilter` global (`P2002` → 409, `P2003` → 400, `P2025` → 404).
* Swagger en `/api/docs` con request/response DTOs y errores principales.
* Escrituras multi-tenant safe en repository (`updateMany` + `tenantId`).
* Validación de unicidad: `slug`, `internalCode` (por tenant); `listingType` (por property).
* Validación de existencia de `tenantId` al crear.
* Validación Property → Listing: property existe, pertenece al tenant y `isActive = true` al crear/activar.
* Soft delete Listing vía `status = CLOSED`; reactivación `CLOSED → ACTIVE` (reutilizar registro).
* PropertyPrice CRUD en `/property-prices` (borrado físico Foundation).
* Reglas `isPrimary`: primer precio auto-principal; exactamente uno cuando hay precios; democión/promoción atómica al crear/actualizar/eliminar principal.
* Bloqueo: no eliminar único precio de listing `ACTIVE`, `PAUSED` o `RESERVED`.
* Activación listing (`→ ACTIVE`): requiere al menos un precio.
* Validación Listing → Price: listing existe y pertenece al tenant.
* Swagger PropertyPrice: `@ApiQuery` en endpoints GET/PATCH/DELETE; errores de negocio documentados.
* PropertyImage CRUD en `/property-images` (metadata only; borrado físico Foundation).
* Reglas `isCover`: primera imagen auto-portada; democión atómica al crear/actualizar portada; promoción atómica al eliminar portada.
* Validación Property → Image: property existe, pertenece al tenant y `isActive = true` al crear.
* Swagger PropertyImage: `@ApiQuery` en endpoints GET/PATCH/DELETE.
* Public API en `/public/properties` (solo lectura, sin JWT).
* Regla de publicación: `isActive` + listing `ACTIVE` + precio `isPrimary` + imagen `isCover`.
* Endpoints: listado paginado con filtros, detalle por `slug`, destacadas por `isFeatured`.
* DTOs públicos sin datos internos (`createdById`, `internalCode`, `tenantId`).

Pendiente (Fase 1 restante / Fases 2–5):

* Guards: `AuthGuard`, `TenantGuard`, `RolesGuard`.
* Slug autogenerado (regla documentada en dominio).
* Paginación y filtros avanzados en listados admin.
* Entidades relacionadas: features admin, agent access.
* Storage abstraction y upload físico.
* Resolución de tenant por dominio/header en Public API.
* Sitemap y SEO metadata endpoints.

---

## Contexto

Property Foundation está completado a nivel de datos:

* Schema Prisma implementado.
* Migración `202606150001_property_foundation` aplicada en Neon.
* Documentación sincronizada.

Referencias:

* `docs/03-database/property-domain.md`
* `docs/03-database/current-schema.md`
* `docs/04-modules/properties.md`
* `docs/03-database/multi-tenant.md`
* `docs/05-development/conventions.md`

Este documento define la implementación futura de la API Property en `apps/api` (NestJS), sin modificar el schema Prisma.

---

## Principios

* Arquitectura: `Controller → Service → Repository → Prisma`
* Código en inglés. UI en español.
* Multi-tenant obligatorio en toda operación de negocio.
* Reglas de negocio en Services, nunca en Controllers.
* Storage agnóstico (R2, S3, Supabase).
* Document First: actualizar docs al implementar cada fase.

---

## Estructura de módulos propuesta

```txt
apps/api/src/
├── prisma/
│   └── prisma.service.ts
├── common/
│   ├── guards/
│   ├── decorators/
│   └── filters/
├── storage/
│   ├── storage.interface.ts
│   ├── storage.module.ts
│   └── providers/
│       ├── r2.storage.ts
│       ├── s3.storage.ts
│       └── supabase.storage.ts
└── property/
    ├── property.module.ts
    ├── controllers/
    │   ├── property.controller.ts          (admin)
    │   ├── property-listing.controller.ts  (admin)
    │   ├── property-feature.controller.ts  (admin / super-admin)
    │   └── public-property.controller.ts   (público)
    ├── services/
    │   ├── property.service.ts
    │   ├── property-listing.service.ts
    │   └── property-image.service.ts
    ├── repositories/
    │   ├── property.repository.ts
    │   ├── property-listing.repository.ts
    │   └── property-feature.repository.ts
    └── dto/
```

---

## 1. Repository Layer

Responsabilidad: acceso a datos vía Prisma. Sin reglas de negocio.

### PropertyRepository

Entidades: `Property`, `PropertyImage`, `PropertyFeatureAssignment`, `PropertyAgentAccess`.

| Método (propuesto) | Descripción |
| ------------------ | ----------- |
| `create(data, tenantId)` | Crear propiedad |
| `findById(id, tenantId)` | Buscar por ID con relaciones opcionales |
| `findBySlug(slug, tenantId)` | Buscar por slug (público y admin) |
| `findMany(filters, tenantId, pagination)` | Listado con filtros |
| `update(id, data, tenantId)` | Actualizar campos físicos |
| `softArchive(id, tenantId)` | `isActive = false` |
| `assignFeatures(propertyId, featureIds, tenantId)` | Gestionar `PropertyFeatureAssignment` |
| `manageAgentAccess(propertyId, access, tenantId)` | CRUD `PropertyAgentAccess` |
| `manageImages(propertyId, images, tenantId)` | CRUD `PropertyImage` metadata |

Índices a aprovechar: `[tenantId, slug]`, `[tenantId, updatedAt]`, `[tenantId, isActive]`, `[tenantId, city]`, `[tenantId, propertyType]`, `[tenantId, condition]`.

### PropertyListingRepository

Entidades: `PropertyListing`, `PropertyPrice`.

| Método (propuesto) | Descripción |
| ------------------ | ----------- |
| `createListing(propertyId, data, tenantId)` | Crear publicación |
| `findByProperty(propertyId, tenantId)` | Listar publicaciones de una propiedad |
| `findById(id, tenantId)` | Detalle de publicación |
| `updateListing(id, data, tenantId)` | Actualizar estado, expensas, destacado |
| `upsertPrices(listingId, prices, tenantId)` | Gestionar `PropertyPrice` |
| `findActiveByTenant(tenantId, filters)` | Publicaciones activas para web |

Restricción DB: `@@unique([propertyId, listingType])`.

Reglas en Service (no en Repository): un solo `isPrimary` por listing.

### PropertyFeatureRepository

Entidad: `PropertyFeature` (catálogo global, sin `tenantId`).

| Método (propuesto) | Descripción |
| ------------------ | ----------- |
| `findAll(filters?)` | Listar features activas |
| `findByCategory(category)` | Filtrar por categoría |
| `findBySlug(slug)` | Buscar feature |
| `create(data)` | Solo `SUPER_ADMIN` |
| `update(id, data)` | Solo `SUPER_ADMIN` |
| `deactivate(id)` | `isActive = false` |

Asignaciones a propiedades: responsabilidad de `PropertyRepository`, validando que la feature esté activa.

---

## 2. Service Layer

Responsabilidad: reglas de negocio, orquestación, validación de `tenantId`, permisos.

### PropertyService

| Responsabilidad | Detalle |
| --------------- | ------- |
| Crear propiedad | Asignar `createdById`, generar `slug`, validar `internalCode` |
| Editar propiedad | Validar ownership o `PropertyAgentAccess.canEdit` |
| Archivar | `isActive = false` sin borrado físico |
| Slug | Generación automática; inmutable tras publicación activa |
| Features | Asignar solo `PropertyFeature.isActive = true` |
| Compartición | Delegar en fase Sharing |
| Consistencia tenant | Verificar `tenantId` en toda la cadena |

Reglas de negocio a implementar:

* Un solo `isCover = true` por propiedad.
* `internalCode` vacío → `null`.
* `createdById` debe pertenecer al mismo `tenantId` (salvo `SUPER_ADMIN`).

### PropertyListingService

| Responsabilidad | Detalle |
| --------------- | ------- |
| Crear publicación | Una por `listingType` por propiedad; bloqueado si `Property.isActive = false` |
| Cambiar estado | Flujo `DRAFT → ACTIVE → PAUSED / RESERVED → CLOSED → ACTIVE` |
| Reactivar cerrado | `CLOSED → ACTIVE`: reutilizar registro; `closedAt = null`; conservar `publishedAt` |
| Precios | Múltiples monedas; un solo `isPrimary` por listing |
| Publicar | Setear `publishedAt` al pasar a `ACTIVE` (solo si es `null`) |
| Cerrar | Setear `closedAt` al pasar a `CLOSED` |
| Property archivada | Bloquear create y activación (`→ ACTIVE`) si `Property.isActive = false` |
| Consistencia tenant | `listing.tenantId === property.tenantId` |

### PropertyImageService

| Responsabilidad | Detalle |
| --------------- | ------- |
| Subir imagen | Obtener URL firmada o upload vía `StorageProvider` |
| Registrar metadata | Crear `PropertyImage` con `storageKey` |
| Portada | Garantizar un solo `isCover = true` |
| Orden | Gestionar `sortOrder` |
| Eliminar | Borrar metadata + archivo en storage |

Depende de Storage Abstraction (fase Storage).

---

## 3. API Layer

### Controllers

| Controller | Prefijo | Audiencia | Rol |
| ---------- | ------- | --------- | --- |
| `PropertyController` | `/properties` | Admin | AGENT, TENANT_ADMIN |
| `PropertyListingController` | `/properties/:id/listings` | Admin | AGENT, TENANT_ADMIN |
| `PropertyFeatureController` | `/property-features` | Admin | SUPER_ADMIN (write), todos (read) |
| `PublicPropertyController` | `/public/properties` | Web pública | Sin auth (tenant por dominio/header) |

### Endpoints admin (propuestos)

**Property**

```txt
POST   /properties
GET    /properties
GET    /properties/:id
PATCH  /properties/:id
PATCH  /properties/:id/archive
POST   /properties/:id/features
DELETE /properties/:id/features/:featureId
POST   /properties/:id/images
PATCH  /properties/:id/images/:imageId
DELETE /properties/:id/images/:imageId
```

**PropertyListing** (implementado — ruta plana `/property-listings`)

```txt
POST   /property-listings
GET    /property-listings
GET    /property-listings/:id
PATCH  /property-listings/:id
DELETE /property-listings/:id
```

**PropertyPrice** (implementado — ruta plana `/property-prices`)

```txt
POST   /property-prices
GET    /property-prices?tenantId=&listingId=
GET    /property-prices/:id?tenantId=
PATCH  /property-prices/:id?tenantId=
DELETE /property-prices/:id?tenantId=
```

**PropertyListing** (anidado — alternativa futura)

```txt
POST   /properties/:propertyId/listings
GET    /properties/:propertyId/listings
PATCH  /properties/:propertyId/listings/:listingId
PATCH  /properties/:propertyId/listings/:listingId/status
PUT    /properties/:propertyId/listings/:listingId/prices
```

**PropertyFeature (SUPER_ADMIN)**

```txt
GET    /property-features
POST   /property-features
PATCH  /property-features/:id
DELETE /property-features/:id
```

### DTOs

Organización en `property/dto/`:

```txt
create-property.dto.ts
update-property.dto.ts
property-filter.dto.ts
create-listing.dto.ts
update-listing.dto.ts
upsert-prices.dto.ts
assign-features.dto.ts
upload-image.dto.ts
public-property-filter.dto.ts
```

Convenciones:

* `class-validator` para validación.
* Enums importados de Prisma Client o `packages/shared-types`.
* DTOs de respuesta separados (no exponer campos internos).

### Validaciones

| Campo / regla | Validación |
| ------------- | ---------- |
| `slug` | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, longitud 3–120 |
| `propertyType` | Enum `PropertyType` |
| `condition` | Enum `PropertyCondition` |
| `listingType` | Enum `PropertyListingType` |
| `currency` | Enum `Currency` |
| `amount` | Decimal positivo |
| `yearBuilt` | Int razonable (1800–2100) |
| `latitude/longitude` | Rangos válidos |
| Precios | Máximo un `isPrimary = true` |
| Imágenes | Máximo un `isCover = true` |

### Swagger

* Configurar `@nestjs/swagger` en `main.ts`.
* Tags: `Properties`, `Property Listings`, `Property Features`, `Public Properties`.
* Documentar enums, filtros y respuestas paginadas.
* Incluir ejemplos de request/response.
* UI disponible en `/api/docs` (solo desarrollo/staging).

---

## 4. Storage Abstraction

Objetivo: desacoplar `PropertyImage` de cualquier proveedor.

### Interface común

```ts
interface StorageProvider {
  upload(key: string, file: Buffer, mimeType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  getSignedUploadUrl(key: string, mimeType: string): Promise<string>;
}
```

### Implementaciones

| Provider | Uso típico |
| -------- | ---------- |
| `R2StorageProvider` | Cloudflare R2 (recomendado producción) |
| `S3StorageProvider` | AWS S3 |
| `SupabaseStorageProvider` | Supabase Storage |

### Configuración

```txt
STORAGE_PROVIDER=r2 | s3 | supabase
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_URL=
```

### Convención de keys

```txt
{tenantId}/properties/{propertyId}/{uuid}.{ext}
```

`PropertyImage.storageKey` almacena la key. `url` es cache opcional de URL pública.

### Módulo NestJS

```txt
StorageModule
├── STORAGE_PROVIDER (token)
└── Factory según env
```

---

## 5. Public API

Audiencia: `apps/web` (sitios white-label por tenant).

Resolución de tenant: dominio (`TenantSetting.domain`) o header `X-Tenant-Slug`.

### Listado público

`GET /public/properties`

Filtros:

| Parámetro | Campo |
| --------- | ----- |
| `type` | `propertyType` |
| `condition` | `condition` |
| `listingType` | `PropertyListing.listingType` |
| `city` | `city` |
| `neighborhood` | `neighborhood` |
| `minPrice` / `maxPrice` | `PropertyPrice.amount` |
| `currency` | `PropertyPrice.currency` |
| `features` | `PropertyFeatureAssignment.featureId` |
| `page` / `limit` | Paginación |

Condiciones obligatorias:

```txt
Property.isActive = true
PropertyListing.status = ACTIVE
```

Ordenamiento:

* Default: `Property.updatedAt DESC`
* Alternativo: precio, destacados (`isFeatured`)

### Detalle por slug

`GET /public/properties/:slug`

* Resolver por `@@unique([tenantId, slug])`.
* Incluir: listings activos, precios primary, imágenes ordenadas, features.
* Excluir: `internalCode`, `createdById`, datos de agentes.

### SEO

| Mecanismo | Implementación |
| --------- | -------------- |
| URLs amigables | `/propiedades/{slug}` en `apps/web` |
| Slug estable | No recalcular tras publicación |
| Sitemap | `GET /public/properties/sitemap` — URLs + `updatedAt` |
| Meta tags | `title`, `description`, imagen `isCover` |
| ISR / revalidación | `updatedAt` por tenant como señal de invalidación |
| Redirect 301 | Si slug cambia (caso excepcional) |

---

## 6. Seguridad Multi-Tenant

### Resolución de tenant

| Contexto | Mecanismo |
| -------- | --------- |
| Admin API | JWT → `user.tenantId` |
| SUPER_ADMIN | Puede especificar `tenantId` en query (auditoría obligatoria) |
| Public API | Dominio o `X-Tenant-Slug` |

### Ownership

```txt
Property.createdById → usuario creador
```

| Rol | Acceso |
| --- | ------ |
| AGENT | Propias (`createdById = self`) + compartidas |
| TENANT_ADMIN | Todas del tenant |
| SUPER_ADMIN | Global |

### PropertyAgentAccess

Validar en cada operación de lectura/escritura:

```txt
canView → lectura
canEdit → edición
```

Reglas:

* Solo `TENANT_ADMIN` puede otorgar acceso.
* `userId` debe pertenecer al mismo `tenantId` que la propiedad.
* El creador tiene acceso implícito (sin registro en `PropertyAgentAccess`).

### Validaciones tenantId

Implementar en Service Layer:

| Operación | Validación |
| --------- | ---------- |
| Crear Property | `tenantId` del usuario autenticado |
| Crear Listing | `listing.tenantId === property.tenantId` |
| Crear Price | `price.tenantId === listing.tenantId === property.tenantId` |
| Asignar Feature | `assignment.tenantId === property.tenantId` |
| Agent Access | `access.tenantId === property.tenantId === user.tenantId` |
| Public query | Siempre filtrar por `tenantId` resuelto |

### Guards propuestos

```txt
AuthGuard           → JWT válido
TenantGuard         → tenantId presente y válido
RolesGuard          → SUPER_ADMIN | TENANT_ADMIN | AGENT
PropertyAccessGuard → ownership + PropertyAgentAccess
```

---

## 7. Fases de implementación

### Fase 1 — Foundation

**Objetivo:** infraestructura base del módulo Property.

Entregables:

| Entregable | Estado |
| ---------- | ------ |
| `PrismaService` global | ✅ |
| `PropertyModule` registrado en `AppModule` | ✅ |
| Repositories base (CRUD mínimo) | ✅ |
| Escrituras multi-tenant safe (`updateMany` + `tenantId`) | ✅ |
| `PrismaExceptionFilter` (P2002, P2003, P2025) | ✅ |
| DTOs base + query DTOs + response DTOs | ✅ |
| Validación global (`ValidationPipe`) | ✅ |
| Swagger configurado (request/response/errores) | ✅ |
| Validación `tenantId` existente al crear | ✅ |
| Unicidad `slug` e `internalCode` por tenant | ✅ |
| Guards: `AuthGuard`, `TenantGuard`, `RolesGuard` | ⏳ Pendiente |
| Tests unitarios de repositories | ⏳ Pendiente |
| Slug autogenerado | ⏳ Pendiente |

Dependencias: ninguna.

**Foundation Hardening** (sin JWT): ver entregables marcados ✅ arriba.

---

### Fase 2 — Admin API

**Objetivo:** CRUD completo para admin/agentes.

Entregables:

* `PropertyController` + `PropertyService` completos. ✅
* `PropertyListingController` + `PropertyListingService` completos (sin precios). ✅
* `PropertyFeatureController` (lectura para todos, escritura SUPER_ADMIN). ⏳
* Reglas de negocio: slug, precios, estados, features. ⏳ (estados listing ✅; precios y slug ⏳)
* Paginación y filtros admin. ⏳
* Swagger documentado. ✅ (Property + PropertyListing)

Dependencias: Fase 1.

---

### Fase 3 — Public API

**Objetivo:** endpoints para `apps/web`.

Entregables:

* `PublicPropertyController`.
* Listado con filtros documentados.
* Detalle por `slug`.
* Endpoint sitemap.
* DTOs de respuesta pública (sin datos internos).
* Tests e2e de aislamiento multi-tenant.

Dependencias: Fase 2.

---

### Fase 4 — Storage

**Objetivo:** gestión de imágenes desacoplada del proveedor.

Entregables:

* `StorageModule` + `StorageProvider` interface.
* Implementaciones R2, S3, Supabase.
* `PropertyImageService` completo.
* Endpoints de upload/delete/reorder.
* Regla de portada única.

Dependencias: Fase 2.

---

### Fase 5 — Sharing

**Objetivo:** compartición entre agentes.

Entregables:

* Endpoints `PropertyAgentAccess` en `PropertyController`.
* `PropertyAccessGuard`.
* Validación `user.tenantId === property.tenantId`.
* Permisos AGENT según `canView` / `canEdit`.
* Tests de permisos cruzados.

Dependencias: Fase 2.

---

## Orden de ejecución recomendado

```txt
Fase 1 (Foundation)
    ↓
Fase 2 (Admin API)
    ↓
├── Fase 3 (Public API)
├── Fase 4 (Storage)
└── Fase 5 (Sharing)
```

Fases 3, 4 y 5 pueden desarrollarse en paralelo tras Fase 2.

---

## Criterios de aceptación global

* Toda query filtra por `tenantId` (excepto `SUPER_ADMIN` y catálogo global `PropertyFeature`).
* Reglas de negocio documentadas en `property-domain.md` implementadas en Services.
* Swagger refleja todos los endpoints.
* Storage intercambiable por variable de entorno.
* Public API no expone datos de agentes ni códigos internos.
* Sin cambios al schema Prisma salvo necesidad documentada.

---

## Referencias post-implementación

Al completar cada fase, actualizar:

* `PROJECT_STATE.md`
* `docs/04-modules/properties.md` (si cambian reglas funcionales)
* Este roadmap (marcar fase como completada)
