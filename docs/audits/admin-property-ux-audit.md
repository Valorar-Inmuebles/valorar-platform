# Auditoría UX — Admin Property (`apps/admin`)

Versión: 1.0  
Fecha: 2026-06-17  
Branch auditado: `feature/admin-property-ux`  
Alcance: análisis del estado real del panel administrativo antes de implementar mejoras UX.

Referencias:

* `docs/07-admin/admin-modules.md`
* `docs/07-admin/admin-nav.md`
* `PROJECT_STATE.md`

---

## Resumen ejecutivo

El admin tiene una **base sólida de shell y CRUD** para el dominio Property: layout consistente, navegación declarativa, sub-nav contextual y flujo comercial end-to-end funcional. El módulo está en fase **MVP operativo**, no producto comercializable.

**Fortalezas:** arquitectura de páginas clara (`PageShell` → `PropertyPageShell`), panel de publicabilidad alineado con Public API, badges y toasts coherentes, auth v1 con sesión JWT.

**Debilidades críticas:** dashboard vacío, listado sin filtros ni estados derivados, formulario monolítico en una sola tab, imágenes con metadata manual (sin upload en UI), documentación desactualizada respecto al código, RBAC solo en sidebar (sin guards de ruta), y patrones visuales inconsistentes entre módulos.

**Nota sobre contexto del sprint:** el contexto de trabajo menciona Storage R2 + upload completado. En el código de este branch, **no existe** el módulo `storage` en `apps/api/src/modules/` ni integración de upload en `PropertyImageManager`. El admin sigue pidiendo `storageKey` manual. Esta auditoría refleja el **código en disco**, no trabajo pendiente de merge.

---

## 1. Estructura del dashboard

### 1.1 Árbol de rutas implementado

```txt
apps/admin/app/
├── layout.tsx                          # Root: Geist, globals.css, AdminProviders (Toast)
├── middleware.ts                       # Cookie JWT → redirect /login
│
├── (auth)/
│   ├── layout.tsx                      # Centrado, sin sidebar
│   └── login/page.tsx                  # ✅ LoginForm
│
├── (dashboard)/
│   ├── layout.tsx                      # getSession() + MainLayout
│   ├── page.tsx                        # ⏳ PlaceholderPanel
│   │
│   ├── propiedades/
│   │   ├── page.tsx                    # ✅ Listado
│   │   ├── loading.tsx                 # Loading básico
│   │   ├── crear/page.tsx              # ✅ Alta
│   │   └── [id]/
│   │       ├── page.tsx                # ✅ Edición + publicabilidad
│   │       ├── not-found.tsx           # Card bare (sin shell)
│   │       ├── publicaciones/          # ✅ CRUD listings + precios
│   │       ├── imagenes/page.tsx       # ✅ Galería metadata
│   │       └── caracteristicas/        # ✅ Features (no documentado en admin-nav v1)
│   │           ├── page.tsx
│   │           └── loading.tsx
│   │
│   └── configuracion/
│       ├── page.tsx                    # ⏳ Hub placeholder
│       ├── usuarios/page.tsx           # ⏳ Placeholder
│       ├── inmobiliaria/page.tsx       # ⏳ Placeholder
│       └── tenants/page.tsx            # ⏳ Placeholder
│
└── api/auth/                           # login, logout, active-tenant
```

**18 rutas de dashboard** implementadas; **1 operativa** (Propiedades y sub-árbol), **5 placeholders** (inicio + configuración).

### 1.2 Cadena de layout

| Capa | Archivo | Responsabilidad |
| ---- | ------- | --------------- |
| Root | `app/layout.tsx` | Fuentes, CSS tokens, `AdminProviders` |
| Dashboard | `app/(dashboard)/layout.tsx` | Guard de sesión server-side, `MainLayout` |
| Shell | `components/layout/MainLayout.tsx` | `SidebarProvider` + sidebar + header sticky + `<main>` |
| Página | `PageShell` / `PropertyPageShell` | `PageHeader` + sub-nav opcional + contenido |

Padding del contenido: `px-4 py-5 sm:px-6 lg:px-8 lg:py-8`.  
**No hay** `layout.tsx` anidado bajo `propiedades/[id]/`; los tabs se inyectan por página vía `PropertySubNav`.

### 1.3 Protección de acceso

