# Admin Modules — Property Domain v1

Versión: v1

Estado: Especificación funcional — implementación parcial en `apps/admin` (Property Domain v1 ✅).

Referencias:

* `docs/07-admin/admin-architecture.md` *(pendiente de crear)*
* `docs/07-admin/admin-ui-audit.md` *(pendiente de crear)*
* `docs/04-modules/properties.md`
* `docs/03-database/property-domain.md`
* `docs/03-database/multi-tenant.md`
* `docs/09-roadmap/property-api-roadmap.md`
* `PROJECT_STATE.md`

---

## Alcance

Este documento define la funcionalidad del panel administrativo para los cuatro módulos Property Foundation ya implementados en `apps/api`:

1. **Properties** — inmueble físico
2. **PropertyListings** — publicación comercial (venta / alquiler / temporario)
3. **PropertyPrices** — precios de una publicación
4. **PropertyImages** — imágenes de una propiedad

Fuera de alcance v1 (documentados aparte): `PropertyFeature`, `PropertyFeatureAssignment`, `PropertyAgentAccess`, upload físico de archivos, auth JWT (pendiente en API).

---

## Estado de implementación (`apps/admin`)

| Módulo | Admin UI | Notas |
| ------ | -------- | ----- |
| Admin Shell | ✅ | Layout, sidebar, nav, breadcrumbs, PropertySubNav, toast |
| Properties | ✅ | CRUD + archivar |
| PropertyListings | ✅ | CRUD estados + tipos |
| PropertyPrices | ✅ | Integrado en Comercialización (SidePanel) |
| Comercialización (UX unificada) | ✅ | Tabla + SidePanel listing+precios; sin pantalla `/precios` |
| Ficha ejecutiva Property (Fase 2) | ✅ | Layout sticky: cabecera + KPIs + sub-nav |
| PropertyImages | ✅ | Grid + SidePanel; «Usar como portada»; metadata manual |
| Indicador publicabilidad (§5) | ✅ | Acordeón compacto al final del tab Datos |
| Auth / RBAC / TenantSwitcher | ⏳ | Tenant dev vía env |
| Configuración (usuarios, inmobiliaria, tenants) | ⏳ | Rutas placeholder |
| Dashboard operativo (`/`) | ⏳ | Placeholder |
| Upload storage | ⏳ | Fuera v1 Foundation |

Orden de entrega real: Properties → PropertyListings → PropertyPrices → PropertyImages.

---

## Modelo relacional (contexto admin)

```txt
Property (1)
├── PropertyListing (0..3 por listingType)
│      └── PropertyPrice (0..n)
└── PropertyImage (0..n)
```

| Entidad hija | Pertenece a | Cardinalidad relevante |
| ------------ | ----------- | ---------------------- |
| PropertyListing | Property | Máx. 1 por `listingType` (SALE, RENT, TEMPORARY_RENT) |
| PropertyPrice | PropertyListing | Múltiples; exactamente 1 `isPrimary` si hay precios |
| PropertyImage | Property | Múltiples; exactamente 1 `isCover` si hay imágenes |

---

## Convenciones transversales

### Multi-tenant

* Toda operación admin incluye `tenantId` resuelto server-side desde la sesión (ver `admin-architecture.md`).
* `SUPER_ADMIN` puede operar sobre cualquier tenant mediante selector de tenant activo.
* El usuario admin **no** edita `tenantId` en formularios normales.

### Permisos (objetivo v1)

Los guards JWT aún no están implementados en API. Esta matriz define el comportamiento **esperado** del admin cuando existan.

| Rol | Properties | Listings | Prices | Images |
| --- | ---------- | -------- | ------ | ------ |
| `AGENT` | CRUD propias + compartidas (`canEdit`) | Idem, scoped a properties accesibles | Idem | Idem |
| `TENANT_ADMIN` | CRUD todas del tenant | Idem | Idem | Idem |
| `SUPER_ADMIN` | CRUD global (con tenant seleccionado) | Idem | Idem | Idem |

Lectura (`canView` vía `PropertyAgentAccess`): AGENT puede ver compartidas sin editar.

### Patrones UI comunes

