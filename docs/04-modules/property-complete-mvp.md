# Property Complete MVP

Versión: 1.0

Estado: **Aprobado para implementación**

Branch objetivo: `feature/property-complete-mvp`

Referencias:

* `docs/03-database/property-domain.md`
* `docs/04-modules/properties.md`
* `docs/09-roadmap/property-api-roadmap.md`
* `docs/07-admin/admin-modules.md`
* `docs/06-web/public-web-ui.md`
* `PROJECT_STATE.md`

---

## Resumen

Property Complete MVP cierra el flujo de negocio end-to-end de una propiedad inmobiliaria para que una inmobiliaria real pueda operar dentro de Valorar: crear el inmueble, completar su ficha, gestionar características y galería, publicar comercialmente y visualizarla correctamente en la web pública.

El schema Prisma v1 (`Property`, `PropertyListing`, `PropertyPrice`, `PropertyImage`, `PropertyFeature`, `PropertyFeatureAssignment`) es suficiente para este MVP. **No se prevén migraciones nuevas** salvo necesidad estricta documentada.

---

## Objetivos

1. Permitir que una inmobiliaria **cree y complete** una propiedad con información física relevante para el mercado argentino.
2. Habilitar la **gestión de características y amenities** mediante catálogo global y asignación por propiedad.
3. Entregar una **galería de imágenes operativa** con upload real, portada y reordenamiento.
4. Mantener el flujo de **publicación comercial** (listing + precio + activación) ya existente y hacerlo usable de punta a punta.
5. Garantizar que la **web pública** refleje fielmente la ficha cargada en admin (detalle enriquecido, features, galería, multi-operación).
6. Establecer bases de **calidad de publicación** (checklist, validaciones soft, slug server-side) sin bloquear operaciones legítimas.

---

## Alcance

### Flujo de negocio cubierto

```txt
Crear Property
    → Completar ficha física (admin)
    → Asignar PropertyFeature (admin)
    → Subir y ordenar PropertyImage (admin)
    → Crear PropertyListing (DRAFT)
    → Agregar PropertyPrice (isPrimary)
    → Activar listing (ACTIVE)
    → Visible en Public API + web pública
```

### Entidades involucradas

```txt
Property
├── PropertyListing
│      └── PropertyPrice
├── PropertyImage
└── PropertyFeatureAssignment → PropertyFeature (global)
```

### Regla de publicación (sin cambios)

Una propiedad es visible en web cuando se cumplen **todas** estas condiciones:

* `Property.isActive = true`
* Al menos un `PropertyListing` con `status = ACTIVE`
* Precio principal (`PropertyPrice.isPrimary = true`) en ese listing
* Imagen portada (`PropertyImage.isCover = true`)

Implementada en Public API y panel de publicabilidad del admin.

### Roadmap oficial

#### FASE A — Features end-to-end (P0)

| Entregable | Descripción |
| ---------- | ----------- |
| Seed catálogo `PropertyFeature` | ~25–30 features estándar AR en `prisma/seed.ts` |
| CRUD `PropertyFeature` | Lectura para todos; escritura `SUPER_ADMIN` |
| API `PropertyFeatureAssignment` | Asignar / desasignar / bulk replace por propiedad |
| Tab Características en admin | Ruta `/propiedades/[id]/caracteristicas` + sub-nav |
| Integración detalle público | Features activas ya consumidas por web; validar flujo completo |

**Catálogo seed objetivo (ejemplos por categoría):**

| Categoría | Ejemplos |
| --------- | -------- |
| `GENERAL` | Apto crédito, apto profesional, uso comercial, acepta permuta |
| `SERVICE` | Agua corriente, gas natural, gas envasado, cloacas, internet, electricidad |
| `ROOM` | Living, comedor, cocina, lavadero, jardín, patio, balcón, terraza |
| `AMENITY` | Pileta, parrilla, quincho, seguridad 24h, portero, aire acondicionado, calefacción, ascensor, gimnasio, SUM, amoblado, acepta mascotas |

**Endpoints API objetivo:**

