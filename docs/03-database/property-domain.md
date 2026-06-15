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
| Ubicación    | street, streetNumber, floor, apartment, neighborhood, city, province, country, postalCode, latitude, longitude |
| Geocoding (opcional) | googlePlaceId, formattedAddress, geocodeSource, geocodeAccuracy |

### Location v1.1

Campos de dominio inmobiliario (fuente de verdad): `country`, `province`, `city`, `neighborhood`, `street`, `streetNumber`, `postalCode`, `latitude`, `longitude`. Carga manual soportada en todos los casos.

Campos de enriquecimiento opcional (Google Places — sin integración activa): `googlePlaceId`, `formattedAddress`, `geocodeSource`, `geocodeAccuracy`.

Enums:

* `GeocodeSource`: `MANUAL`, `GOOGLE_PLACES`, `IMPORT`
* `GeocodeAccuracy`: `EXACT`, `APPROXIMATE`, `NEIGHBORHOOD`, `CITY`

Compatibilidad API admin: el campo deprecado `state` en request/response es alias de `province`.

Migración: `202606150002_property_location_v1_1` (renombra columna `state` → `province`).

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
DRAFT → ACTIVE → PAUSED / RESERVED → CLOSED → ACTIVE
```

Información comercial por publicación:

* Expensas (`expensesAmount`, `expensesCurrency`)
* Destacado (`isFeatured`)
* Fechas de publicación y cierre

Una propiedad puede tener varias publicaciones, pero solo una por `listingType` (`@@unique([propertyId, listingType])`).

### Ciclo de vida y fechas

| Evento | Efecto |
| ------ | ------ |
| Primera activación (`→ ACTIVE`) | `publishedAt` se asigna si es `null`; si ya existe, se conserva |
| Cierre (`→ CLOSED`) | `closedAt` se asigna; no hay borrado físico |
| Reactivación (`CLOSED → ACTIVE`) | `closedAt` vuelve a `null`; `publishedAt` se conserva si ya existía |

### Reutilización de listings cerrados

No se crea un nuevo `PropertyListing` cuando ya existe uno `CLOSED` para el mismo `listingType`. La restricción única por propiedad obliga a **reactivar** el registro existente (`PATCH` con `status: ACTIVE`).

### Property archivada

No se puede crear ni activar un `PropertyListing` si la `Property` asociada tiene `isActive = false`. Restaurar la propiedad antes de crear o reactivar publicaciones.

No se puede activar un `PropertyListing` (`→ ACTIVE`) sin al menos un `PropertyPrice` asociado.

---

## PropertyPrice

Múltiples precios por publicación. Monedas: `ARS`, `USD`.

```txt
SALE
├── USD 200.000 (isPrimary, label: "contado")
└── USD 220.000 (label: "financiado")

TEMPORARY_RENT
├── ARS 1.400.000 (isPrimary)
└── USD 1.000
```

Un precio `isPrimary` por publicación para visualización en web. Cuando existen precios, debe haber **exactamente uno** con `isPrimary = true`.

Múltiples precios en la **misma moneda** son válidos si se distinguen por `label` (ej. contado vs financiado).

### Reglas operativas

* Primer precio del listing: `isPrimary = true` automáticamente.
* Al promover un precio (`isPrimary: true`), los demás pasan a `isPrimary = false` (transacción).
* Al desmarcar el principal (`isPrimary: false`): si hay otros precios, se promueve automáticamente el más antiguo; si es el único precio, se rechaza.
* Al eliminar el precio principal: se promueve automáticamente otro (transacción).
* No eliminar el único precio si el listing está `ACTIVE`, `PAUSED` o `RESERVED`.
* Permitido eliminar el único precio si el listing está `DRAFT` o `CLOSED`.
* Borrado físico en Foundation.
* `amount > 0`; `currency` obligatorio.

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
| Exactamente un `isPrimary` por publicación (si hay precios) | Aplicación |
| Listing `ACTIVE` requiere al menos un precio | Aplicación |
| Múltiples precios misma moneda con `label` distinto | Aplicación (permitido) |
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