| Patrón | Uso |
| ------ | --- |
| Listado + tabla | Índice de entidad con filtros y acciones por fila |
| Formulario página | Alta/edición de Property |
| Side panel | Alta/edición rápida de Price e Image metadata |
| Confirm modal | Archivar Property, cerrar Listing, eliminar Price/Image |
| Toast | Feedback de mutaciones |
| Empty state | Sin datos; SUPER_ADMIN sin tenant seleccionado |

### API admin (referencia)

| Módulo | Base path |
| ------ | --------- |
| Properties | `/properties` |
| PropertyListings | `/property-listings` |
| PropertyPrices | `/property-prices` |
| PropertyImages | `/property-images` |

---

# 1. Properties

## Objetivo

Permitir al equipo de la inmobiliaria registrar, consultar, editar y archivar inmuebles físicos dentro de su tenant. La Property es la entidad raíz del dominio: concentra datos del inmueble (ubicación, superficies, tipología) pero **no** precio ni operación comercial — eso vive en PropertyListing y PropertyPrice.

Una Property archivada (`isActive = false`) deja de ser visible en la web pública y bloquea la creación o activación de publicaciones asociadas.

## Entidades involucradas

| Entidad | Relación |
| ------- | -------- |
| `Property` | Entidad principal |
| `Tenant` | Owner (`tenantId`) |
| `User` | Creador (`createdById`) |
| `PropertyListing` | Hijas — gestionadas en módulo aparte |
| `PropertyImage` | Hijas — gestionadas en módulo aparte |
| `PropertyFeatureAssignment` | Futuro — no incluido en pantallas v1 |
| `PropertyAgentAccess` | Futuro — compartición entre agentes |

## Pantallas

| Ruta admin | Nombre UI | Descripción |
| ---------- | --------- | ----------- |
| `/propiedades` | Propiedades | Listado paginado/buscable de propiedades del tenant |
| `/propiedades/crear` | Nueva propiedad | Formulario de alta |
| `/propiedades/[id]` | Detalle / editar | Ficha editable con secciones y acceso a sub-módulos |
| `/propiedades/[id]/publicaciones` | Comercialización | Operaciones comerciales, precios y visibilidad web |
| `/propiedades/[id]/imagenes` | Imágenes | Enlace al módulo Images (contexto property) |

### Secciones del formulario `/propiedades/[id]`

| Sección UI | Campos principales |
| ---------- | ------------------ |
| Identificación | Título, slug, código interno, tipo, condición |
| Ubicación | Calle, número, piso, depto; **Provincia** (select catálogo); **Localidad** (autocomplete); **Barrio** (autocomplete opcional); CP, coordenadas. Campos legacy sincronizados al guardar. |
| Superficies y distribución | m² totales/cubiertos/descubiertos, frente/fondo, ambientes, dormitorios, baños, cocheras, antigüedad |
| Descripción | Texto libre |
| Estado | Activa / archivada (`isActive`) |
| Resumen comercial (solo lectura) | Cabecera ejecutiva + KPIs en layout `[id]` — links a sub-módulos |

### Ficha ejecutiva (Fase 2)

Layout compartido en `/propiedades/[id]/*`:

| Bloque | Contenido |
| ------ | --------- |
| Cabecera sticky | Tipo, título, dirección, provincia/localidad, estado activa/archivada, estado comercial publicada/borrador, operaciones activas, precio principal, moneda, destacada, imágenes, última modificación |
| KPIs | Publicable, Operaciones, Imágenes, Características, SEO |
| Sub-nav | Datos · Comercialización · Características · Imágenes |
| Tab Datos | Formulario + publicabilidad (checklist en acordeón al final) |

## Acciones

| Acción UI | API | Efecto |
| --------- | --- | ------ |
| Crear propiedad | `POST /properties` | Nueva Property con `isActive = true` default |
| Ver listado | `GET /properties?tenantId=` | Lista filtrable por `isActive` |
| Ver detalle | `GET /properties/:id?tenantId=` | Ficha completa |
| Guardar cambios | `PATCH /properties/:id?tenantId=` | Actualización parcial |
| Archivar | `DELETE /properties/:id?tenantId=` | Soft delete: `isActive = false` |
| Restaurar | `PATCH` con `isActive: true` | Reactiva propiedad archivada |
| Ir a publicaciones | Navegación | `/propiedades/[id]/publicaciones` |
| Ir a imágenes | Navegación | `/propiedades/[id]/imagenes` |
| Ver en web (futuro) | Link externo | `/propiedades/{slug}` si publicable |

## Permisos

