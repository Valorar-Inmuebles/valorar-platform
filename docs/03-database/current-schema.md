# Current Schema

## Estado

Versión: Foundation v1

Base de datos:

* PostgreSQL
* Prisma ORM

---

# Tenant

Representa una inmobiliaria dentro de la plataforma.

## Responsabilidades

* Aislamiento multi-tenant.
* Propietario de propiedades.
* Propietario de usuarios.
* Configuración de branding.

## Campos

| Campo     | Tipo     |
| --------- | -------- |
| id        | String   |
| name      | String   |
| slug      | String   |
| isActive  | Boolean  |
| createdAt | DateTime |
| updatedAt | DateTime |

## Relaciones

```txt
Tenant
├── Users
├── TenantSetting
├── Properties
├── Developments
└── Leads
```

---

# User

Representa una persona que utiliza el sistema.

## Roles

```txt
SUPER_ADMIN
TENANT_ADMIN
AGENT
```

## Campos

| Campo        | Tipo     |
| ------------ | -------- |
| id           | String   |
| tenantId     | String   |
| name         | String   |
| email        | String   |
| passwordHash | String   |
| role         | UserRole |
| isActive     | Boolean  |
| lastLoginAt  | DateTime |
| createdAt    | DateTime |
| updatedAt    | DateTime |

## Relaciones

```txt
User
├── Tenant
└── Properties (owner)
```

---

# TenantSetting

Configuración de branding de cada inmobiliaria.

## Campos

| Campo          | Tipo     |
| -------------- | -------- |
| id             | String   |
| tenantId       | String   |
| companyName    | String   |
| logoUrl        | String   |
| primaryColor   | String   |
| secondaryColor | String   |
| whatsapp       | String   |
| email          | String   |
| domain         | String   |
| facebookUrl    | String   |
| instagramUrl   | String   |
| linkedinUrl    | String   |
| createdAt      | DateTime |
| updatedAt      | DateTime |

---

# UserRole

## Valores

```txt
SUPER_ADMIN
TENANT_ADMIN
AGENT
```

---

# Property Domain (Planned)

Estado:

Pendiente de implementación.

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
└── PropertyFeature
```

---

# Property

Representa un inmueble físico.

## Responsabilidades

* Información física.
* Ubicación.
* Metros cuadrados.
* Ambientes.
* Dormitorios.
* Baños.
* Antigüedad.

## Operaciones

No contiene operaciones comerciales.

Las operaciones se modelan mediante:

```txt
PropertyListing
```

---

# PropertyListing

Representa una publicación comercial.

Ejemplos:

```txt
Venta
Alquiler
Alquiler Temporario
```

Una propiedad puede tener múltiples publicaciones.

---

# PropertyPrice

Permite múltiples monedas por publicación.

Ejemplo:

```txt
Venta
├── USD 200.000

Temporario
├── ARS 1.400.000
└── USD 1.000
```

---

# PropertyImage

Compatible con:

* Cloudflare R2
* Supabase Storage
* AWS S3

El dominio no debe depender de un proveedor específico.

---

# PropertyFeature

Características configurables agrupadas por categorías.

## Categorías

```txt
GENERAL
SERVICE
ROOM
AMENITY
```

Ejemplos:

GENERAL

* Apto crédito
* Apto profesional

SERVICE

* Agua corriente
* Gas natural

ROOM

* Living
* Jardín
* Lavadero

AMENITY

* Pileta
* Parrilla
* Quincho

```

---

# Reglas Globales

## Multi Tenant

Toda entidad funcional debe pertenecer a un Tenant.

---

## Inglés

Base de datos:

- Inglés

Código:

- Inglés

Interfaz:

- Español

---

## Documentación

Toda migración Prisma debe actualizar este documento.
```
