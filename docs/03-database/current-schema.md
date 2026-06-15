# Current Schema

## Estado

Versión: Foundation v1 + Property Domain v1

Base de datos:

* PostgreSQL
* Prisma ORM

Dominio Property: migrado (`202606150001_property_foundation`).

---

# Tenant

Representa una inmobiliaria dentro de la plataforma.

## Responsabilidades

* Aislamiento multi-tenant.
* Propietario de propiedades.
* Propietario de usuarios.
* Configuración de branding.

## Campos

| Campo     | Tipo     | Descripción              |
| --------- | -------- | ------------------------ |
| id        | String   | Identificador (`cuid`)   |
| name      | String   | Nombre de la inmobiliaria|
| slug      | String   | Identificador URL único  |
| createdAt | DateTime |                          |
| updatedAt | DateTime |                          |

## Restricciones

* `slug`: único (`@unique`)

## Relaciones

```txt
Tenant
├── Users
├── TenantSetting
├── Properties
├── PropertyListings
├── PropertyPrices
├── PropertyImages
├── PropertyFeatureAssignments
├── PropertyAgentAccess
├── Developments (planificado)
└── Leads (planificado)
```

---

# User

Representa una persona que utiliza el sistema.

## Campos

| Campo     | Tipo      | Descripción                              |
| --------- | --------- | ---------------------------------------- |
| id        | String    | Identificador (`cuid`)                   |
| tenantId  | String?   | Tenant al que pertenece (`null` en SUPER_ADMIN) |
| name      | String    | Nombre                                   |
| email     | String    | Email único                              |
| role      | UserRole  | Rol del usuario (default: `AGENT`)       |
| createdAt | DateTime  |                                          |
| updatedAt | DateTime  |                                          |

## Restricciones

* `email`: único (`@unique`)
* `tenantId`: opcional para permitir `SUPER_ADMIN` sin tenant

## Relaciones

```txt
User
├── Tenant
├── Properties (createdBy)
├── PropertyAgentAccess (sharedWith)
└── PropertyAgentAccess (grantedBy)
```

---

# TenantSetting

Configuración de branding de cada inmobiliaria.

Relación 1:1 con `Tenant`.

## Campos

| Campo          | Tipo     | Descripción |
| -------------- | -------- | ----------- |
| id             | String   |             |
| tenantId       | String   | Único       |
| companyName    | String?  |             |
| logoUrl        | String?  |             |
| primaryColor   | String?  |             |
| secondaryColor | String?  |             |
| whatsapp       | String?  |             |
| email          | String?  |             |
| domain         | String?  |             |
| createdAt      | DateTime |             |
| updatedAt      | DateTime |             |

## Restricciones

* `tenantId`: único (`@unique`) — una configuración por tenant

---

# UserRole

Enum de roles de usuario.

## Valores

```txt
SUPER_ADMIN
TENANT_ADMIN
AGENT
```

## Default

`AGENT` (en modelo `User`)

---

# Property Domain v1

Estado: migrado (`202606150001_property_foundation`).

Documentación detallada: `docs/03-database/property-domain.md`