| Capa | Mecanismo | Estado |
| ---- | --------- | ------ |
| Middleware | Cookie `access_token` → redirect `/login?next=` | ✅ |
| Dashboard layout | `getSession()` → redirect si null | ✅ |
| RBAC por ruta | Guard en páginas de configuración | ❌ |
| RBAC sidebar | `isNavItemVisible()` en `nav-config.ts` | ✅ |

---

## 2. Pantallas existentes

### 2.1 Inventario funcional

| Ruta | Shell | Componentes principales | Estado |
| ---- | ----- | ----------------------- | ------ |
| `/` | — | `PlaceholderPanel` | ⏳ Vacío |
| `/login` | Auth layout | `LoginForm` | ✅ |
| `/propiedades` | `PageShell` | `PropertyTable`, `PropertyEmptyState` | ✅ MVP |
| `/propiedades/crear` | `PageShell` | `PropertyForm` (create) | ✅ |
| `/propiedades/[id]` | `PropertyPageShell` | `PropertyPublishabilityPanel`, `PropertyForm` (edit), `PropertyStatusBadge` | ✅ |
| `/propiedades/[id]/publicaciones` | `PropertyPageShell` | `PropertyListingTable`, publishability badges | ✅ |
| `/propiedades/[id]/publicaciones/crear` | `PropertyPageShell` | `PropertyListingForm` | ✅ |
| `/propiedades/[id]/publicaciones/[listingId]` | `PropertyPageShell` | `PropertyListingForm` (edit + transiciones estado) | ✅ |
| `/propiedades/[id]/publicaciones/[listingId]/precios` | `PropertyPageShell` | `PropertyPriceManager` | ✅ |
| `/propiedades/[id]/imagenes` | `PropertyPageShell` | `PropertyImageManager`, `PropertyImageGrid` | ⚠️ Metadata manual |
| `/propiedades/[id]/caracteristicas` | `PropertyPageShell` | `PropertyFeatureManager` | ✅ (fuera de doc nav) |
| `/configuracion/*` | Mixto | `PlaceholderPanel` | ⏳ |

### 2.2 Flujo de datos

Toda operación admin pasa por **NestJS API** (`apps/api`) con cookie JWT reenviada. Sin acceso directo a Prisma desde el admin.

Patrón dominante:

1. Server Component carga datos (`listProperties`, `getProperty`, etc.).
2. Mutaciones vía **Server Actions** (`*-actions.ts`) + `router.refresh()`.
3. Feedback con **Toast** (`@repo/ui/toast`).

Excepción costosa: `loadPropertyPublishabilityContext()` hace **4+ requests HTTP** por página de detalle/publicaciones (property + listings + images + N price lists).

---

## 3. Navegación

### 3.1 Sidebar (`nav-config.ts` + `MainSidebar.tsx`)

| Sección | Ítems | Acceso |
| ------- | ----- | ------ |
| General | Inicio → `/` | Todos |
| Inmobiliaria | Propiedades → `/propiedades` | Todos |
| Configuración | Usuarios, Inmobiliaria, Tenants | Por rol / `superAdminOnly` |
| Cuenta | Cerrar sesión (action) | Todos |

**Comportamiento:**

* Expandido `220px` / colapsado `w-14` (56px).
* Mobile: drawer overlay + scroll lock (`sidebar-context.tsx`).
* Activo: barra azul + `bg-sidebar-accent`.
* Matching: `matchNavPath()` — `/propiedades/**` mantiene «Propiedades» activo.

**Gaps vs `admin-nav.md`:**

* Sin flyout popover en sidebar colapsado.
* Sin persistencia de estado colapsado (session storage).
* `TenantSwitcher` oculto en viewports `< lg` (`hidden max-w-[220px] lg:block`).
* Sin menú de usuario en header (solo avatar estático + logout en sidebar).
* Tab **Características** implementada pero no documentada en nav v1.

### 3.2 Sub-nav de propiedad (`PropertySubNav`)

| Tab | Ruta | Activo cuando |
| --- | ---- | ------------- |
| Datos generales | `/propiedades/[id]` | pathname exacto al id |
| Publicaciones | `…/publicaciones` | pathname incluye `/publicaciones` |
| Características | `…/caracteristicas` | pathname incluye `/caracteristicas` |
| Imágenes | `…/imagenes` | pathname incluye `/imagenes` |