| Acción | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ------ | ----- | ------------ | ----------- |
| Listar | Propias + compartidas (`canView`) | Todas del tenant | Todas (tenant seleccionado) |
| Crear | ✅ (`createdById = self`) | ✅ | ✅ |
| Editar | Propias + `canEdit` | Todas del tenant | Todas |
| Archivar | Propias + `canEdit` | Todas del tenant | Todas |
| Ver `internalCode` | ✅ | ✅ | ✅ |
| Cambiar `createdById` | ❌ | ❌ (futuro reasignación) | ❌ |

## Validaciones

### Obligatorios al crear

| Campo | Regla |
| ----- | ----- |
| `tenantId` | Existe en DB; coincide con sesión |
| `createdById` | Usuario existe y pertenece al tenant |
| `slug` | 3–120 chars; `[a-z0-9-]+`; único por tenant |
| `title` | No vacío |
| `propertyType` | Enum válido |
| `provinceId` + `localityId` | Obligatorios vía catálogo GEO (Admin UI). API acepta legacy `city` si no hay IDs. |

### Ubicación (GEO-002)

| Campo UI | Fuente | Comportamiento |
| -------- | ------ | -------------- |
| Provincia | `GET /geo/provinces` | Select; al cambiar limpia localidad y barrio |
| Localidad | `GET /geo/provinces/:id/localities?q=` | Autocomplete dependiente de provincia |
| Barrio | `GET /geo/localities/:id/neighborhoods?q=` | Autocomplete opcional; limpia al cambiar localidad |

Cliente admin: `apps/admin/lib/api/geo-client.ts` (API pública, sin cookies server-side).

### Opcionales con reglas

| Campo | Regla |
| ----- | ----- |
| `internalCode` | Único por tenant si definido; `""` → `null` |
| `latitude` | -90 … 90 |
| `longitude` | -180 … 180 |
| `yearBuilt` | 1800 … 2100 |
| Superficies y contadores | ≥ 0 |
| `province` | Preferido sobre `state` (alias deprecado en API) |

### Validaciones de negocio (UI debe anticipar)

| Regla | Mensaje UI sugerido |
| ----- | ------------------- |
| Slug duplicado | «Ya existe una propiedad con esa URL» (409) |
| Código interno duplicado | «Ese código interno ya está en uso» (409) |
| Archivar con listings ACTIVE | Advertir: dejarán de publicarse en web; no bloquear archivado |
| Editar slug de propiedad publicada | Confirmación: puede afectar SEO / URLs |

## Estados

Property no tiene enum de estado comercial. El admin gestiona:

| Estado UI | Campo DB | Significado |
| --------- | -------- | ----------- |
| Activa | `isActive = true` | Visible en admin; elegible para publicación |
| Archivada | `isActive = false` | Oculta en web; bloquea create/activate de listings |

### Indicadores derivados (solo lectura en listado)

| Badge UI | Condición |
| -------- | --------- |
| Publicada | Al menos un listing `ACTIVE` + precio primary + portada |
| Borrador comercial | Property activa sin listing ACTIVE completo |
| Archivada | `isActive = false` |

## Navegación

```txt
Sidebar
└── Inmobiliaria
    └── Propiedades → /propiedades

/propiedades
├── [+ Nueva propiedad] → /propiedades/crear
└── [fila] → /propiedades/[id]

/propiedades/[id]
├── Tab / link: Datos generales (misma página)
├── Tab / link: Publicaciones → /propiedades/[id]/publicaciones
└── Tab / link: Imágenes → /propiedades/[id]/imagenes

Breadcrumb ejemplo:
Inicio > Propiedades > Casa en Belgrano
```

## Dependencias

| Dependencia | Tipo | Notas |
| ----------- | ---- | ----- |
| Auth + guards API | Bloqueante producción | Sin JWT, tenantId es manipulable |
| `Tenant` existente | Datos | Validado en API al crear |
| `User` (`createdById`) | Datos | Sesión autenticada |
| PropertyListings | Módulo hijo | Publicación comercial |
| PropertyImages | Módulo hijo | Requisito publicación web (portada) |
| PropertyPrices | Nieto vía Listing | Requisito activación listing |
| Public API | Downstream | Regla de publicación compuesta |
| Slug autogenerado | Mejora futura | Hoy el admin ingresa slug manualmente |

---

# 2. PropertyListings