```txt
GET    /property-features
GET    /property-features/:id
POST   /property-features              # SUPER_ADMIN
PATCH  /property-features/:id          # SUPER_ADMIN
DELETE /property-features/:id          # soft: isActive = false

GET    /properties/:propertyId/features
PUT    /properties/:propertyId/features   # bulk [{ featureId, value? }]
POST   /properties/:propertyId/features
DELETE /properties/:propertyId/features/:featureId
```

Reglas:

* Solo features con `isActive = true` son asignables.
* `@@unique([propertyId, featureId])` — una feature por propiedad.
* `value` opcional para detalle (ej. «2 cocheras cubiertas»).

---

#### FASE B — Ficha técnica completa (P0)

Completar formulario Property en admin con campos ya existentes en schema y API:

| Campo UI | Campo DB |
| -------- | -------- |
| Ambientes | `rooms` |
| Toilettes | `halfBathrooms` |
| Cocheras | `parkingSpaces` |
| m² descubiertos | `uncoveredArea` |
| Frente terreno | `lotFront` |
| Fondo terreno | `lotDepth` |
| Antigüedad | `yearBuilt` |
| Orientación | `orientation` |
| Disposición | `layout` |
| Luminosidad | `brightness` |
| Piso | `floor` |
| Departamento | `apartment` |
| Latitud / Longitud | `latitude`, `longitude` |

Actualizar:

* DTOs admin (`CreatePropertyDto`, `UpdatePropertyDto`, tipos admin).
* `PublicPropertyDetailDto` y `@repo/shared-types`.
* Detalle web: sección **Ficha técnica** (`PropertyHeader` o componente dedicado).
* Labels ES para enums (`orientation`, `layout`, `brightness`, `condition`).

**Privacidad pública:** no exponer calle, número, piso ni departamento en Public API (mantener regla actual).

---

#### FASE C — Storage + galería (P0)

| Entregable | Descripción |
| ---------- | ----------- |
| `StorageModule` | Interface agnóstica; providers R2, S3, Supabase |
| Upload imágenes | Signed URL o multipart desde admin |
| Portada | Regla `isCover` única (ya implementada en service) |
| Reordenamiento | Endpoint batch `sortOrder` + UX drag & drop o controles |
| Eliminación | Borrado metadata + archivo en storage |

Convención de keys:

```txt
{tenantId}/properties/{propertyId}/{uuid}.{ext}
```

Configuración vía env (`STORAGE_PROVIDER`, bucket, credenciales). Ver `docs/09-roadmap/property-api-roadmap.md` §4.

**Endpoints API objetivo (extensión):**

```txt
POST   /property-images/upload-url     # signed URL para upload
PATCH  /property-images/reorder        # [{ id, sortOrder }]
```

---

#### FASE D — Publicación (P1)

| Entregable | Descripción |
| ---------- | ----------- |
| Checklist visual | Mejorar panel publicabilidad existente con warnings opcionales |
| Validaciones soft | Recomendaciones no bloqueantes: descripción, mínimo de fotos, ficha parcial |
| Slug server-side | Generación en API al crear; inmutabilidad si listing `ACTIVE` |

Las **4 reglas hard** de publicación no cambian. Las validaciones soft son informativas en admin.

---

#### FASE E — Buscador avanzado (P2)

| Entregable | Descripción |
| ---------- | ----------- |
| Filtro por features | `features[]` en Public API + UI listado web |
| Filtro por condition | `condition` en Public API + UI |
| Más criterios | Superficie mínima, cocheras, etc. (según demanda) |

Post-MVP; no bloquea el cierre del flujo operativo.

---

## Fuera de alcance

| Tema | Motivo |
| ---- | ------ |
| Migraciones schema salvo necesidad estricta | Schema v1 cubre MVP |
| `PropertyAgentAccess` / compartición entre agentes | Fase Sharing — post MVP |
| RBAC API (`@Roles` en endpoints) | Auth v1.1 |
| Resolución tenant por dominio en Public API | Infra post-MVP |
| Geocoding Google Places activo | Enriquecimiento futuro |
| Emprendimientos (`Development`) | Módulo aparte |
| Lead Domain implementación | Documentado, congelado |
| Video / Matterport / tours 360 | Post-MVP |
| Documentos legales (escrituras, planos PDF) | Post-MVP |
| Copy comercial distinto por listing | Comparte `Property.description` en MVP |
| Campos boolean de alquiler en schema (`petsAllowed`, `isFurnished`) | Cubrir vía `PropertyFeature` (amoblado, acepta mascotas) |
| Dashboard operativo admin | Post-MVP |
| Configuración usuarios / inmobiliaria | Post-MVP |
| Filtro features en buscador (Fase E) | P2 — no bloquea MVP |