Estilo: tabs con underline (`border-b-2 border-primary`).  
**No existe** tab SEO, Ubicación separada, ni sub-nav a nivel listing (precios dependen solo de breadcrumb).

### 3.3 Breadcrumbs (`lib/property/breadcrumbs.ts` + `PageHeader`)

* Primer ítem siempre «Inicio» → `/`.
* Títulos dinámicos de property y tipo de listing.
* Profundidad máxima: 5 niveles (precios).
* **Deuda:** `DEMO_PROPERTY_ID`, `getMockPropertyTitle()` aún presentes.
* Sin prop `back={true}` en `PageHeader` (documentado pero no implementado).

---

## 4. Componentes reutilizables

### 4.1 Layout (`components/layout/`)

| Componente | Uso |
| ---------- | --- |
| `MainLayout` | Wrapper dashboard |
| `MainSidebar` | Nav filtrada por rol |
| `MainHeader` | Toggle sidebar + user + `TenantSwitcher` |
| `PageHeader` | Título, descripción, breadcrumbs, slot acciones |
| `TenantSwitcher` | Input CUID raw para SUPER_ADMIN |
| `SidebarProvider` / `useSidebar` | Colapso + mobile drawer |
| `NavIcon` / `icons.tsx` | Mapa SVG por `iconId` |
| `nav-config.ts` | Datos + `isNavItemVisible()` |

### 4.2 Shared (`components/shared/`)

| Componente | Uso |
| ---------- | --- |
| `PageShell` | Patrón estándar de página |
| `PlaceholderPanel` | «Próximamente» para módulos vacíos |
| `ApiErrorPanel` | Error API en Card roja |

**Ausentes y necesarios para producto:**

* `DataTable` compartida (3 tablas copy-paste).
* `EmptyState` genérico (solo `PropertyEmptyState` existe).
* `Skeleton` / loading states.
* `Textarea` en `@repo/ui` (form usa clases raw zinc/indigo).

### 4.3 Property (`components/property/` — 19 componentes)

| Grupo | Componentes |
| ----- | ----------- |
| Shell / nav | `PropertyPageShell`, `PropertySubNav` |
| Listados | `PropertyTable`, `PropertyListingTable`, `PropertyPriceTable` |
| Formularios | `PropertyForm`, `PropertyListingForm`, `PropertyPriceForm`, `PropertyImageForm` |
| Gestores | `PropertyPriceManager`, `PropertyImageManager`, `PropertyFeatureManager` |
| Galería | `PropertyImageGrid` |
| Publicación | `PropertyPublishabilityPanel` |
| Estados | `PropertyStatusBadge`, `PropertyListingStatusBadge`, `PropertyEmptyState` |

### 4.4 Primitivos `@repo/ui` en uso

`button`, `card`, `badge`, `input`, `select`, `form-field`, `modal` (`ConfirmModal`), `side-panel`, `toast`.

---

## 5. Tablas

Tres implementaciones **hand-rolled** con el mismo patrón:

```txt
Card → overflow-x-auto → <table> con headers uppercase text-xs
```

| Tabla | Columnas | Acciones |
| ----- | -------- | -------- |
| `PropertyTable` | Propiedad, Tipo, Ubicación, Estado, Acciones | Editar, Archivar |
| `PropertyListingTable` | Operación, Estado, Expensas, Destacada, Publicada, Web, Acciones | Precios, Editar, Archivar |
| `PropertyPriceTable` | Moneda, Precio, Principal, Acciones | Editar, Marcar principal, Eliminar |

**Problemas UX:**

| # | Problema | Impacto |
| - | -------- | ------- |
| 1 | Sin paginación, búsqueda ni orden | Escala mal con inventario real |
| 2 | Sin vista card en mobile | Solo scroll horizontal |
| 3 | `PropertyTable` muestra solo active/archived | No refleja Publicada / Borrador comercial |
| 4 | «Archivar» listing cierra (`CLOSED`) pero toast dice «archivada» | Confusión semántica |
| 5 | Sin `scope` en `<th>`, sin selección múltiple | Accesibilidad y productividad |

---

## 6. Formularios

### 6.1 `PropertyForm` — monolito en tab «Datos generales»

Secciones en Cards:

1. Identificación (título, slug, código, tipo, condición)
2. Ubicación (calle, ciudad, coordenadas, geocoding fields)
3. Superficies y distribución
4. Descripción (textarea con clases hardcoded zinc/indigo)
5. Estado (`isActive` — restaurar solo vía checkbox en edit)

Slug autogenerado client-side desde título (`slugifyTitle`). Sin confirmación al editar slug de propiedad publicada.

### 6.2 `PropertyListingForm`

* Create: tipo + datos comerciales.
* Edit: transiciones de estado vía Select + badge de estado actual.
* Activación no valida portada ni checklist completo (solo API exige precio).

### 6.3 Side panels (precios e imágenes)

Patrón consistente: `SidePanel` + form + toast + refresh.

**Imágenes:** formulario pide `storageKey` manual con helper «upload en fase posterior». Contradice objetivo del sprint si R2 ya está operativo en otro branch.

### 6.4 `PropertyFeatureManager`

* Checkboxes agrupados por categoría.
* **Dos botones Guardar** (arriba y abajo) sin patrón sticky.
* Feedback inline (`border-emerald-200` / `border-red-200`) distinto de `ApiErrorPanel`.
* Empty state ad-hoc (no `PropertyEmptyState`).

---

## 7. Consistencia visual

### 7.1 Design tokens (`globals.css`)

| Token | Valor | Uso |
| ----- | ----- | --- |
| `--background` | `#f4f4f5` | Fondo página |
| `--surface` | `#ffffff` | Cards, header |
| `--color-primary` | `#2563eb` | Links, tabs activos, CTAs |
| Sidebar | `#18181b` | Chrome invertido |

Tipografía: Geist Sans. UI en español (`lang="es"`).

### 7.2 Ritmo de espaciado (donde se usa `PageShell`)

* Header margin: `mb-6`
* Secciones: `space-y-6`
* Cards: `@repo/ui/card` uniforme

### 7.3 Inconsistencias detectadas

| Área | Variante A | Variante B |
| ---- | ---------- | ---------- |
| Wrapper de página | `PageShell` / `PropertyPageShell` | Dashboard y config usan `PlaceholderPanel` suelto |
| Errores | `ApiErrorPanel` (Card roja) | Feature manager: divs inline |
| Empty states | `PropertyEmptyState` (borde dashed) | Feature: Card centrado plano |
| Header height | CSS `--header-height: 3.5rem` | Layout usa `h-[3.25rem]` y `calc(100vh-3.25rem)` |
| Focus rings | Sidebar `ring-white/20` | Textarea `ring-indigo-500/10` |
| Colores semánticos | Tokens `text-muted`, `border-border` | Dispersión `zinc-*`, `emerald-*`, `amber-*` |

### 7.4 Badges

| Componente | Variantes |
| ---------- | --------- |
| `PropertyStatusBadge` | active→success, archived→neutral, published→info, commercial-draft→warning |
| `PropertyListingStatusBadge` | DRAFT→warning, ACTIVE→success, PAUSED/CLOSED→neutral, RESERVED→info |

Paleta fija en `@repo/ui/badge` (Tailwind greens/yellows/grays/blues).

---

## 8. Problemas UX (priorizados)

### P0 — Bloquean producto comercializable

| # | Problema | Evidencia |
| - | -------- | --------- |
| 1 | Dashboard sin valor operativo | `app/(dashboard)/page.tsx` → solo `PlaceholderPanel` |
| 2 | Listado sin filtros, búsqueda ni estado comercial | `PropertyTable` solo `isActive` |
| 3 | Imágenes con fricción dev (storageKey manual) | `property-image-form.tsx`, `property-image-manager.tsx` |
| 4 | Formulario property monolítico (ubicación mezclada con identificación) | `property-form.tsx` ~500+ líneas, una sola tab |
| 5 | Activación listing sin gate de publicación completa | Backend solo exige precio; admin no bloquea activar sin portada |

### P1 — Fricción operativa diaria

| # | Problema |
| - | -------- |
| 6 | SUPER_ADMIN sin empty state «Seleccioná inmobiliaria» (doc §6.4) |
| 7 | TenantSwitcher invisible en mobile/tablet |
| 8 | Restaurar propiedad archivada solo vía checkbox en form (no desde listado) |
| 9 | Precios sin sub-nav listing; wayfinding solo breadcrumb |
| 10 | Loading sparse: solo 2 `loading.tsx`, sin skeletons |
| 11 | `not-found.tsx` sin shell ni breadcrumbs |

