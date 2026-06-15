# Development Conventions

## Objetivo

Definir convenciones obligatorias para mantener consistencia en toda la plataforma.

Estas reglas aplican a:

* Base de datos.
* Prisma.
* NestJS.
* Next.js.
* Documentación.
* Git.

---

# Idioma

## Base de Datos

Inglés.

Ejemplos:

```txt
Tenant
User
Property
PropertyListing
PropertyPrice
```

---

## Código

Inglés.

Ejemplos:

```ts
propertyService
tenantRepository
createProperty
```

---

## UI

Español.

Ejemplos:

```txt
Propiedades
Emprendimientos
Dormitorios
Baños
```

---

## Documentación

Español.

---

# Prisma

## Modelos

PascalCase.

Correcto:

```prisma
model Property
```

Incorrecto:

```prisma
model property
model properties
```

---

## Campos

camelCase.

Correcto:

```prisma
createdAt
updatedAt
tenantId
publishedAt
```

Incorrecto:

```prisma
created_at
tenant_id
published_at
```

---

## IDs

Todas las entidades principales utilizan:

```prisma
@id @default(cuid())
```

---

## Relaciones

Siempre documentar relaciones importantes.

Ejemplo:

```prisma
tenantId String
tenant Tenant @relation(...)
```

---

# Base de Datos

## Multi Tenant

Toda entidad funcional debe contener:

```txt
tenantId
```

salvo excepciones explícitas.

---

## Catálogos

Preferir enums cuando:

* El conjunto es pequeño.
* El conjunto es estable.

Ejemplos:

```txt
Currency
PropertyStatus
UserRole
```

---

## Tablas

Preferir tablas cuando:

* Son configurables.
* Pueden crecer.

Ejemplos:

```txt
PropertyFeature
LeadSource
```

---

# NestJS

## Arquitectura

```txt
Controller
↓
Service
↓
Repository
↓
Prisma
```

---

## Responsabilidades

Controller:

* HTTP
* DTOs
* Validaciones básicas

Service:

* Reglas de negocio

Repository:

* Acceso a datos

---

## Nunca

No colocar reglas de negocio en Controllers.

---

# Next.js

## App Router

Utilizar App Router.

---

## Server Components

Preferir Server Components.

---

## Client Components

Utilizar únicamente cuando sea necesario.

---

## Organización

```txt
app/
components/
hooks/
services/
types/
```

---

# UI

## Diseño

Inspiración:

* Airbnb
* Zillow

---

## Principios

* Mobile First
* Espacios amplios
* Interfaces limpias
* Formularios simples

---

## Componentes

Todo componente reutilizable debe vivir en:

```txt
packages/ui
```

---

# Tipos Compartidos

Todos los tipos reutilizables deben vivir en:

```txt
packages/shared-types
```

---

# Documentación

## Document First

Antes de implementar:

1. Diseñar.
2. Documentar.
3. Implementar.

---

## Actualización

Si cambia:

* Arquitectura
* Base de datos
* Reglas de negocio
* Módulos

Debe actualizarse la documentación correspondiente.

---

# Git

## Branches

Feature:

```txt
feature/properties
feature/leads
feature/developments
```

Fix:

```txt
fix/property-filters
fix/image-upload
```

Refactor:

```txt
refactor/property-service
```

---

## Commits

Formato:

```txt
feat:
fix:
refactor:
docs:
chore:
```

Ejemplos:

```txt
feat: property foundation

feat: lead management

fix: property filters

docs: update property domain
```

---

# Storage

La plataforma debe permanecer compatible con:

* Cloudflare R2
* AWS S3
* Supabase Storage

Nunca acoplar entidades de dominio a un proveedor específico.

---

# Seguridad

Nunca confiar en datos provenientes del cliente.

Validar siempre:

* Tenant
* Usuario
* Rol
* Permisos

en backend.

---

# Principio General

Priorizar:

1. Escalabilidad.
2. Mantenibilidad.
3. Consistencia.
4. Simplicidad.

sobre soluciones rápidas.
