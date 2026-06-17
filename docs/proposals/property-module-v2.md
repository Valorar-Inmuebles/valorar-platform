# Propuesta — Módulo Propiedades v2

Versión: 1.0  
Fecha: 2026-06-17  
Branch: `feature/admin-property-ux`  
Estado: Propuesta — sin implementación.

Referencias:

* `docs/audits/admin-property-ux-audit.md`
* `docs/07-admin/admin-modules.md`
* `apps/admin/lib/property/publishability.ts`

---

## Objetivo

Elevar `/propiedades` y su sub-árbol de **CRUD funcional** a **experiencia de productividad inmobiliaria**: encontrar propiedades rápido, entender estado comercial de un vistazo, y navegar el ciclo de publicación sin fricción.

---

## Mapa actual del módulo

```txt
/propiedades                          → PropertyTable (5 columnas)
/propiedades/crear                    → PropertyForm (create)
/propiedades/[id]                     → PublishabilityPanel + PropertyForm (edit, monolito)
/propiedades/[id]/publicaciones       → PropertyListingTable
/propiedades/[id]/publicaciones/crear → PropertyListingForm
/propiedades/[id]/publicaciones/[id]  → PropertyListingForm (estado)
/propiedades/[id]/publicaciones/[id]/precios → PropertyPriceManager
/propiedades/[id]/imagenes            → PropertyImageManager (metadata manual)
/propiedades/[id]/caracteristicas     → PropertyFeatureManager
```

**Sub-nav actual:** Datos generales | Publicaciones | Características | Imágenes  
**Ausente:** Ubicación dedicada, SEO, vista resumen unificada.

---

## Problemas detectados

### Listado (`/propiedades`)

| # | Problema | Código / evidencia |
| - | -------- | ---------------- |
| L1 | Solo 5 columnas básicas; sin estado comercial | `property-table.tsx` — badge solo active/archived |
| L2 | Sin búsqueda por título, slug, código interno | `listProperties()` sin query de texto |
| L3 | Sin filtros UI (`isActive`, tipo, ciudad, estado publicación) | API soporta `?isActive=` pero UI no lo usa |
| L4 | Sin paginación | Carga array completo |
| L5 | Sin thumbnail de portada | No carga images en listado |
| L6 | Sin acciones rápidas inline (ver web, duplicar, publicaciones) | Solo Editar + Archivar |
| L7 | Contador al pie en Card separado | UX redundante; debería integrarse en header de tabla |
| L8 | Archivar sin opción de restaurar desde listado | Restaurar solo en form edit |

### Detalle (`/propiedades/[id]`)

| # | Problema | Código / evidencia |
| - | -------- | ---------------- |
| D1 | Panel publicabilidad + formulario largo en misma página | Scroll excesivo; checklist compite con edición |
| D2 | Tab «Datos generales» contiene ubicación + ficha técnica + descripción | `property-form.tsx` — todo en una tab |
| D3 | Header muestra badge pero sin resumen comercial compacto | Sin precio principal, sin count imágenes |
| D4 | Acciones globales limitadas: badge + «Volver al listado» | Sin «Ver en web», «Archivar», «Duplicar» |
| D5 | Sin indicador de progreso de completitud (%) | Solo checklist binario por listing |
| D6 | Slug editable sin warning si publicada | Riesgo SEO |

### Publicaciones

| # | Problema |
| - | -------- |
| P1 | Tabla rica (7 columnas) pero sin filtro por estado/tipo |
| P2 | «Archivar» listing = CLOSED; terminología confusa |
| P3 | Activar listing no muestra checklist previo inline |
| P4 | Sin atajo visual «completar para publicar» desde fila |
| P5 | Precios en ruta profunda sin sub-nav listing |

### Características

| # | Problema |
| - | -------- |
| C1 | Dos botones Guardar; feedback visual distinto al resto del admin |
| C2 | No contribuye al checklist de publicación (solo informativo) |
| C3 | Sin contador «X de Y seleccionadas» prominente |

### Imágenes

| # | Problema |
| - | -------- |
| I1 | Ingreso manual `storageKey` — fricción crítica |
| I2 | Sin drag & drop upload ni reorder visual |
| I3 | Sin indicador «mínimo recomendado 3 fotos» |
| I4 | Grid funcional pero sin vista «cover hero» destacada arriba |

---

## Propuesta UX — Listado v2

