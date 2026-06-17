# Navegación Property v2 — `/propiedades` y `/propiedades/[id]`

Versión: 1.0  
Fecha: 2026-06-17  
Estado: Planificación — sin implementación.

Referencias:

* `docs/audits/admin-property-ux-audit.md`
* `docs/proposals/property-module-v2.md`
* `apps/admin/lib/property/navigation.ts`
* `apps/admin/components/property/property-sub-nav.tsx`

---

## Objetivo

Definir la **arquitectura de navegación objetivo** para el módulo Propiedades: rutas, tabs, breadcrumbs, acciones globales, estados y flujo de publicación.

Basado en código existente. No introduce módulos inexistentes (Leads, Contratos, etc.).

---

## Estado actual vs objetivo

### Listado `/propiedades` — hoy

```txt
PageShell
├── PageHeader: «Propiedades» + breadcrumb [Inicio › Propiedades]
├── Action: [Nueva propiedad]
└── PropertyTable (5 cols) + footer count Card
```

### Listado `/propiedades` — objetivo v2

```txt
PageShell
├── PageHeader + breadcrumb
├── PropertyListFilters (search + tabs estado + filtros avanzados)
├── PropertyTable / DataTable (7-8 cols + thumbnail)
└── Pagination
```

### Detalle `/propiedades/[id]` — hoy

```txt
PropertyPageShell
├── PageHeader: título + badge + [Volver al listado]
├── PropertySubNav: [Datos generales | Publicaciones | Características | Imágenes]
└── Contenido según ruta (form monolito en «Datos generales»)
```

### Detalle `/propiedades/[id]` — objetivo v2

```txt
PropertyPageShell
├── PropertyDetailHeader (título, meta, badge, acciones globales)
├── PropertySubNav: [Resumen | Datos | Ubicación | Características | Imágenes | Publicaciones | SEO]
└── Contenido por tab
```

---

## Árbol de rutas objetivo

```txt
/propiedades
├── ?isActive=&q=&propertyType=&city=&publishStatus=&page=
├── /crear
└── /[id]
    ├── /                      → Resumen (default)
    ├── /datos                 → Identificación + ficha + descripción
    ├── /ubicacion             → Dirección + coordenadas
    ├── /caracteristicas       → ✅ existe
    ├── /imagenes              → ✅ existe
    ├── /publicaciones         → ✅ existe
    │   ├── /crear
    │   └── /[listingId]
    │       ├── /              → Editar listing
    │       └── /precios       → Precios
    └── /seo                   → Preview / edición SEO
```

**Compatibilidad:** `/propiedades/[id]` permanece como URL principal (Resumen). No romper links existentes del sidebar ni listado.

---

## Wireframe — Listado `/propiedades`

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR │ HEADER: [≡] Valorar Admin    Tenant: demo    usuario@demo    [AV] │
├─────────┴───────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Propiedades                                           [+ Nueva propiedad]  │
│  Inicio › Propiedades                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Buscar por título, código o ciudad...                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [ Todas (42) ] [ Activas (38) ] [ Archivadas (4) ]                        │
│                                                                             │
│  Filtros:  Tipo [Todos ▼]  Ciudad [Todas ▼]  Estado web [Todos ▼]  Limpiar │
│                                                                             │
│  ┌────┬──────────────────────┬───────┬───────────┬────────────┬─────────┐ │
│  │ 📷 │ Propiedad            │ Tipo  │ Ubicación │ Estado     │    ⋮    │ │
│  ├────┼──────────────────────┼───────┼───────────┼────────────┼─────────┤ │
│  │ ▢  │ Casa en Belgrano     │ Casa  │ Belgrano  │ ●Publicada │ Acciones│ │
│  │    │ REF-001              │       │ CABA      │ Venta·USD  │         │ │
│  ├────┼──────────────────────┼───────┼───────────┼────────────┼─────────┤ │
│  │ ▢  │ Depto Palermo        │ Depto │ Palermo   │ ○Borrador  │ Acciones│ │
│  │    │                      │       │ CABA      │ comercial  │         │ │
│  ├────┼──────────────────────┼───────┼───────────┼────────────┼─────────┤ │
│  │ ▢  │ PH San Isidro        │ PH    │ San Isidro│ ○Borrador  │ Acciones│ │
│  │    │ REF-003              │       │ Bs As     │ comercial  │         │ │
│  └────┴──────────────────────┴───────┴───────────┴────────────┴─────────┘ │
│                                                                             │
│  Mostrando 1-20 de 42                              [ ← ] 1  2  3 [ → ]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Menú acciones fila (⋮)