## Objetivo

Gestionar las publicaciones comerciales de una propiedad: venta, alquiler o alquiler temporario. Cada publicación tiene ciclo de vida propio (`DRAFT` → `ACTIVE` → …) y determina qué operación se muestra en la web pública.

El admin debe guiar al usuario para cumplir los requisitos de activación (precio asociado, property activa) y reflejar el impacto en visibilidad pública.

## Entidades involucradas

| Entidad | Relación |
| ------- | -------- |
| `PropertyListing` | Entidad principal |
| `Property` | Padre (`propertyId`) |
| `PropertyPrice` | Hijas — requisito para activar |
| `Tenant` | Owner (`tenantId`) |

## Pantallas

| Ruta admin | Nombre UI | Descripción |
| ---------- | --------- | ----------- |
| `/propiedades/[id]/publicaciones` | Publicaciones | Listado de listings de la property |
| `/propiedades/[id]/publicaciones/crear` | Nueva publicación | Selección de `listingType` + datos comerciales |
| `/propiedades/[id]/publicaciones/[listingId]` | Editar publicación | Estado, expensas, destacado, acciones de transición |
| `/propiedades/[id]/publicaciones/[listingId]/precios` | Precios | Listado/gestión de PropertyPrice del listing |

### Alternativa de UX (equivalente funcional)

Side panel de creación/edición desde la tabla de publicaciones en lugar de rutas dedicadas — válido si mantiene las mismas acciones y validaciones.

## Acciones

| Acción UI | API | Efecto |
| --------- | --- | ------ |
| Listar por property | `GET /property-listings?tenantId=&propertyId=` | Listings de la propiedad |
| Crear publicación | `POST /property-listings` | Nuevo listing en `DRAFT` |
| Ver detalle | `GET /property-listings/:id?tenantId=` | Datos + estado |
| Editar datos comerciales | `PATCH /property-listings/:id?tenantId=` | Expensas, `isFeatured`, etc. |
| Cambiar estado | `PATCH` con `status` | Transición validada |
| Activar | `PATCH` `status: ACTIVE` | Requiere ≥1 precio; set `publishedAt` si null |
| Pausar | `PATCH` `status: PAUSED` | Oculta de web |
| Reservar | `PATCH` `status: RESERVED` | Oculta de web; semántica comercial |
| Cerrar | `DELETE /property-listings/:id?tenantId=` | `status = CLOSED`; set `closedAt` |
| Reactivar | `PATCH` `CLOSED → ACTIVE` | Limpia `closedAt`; conserva `publishedAt` |
| Gestionar precios | Navegación | `/…/precios` o side panel |
| Marcar destacada | `PATCH` `isFeatured: true` | Aparece en `/public/properties/featured` |

## Permisos

Hereda acceso a la Property padre.

| Acción | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ------ | ----- | ------------ | ----------- |
| Listar | Si puede ver Property | ✅ | ✅ |
| Crear | Si puede editar Property | ✅ | ✅ |
| Cambiar estado | Si puede editar Property | ✅ | ✅ |
| Cerrar / reactivar | Si puede editar Property | ✅ | ✅ |
| Marcar destacada | Si puede editar Property | ✅ | ✅ |

## Validaciones

### Al crear

| Regla | Detalle |
| ----- | ------- |
| Property activa | `Property.isActive = true` |
| Unicidad por tipo | No puede existir otro listing con mismo `listingType` para la property (incluye CLOSED — debe reactivarse, no crear duplicado) |
| `listingType` | SALE \| RENT \| TEMPORARY_RENT |
| `tenantId` | Coherente con Property |

### Al activar (`→ ACTIVE`)

| Regla | Detalle |
| ----- | ------- |
| Property activa | Rechazado si archivada |
| Al menos un precio | `PropertyPrice` count ≥ 1 para el listing |
| Transición válida | Desde DRAFT, PAUSED, RESERVED o CLOSED |

### Datos comerciales

| Campo | Regla |
| ----- | ----- |
| `expensesAmount` | ≥ 0 si definido |
| `expensesCurrency` | ARS \| USD si hay monto de expensas |
| `isFeatured` | Boolean; default false |

### Mensajes UI ante errores API