## Entidades

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
│      └── PropertyFeature (catálogo global)
│
└── PropertyAgentAccess
```

## Catálogos globales del sistema

Sin `tenantId`. Compartidos por todos los tenants.

```txt
PropertyType            (enum)
PropertyCondition       (enum)
Currency                (enum)
PropertyListingType     (enum)
PropertyListingStatus   (enum)
PropertyFeatureCategory (enum)
Orientation             (enum)
PropertyLayout          (enum)
PropertyBrightness      (enum)
PropertyFeature         (tabla)
```

---

## Enums

### PropertyType

```txt
HOUSE
APARTMENT
PH
OFFICE
COMMERCIAL
WAREHOUSE
INDUSTRIAL
LAND
FIELD
GARAGE
COUNTRY_HOUSE
OTHER
```

Fronteras entre tipos:

| Tipo            | Uso                                      |
| --------------- | ---------------------------------------- |
| LAND            | Lote o terreno para construcción         |
| FIELD           | Campo o rural                            |
| WAREHOUSE       | Galpón o depósito                        |
| INDUSTRIAL      | Nave o planta industrial                 |
| GARAGE          | Cochera o garage como unidad comercial   |
| COUNTRY_HOUSE   | Casa quinta o vivienda con terreno       |
| HOUSE           | Vivienda urbana                          |

### PropertyCondition

```txt
NEW
EXCELLENT
VERY_GOOD
GOOD
REGULAR
TO_RENOVATE
UNDER_CONSTRUCTION
```

Complementa `yearBuilt` (dato objetivo) con clasificación comercial (subjetiva).

### PropertyListingType

```txt
SALE            → Venta
RENT            → Alquiler
TEMPORARY_RENT  → Alquiler temporario
```

### PropertyListingStatus

```txt
DRAFT
ACTIVE
PAUSED
RESERVED
CLOSED
```

### Currency

```txt
ARS
USD
```

### PropertyFeatureCategory

```txt
GENERAL
SERVICE
ROOM
AMENITY
```

### Orientation

```txt
NORTH
SOUTH
EAST
WEST
NORTHEAST
NORTHWEST
SOUTHEAST
SOUTHWEST
```

### PropertyLayout

```txt
FRONT
BACK
SIDE
INTERNAL
CORNER
```

### PropertyBrightness

```txt
LOW
MEDIUM
HIGH
```

---

# Property

Representa un inmueble físico.

## Responsabilidades

* Información física y de ubicación.
* Superficies y dimensiones del terreno.
* Distribución (ambientes, dormitorios, baños).
* Antigüedad, orientación, disposición y luminosidad.
* Condición del inmueble.
* Visibilidad (`isActive`).
* Slug público para URLs SEO.
* Ownership del agente creador.

No contiene publicaciones comerciales ni precios.

## Campos

| Campo          | Tipo                | Descripción                              |
| -------------- | ------------------- | ---------------------------------------- |
| id             | String              | Identificador                            |
| tenantId       | String              | Tenant propietario                       |
| createdById    | String              | Agente creador                           |
| slug           | String              | URL amigable, único por tenant           |
| internalCode   | String?             | Código interno CRM                       |
| title          | String              | Título                                   |
| description    | String?             | Descripción                              |
| propertyType   | PropertyType        | Tipo de inmueble                         |
| condition      | PropertyCondition?  | Estado / condición comercial             |
| isActive       | Boolean             | Activa / archivada (default: true)       |
| street         | String?             | Calle                                    |
| streetNumber   | String?             | Altura                                   |
| floor          | String?             | Piso                                     |
| apartment      | String?             | Departamento                             |
| neighborhood   | String?             | Barrio                                   |
| city           | String              | Ciudad                                   |
| state          | String?             | Provincia                                |
| country        | String              | País (default: AR)                       |
| postalCode     | String?             | Código postal                            |
| latitude       | Decimal?            | Latitud                                  |
| longitude      | Decimal?            | Longitud                                 |
| totalArea      | Decimal?            | Metros totales (m²)                      |
| coveredArea    | Decimal?            | Metros cubiertos (m²)                    |
| uncoveredArea  | Decimal?            | Metros descubiertos (m²)                 |
| lotFront       | Decimal?            | Frente del terreno (m)                   |
| lotDepth       | Decimal?            | Fondo del terreno (m)                    |
| rooms          | Int?                | Ambientes                                |
| bedrooms       | Int?                | Dormitorios                              |
| bathrooms      | Int?                | Baños                                    |
| halfBathrooms  | Int?                | Toilettes                                |
| parkingSpaces  | Int?                | Cocheras                                 |
| yearBuilt      | Int?                | Año de construcción                      |
| orientation    | Orientation?        | Orientación                              |
| layout         | PropertyLayout?     | Disposición                              |
| brightness     | PropertyBrightness? | Luminosidad                              |
| createdAt      | DateTime            |                                          |
| updatedAt      | DateTime            |                                          |

## Restricciones

* `@@unique([tenantId, slug])`
* `@@unique([tenantId, internalCode])` cuando `internalCode` está definido
* Índices: `tenantId`, `[tenantId, createdById]`, `[tenantId, city]`, `[tenantId, propertyType]`, `[tenantId, condition]`, `[tenantId, updatedAt]`

## Slug

* Generado automáticamente al crear la propiedad.
* Formato: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, longitud 3–120.
* Estable tras publicación; cambios requieren redirect 301.
* Diferente de `internalCode` (uso CRM interno).

## Relaciones

```txt
Property
├── Tenant
├── User (createdBy)
├── PropertyListing[]
├── PropertyImage[]
├── PropertyFeatureAssignment[]
└── PropertyAgentAccess[]
```

---

# PropertyListing

Representa una publicación comercial.

## Responsabilidades

* Tipo de operación (venta, alquiler, temporario).
* Estado de publicación.
* Expensas y destacado.
* Contenedor de precios.

## Campos

| Campo            | Tipo                  | Descripción                |
| ---------------- | --------------------- | -------------------------- |
| id               | String                |                            |
| tenantId         | String                |                            |
| propertyId       | String                | Propiedad asociada         |
| listingType      | PropertyListingType   | SALE, RENT, TEMPORARY_RENT |
| status           | PropertyListingStatus |                            |
| expensesAmount   | Decimal?              | Expensas                   |
| expensesCurrency | Currency?             | Moneda de expensas         |
| isFeatured       | Boolean               | Destacado                  |
| publishedAt      | DateTime?             | Primera activación (`→ ACTIVE`) |
| closedAt         | DateTime?             | Cierre (`→ CLOSED`); `null` al reactivar |
| createdAt        | DateTime              |                            |
| updatedAt        | DateTime              |                            |

## Ciclo de estados

```txt
DRAFT → ACTIVE → PAUSED / RESERVED → CLOSED → ACTIVE
```

| Transición | `publishedAt` | `closedAt` |
| ---------- | ------------- | ---------- |
| Primera `→ ACTIVE` | Se asigna si es `null` | Sin cambio |
| `→ CLOSED` | Sin cambio | Se asigna |
| `CLOSED → ACTIVE` | Se conserva si ya existía | `null` |

Soft delete: el cierre usa `status = CLOSED`, sin borrado físico.

## Reglas

* Una propiedad puede tener múltiples publicaciones simultáneas (una por `listingType`).
* Solo una por tipo: `@@unique([propertyId, listingType])` — incluye listings `CLOSED`.
* Listings `CLOSED` se **reactivan** (`PATCH` `status: ACTIVE`); no se crea un registro nuevo para el mismo `listingType`.
* No crear ni activar listings si `Property.isActive = false`.

## Relaciones

```txt
PropertyListing
├── Tenant
├── Property
└── PropertyPrice[]
```

---

# PropertyPrice

Permite múltiples precios por publicación.

## Campos

| Campo     | Tipo     | Descripción                              |
| --------- | -------- | ---------------------------------------- |
| id        | String   |                                          |
| tenantId  | String   |                                          |
| listingId | String   | Publicación asociada                     |
| amount    | Decimal  | Monto                                    |
| currency  | Currency | ARS o USD                                |
| isPrimary | Boolean  | Precio principal                         |
| label     | String?  | Etiqueta opcional (ej. "Precio contado") |
| createdAt | DateTime |                                          |
| updatedAt | DateTime |                                          |

## Ejemplo

```txt
Property "Casa Palermo"
├── SALE
│   └── USD 200.000 (isPrimary)
└── TEMPORARY_RENT
    ├── ARS 1.400.000 (isPrimary)
    └── USD 1.000