```txt
┌──────────────────┐
│ Editar           │ → /propiedades/[id]/datos
│ Publicaciones    │ → /propiedades/[id]/publicaciones
│ Imágenes         │ → /propiedades/[id]/imagenes
│ Ver en web ↗     │ → PUBLIC_WEB (si publicable)
│ ──────────────── │
│ Archivar         │ → ConfirmModal (si activa)
│ Restaurar        │ → (si archivada)
└──────────────────┘
```

### Breadcrumbs listado

| Ruta | Trail |
| ---- | ----- |
| `/propiedades` | Inicio › Propiedades |
| `/propiedades/crear` | Inicio › Propiedades › Nueva propiedad |

### Estados en listado

| Badge | Variant | Condición |
| ----- | ------- | --------- |
| Publicada | `info` | `isAnyPublishable = true` |
| Borrador comercial | `warning` | activa, no publicable |
| Archivada | `neutral` | `!isActive` |

**Sub-línea opcional:** `Venta · USD 250.000` del listing publicable prioritario (SALE > RENT > TEMPORARY_RENT — misma regla Public API).

---

## Wireframe — Detalle header global

Aplica a **todas** las tabs bajo `/propiedades/[id]/*`.

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Casa en Belgrano                                                           │
│  Casa · Belgrano, CABA · REF-001                                            │
│                                                                             │
│  [ Publicada ]  [ Ver en web ↗ ]  [ Archivar ▼ ]  [ ← Volver al listado ]  │
│                                                                             │
│  Inicio › Propiedades › Casa en Belgrano                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Resumen │ Datos │ Ubicación │ Características │ Imágenes │ Pub... │ SEO │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Acciones globales

| Acción | Visible cuando | Comportamiento |
| ------ | -------------- | -------------- |
| Badge estado | Siempre | `PropertyStatusBadge` |
| Ver en web | `isAnyPublishable` + URL configurada | `target="_blank"` |
| Archivar | `isActive` | ConfirmModal → `archivePropertyAction` |
| Restaurar | `!isActive` | ConfirmModal → `updateProperty isActive:true` |
| Volver al listado | Siempre | Link `/propiedades` |
| Menú ⋮ (fase 2) | Opcional | Duplicar, copiar slug, ver JSON |

### Meta línea

```txt
{propertyType label} · {neighborhood || city} · {internalCode || "—"}
```

---

## Wireframe — Tab Resumen `/propiedades/[id]`

**Tab default.** Reemplaza el actual «Datos generales» como landing.

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│  (header + sub-nav — ver arriba)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Progreso de publicación ──────────────────────────────────── 75% ─┐   │
│  │ ████████████████████░░░░░                                             │   │
│  │                                                                       │   │
│  │  ✓ Propiedad activa                                                   │   │
│  │  ✓ Imagen portada (4 fotos)                                           │   │
│  │  ✓ Publicación Venta activa                                           │   │
│  │  ○ Precio principal (Venta)              → Ir a precios               │   │
│  │                                                                       │   │
│  │  ⚠ Recomendación: agregá descripción más completa                     │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 4 Imágenes  │ │ 2 Publicac. │ │ 8 Caract.   │ │ Venta       │          │
│  │ [Gestionar] │ │ [Gestionar] │ │ [Gestionar] │ │ USD 250.000 │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                             │
│  ┌─ Próximo paso ─────────────────────────────────────────────────────┐   │
│  │  Agregá el precio principal de Venta para publicar en la web.        │   │
│  │                                              [Ir a precios →]       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Publicaciones por operación ────────────────────────────────────────┐   │
│  │  Venta      [Activa (no visible)]  checklist 2/4  [Completar →]     │   │
│  │  Alquiler   [Borrador]             sin precio     [Configurar →]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Breadcrumb Resumen

