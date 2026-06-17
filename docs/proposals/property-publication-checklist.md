# Propuesta — Checklist de Publicación (estilo Airbnb)

Versión: 1.0  
Fecha: 2026-06-17  
Branch: `feature/admin-property-ux`  
Estado: Propuesta — sin implementación.

Referencias:

* `apps/admin/lib/property/publishability.ts`
* `apps/api/src/modules/public-property/repositories/public-property.repository.ts`
* `apps/api/src/modules/property-listing/services/property-listing.service.ts`
* `docs/04-modules/property-complete-mvp.md` (Fase D)

---

## Objetivo

Una propiedad **no debería poder publicarse en web** (listing `ACTIVE` + visible en Public API) si falta:

1. Al menos **1 imagen** (portada / `isCover`)
2. Al menos **1 publicación activa** (`PropertyListing.status = ACTIVE`)
3. Al menos **1 precio principal** (`PropertyPrice.isPrimary = true`)

Experiencia inspirada en **Airbnb Host**: progreso visible, pasos clickeables, bloqueo claro antes de «publicar», celebración al completar.

---

## Estado actual — Backend

### Regla de publicación web (Public API) — 4 checks

Implementada en `public-property.repository.ts`:

| # | Requisito | Enforced en Public API |
| - | --------- | ---------------------- |
| 1 | `Property.isActive = true` | ✅ Prisma `where` |
| 2 | `PropertyListing.status = ACTIVE` | ✅ |
| 3 | `PropertyPrice.isPrimary = true` en listing | ✅ |
| 4 | `PropertyImage.isCover = true` en property | ✅ |

### Activación de listing (Admin API) — solo 2 checks

En `property-listing.service.ts`, transición `→ ACTIVE`:

| Requisito | Enforced al activar |
| --------- | ------------------- |
| Property existe + tenant | ✅ |
| `Property.isActive = true` | ✅ |
| Al menos 1 precio (cualquiera) | ✅ `assertListingHasAtLeastOnePrice` |
| Precio `isPrimary` explícito | ⚠️ Implícito (primer precio auto-primary) |
| Imagen portada | ❌ **No bloquea** |
| Al menos 1 imagen total | ❌ **No bloquea** |

### Gap crítico

```txt
Usuario puede:
  1. Crear listing → agregar precio → ACTIVAR
  2. Listing queda ACTIVE en admin
  3. Public API retorna 404 / no lista la property (sin cover)
  4. Admin muestra checklist rojo pero listing ya está «activo»
```

**Conclusión:** las reglas hard están **split** entre activación (débil) y visibilidad pública (estricta).

---

## Estado actual — Frontend

### Panel existente

`PropertyPublishabilityPanel` en `/propiedades/[id]`:

* Evalúa 4 checks por listing vía `publishability.ts`
* Items no cumplidos son links a la sección correcta
* Badge por listing: «Visible en web» / «No publicable»
* **No bloquea** acciones de activación en `PropertyListingForm`
* **No aparece** inline al intentar activar desde form de listing

### Carga de datos

`loadPropertyPublishabilityContext()`:

* 4 requests paralelos + N requests de precios
* Lógica duplicada del backend (riesgo de drift)
* Sin endpoint dedicado

### Listado de publicaciones

`PropertyListingTable` muestra columna Web con badge derivado — informativo, no preventivo.

---

## Reglas propuestas

### Hard rules (bloqueantes)

Alineadas con Public API. Una property es **publicable** por operación cuando:

| ID | Regla | Nivel | Mensaje UI |
| -- | ----- | ----- | ---------- |
| `property-active` | `Property.isActive = true` | Property | «Activá la propiedad» |
| `has-image` | `PropertyImage` count ≥ 1 | Property | «Agregá al menos una imagen» |
| `cover-image` | Existe `isCover = true` | Property | «Definí una imagen portada» |
| `listing-active` | `PropertyListing.status = ACTIVE` | Listing | «Activá la publicación de {tipo}» |
| `primary-price` | Existe `isPrimary = true` en listing | Listing | «Definí un precio principal» |

**Regla de negocio unificada para activar listing:**

```txt
NO permitir status → ACTIVE si:
  - Property.isActive = false
  - PropertyImage count < 1  (nuevo)
  - No existe isCover = true (nuevo)
  - PropertyPrice count < 1 (existente)
```

**Regla para visibilidad web:** las 5 condiciones anteriores (equivalente a hoy).

### Soft rules (warnings — Fase D, no bloqueantes)