---

## Estado actual vs objetivo

| Capacidad | Hoy | Tras MVP |
| --------- | --- | -------- |
| CRUD Property (campos básicos) | ✅ | ✅ ficha completa |
| CRUD Listing / Price | ✅ | ✅ |
| CRUD Image (metadata manual) | ⚠️ | ✅ upload real |
| PropertyFeature catálogo | ❌ schema only | ✅ seed + CRUD |
| PropertyFeatureAssignment | ❌ | ✅ API + admin |
| Public API detalle | ⚠️ subset campos | ✅ ficha técnica |
| Public web detalle | ⚠️ | ✅ alineado con admin |
| Publicabilidad checklist | ✅ 4 reglas hard | ✅ + warnings soft (Fase D) |
| Slug autogenerado server-side | ❌ client-side admin | ✅ Fase D |

---

## Criterios de aceptación

Una inmobiliaria demo puede completar este flujo sin intervención técnica:

1. **Crear** una propiedad con título, tipo, ciudad y slug.
2. **Completar** ficha física: ambientes, dormitorios, baños, cocheras, superficies, antigüedad, orientación, piso/depto, coordenadas.
3. **Asignar** al menos 5 características del catálogo global (ej. pileta, apto crédito, gas natural).
4. **Subir** al menos 3 imágenes, definir portada y ordenar la galería.
5. **Crear** publicación de venta (`SALE`), agregar precio USD principal y **activar** el listing.
6. Ver **checklist verde** de publicabilidad en admin.
7. **Visualizar** la propiedad en `/propiedades/{slug}` con galería, precio, expensas (si aplica), ficha técnica y características agrupadas por categoría.
8. **Crear** segunda publicación de alquiler (`RENT`) en la misma propiedad y alternar operación con `ListingTypeSwitcher` en web.

---

## Dependencias

### Técnicas

| Dependencia | Fases | Notas |
| ----------- | ----- | ----- |
| Schema Property v1 migrado | Todas | Sin migración adicional prevista |
| Auth Foundation v1 (JWT + TenantGuard) | A–D | Ya implementado |
| Property / Listing / Price / Image API | B–D | Foundation ✅ |
| Public Property API + web Fases 1–6 | A, B | Base ✅ |
| Admin Property Domain v1 | A–D | Shell + CRUD ✅ |
| Variables entorno storage (R2/S3/Supabase) | C | Requerido para upload |
| `@repo/shared-types` | B | Sincronizar tipos públicos |

### Orden de ejecución

```txt
FASE A (Features) ──┐
                    ├──→ FASE C (Storage) ──→ FASE D (Publicación)
FASE B (Ficha) ─────┘
                              ↓
                    FASE E (Buscador) — post-MVP
```

Fases A y B pueden desarrollarse en paralelo. C depende de credenciales storage. D requiere A–C funcional.

### Documentación a actualizar por fase

| Fase | Documentos |
| ---- | ---------- |
| A | `property-domain.md`, `properties.md`, este doc, `admin-modules.md` |
| B | `properties.md`, `public-web-ui.md`, shared-types |
| C | `property-api-roadmap.md`, `properties.md`, `.env.example` |
| D | `property-domain.md`, `admin-modules.md` |
| E | `public-web-ui.md`, `property-domain.md` |

---

## Riesgos

| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| Storage no configurado en dev | Fase C bloqueada | Provider local/mock o R2 dev bucket; documentar en README api |
| Catálogo global vacío sin seed | Features inutilizables | Fase A incluye seed obligatorio |
| Duplicar campos boolean en schema vs features | Deuda técnica | Usar features para amoblado/mascotas en MVP |
| Slug editable post-publicación | SEO roto | Fase D: inmutabilidad server-side |
| Admin form muy largo | UX pobre | Secciones colapsables; mantener patrón Card existente |
| RBAC no aplicado en API | Seguridad parcial | TenantGuard activo; `@Roles` en Fase A solo para SUPER_ADMIN features |
| Upload sin límites | Costos storage | Validar mimeType, fileSize, máximo por propiedad en service |

---

## Definición de terminado (DoD)

### Global (todas las fases)

* [ ] Código en inglés; UI en español.
* [ ] Multi-tenant: escrituras con `tenantId` del JWT (TenantGuard).
* [ ] Reglas de negocio en Services, no en Controllers.
* [ ] Swagger actualizado en `/api/docs`.
* [ ] Tipos sincronizados en `@repo/shared-types` cuando aplique.
* [ ] Documentación actualizada según tabla de dependencias.
* [ ] `PROJECT_STATE.md` refleja avance por fase.
* [ ] Sin migraciones Prisma salvo necesidad estricta documentada.

### FASE A — DoD

* [ ] Seed ejecutable con catálogo features estándar AR.
* [ ] CRUD admin API `PropertyFeature` con restricción SUPER_ADMIN en write.
* [ ] API asignación features por propiedad (bulk + individual).
* [ ] Admin: tab Características con selector por categoría y guardado.
* [ ] Detalle público muestra features asignadas agrupadas por categoría.
* [ ] Tests manuales: asignar/desasignar; feature inactiva no asignable.

### FASE B — DoD

* [ ] Formulario admin expone los 13 campos listados en alcance.
* [ ] Validaciones DTO alineadas con schema (rangos yearBuilt, lat/lng, m² ≥ 0).
* [ ] Public API detalle expone campos de ficha técnica (sin dirección exacta).
* [ ] Web detalle renderiza ficha técnica con labels ES.
* [ ] Cards/listado: evaluar exposición de `coveredArea` (opcional, no bloqueante).

### FASE C — DoD

* [ ] `StorageModule` con factory por `STORAGE_PROVIDER`.
* [ ] Admin sube imagen sin ingresar `storageKey`/`url` manualmente.
* [ ] Portada única garantizada tras upload y delete.
* [ ] Reordenamiento persistido (`sortOrder`).
* [ ] Delete elimina archivo en storage + registro DB.
* [ ] Galería web ordenada igual que admin.

### FASE D — DoD

* [ ] Slug generado en API al crear property.
* [ ] PATCH slug rechazado si property tiene listing ACTIVE.
* [ ] Panel publicabilidad muestra warnings soft (descripción vacía, < 3 fotos, etc.).
* [ ] Warnings no impiden activar listing si se cumplen 4 reglas hard.

### FASE E — DoD

* [ ] Public API acepta `features[]` y `condition` en listado.
* [ ] Web sincroniza filtros con URL.
* [ ] Documentado en `property-domain.md` filtros públicos.

---

## Modelo de datos (referencia)

Sin cambios previstos. Detalle en `docs/03-database/property-domain.md`.

Cambios schema **solo si estrictamente necesarios**, con:

1. Actualización Prisma.
2. Migración Prisma.
3. Actualización `current-schema.md` y `property-domain.md`.

Candidatos post-MVP (no incluidos): `PropertyImage.imageType`, campos alquiler en `PropertyListing`, `PropertyFeature.icon`.

---

## Referencias de implementación existente

| Área | Ubicación |
| ---- | --------- |
| Schema Prisma | `apps/api/prisma/schema.prisma` |
| Property API | `apps/api/src/modules/property` |
| PropertyListing API | `apps/api/src/modules/property-listing` |
| PropertyPrice API | `apps/api/src/modules/property-price` |
| PropertyImage API | `apps/api/src/modules/property-image` |
| Public Property API | `apps/api/src/modules/public-property` |
| Admin Property form | `apps/admin/components/property/property-form.tsx` |
| Admin publicabilidad | `apps/admin/lib/property/publishability.ts` |
| Web detalle | `apps/web/app/(site)/propiedades/[slug]/page.tsx` |
| Web features UI | `apps/web/components/property/property-features.tsx` |