`Inicio › Propiedades › {título}`

---

## Wireframe — Tab Datos `/propiedades/[id]/datos`

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│  (header + sub-nav)                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Identificación ────────────────────────────────────────────────────┐   │
│  │  Título, slug*, código interno, tipo, condición                       │   │
│  │  * slug con warning si publicada                                      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Ficha técnica ─────────────────────────────────────────────────────┐   │
│  │  Ambientes, dormitorios, baños, cocheras, superficies, antigüedad    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Descripción ───────────────────────────────────────────────────────┐   │
│  │  Textarea descripción comercial                                     │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Estado ────────────────────────────────────────────────────────────┐   │
│  │  ☑ Propiedad activa                                                   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                              [Guardar cambios]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Breadcrumb

`Inicio › Propiedades › {título} › Datos generales`

---

## Wireframe — Tab Ubicación `/propiedades/[id]/ubicacion`

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Dirección ─────────────────────────────────────────────────────────┐   │
│  │  Calle, número, piso, depto, barrio, ciudad, provincia, CP, país    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Coordenadas ───────────────────────────────────────────────────────┐   │
│  │  Latitud, longitud, googlePlaceId, formattedAddress                 │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Mapa ──────────────────────────────────────────────────────────────┐   │
│  │  [placeholder mapa — sin geocoding activo en MVP]                   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                              [Guardar cambios]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe — Tabs existentes (sin cambio estructural mayor)

### Características `/caracteristicas`

Mantener `PropertyFeatureManager`. Mejoras UX de EPIC-01 (sticky save).

### Imágenes `/imagenes`