| Error | Mensaje sugerido |
| ----- | ---------------- |
| Property archivada | «Activá o restaurá la propiedad antes de publicar» |
| Sin precios al activar | «Agregá al menos un precio antes de activar la publicación» |
| Tipo duplicado | «Ya existe una publicación de {tipo}. Reactivala o editá la existente» |
| Transición inválida | «No se puede cambiar de {estado actual} a {estado destino}» |

## Estados

### Enum `PropertyListingStatus`

| Estado DB | Label UI | Visible en web | Transiciones permitidas |
| --------- | -------- | -------------- | ----------------------- |
| `DRAFT` | Borrador | No | → ACTIVE, CLOSED |
| `ACTIVE` | Activa | Sí (si cumple regla publicación completa) | → PAUSED, RESERVED, CLOSED |
| `PAUSED` | Pausada | No | → ACTIVE, CLOSED |
| `RESERVED` | Reservada | No | → ACTIVE, CLOSED |
| `CLOSED` | Cerrada | No | → ACTIVE (reactivación) |

```txt
DRAFT ──→ ACTIVE ──→ PAUSED ──→ ACTIVE
              │          │
              │          └──→ CLOSED ──→ ACTIVE
              ├──→ RESERVED ──→ ACTIVE
              └──→ CLOSED ──→ ACTIVE

DRAFT ──→ CLOSED
```

### Fechas asociadas

| Campo | Cuándo se setea |
| ----- | --------------- |
| `publishedAt` | Primera activación; se conserva en reactivaciones |
| `closedAt` | Al cerrar; `null` al reactivar |

### Tipos de operación (`listingType`)

| UI | Valor |
| -- | ----- |
| Venta | `SALE` |
| Alquiler | `RENT` |
| Alquiler temporario | `TEMPORARY_RENT` |

## Navegación

```txt
/propiedades/[id]
└── Comercialización → /propiedades/[id]/publicaciones
    ├── [+ Nueva operación] → /propiedades/[id]/publicaciones/crear
    ├── [Editar] → SidePanel (listing + precios, sin cambio de ruta)
    └── Rutas legacy (redirect automático):
        ├── /publicaciones/[listingId] → ?edit=[listingId]
        └── /publicaciones/[listingId]/precios → ?edit=[listingId]

Breadcrumb:
Inicio > Propiedades > {título} > Comercialización
```

Entrada alternativa desde listado global de propiedades: columna «Comercialización» con contador por estado.

### UX Comercialización (v1.1)

El operador gestiona **operaciones y precios en un único módulo**. No existe navegación separada a «Precios».

| Elemento | Comportamiento |
| -------- | -------------- |
| Tabla | Operación, estado, precio principal, moneda, otros precios, visible web, destacada |
| SidePanel editar | Estado, expensas, destacada + sección precios con radio principal |
| Agregar/editar precio | SidePanel anidado (sin navegación) |
| Guardar | Persiste listing + promoción de precio principal si cambió |
| Cache web | Tras mutación comercial, Admin llama `POST /api/revalidate` en web (`REVALIDATE_SECRET`) |

Rutas internas del dominio (`PropertyListing`, `PropertyPrice`, `/property-listings`, `/property-prices`) **no cambian**.

## Dependencias

| Dependencia | Tipo | Notas |
| ----------- | ---- | ----- |
| Property activa | Padre | Bloquea create/activate |
| PropertyPrices | Hijo | Bloquea activate |
| Property (slug, datos) | Padre | Web pública usa slug de Property |
| PropertyImages (portada) | Hermano | Regla publicación web también exige `isCover` |
| Public API | Downstream | Solo listings ACTIVE + precio primary |
| Auth guards | Infra | Pendiente |

---

# 3. PropertyPrices

## Objetivo

Gestionar los precios de una operación comercial **desde el módulo Comercialización** (SidePanel de edición). Soporta múltiples precios por listing (distintas monedas o variaciones con `label`), con exactamente un precio principal (`isPrimary`) para visualización en web y filtros públicos.

El admin debe hacer explícitas las reglas de promoción automática al cambiar o eliminar el precio principal, y los bloqueos cuando el listing está en estados publicados.

## Entidades involucradas

| Entidad | Relación |
| ------- | -------- |
| `PropertyPrice` | Entidad principal |
| `PropertyListing` | Padre (`listingId`) |
| `Property` | Abuelo (vía listing → property) |
| `Tenant` | Owner (`tenantId`) |

## Pantallas