| ID | Regla | Mensaje |
| -- | ----- | ------- |
| `description` | `description` length ≥ 100 chars | «Agregá una descripción más completa» |
| `min-photos` | `PropertyImage` count ≥ 3 | «Recomendamos al menos 3 fotos» |
| `alt-text` | Cover tiene `altText` | «Agregá texto alternativo a la portada» |
| `features` | ≥ 5 feature assignments | «Completá características del inmueble» |
| `technical-sheet` | bedrooms + bathrooms + totalArea definidos | «Completá la ficha técnica» |

Documentadas en `property-complete-mvp.md` Fase D.

---

## UX propuesta

### 1. Checklist global (property-level)

Ubicación primaria: **tab Resumen** o top de `/propiedades/[id]`.

```txt
┌─────────────────────────────────────────────────────────────┐
│ Progreso de publicación                              3/5      │
│ ████████████░░░░░░░░  60%                                   │
│                                                             │
│ ✓ Propiedad activa                                          │
│ ✓ Imagen portada definida (4 fotos)                         │
│ ○ Publicación de Venta activa          → Ir a publicaciones │
│ ○ Precio principal (Venta)             → Ir a precios       │
│ ○ Publicación de Alquiler activa       → Opcional            │
│                                                             │
│ ⚠ Recomendación: agregá más fotos (tenés 1, sugerimos 3)   │
│                                                             │
│ [Publicar en web]  (disabled hasta 100% hard rules venta)   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Gate en activación de listing

Al seleccionar `ACTIVE` en `PropertyListingForm`:

```txt
┌─────────────────────────────────────────┐
│ ¿Activar publicación de Venta?          │
│                                         │
│ Antes de publicar, completá:            │
│ ✓ Precio principal                      │
│ ○ Al menos 1 imagen      [Ir a imágenes]│
│ ○ Imagen portada         [Ir a imágenes]│
│                                         │
│ [Cancelar]  [Activar de todos modos]    │  ← solo TENANT_ADMIN? NO — quitar en v1
└─────────────────────────────────────────┘
```

**Recomendación:** sin bypass en v1. Bloqueo estricto.

### 3. Empty states orientados

| Pantalla | CTA checklist |
| -------- | ------------- |
| Sin imágenes | «Sin fotos no podés publicar. Subí al menos una imagen.» |
| Sin publicaciones | «Creá una publicación para definir venta o alquiler.» |
| Sin precios | «Agregá un precio antes de activar la publicación.» |

### 4. Celebración al completar

Toast + confetti sutil (opcional): «¡Tu propiedad ya es visible en el sitio web!» + link «Ver en web».

---

## Componentes

### Existentes a extender

| Componente | Cambio |
| ---------- | ------ |
| `PropertyPublishabilityPanel` | Barra progreso, soft warnings, CTA «Publicar» |
| `PropertyListingForm` | Modal pre-activación con checklist |
| `PropertyListingTable` | Icono ⚠ en filas ACTIVE pero no publicables |
| `PropertyEmptyState` | Copy orientado a checklist |
| `PropertyStatusBadge` | Tooltip con % completitud |

### Nuevos

| Componente | Responsabilidad |
| ---------- | --------------- |
| `PublicationChecklist` | Lista reutilizable de checks hard + soft |
| `PublicationProgressBar` | % basado en checks hard |
| `PublicationGateModal` | Bloqueo activación listing |
| `PublicationNextStep` | CTA dinámico «siguiente paso» (dashboard + detalle) |
| `usePublicationStatus` | Hook client o server helper unificado |

**Ubicación:** `apps/admin/components/property/publication/` o `lib/property/publication/`

---

## Estados visuales

### Property-level

| Estado UI | Condición | Color badge |
| --------- | --------- | ----------- |
| Archivada | `!isActive` | neutral |
| Borrador comercial | activa, ningún listing publicable | warning |
| Publicada | al menos 1 listing publicable | info/success |
| Incompleta | activa, faltan imágenes | warning + icono |

### Listing-level

| Estado UI | Condición |
| --------- | --------- |
| Borrador | `DRAFT` |
| Activa (no visible) | `ACTIVE` + checklist incompleto |
| Publicada | `ACTIVE` + checklist completo |
| Pausada / Reservada / Cerrada | según enum |

### Checklist items

| Visual | Significado |
| ------ | ----------- |
| ✓ verde | Cumplido |
| ○ gris | Pendiente (link) |
| ⚠ amarillo | Soft warning |
| ✕ rojo | Bloqueante explícito |

---

## Cambios backend necesarios

### P0 — Bloqueo en activación

**Archivo:** `property-listing.service.ts`

Agregar antes de `→ ACTIVE`:

```ts
await this.assertPropertyHasPublishableImages(propertyId, tenantId);
// count >= 1 AND exists isCover
```

**Nuevo error HTTP 400:**

```json
{
  "message": "Cannot activate listing: property requires at least one image with a cover image set.",
  "code": "PUBLICATION_CHECKLIST_INCOMPLETE",
  "missing": ["has-image", "cover-image"]
}
```

### P1 — Endpoint agregado de publicabilidad

```txt
GET /properties/:id/publishability
```

Response:

```ts
{
  propertyId: string;
  hardChecks: PublishabilityCheckItem[];
  softWarnings: PublishabilityCheckItem[];
  progressPercent: number;
  listings: ListingPublishability[];
  isAnyPublishable: boolean;
}
```

**Beneficios:**

* Una sola fuente de verdad (mover lógica de `publishability.ts` a shared package o API service)
* Elimina N+1 del admin
* Dashboard y listado pueden consumir versión batch

### P2 — Batch para listado

```txt
GET /properties?include=publishabilitySummary=true
```

Retorna `statusVariant` + `coverUrl` + `activeListingTypes` por property.

### P3 — Validación soft (no bloqueante)

Solo en response de publishability; sin reject en API.

### Shared package (recomendado)

Extraer reglas a `packages/shared-types` o `packages/property-rules`:

```ts
export function evaluatePublishability(ctx: PublishabilityContext): PublishabilityResult
```

Consumido por: Public API repository, PropertyListing service, Admin (vía API).

---

## Cambios frontend necesarios

| # | Cambio | Archivo(s) | Prioridad |
| - | ------ | ---------- | --------- |
| F1 | Consumir `GET /properties/:id/publishability` | `load-publishability-context.ts` | P0 |
| F2 | `PublicationGateModal` en activación listing | `property-listing-form.tsx` | P0 |
| F3 | Extender panel con progress bar + soft warnings | `property-publishability-panel.tsx` | P1 |
| F4 | Badge «Activa (no visible)» en listing table | `property-listing-table.tsx` | P1 |
| F5 | `PublicationNextStep` en dashboard | `dashboard-home-v1.md` | P1 |
| F6 | Manejar error `PUBLICATION_CHECKLIST_INCOMPLETE` con links | `property-listing-actions.ts` | P0 |
| F7 | Checklist en empty states de imágenes/publicaciones | managers + empty states | P2 |

---

## Flujo objetivo (Airbnb-like)

```txt
Crear property
    ↓
