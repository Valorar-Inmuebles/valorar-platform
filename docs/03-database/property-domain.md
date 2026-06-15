# Property Domain

Versión: v1 (migrada)

Estado: migrado (`202606150001_property_foundation`).

---

## Concepto

`Property` representa un inmueble físico.

La comercialización se modela mediante `PropertyListing`.

Los precios se modelan mediante `PropertyPrice`.

Las características usan un catálogo global `PropertyFeature` asignado vía `PropertyFeatureAssignment`.

La compartición entre agentes se modela mediante `PropertyAgentAccess`.

---

## Modelo

```txt
Property
│
├── PropertyListing
│      │
│      └── PropertyPrice
│
├── PropertyImage
│
├── PropertyFeatureAssignment
│      │
│      └── PropertyFeature (global)
│
└── PropertyAgentAccess
```

---

## Property

Inmueble físico. Sin precios ni tipo de operación comercial.

### Tipos (PropertyType)

```txt
HOUSE           → Casa urbana
APARTMENT       → Departamento
PH              → PH
OFFICE          → Oficina
COMMERCIAL      → Local comercial
WAREHOUSE       → Galpón / depósito
INDUSTRIAL      → Nave o planta industrial
LAND            → Lote o terreno para construcción
FIELD           → Campo / rural
GARAGE          → Cochera o garage
COUNTRY_HOUSE   → Casa quinta
OTHER           → Otro
```

### Condición (PropertyCondition)

```txt
NEW                 → A estrenar
UNDER_CONSTRUCTION  → En construcción
EXCELLENT           → Excelente estado
VERY_GOOD           → Muy bueno
GOOD                → Bueno
REGULAR             → Regular
TO_RENOVATE         → A refaccionar
```

`condition` complementa `yearBuilt`:

* `yearBuilt`: dato objetivo (año de construcción).
* `condition`: clasificación comercial subjetiva.

### Visibilidad

* `isActive`: controla si la propiedad está activa o archivada (default: `true`).
* Propiedades con `isActive = false` quedan ocultas de la web pública sin borrado físico.

### Identificación pública

* `slug`: URL amigable para SEO. Único por tenant (`@@unique([tenantId, slug])`).
* `internalCode`: código interno CRM. Opcional. Distinto del slug.

### Información física

| Grupo        | Campos                                              |
| ------------ | --------------------------------------------------- |
| Superficies  | totalArea, coveredArea, uncoveredArea               |
| Terreno      | lotFront, lotDepth                                  |
| Distribución | rooms, bedrooms, bathrooms, halfBathrooms, parkingSpaces |
| Características | yearBuilt, orientation, layout, brightness       |
| Ubicación    | street, streetNumber, floor, apartment, neighborhood, city, state, country, postalCode, latitude, longitude |

### Ownership

`createdById` identifica al agente creador.

---

## PropertyListing

Publicación comercial de una propiedad.

| listingType    | Significado         |
| -------------- | ------------------- |
| SALE           | Venta               |
| RENT           | Alquiler            |
| TEMPORARY_RENT | Alquiler temporario |

Estados (`PropertyListingStatus`):

```txt
DRAFT → ACTIVE → PAUSED / RESERVED → CLOSED
```

Información comercial por publicación:

* Expensas (`expensesAmount`, `expensesCurrency`)
* Destacado (`isFeatured`)
* Fechas de publicación y cierre

Una propiedad puede tener varias publicaciones, pero solo una por `listingType`.

---

## PropertyPrice

Múltiples precios por publicación. Monedas: `ARS`, `USD`.

```txt
SALE
└── USD 200.000 (isPrimary)

TEMPORARY_RENT
├── ARS 1.400.000 (isPrimary)
└── USD 1.000
```

Un precio `isPrimary` por publicación para visualización en web.

---

## PropertyImage

Imágenes de la propiedad (no de la publicación).

* Portada: `isCover`
* Galería: `sortOrder`
* Storage agnóstico: `storageKey`, `url` opcional

Compatible con Cloudflare R2, AWS S3 y Supabase Storage.

---

## PropertyFeature

Catálogo global sin `tenantId`.

* Compartido por todos los tenants.
* Gestionado por `SUPER_ADMIN`.
* Categorías: `GENERAL`, `SERVICE`, `ROOM`, `AMENITY`.
* `slug` único a nivel plataforma.

Los tenants no crean características propias; seleccionan del catálogo global al asignar.

---

## PropertyFeatureAssignment

Relación N:M entre `Property` (tenant) y `PropertyFeature` (global).

* Lleva `tenantId` para consultas directas por tenant.
* `value` opcional para detalles adicionales.
* `createdAt` y `updatedAt` para auditoría de asignaciones.

---

## PropertyAgentAccess

Compartición entre agentes del mismo tenant.

* `canView`, `canEdit`
* Otorgado por `TENANT_ADMIN`
* El creador (`createdById`) mantiene ownership implícito

---

## Reglas de negocio

| Regla | Responsable |
| ----- | ----------- |
| `tenantId` consistente Property → Listing → Price | Aplicación |
| Un solo `isPrimary` por publicación | Aplicación |
| Una sola `isCover` por propiedad | Aplicación |
| Solo features `isActive = true` asignables | Aplicación |
| Slug generado al crear; estable tras publicación | Aplicación |
| AGENT: propias + compartidas | Permisos |
| TENANT_ADMIN: todas del tenant | Permisos |
| Web: `isActive = true` | Query pública |
| Web: `status = ACTIVE` | Query pública |
| Web: detalle por `slug` | Query pública |
| Listados recientes / sitemap / ISR: `updatedAt` | Query pública |

---

## Filtros públicos previstos

* `isActive`
* `propertyType`
* `condition`
* `listingType`
* `status`
* `city`, `neighborhood`
* Rango de precio (`PropertyPrice`)
* Características (`PropertyFeatureAssignment`)