| Ruta admin | Nombre UI | Descripción |
| ---------- | --------- | ----------- |
| `/propiedades/[id]/publicaciones` | Comercialización | Tabla con resumen de precios por operación |
| SidePanel «Editar operación» | Comercialización | Listing + sección precios |
| SidePanel «Agregar / Editar precio» | (anidado) | Form: monto, moneda, label |
| `/propiedades/.../precios` | *(legacy)* | Redirect → Comercialización `?edit=` |

## Acciones

| Acción UI | API | Efecto |
| --------- | --- | ------ |
| Listar | `GET /property-prices?listingId=` | Precios del listing (server-side en página Comercialización) |
| Crear | `POST /property-prices` | Nuevo precio; primer precio → auto `isPrimary` |
| Editar | `PATCH /property-prices/:id` | Monto, moneda, label |
| Marcar principal | Radio + Guardar → `PATCH` `isPrimary: true` | Demota los demás (transacción) |
| Quitar principal | `PATCH` `isPrimary: false` | Promueve otro si existe; error si es único — **no expuesto en UI** |
| Eliminar | `DELETE /property-prices/:id` | Borrado físico; promueve otro si era primary |

## Permisos

Hereda acceso al PropertyListing padre (y por extensión a Property).

| Acción | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ------ | ----- | ------------ | ----------- |
| Listar | Si puede ver listing | ✅ | ✅ |
| Crear / editar / eliminar | Si puede editar listing | ✅ | ✅ |

## Validaciones

### Al crear / editar

| Campo | Regla |
| ----- | ----- |
| `amount` | > 0 (API: `@Min(0.01)`) |
| `currency` | `ARS` \| `USD` — obligatorio |
| `label` | Opcional; recomendado si hay múltiples precios misma moneda |
| `listingId` | Listing existe y pertenece al tenant |
| `isPrimary` | Solo uno true por listing cuando hay precios |

### Reglas de negocio

| Regla | Comportamiento UI |
| ----- | ----------------- |
| Primer precio del listing | Auto principal — informar en empty state |
| Promover principal | Al marcar uno, desmarcar otros (sin confirmación) |
| Desmarcar único principal | Bloquear con mensaje |
| Eliminar único precio + listing ACTIVE/PAUSED/RESERVED | Bloquear: «No podés eliminar el único precio de una publicación activa» |
| Eliminar único precio + listing DRAFT/CLOSED | Permitido |
| Eliminar precio principal con alternativas | Confirmar; informar que se promoverá otro automáticamente |

### Formato UI

| Campo UI | Entrada |
| -------- | ------- |
| Precio | `Input type="number"` (v1); `CurrencyInput` en `@repo/ui` — futuro |
| Moneda | Select ARS / USD |
| Etiqueta | Texto libre — ej. «Contado», «Financiado» |
| Principal | Radio en SidePanel Comercialización + Guardar |

## Estados

PropertyPrice no tiene enum de estado. Estados relevantes son **derivados**:

| Indicador UI | Condición |
| ------------ | --------- |
| Principal | `isPrimary = true` |
| Secundario | `isPrimary = false` |
| Único | Count = 1 — no eliminable si listing publicado |

### Impacto en listing padre

| Situación | Efecto |
| --------- | ------ |
| Listing ACTIVE sin precios | Estado inválido — no debería ocurrir; UI previene al eliminar |
| Cambio de precio principal | Actualiza precio mostrado en web y filtros `priceMin`/`priceMax` |

## Navegación

```txt
/propiedades/[id]/publicaciones/[listingId]
└── Precios → /propiedades/[id]/publicaciones/[listingId]/precios
    ├── [+ Agregar precio] → side panel
    └── [fila] → editar / eliminar / marcar principal

Breadcrumb:
Inicio > Propiedades > {título} > Publicaciones > Venta > Precios
```

Atajo desde detalle de listing: badge del precio principal con link a gestión de precios.

## Dependencias

| Dependencia | Tipo | Notas |
| ----------- | ---- | ----- |
| PropertyListing | Padre directo | `listingId` obligatorio |
| Property | Abuelo | Contexto navegación |
| Listing status | Regla negocio | Restringe delete del único precio |
| Public API | Downstream | Expone solo `isPrimary` del listing activo |
| `@repo/ui` SidePanel | UI | Form create/edit en panel lateral |

---

# 4. PropertyImages

## Objetivo