### Wireframe textual

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Propiedades                                          [+ Nueva propiedad]    │
│ Inicio › Propiedades                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Buscar por título, código o ciudad...          ]                        │
│                                                                             │
│ Filtros: [Todas ▼] [Estado ▼] [Tipo ▼] [Operación ▼] [Ciudad ▼]  Limpiar  │
│                                                                             │
│ ┌────┬────────────────────┬──────┬──────────┬────────────┬───────────────┐ │
│ │ 📷 │ Propiedad          │ Tipo │ Ubicación│ Estado     │ Acciones      │ │
│ ├────┼────────────────────┼──────┼──────────┼────────────┼───────────────┤ │
│ │ ▢  │ Casa en Belgrano   │ Casa │ Belgrano │ Publicada  │ ⋮             │ │
│ │    │ REF-001            │      │ CABA     │ Venta · $  │               │ │
│ ├────┼────────────────────┼──────┼──────────┼────────────┼───────────────┤ │
│ │ ▢  │ Depto Palermo      │ Depto│ Palermo  │ Borrador   │ ⋮             │ │
│ │    │                    │      │ CABA     │ comercial  │               │ │
│ └────┴────────────────────┴──────┴──────────┴────────────┴───────────────┘ │
│                                                                             │
│ Mostrando 1-20 de 42                              [← 1 2 3 →]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Columnas propuestas

| Columna | Contenido | Fuente |
| ------- | --------- | ------ |
| Thumbnail | Cover image 48×48 o placeholder | `PropertyImage.isCover` |
| Propiedad | Título (link) + `internalCode` | `Property` |
| Tipo | Label `propertyType` | Existente |
| Ubicación | `neighborhood, city` | Existente |
| Estado | Badge compuesto | Derivado publishability |
| Operación / Precio | Tipo listing activo + monto primary | Listing + Price |
| Acciones | Menú ⋮ | Nuevo `PropertyRowActions` |

### Badges de estado (listado)

Reutilizar `PropertyStatusBadge` con variantes ya definidas:

| Badge | Condición |
| ----- | --------- |
| Publicada | `resolvePropertyStatusVariant` → `published` |
| Borrador comercial | `commercial-draft` |
| Archivada | `!isActive` |

**Sub-badge opcional:** tipo operación activa (Venta / Alquiler).

### Filtros

| Filtro | Query param | API hoy | API necesaria |
| ------ | ----------- | ------- | ------------- |
| Estado property | `isActive` | ✅ | — |
| Estado comercial | `publishStatus` | ❌ | Agregar o filtrar client-side v1 |
| Tipo property | `propertyType` | ⚠️ parcial | Extender `ListPropertiesQueryDto` |
| Operación | `listingType` + `listingStatus` | ❌ | Join listing |
| Ciudad | `city` | ⚠️ índice existe | Query param |
| Búsqueda texto | `q` | ❌ | `title`, `internalCode`, `slug` ILIKE |

**Sync URL:** filtros en query string (patrón ya usado en `apps/web`).

### Acciones rápidas por fila

| Acción | Condición |
| ------ | --------- |
| Editar | Siempre |
| Publicaciones | Siempre |
| Imágenes | Siempre |
| Ver en web | Si `isPublishable` |
| Archivar / Restaurar | Según `isActive` |
| Duplicar | Fase 2 |

---

## Propuesta UX — Detalle v2

### Navegación futura (tabs)

```txt
┌──────────────────────────────────────────────────────────────────────────┐
│ Casa en Belgrano                              [Publicada] [Ver web ↗] [⋮] │
│ Inicio › Propiedades › Casa en Belgrano                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ [Resumen] [Datos] [Ubicación] [Características] [Imágenes] [Publicaciones] [SEO] │
└──────────────────────────────────────────────────────────────────────────┘
```

**Fase de tabs:**

| Tab | Fase | Contenido |
| --- | ---- | --------- |
| Resumen | 2 | KPIs property, checklist, acciones siguientes |
| Datos | 1 | Identificación + ficha técnica + descripción (split del form actual) |
| Ubicación | 2 | Campos geo separados + mapa placeholder |
| Características | ✅ existe | Sin cambios mayores |
| Imágenes | 1 | Upload + galería |
| Publicaciones | ✅ existe | Tabla listings embebida o link |
| SEO | 3 | Ver `property-seo-tab.md` |

### Header de detalle

| Elemento | Descripción |
| -------- | ----------- |
| Título | `property.title` |
| Badge estado | `PropertyStatusBadge` |
| Meta línea | `{propertyType} · {city} · {internalCode}` |
| Acciones globales | Ver web, Archivar, menú más acciones |
| Barra progreso | % checklist hard rules (opcional Fase 2) |

### Tab Resumen (nuevo — recomendado)