```txt
┌─ Upload zone ─────────────────────────────────────────────────────────────┐
│  Arrastrá imágenes aquí o [Seleccionar archivos]                          │
│  JPG, PNG, WebP · máx 10 MB                                               │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Portada ───────────────────────────────────────────────────────────────────┐
│  [ imagen grande cover ]                                                  │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Galería (drag para reordenar) ───────────────────────────────────────────┐
│  [img] [img] [img] [img]                                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Publicaciones `/publicaciones`

Mantener `PropertyListingTable`. Agregar filtros por estado/tipo en header de tab.

---

## Wireframe — Contexto listing `/publicaciones/[listingId]`

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│  Casa en Belgrano — Publicación Venta                                       │
│  [ Activa (no visible) ]                                                    │
│                                                                             │
│  Inicio › Propiedades › Casa en Belgrano › Publicaciones › Venta            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Datos comerciales │ Precios                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ ListingSubNav activo: Datos comerciales ────────────────────────────┐   │
│  │  Estado, expensas, destacada, transiciones                           │   │
│  │                                                                       │   │
│  │  Estado: [ACTIVE ▼]  → dispara PublicationGateModal si faltan checks │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ListingSubNav

| Tab | Ruta | Activo |
| --- | ---- | ------ |
| Datos comerciales | `…/[listingId]` | pathname exacto listing |
| Precios | `…/[listingId]/precios` | pathname incluye `/precios` |

### Breadcrumbs listing

| Ruta | Trail |
| ---- | ----- |
| `…/publicaciones` | Inicio › Propiedades › {título} › Publicaciones |
| `…/publicaciones/crear` | … › Publicaciones › Nueva publicación |
| `…/[listingId]` | … › Publicaciones › Venta |
| `…/[listingId]/precios` | … › Publicaciones › Venta › Precios |

---

## Wireframe — Tab SEO `/propiedades/[id]/seo`

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Configuración (fase B) ──────────┐  ┌─ Vista previa ─────────────────┐ │
│  │  Meta título        [____] 42/70  │  │ Google:                        │ │
│  │  Meta descripción   [____] 0/160  │  │ Casa en Belgrano — Venta...    │ │
│  │  ☐ No indexar                     │  │ OG: [cover preview]            │ │
│  └───────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                             │
│  ⚠ El slug está publicado. Cambios en Datos pueden afectar SEO.            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Fase A: solo columna derecha (preview) + warnings.

---

## Resolución de tab activo

### PropertySubNav (`resolvePropertySubNavTab`)

| Tab | Condición pathname |
| --- | ------------------ |
| `resumen` | Exacto `/propiedades/[id]` |
| `datos` | Incluye `/datos` |
| `ubicacion` | Incluye `/ubicacion` |
| `caracteristicas` | Incluye `/caracteristicas` |
| `imagenes` | Incluye `/imagenes` |
| `publicaciones` | Incluye `/publicaciones` |
| `seo` | Incluye `/seo` |

**Precios y listing detail:** tab `publicaciones` permanece activo (como hoy).

### Sidebar principal

Sin cambios: «Propiedades» activo en todo `/propiedades/**` (`matchNavPath`).

---

## Flujo de publicación en la navegación

```txt
Listado /propiedades
    │
    ├─[Nueva propiedad]→ /crear → redirect /[id] Resumen
    │
    └─[fila]→ /[id] Resumen
              │
              ├─ checklist incompleto → PublicationNextStep CTA
              │
              ├─ /imagenes → upload (EPIC-05)
              │
              ├─ /publicaciones/crear → DRAFT
              │       └─ /[listingId]/precios → agregar precio
              │       └─ /[listingId] → ACTIVE (gate modal)
              │
              └─ checklist 100% → Ver en web habilitado
```

### Estados en navegación

| Nivel | Estados UI | Componente |
| ----- | ---------- | ---------- |
| Property | Publicada / Borrador comercial / Archivada | `PropertyStatusBadge` |
| Listing | DRAFT / ACTIVE / PAUSED / RESERVED / CLOSED | `PropertyListingStatusBadge` |
| Listing + web | Activa (no visible) / Visible en web | Badge compuesto |
| Checklist item | ✓ / ○ / ⚠ | `PublicationChecklist` |

---

## Cambios en archivos (implementación futura)

| Archivo | Cambio |
| ------- | ------ |
| `lib/property/navigation.ts` | Nuevos tabs + resolvers |
| `property-sub-nav.tsx` | 7 tabs |
| `property-page-shell.tsx` | Integrar `PropertyDetailHeader` |
| `breadcrumbs.ts` | Trails datos, ubicación, seo, resumen |
| `app/(dashboard)/propiedades/[id]/page.tsx` | Convertir a Resumen |
| **Nuevas rutas** | `datos/page.tsx`, `ubicacion/page.tsx`, `seo/page.tsx` |
| `property-form.tsx` | Split → `PropertyDataForm`, `PropertyLocationForm` |
| **Nuevo** | `property-detail-header.tsx`, `listing-sub-nav.tsx` |

---

## Fases de adopción de navegación

| Fase | Tabs disponibles | Notas |
| ---- | ---------------- | ----- |
| v1 (hoy) | Datos generales, Publicaciones, Características, Imágenes | Sin cambios |
| v2a | + Resumen (default), renombrar Datos | Redirect `/[id]` |
| v2b | + Datos, Ubicación (split form) | Deprecar form monolito |
| v2c | + SEO preview | Sin migración |
| v2d | + ListingSubNav | Contexto listing |
| v3 | SEO editable | Con migración |

---

## Criterios de aceptación navegación v2

1. `/propiedades/[id]` abre tab Resumen con checklist y próximo paso.
2. Sub-nav muestra tab activo correcto en las 7 secciones.
3. Breadcrumbs correctos hasta 5 niveles (precios).
4. Acciones globales accesibles desde cualquier tab.
5. Activar listing desde tab Publicaciones dispara gate si faltan requisitos.
6. Sidebar «Propiedades» sigue activo en todo el sub-árbol.