Gestionar las imágenes asociadas a una propiedad (metadata en Foundation v1). Define cuál es la portada (`isCover`) y el orden de galería (`sortOrder`). Las imágenes pertenecen a la **Property**, no al listing — la misma galería se usa para todas las publicaciones de la propiedad.

Foundation v1 administra solo metadata (`storageKey`, `url`, `altText`, etc.); el upload físico a storage (R2/S3/Supabase) es fase posterior.

## Entidades involucradas

| Entidad | Relación |
| ------- | -------- |
| `PropertyImage` | Entidad principal |
| `Property` | Padre (`propertyId`) |
| `Tenant` | Owner (`tenantId`) |

## Pantallas

| Ruta admin | Nombre UI | Descripción |
| ---------- | --------- | ----------- |
| `/propiedades/[id]/imagenes` | Imágenes | Galería con grid/lista, portada destacada |
| Side panel «Agregar imagen» | Nueva imagen | Metadata + `storageKey` (manual v1) |
| Side panel «Editar imagen» | Editar imagen | altText, sortOrder, portada |
| Modal confirmación | Eliminar imagen | Advertencia si es portada |

### Evolución v2 (fuera de alcance funcional v1)

* Upload drag & drop → genera `storageKey` + signed URL
* Reordenamiento drag & drop en grid (API ya persiste `sortOrder`)

## Acciones

| Acción UI | API | Efecto |
| --------- | --- | ------ |
| Listar | `GET /property-images?tenantId=&propertyId=` | Imágenes de la property |
| Crear metadata | `POST /property-images` | Registro con `storageKey`; primera → auto `isCover` |
| Editar | `PATCH /property-images/:id?tenantId=` | altText, sortOrder, url |
| Marcar portada | `PATCH` `isCover: true` | Demota las demás; acción UI «Usar como portada» |
| Cambiar orden | `PATCH` `sortOrder` | Manual v1 (input numérico); drag v2 |
| Eliminar | `DELETE /property-images/:id?tenantId=` | Borrado físico; promueve portada si aplica |
| Previsualizar | UI | Render `url` si existe; placeholder si no |

## Permisos

Hereda acceso a la Property padre.

| Acción | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ------ | ----- | ------------ | ----------- |
| Listar | Si puede ver Property | ✅ | ✅ |
| Crear / editar / eliminar | Si puede editar Property | ✅ | ✅ |

## Validaciones

### Al crear

| Campo | Regla |
| ----- | ----- |
| `propertyId` | Property existe, pertenece al tenant |
| Property activa | `isActive = true` — no crear en archivadas |
| `storageKey` | Obligatorio — identificador agnóstico de storage |
| `url` | Opcional — preview si disponible |
| `altText` | Opcional — recomendado para accesibilidad |
| `mimeType`, `fileSize` | Opcionales en API — **no expuestos en admin v1** |
| `sortOrder` | ≥ 0; default 0 |
| `isCover` | Una sola portada por property |

### Campos visibles en admin v1 (SidePanel)

| Campo | Crear | Editar |
| ----- | ----- | ------ |
| `storageKey` | ✅ obligatorio | Solo lectura |
| `url` | ✅ opcional | ✅ |
| `altText` | ✅ opcional | ✅ |
| `sortOrder` | ✅ opcional | ✅ |
| `mimeType`, `fileSize` | — | — (API only) |

### Formato UI

| Elemento | Comportamiento v1 |
| -------- | ----------------- |
| Portada | Badge «Portada» en grid + acción «Usar como portada» — sin checkbox en form |
| Preview | `<img>` si hay `url`; placeholder si no |
| Galería | Grid de cards (`PropertyImageGrid`) |
| Alta/edición | SidePanel (`PropertyImageForm`) |

### Reglas de negocio

| Regla | Comportamiento UI |
| ----- | ----------------- |
| Primera imagen | Auto portada |
| Marcar nueva portada | Demota anterior automáticamente |
| Eliminar portada | Promueve imagen más antigua restante |
| Eliminar única imagen | Permitido; property queda sin portada → no publicable en web |
| Property archivada | Bloquear alta de imágenes |

### Foundation v1 — ingreso manual de `storageKey`

Hasta existir upload, el admin ingresa `storageKey` (y opcionalmente `url`) manualmente. La UI debe documentar con helper text que esto es temporal.

## Estados

PropertyImage no tiene enum de estado.