### P2 — Deuda y pulido

| # | Problema |
| - | -------- |
| 12 | Config hub huérfano (no en sidebar como índice) |
| 13 | Rutas config sin guard RBAC (URL directa accesible) |
| 14 | Doc drift: Características, publicabilidad, auth marcados pendientes en `admin-modules.md` |
| 15 | Código muerto: `DEV_NAV_CONTEXT`, mocks en breadcrumbs |
| 16 | 3 tablas duplicadas sin abstracción |

---

## 9. Oportunidades de mejora

| Oportunidad | Impacto | Esfuerzo |
| ----------- | ------- | -------- |
| Dashboard home con KPIs + actividad + acciones rápidas | Alto | Medio |
| Listado enriquecido (badges publicación, filtros, búsqueda) | Alto | Medio |
| Reorganizar tabs: Ubicación, SEO (futuro) | Alto | Medio-Alto |
| Checklist Airbnb-style con bloqueo de activación | Alto | Medio |
| `DataTable` compartida + skeletons | Medio | Bajo-Medio |
| Upload drag & drop en galería (cuando API esté en branch) | Alto | Medio |
| Endpoint agregado `GET /properties/:id/publishability` | Medio | Bajo |
| Empty state SUPER_ADMIN + tenant picker mejorado | Medio | Bajo |

---

## 10. Deuda técnica visible

| Categoría | Ítem | Ubicación |
| --------- | ---- | --------- |
| Doc drift | Publicabilidad ⏳ en docs; ✅ en código | `admin-modules.md` §5 vs `[id]/page.tsx` |
| Doc drift | Auth/TenantSwitcher ⏳; implementados | `admin-modules.md` vs `middleware.ts`, `TenantSwitcher` |
| Doc drift | Tab Características no en `admin-nav.md` §4.2 | `property-sub-nav.tsx` |
| Dead code | `DEV_NAV_CONTEXT` | `nav-config.ts:56-60` |
| Dead code | `DEMO_PROPERTY_ID`, `getMockPropertyTitle` | `breadcrumbs.ts` |
| Dead code | `visibleNavChildren()` sin uso | `nav-config.ts` |
| API N+1 | Publishability: 4 + N requests por página | `load-publishability-context.ts` |
| Reglas duplicadas | Publishability en admin TS, no en backend compartido | `publishability.ts` vs Public API Prisma filters |
| RBAC parcial | Nav-only; sin `@Roles` en API | `nav-context.ts` |
| Storage gap | Admin manual; sprint dice R2 listo | `property-image-form.tsx` |
| Sin KPI endpoint | Dashboard requerirá agregación nueva | No existe en `apps/api` |
| Header mismatch | 3.5rem token vs 3.25rem uso | `globals.css` vs `MainLayout.tsx` |

---

## 11. Matriz doc vs código

| Capacidad | `admin-modules.md` | Código real |
| --------- | ------------------ | ----------- |
| Shell + nav | ✅ | ✅ |
| CRUD Property domain | ✅ | ✅ |
| Publicabilidad checklist | ⏳ | ✅ (`PropertyPublishabilityPanel`) |
| Auth + TenantSwitcher | ⏳ | ✅ |
| Tab Características | — | ✅ (no documentado) |
| Upload storage | ⏳ | ❌ UI manual |
| Dashboard operativo | ⏳ | ❌ Placeholder |
| RBAC rutas | Esperado | ❌ Solo sidebar |

---

## 12. Conclusión

El admin está listo para **operación técnica interna** (crear propiedades, publicar, gestionar precios e imágenes con metadata). Para convertirse en **producto comercializable** para inmobiliarias, el gap principal no es funcionalidad faltante de contratos o CRM, sino:

1. **Orientación al operador** — dashboard, listado inteligente, estados visibles.
2. **Flujo de publicación guiado** — checklist con bloqueos, no solo indicadores.
3. **Reducción de fricción** — upload de imágenes, formularios por sección/tab, filtros.
4. **Consistencia** — patrones visuales, loading, empty states, documentación al día.

Los documentos de propuesta en `docs/proposals/` desglosan el plan de implementación por fases.