Consolidar lo que hoy está fragmentado:

* `PropertyPublishabilityPanel` (promovido, sticky o top)
* Cards mini: imágenes (N), publicaciones (N activas), características (N)
* «Próximo paso» CTA dinámico (estilo Airbnb): «Agregá una imagen portada →»

Mover `PropertyForm` completo fuera de esta vista → tabs Datos + Ubicación.

---

## Quick wins (Fase 1 — 1-2 sprints)

| # | Mejora | Archivos afectados | Esfuerzo |
| - | ------ | ------------------ | -------- |
| QW1 | Badge `published` / `commercial-draft` en listado | `property-table.tsx`, cargar publishability batch o endpoint | M |
| QW2 | Filtro `isActive` con tabs «Activas / Archivadas / Todas» | `propiedades/page.tsx` | S |
| QW3 | Búsqueda client-side por título/código (pre-paginación) | `PropertyTable` | S |
| QW4 | Acción «Ver en web» en fila si publicable | `property-table.tsx` | S |
| QW5 | Mover checklist arriba; colapsar form en accordion | `[id]/page.tsx` | S |
| QW6 | Restaurar propiedad desde listado (no solo form) | `property-table.tsx` + action | S |
| QW7 | Unificar feedback en `PropertyFeatureManager` (un solo Guardar sticky) | `property-feature-manager.tsx` | S |
| QW8 | Warning al editar slug si `isAnyPublishable` | `property-form.tsx` | S |
| QW9 | Renombrar «Archivar» listing → «Cerrar publicación» | `property-listing-table.tsx` | S |
| QW10 | `loading.tsx` + skeleton en todas las rutas property | Nuevos archivos | M |

---

## Mejoras mediano plazo (Fase 2-3)

| # | Mejora | Dependencias |
| - | ------ | ------------ |
| M1 | Tab Resumen + split form (Datos / Ubicación) | Reestructurar rutas o tabs |
| M2 | Paginación server-side + filtros API | Backend query DTO |
| M3 | Thumbnail column con cover URL | List DTO enriquecido |
| M4 | `DataTable` compartida con sort | `@repo/ui` o admin shared |
| M5 | Sub-nav listing (Datos | Precios) en edición publicación | `ListingSubNav` |
| M6 | Upload drag & drop + reorder galería | Storage API en branch |
| M7 | Menú acciones ⋮ por fila | `PropertyRowActions` |
| M8 | Endpoint `GET /properties?include=publishability` | Backend |
| M9 | Vista card responsive en mobile | CSS + breakpoint |
| M10 | Duplicar propiedad (copy con nuevo slug) | Nueva action + API |

---

## Componentes nuevos sugeridos

| Componente | Ubicación | Prioridad |
| ---------- | --------- | --------- |
| `PropertyListFilters` | `components/property/` | P0 |
| `PropertyRowActions` | `components/property/` | P1 |
| `PropertyListStatusBadge` | wrapper publishability para listado | P0 |
| `PropertySummaryCards` | tab Resumen | P2 |
| `PropertyFormSections` | split de `PropertyForm` | P2 |
| `ListingSubNav` | publicaciones/[id]/* | P2 |
| `DataTable` | `components/shared/` | P1 |

---

## Impacto esperado

| Métrica | Antes | Después v2 |
| ------- | ----- | ---------- |
| Tiempo encontrar propiedad | Scroll lista completa | Búsqueda + filtros < 3s |
| Comprensión estado comercial | Abrir detalle | Visible en listado |
| Clics hasta publicar | 5-8 | 3-4 con resumen + CTAs |
| Errores publicación (sin portada) | Alta (activación permitida) | Baja (checklist + gate) |

---

## Criterios de aceptación v2

1. Listado muestra estado Publicada / Borrador comercial / Archivada.
2. Filtros por estado activo y búsqueda por título funcionan con URL sync.
3. Detalle tiene header con acciones globales incluyendo «Ver en web».
4. Checklist de publicación visible sin scroll en viewport desktop estándar.
5. Formulario dividido en al menos 2 secciones navegables (Datos + Ubicación) o tabs.
6. Galería con upload sin ingreso manual de `storageKey`.

---

## Relación con otros documentos

| Documento | Conexión |
| --------- | -------- |
| `dashboard-home-v1.md` | KPIs y filtros comparten definiciones de «publicada» |
| `property-publication-checklist.md` | Gate de activación y checklist UI |
| `property-seo-tab.md` | Nueva tab en sub-nav |
| `admin-property-ux-roadmap.md` | Fases de implementación |