| Indicador UI | Condición |
| ------------ | --------- |
| Portada | `isCover = true` — badge en grid |
| Galería | `isCover = false` |
| Sin imágenes | Empty state con CTA agregar |
| No publicable | Property sin portada — warning en resumen Property |

## Navegación

```txt
/propiedades/[id]
└── Imágenes → /propiedades/[id]/imagenes
    ├── [+ Agregar imagen] → side panel
    └── [card] → editar / eliminar / «Usar como portada»

Breadcrumb:
Inicio > Propiedades > {título} > Imágenes
```

## Dependencias

| Dependencia | Tipo | Notas |
| ----------- | ---- | ----- |
| Property activa | Padre | Bloquea create |
| Storage upload API | Futuro | Reemplaza ingreso manual de storageKey |
| Public API | Downstream | Requiere `isCover = true` para publicación |
| PropertyListings ACTIVE | Hermano | Publicación web exige portada + listing + precio |
| packages/ui SidePanel | UI | Edición metadata |

---

# 5. Regla de publicación web (cross-module)

> **Estado UI:** ✅ implementado — KPI «Publicable» en cabecera + panel acordeón al final del tab Datos (`PropertyPublishabilityPanel`).

El admin muestra un **indicador de publicabilidad** en la ficha de Property, derivado de la regla ya implementada en Public API:

| Requisito | Módulo responsable |
| --------- | ------------------ |
| `Property.isActive = true` | Properties |
| `PropertyListing.status = ACTIVE` | PropertyListings |
| `PropertyPrice.isPrimary = true` en ese listing | PropertyPrices |
| `PropertyImage.isCover = true` en la property | PropertyImages |

Checklist UI sugerido en `/propiedades/[id]`:

```txt
☑ Propiedad activa
☑ Publicación activa (Venta / Alquiler / …)
☑ Precio principal definido
☑ Imagen portada definida
→ Visible en web pública
```

---

# 6. Matriz de dependencias entre módulos

```txt
                    ┌─────────────┐
                    │  Properties │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   ┌───────────────┐               ┌───────────────┐
   │PropertyListings│               │PropertyImages │
   └───────┬───────┘               └───────────────┘
           ▼
   ┌───────────────┐
   │ PropertyPrices│
   └───────────────┘

Orden de implementación admin recomendado (dependencias):
1. Properties
2. PropertyImages (portada — requisito publicación)
3. PropertyListings
4. PropertyPrices (requisito activación listing)

Orden de entrega en `apps/admin`: Properties → PropertyListings → PropertyPrices → PropertyImages.
```

| Módulo | Depende de | Bloquea a |
| ------ | ---------- | --------- |
| Properties | Tenant, User, Auth | Listings, Images |
| PropertyListings | Property activa, Prices (para ACTIVE) | Public API (operación) |
| PropertyPrices | PropertyListing | Activación listing, Public API (precio) |
| PropertyImages | Property activa | Public API (portada) |

---

# 7. Roadmap funcional admin (por módulo)

| Fase | Properties | Listings | Prices | Images |
| ---- | ---------- | -------- | ------ | ------ |
| v1 Foundation | ✅ CRUD + archivar + listado | ✅ CRUD estados + tipos | ✅ CRUD + primary rules | ✅ CRUD metadata manual |
| v1.1 | Slug autogenerado | — | — | sortOrder drag |
| v2 | Features assignment | — | — | Upload storage |
| v2 | Agent access / compartir | — | — | — |
| v3 | Bulk import | Plantillas precio | — | Batch upload |

---

# 8. Referencias API rápidas

Documentación detallada de endpoints y DTOs: `docs/04-modules/properties.md` y Swagger `/api/docs`.

| Operación | Properties | Listings | Prices | Images |
| --------- | ---------- | -------- | ------ | ------ |
| Create | POST | POST | POST | POST |
| List | GET + tenantId | GET + tenantId, propertyId | GET + tenantId, listingId | GET + tenantId, propertyId |
| Read | GET :id | GET :id | GET :id | GET :id |
| Update | PATCH :id | PATCH :id | PATCH :id | PATCH :id |
| Delete | DELETE :id (soft) | DELETE :id (→ CLOSED) | DELETE :id (hard) | DELETE :id (hard) |

---

**Documentos relacionados:** `docs/07-admin/admin-nav.md` — navegación y matriz rol × ruta.
