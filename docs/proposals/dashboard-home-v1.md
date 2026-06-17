# Propuesta — Dashboard Home v1 (`/dashboard` o `/`)

Versión: 1.0  
Fecha: 2026-06-17  
Branch: `feature/admin-property-ux`  
Estado: Propuesta — sin implementación.

Referencias:

* `docs/audits/admin-property-ux-audit.md`
* `docs/07-admin/admin-nav.md`

---

## Objetivo

Transformar `/` de placeholder a **centro de operaciones inmobiliario**: visión rápida del inventario, momentum de publicación y accesos directos al trabajo diario.

Inspiración conceptual (no copia literal):

* **Airbnb Host Dashboard** — progreso de listing, checklist, acciones siguientes.
* **Zillow Pro** — KPIs de inventario, propiedades activas vs borrador.
* **CRM inmobiliarios** — actividad reciente, CTAs prominentes.

---

## Estado actual

```tsx
// apps/admin/app/(dashboard)/page.tsx
<PlaceholderPanel
  title="Inicio"
  description="Resumen operativo... se implementará en fases posteriores."
/>
```

**API disponible hoy:** no existe endpoint de stats/KPIs. Solo CRUD granular:

* `GET /properties`
* `GET /property-listings?propertyId=`
* Sin agregaciones ni feed de actividad.

**Implicación:** v1 del dashboard requiere **nuevo endpoint de agregación** o carga client-side costosa (no recomendada).

---

## Wireframe textual

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Inicio                                                                      │
│ Bienvenido, {nombre} · {nombre inmobiliaria}                    [Ver sitio] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │    42    │ │    18    │ │    12    │ │     8    │ │     3    │        │
│  │Propiedades│ │Publicadas│ │ En Venta │ │En Alquiler│ │Destacadas│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Acciones rápidas             │  │ Publicación pendiente            │  │
│  │                              │  │                                  │  │
│  │ [+ Nueva propiedad]          │  │ 5 propiedades sin portada    →  │  │
│  │ [+ Nueva publicación]        │  │ 3 listings en borrador       →  │  │
│  │ [Ver sitio web ↗]            │  │ 2 sin precio principal       →  │  │
│  │                              │  │                                  │  │
│  └──────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Actividad reciente                                                  │   │
│  │                                                                     │   │
│  │ ● Casa en Belgrano — imagen agregada              hace 2 h    [Ver]  │   │
│  │ ● Depto Palermo — publicación activada (Venta)    hace 5 h    [Ver]  │   │
│  │ ● PH San Isidro — precio actualizado              ayer        [Ver]  │   │
│  │ ● Loft Puerto Madero — propiedad creada           ayer        [Ver]  │   │
│  │                                                                     │   │
│  │                              [Ver todas las propiedades →]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Distribución de bloques (desktop)

| Zona | Grid | Contenido |
| ---- | ---- | --------- |
| Header | Full width | Título + saludo + link externo web |
| KPI row | 5 columnas (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) | Cards métricas |
| Middle row | 1/3 + 2/3 | Acciones rápidas + Alertas publicación |
| Bottom | Full width | Feed actividad reciente |

### Mobile

* KPIs: carrusel horizontal o grid 2×3.
* Acciones rápidas: stack vertical, botones full-width.
* Actividad: lista compacta.

---

## Bloques detallados

### 1. Cards KPI

| KPI | Definición | Fuente de datos |
| --- | ---------- | --------------- |
| **Propiedades** | Count `Property` con `isActive = true` | Agregación tenant |
| **Publicadas** | Properties con al menos 1 listing que cumple regla publicación completa (4 checks) | Lógica `publishability.ts` o endpoint |
| **En Venta** | Listings `ACTIVE` + `listingType = SALE` | `PropertyListing` |
| **En Alquiler** | Listings `ACTIVE` + `listingType IN (RENT, TEMPORARY_RENT)` | `PropertyListing` |
| **Destacadas** | Listings `ACTIVE` + `isFeatured = true` | `PropertyListing` |

**Visual:** reutilizar `@repo/ui/card` con número grande (`text-3xl font-bold`), label `text-sm text-muted`, opcional trend «+3 esta semana» (fase 2).

**Interacción:** click en card → listado pre-filtrado:

* Publicadas → `/propiedades?publishStatus=published`
* En Venta → `/propiedades?listingType=SALE&listingStatus=ACTIVE`

### 2. Actividad reciente

Eventos a mostrar (orden `updatedAt desc`, máx. 10):

| Tipo evento | Detección | Copy UI |
| ----------- | --------- | ------- |
| Propiedad creada | `Property.createdAt ≈ updatedAt` | «{título} — propiedad creada» |
| Publicación activada | `PropertyListing.status → ACTIVE` + `publishedAt` reciente | «{título} — publicación activada ({tipo})» |
| Precio actualizado | `PropertyPrice.updatedAt` | «{título} — precio actualizado» |
| Imagen agregada | `PropertyImage.createdAt` | «{título} — imagen agregada» |

**Limitación v1:** sin tabla `ActivityLog`. Opciones:

| Opción | Pros | Contras |
| ------ | ---- | ------- |
| A) Query union en endpoint stats | Sin migración | Heurística imperfecta |
| B) Tabla `AdminActivity` futura | Preciso | Migración + scope |

