# Properties Module

Versión: v1 (congelada)

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

Múltiples precios por publicación (ARS/USD). Uno marcado como `isPrimary`.

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

* Lista `PropertyListing` con `status = ACTIVE` a nivel tenant.
* Detalle por `slug` de la propiedad.
* Filtros por tipo, condición, operación, ubicación, precio y características.
* No depende del agente creador.