```

## Reglas

* Múltiples precios por publicación; se permiten varias entradas en la misma moneda si tienen `label` distinto (ej. contado / financiado).
* Exactamente un `isPrimary = true` por publicación cuando existen precios (validación en aplicación).
* Primer precio auto `isPrimary = true`.
* Promoción automática al eliminar o desmarcar el principal (si hay otros precios).
* No eliminar el único precio si el listing está `ACTIVE`, `PAUSED` o `RESERVED`.
* Borrado físico en Foundation; `amount > 0`.
* Activar listing (`→ ACTIVE`) requiere al menos un precio (validación en `PropertyListingService`).

---

# PropertyImage

Almacena imágenes de la propiedad. Storage agnóstico.

Compatible con Cloudflare R2, Supabase Storage y AWS S3.

## Campos

| Campo      | Tipo     | Descripción          |
| ---------- | -------- | -------------------- |
| id         | String   |                      |
| tenantId   | String   |                      |
| propertyId | String   |                      |
| storageKey | String   | Clave en storage     |
| url        | String?  | URL pública cacheada |
| altText    | String?  |                      |
| mimeType   | String?  |                      |
| fileSize   | Int?     | Bytes                |
| sortOrder  | Int      | Orden en galería     |
| isCover    | Boolean  | Portada              |
| createdAt  | DateTime |                      |
| updatedAt  | DateTime |                      |

## Reglas

* Solo una imagen `isCover = true` por propiedad (validación en aplicación).
* Primera imagen auto `isCover = true`.
* Promoción automática al eliminar la portada (si hay imágenes restantes).
* No crear imágenes si `Property.isActive = false`.
* Borrado físico en Foundation; `storageKey` obligatorio al crear.
* `sortOrder` persistido; reordenamiento UI pendiente.

---

# PropertyFeature

Catálogo global de características. Sin `tenantId`.

Gestionado a nivel plataforma (`SUPER_ADMIN`). Compartido por todos los tenants.

## Campos

| Campo     | Tipo                    | Descripción    |
| --------- | ----------------------- | -------------- |
| id        | String                  |                |
| name      | String                  | Nombre visible |
| slug      | String                  | Único global   |
| category  | PropertyFeatureCategory |                |
| isActive  | Boolean                 |                |
| sortOrder | Int                     |                |
| createdAt | DateTime                |                |
| updatedAt | DateTime                |                |

## Restricciones

* `@@unique([slug])`

## Categorías y ejemplos

GENERAL: Apto crédito, Apto profesional, Uso comercial

SERVICE: Agua corriente, Gas natural, Cloacas, Internet

ROOM: Living, Comedor, Jardín, Patio, Lavadero

AMENITY: Pileta, Parrilla, Quincho, Seguridad, Aire acondicionado

---

# PropertyFeatureAssignment

Asigna características globales a propiedades de un tenant.

## Campos

| Campo      | Tipo     | Descripción       |
| ---------- | -------- | ----------------- |
| id         | String   |                   |
| tenantId   | String   |                   |
| propertyId | String   |                   |
| featureId  | String   | → PropertyFeature |
| value      | String?  | Detalle opcional  |
| createdAt  | DateTime |                   |
| updatedAt  | DateTime |                   |

## Restricciones

* `@@unique([propertyId, featureId])`

---

# PropertyAgentAccess

Compartición de propiedades entre agentes del mismo tenant.

## Campos

| Campo       | Tipo     | Descripción              |
| ----------- | -------- | ------------------------ |
| id          | String   |                          |
| tenantId    | String   |                          |
| propertyId  | String   |                          |
| userId      | String   | Agente con acceso        |
| canView     | Boolean  | Permiso de visualización |
| canEdit     | Boolean  | Permiso de edición       |
| grantedById | String?  | Usuario que otorgó acceso|
| createdAt   | DateTime |                          |
| updatedAt   | DateTime |                          |

## Restricciones

* `@@unique([propertyId, userId])`

## Ejemplo

```txt
Casa Palermo
Creada por: Juan
Compartida con: María (canView, canEdit), Pedro (canView)
```

---

# Reglas Globales

## Multi Tenant

Entidades funcionales con `tenantId`:

```txt
Property
PropertyListing
PropertyPrice
PropertyImage
PropertyFeatureAssignment
PropertyAgentAccess
```

Catálogos globales sin `tenantId`:

```txt
PropertyFeature
```

Enums globales:

```txt
PropertyType
PropertyCondition
Currency
PropertyListingType
PropertyListingStatus
PropertyFeatureCategory
Orientation
PropertyLayout
PropertyBrightness
```

## Ownership

Toda propiedad tiene un creador (`createdById`). Acceso extendido vía `PropertyAgentAccess`.

## Web pública

Publica `Property` con `isActive = true` y `PropertyListing` con `status = ACTIVE` a nivel tenant.

URLs de detalle: `/propiedades/{slug}` (slug único por tenant).

Listados recientes, sitemap e ISR: `@@index([tenantId, updatedAt])`.

## Inglés

Base de datos y código en inglés. Interfaz en español.

## Documentación

Toda migración Prisma debe actualizar este documento.