**Recomendación v1:** Opción A en endpoint `GET /admin/dashboard/summary`; migrar a B en Fase 4.

### 3. Acciones rápidas

| Acción | Destino | Componente |
| ------ | ------- | ---------- |
| Nueva propiedad | `/propiedades/crear` | `Button` primary |
| Nueva publicación | `/propiedades?action=new-listing` o modal selector property | `Button` secondary — requiere picker |
| Ver sitio web | `{PUBLIC_WEB_URL}` nueva pestaña | `Button` outline + icono external |

**Nota UX:** «Nueva publicación» necesita contexto de property. Patrones:

1. Modal con buscador de propiedades recientes (recomendado).
2. Redirect a listado con CTA destacado.

### 4. Bloque «Publicación pendiente» (diferenciador)

Lista de **blockers agregados** (estilo Airbnb listing progress):

* X propiedades sin imagen portada
* Y listings en DRAFT con precio pero sin activar
* Z propiedades activas sin ningún listing ACTIVE

Cada ítem linkea al listado filtrado o a la primera property afectada.

---

## Reutilización de componentes existentes

| Componente existente | Uso en dashboard |
| -------------------- | ---------------- |
| `PageShell` | Wrapper con título «Inicio» (sin breadcrumb, per doc) |
| `@repo/ui/card` | KPI cards, bloques de contenido |
| `@repo/ui/button` | Acciones rápidas |
| `PropertyStatusBadge` | En feed si aplica |
| `PropertyEmptyState` | SUPER_ADMIN sin tenant |
| `ApiErrorPanel` | Fallo de carga stats |
| `PlaceholderPanel` | **Reemplazar** — no reutilizar en producción |

### Nuevos componentes sugeridos

| Componente | Responsabilidad | Prioridad |
| ---------- | --------------- | --------- |
| `DashboardKpiGrid` | Grid de 5 métricas | P0 |
| `DashboardKpiCard` | Card individual con valor + label + link | P0 |
| `DashboardQuickActions` | Columna de CTAs | P0 |
| `DashboardActivityFeed` | Lista temporal de eventos | P1 |
| `DashboardPublishAlerts` | Blockers de publicación | P1 |
| `PropertyPickerModal` | Selector para «Nueva publicación» | P1 |
| `DashboardPageShell` | Variante de PageShell sin breadcrumb + saludo | P2 |

**Ubicación sugerida:** `apps/admin/components/dashboard/`

---

## Backend necesario (nuevo)

### Endpoint propuesto

```txt
GET /admin/dashboard/summary
Authorization: JWT + TenantGuard
```

**Response DTO:**

```ts
type DashboardSummary = {
  kpis: {
    totalProperties: number;
    publishedProperties: number;
    activeSaleListings: number;
    activeRentListings: number;
    featuredListings: number;
  };
  publishAlerts: {
    withoutCover: number;
    draftListingsWithPrice: number;
    activeWithoutListing: number;
  };
  recentActivity: Array<{
    type: "property_created" | "listing_activated" | "price_updated" | "image_added";
    propertyId: string;
    propertyTitle: string;
    listingType?: PropertyListingType;
    occurredAt: string;
    href: string; // ruta admin sugerida
  }>;
};
```

**Complejidad:** Media. Una query Prisma agregada + subqueries. Reutilizar lógica de publicabilidad del Public API (extraer a shared service).

---

## Prioridad de implementación

| Orden | Entregable | Complejidad | Impacto | Dependencias |
| ----- | ---------- | ----------- | ------- | ------------ |
| 1 | Endpoint `GET /admin/dashboard/summary` | M | Alto | TenantGuard |
| 2 | `DashboardKpiGrid` + reemplazar placeholder `/` | S | Alto | #1 |
| 3 | Acciones rápidas (Nueva propiedad + Ver web) | S | Alto | `PUBLIC_WEB_URL` |
| 4 | Bloque publish alerts | M | Alto | #1, lógica publishability |
| 5 | `PropertyPickerModal` + Nueva publicación | M | Medio | Listado properties |
| 6 | Activity feed | M | Medio | #1 |
| 7 | KPIs clickeables con filtros en listado | M | Medio | Filtros en `/propiedades` |
| 8 | Trends semanales | L | Bajo | Histórico / snapshots |

**Quick win inmediato (sin backend):** reemplazar placeholder con KPIs estáticos desde `listProperties()` + conteo client-side — útil solo para demo, no producción.

---

## Criterios de aceptación v1

1. `/` muestra 5 KPIs reales del tenant activo.
2. SUPER_ADMIN sin tenant ve `PropertyEmptyState` guiado, no error API.
3. «Nueva propiedad» navega a `/propiedades/crear`.
4. «Ver sitio web» abre URL pública configurada.
5. Al menos 3 ítems de actividad reciente o empty state explícito.
6. Carga en < 500ms con endpoint agregado (un solo round-trip admin → API).

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| N+1 si se calcula publishability por property en dashboard | Agregación SQL / endpoint dedicado |
| Activity feed impreciso sin audit log | Documentar como «aproximado» en v1 |
| «Nueva publicación» sin contexto confunde | Modal picker obligatorio |