Subir imágenes (≥1, portada auto)     ← checklist: imágenes
    ↓
Crear listing DRAFT + precio           ← checklist: precio
    ↓
Intentar ACTIVAR
    ↓
[Gate] ¿Cumple hard rules? ──No──→ Mostrar faltantes + links
    │
   Sí
    ↓
Listing ACTIVE + checklist 100%
    ↓
Visible en Public API + «Ver en web» habilitado
    ↓
Soft warnings visibles (no bloquean)
```

---

## Prioridad de implementación

| Orden | Entregable | Backend | Frontend |
| ----- | ---------- | ------- | -------- |
| 1 | Bloqueo activación sin imágenes/portada | ✅ | — |
| 2 | Gate modal + error handling | — | ✅ |
| 3 | Endpoint `/publishability` | ✅ | ✅ |
| 4 | Progress bar + soft warnings | — | ✅ |
| 5 | Batch publishability en listado | ✅ | ✅ |
| 6 | Shared rules package | ✅ | ✅ |

---

## Criterios de aceptación

1. No es posible activar un listing si la property no tiene imágenes con portada.
2. El admin muestra el mismo estado que la Public API (sin listings «activos fantasma»).
3. Cada ítem pendiente del checklist enlaza a la pantalla correcta.
4. Soft warnings visibles pero no impiden activación si hard rules cumplen.
5. Una sola fuente de verdad para reglas (API o shared package).
6. Activación bloqueada retorna error estructurado con `missing[]`.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Listings ya ACTIVE sin portada (datos legacy) | Script de migración o banner «requiere imágenes» |
| Reglas divergen entre admin y API | Shared package + tests |
| UX demasiado restrictiva para borradores internos | DRAFT sigue libre; bloqueo solo en ACTIVE |
