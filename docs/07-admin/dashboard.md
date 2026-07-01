# Dashboard operativo (Admin)

Versión: v1 (Fase 3)

Estado: ✅ implementado en `apps/admin` + `GET /admin/dashboard/summary`

Referencias:

* `docs/07-admin/admin-modules.md`
* `docs/07-admin/admin-nav.md`
* `PROJECT_STATE.md`

---

## Objetivo

Convertir `/` en el centro de trabajo diario de la inmobiliaria.

El operador debe responder en **menos de 5 segundos**:

| Pregunta | Fuente en UI |
| -------- | ------------ |
| ¿Cuántas propiedades tengo? | KPI **Propiedades** |
| ¿Cuántas están publicadas? | KPI **Publicadas** |
| ¿Cuántas necesitan atención? | Sección **Requieren atención** + KPI **Borradores** |
| ¿Qué hice recientemente? | **Actividad reciente** |
| ¿Qué debería hacer ahora? | **Acciones rápidas** + alertas clicables |

---

## Auditoría del dashboard anterior

| Elemento previo | Evaluación | Decisión Fase 3 |
| --------------- | ---------- | --------------- |
| Mensaje «Bienvenido, {nombre}» | Contexto mínimo | Mantener saludo breve integrado al resumen |
| KPI «Propiedades activas» | Útil pero ambiguo | Reemplazado por **Propiedades** (total inventario) |
| KPI «Publicadas en web» | Útil | Mantener como **Publicadas** |
| KPI «Publicaciones activas · venta/alquiler/destacadas» | Métricas de listing, no de propiedad | **Eliminados** del dashboard principal |
| Alertas «sin portada / borrador con precio / sin publicación activa» | Parcialmente útil | Reemplazados por alertas orientadas a propiedad |
| Acciones rápidas con botones full-width | Funcional pero pesado | Rediseñadas como chips compactos |
| Actividad reciente | **No existía** | **Agregada** (inferida de timestamps) |
| Estado del catálogo | **No existía** | **Agregado** (5 métricas de completitud) |
| Navegación desde KPIs | Parcial (solo 2 KPIs) | **Todos** los KPIs y alertas son clicables |

---

## Estructura visual

```txt
/  (Inicio)
├── Fila 1 — KPIs principales
│     Propiedades · Publicadas · Borradores · Archivadas
├── Fila 2 — Estado del catálogo
│     Sin imágenes · Sin comercialización · Sin descripción
│     Sin características · Pendientes de publicación
├── Fila 3 — Atención + Actividad (grid 2 columnas en desktop)
│     Requieren atención          Actividad reciente
├── Fila 4 — Acciones rápidas
│     Nueva propiedad · Ver borradores · Pendientes · Ver sitio
└── [Futuro] Métricas CRM / Analytics (slot documentado, no implementado)
```

---

## Widgets

### KPIs principales

| Widget | Métrica | Destino al click |
| ------ | ------- | ---------------- |
| Propiedades | Total inventario tenant | `/propiedades` |
| Publicadas | Activas publicables en web | `/propiedades?estado=published` |
| Borradores | Activas sin publicar | `/propiedades?estado=commercial-draft` |
| Archivadas | `isActive = false` | `/propiedades?estado=archived` |

### Estado del catálogo

Solo propiedades **activas**. Cada card enlaza a `/propiedades?atencion={filtro}`.

| Filtro `atencion` | Criterio |
| ----------------- | -------- |
| `without-images` | Sin imágenes |
| `without-commercialization` | Sin ningún listing |
| `without-description` | Descripción vacía o &lt; 40 caracteres |
| `without-features` | Sin asignaciones de características |
| `pending-publication` | Con listings pero ninguno publicable |

### Requieren atención

Alertas con contador y link al listado filtrado. Solo se muestran si count &gt; 0.

| Alerta | Filtro |
| ------ | ------ |
| Sin imágenes | `without-images` |
| Sin precio | `without-price` (listing ACTIVE sin precio principal) |
| Sin descripción | `without-description` |
| Sin comercialización | `without-commercialization` |
| Archivadas recientemente | `recently-archived` (últimos 30 días) |

### Actividad reciente

Implementación **v1 simple** — sin tabla de auditoría.

Eventos inferidos de:

* `Property.createdAt` / `updatedAt`
* `PropertyListing.createdAt` / `publishedAt`
* `PropertyImage.createdAt`
* `Property.isActive = false` + `updatedAt` reciente

Tipos: `property_created`, `property_updated`, `listing_published`, `listing_created`, `images_added`, `property_archived`.

Actor: nombre del creador de la propiedad cuando está disponible (`createdBy.name`).

Diseñado para reemplazarse por un feed de auditoría real en el futuro.

### Acciones rápidas

Chips compactos (no botones full-width):

* Nueva propiedad → `/propiedades/crear`
* Ver borradores → listado filtrado
* Propiedades pendientes → `atencion=pending-publication`
* Ver sitio web → URL pública (env)

---

## API

**Endpoint:** `GET /admin/dashboard/summary`

**Auth:** JWT + TenantGuard

**Carga centralizada** (sin N+1):

1. `Property.findManyWithCreator(tenantId)`
2. En paralelo: listings, image stats, images, feature counts
3. Precios principales por listing
4. Builder puro `operational-dashboard.builder.ts` calcula KPIs, alertas, filterSets y actividad

Respuesta incluye `filterSets` con IDs de propiedad por filtro de atención para el listado admin.

---

## Componentes (`apps/admin`)

| Componente | Rol |
| ---------- | --- |
| `DashboardKpiGrid` | Fila 1 |
| `DashboardCatalogHealthGrid` | Fila 2 |
| `DashboardAttentionAlertsPanel` | Alertas |
| `DashboardRecentActivity` | Cronología |
| `DashboardQuickActions` | Atajos |
| `DashboardMetricCard` | Card métrica reutilizable |
| `DashboardHomeSkeleton` | Loading state |

---

## Responsive

| Breakpoint | Comportamiento |
| ---------- | -------------- |
| Mobile | KPIs 2 columnas; catálogo 2 columnas; atención y actividad apilados |
| Tablet | Igual jerarquía, más aire horizontal |
| Desktop | KPIs 4 columnas; catálogo 5 columnas; atención + actividad en 2 columnas |

---

## Extensiones futuras (preparado, no implementado)

Debajo de **Acciones rápidas** se reserva espacio para:

* Leads / consultas
* Visitas / analytics
* Agentes / contratos

Sin cambiar la estructura de filas 1–4.

---

## Decisiones UX

1. **Priorizar propiedad sobre listing** en KPIs — el operador piensa en inventario, no en contadores de venta/alquiler sueltos.
2. **Un solo request** al abrir el dashboard — performance y simplicidad.
3. **Filter sets en la respuesta** — evita recalcular filtros de atención en el listado; el listado solo consume IDs cuando llega desde `?atencion=`.
4. **Actividad inferida** — entrega valor hoy sin migraciones; claramente documentada como reemplazable.
