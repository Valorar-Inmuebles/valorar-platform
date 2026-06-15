# Admin Navigation — Valorar Platform

Versión: v1

Estado: Especificación funcional — sin implementación en `apps/admin`.

Referencias:

* `docs/07-admin/admin-ui-audit.md`
* `docs/07-admin/admin-architecture.md`
* `docs/07-admin/admin-modules.md`
* `docs/03-database/multi-tenant.md`
* `docs/02-architecture/monorepo.md`

---

## Objetivo

Definir la navegación del panel administrativo (`apps/admin`): sidebar, breadcrumbs, jerarquía de rutas App Router, permisos por rol y convenciones de URL.

Este documento es la **fuente de verdad** para `nav-config.ts` y la estructura de carpetas bajo `app/(dashboard)/`.

---

## Principios de navegación

| Principio | Aplicación |
| --------- | ---------- |
| Sidebar = módulos raíz | Solo entidades de primer nivel o secciones operativas globales |
| Sub-recursos bajo Property | Listings, Prices e Images **no** aparecen en el sidebar principal |
| Contexto Property | Toda gestión comercial e imágenes se accede desde `/propiedades/[id]` |
| UI en español | Labels del sidebar y breadcrumbs en español |
| Rutas en español | Segmentos URL en kebab-case español |
| RBAC declarativo | Cada ítem define roles permitidos; ocultar, no deshabilitar, salvo excepciones |
| SUPER_ADMIN + tenant | Sin tenant seleccionado: páginas de datos muestran empty state, no error de ruta |

---

## 1. Navegación principal

La navegación principal vive en el **sidebar izquierdo** (`MainSidebar`), alimentado por `nav-config.ts` (patrón de `proyecto-ejemplo/`).

### 1.1 Secciones del sidebar (v1 Foundation)

```txt
┌─────────────────────────────────────┐
│ [Logo] Valorar Admin                │
├─────────────────────────────────────┤
│ GENERAL                             │
│   Inicio                            │
├─────────────────────────────────────┤
│ INMOBILIARIA                        │
│   Propiedades                       │
├─────────────────────────────────────┤
│ CONFIGURACIÓN                       │
│   Usuarios              (admin)     │
│   Inmobiliaria          (admin)     │
├─────────────────────────────────────┤
│ CUENTA                              │
│   Cerrar sesión                     │
└─────────────────────────────────────┘
```

### 1.2 Ítems del sidebar — definición

| id | Label | href | Tipo | roles | Notas |
| -- | ----- | ---- | ---- | ----- | ----- |
| `inicio` | Inicio | `/` | link | todos | Dashboard placeholder Fase Foundation |
| `propiedades` | Propiedades | `/propiedades` | link | todos | Único ítem Property Domain en sidebar |
| `config-usuarios` | Usuarios | `/configuracion/usuarios` | link | `TENANT_ADMIN`, `SUPER_ADMIN` | Fase posterior a auth |
| `config-tenant` | Inmobiliaria | `/configuracion/inmobiliaria` | link | `TENANT_ADMIN` | Branding y datos del tenant |
| `config-tenants` | Tenants | `/configuracion/tenants` | link | `SUPER_ADMIN` | Solo super admin |
| `salir` | Cerrar sesión | — | action | todos | `action: sign-out`; Fase auth |

### 1.3 Ítems explícitamente excluidos del sidebar

Los siguientes módulos **no** tienen entrada en el sidebar principal:

| Módulo | Motivo | Acceso correcto |
| ------ | ------ | --------------- |
| PropertyListings | Sub-recurso de Property | `/propiedades/[id]/publicaciones` |
| PropertyPrices | Sub-recurso de Listing | `/propiedades/[id]/publicaciones/[listingId]/precios` |
| PropertyImages | Sub-recurso de Property | `/propiedades/[id]/imagenes` |

Futuros módulos (Leads, Emprendimientos, Agentes) sí podrán ser ítems raíz cuando existan; no forman parte de v1 Foundation.

### 1.4 Topbar (complemento, no sidebar)

Elementos del header que **no** son navegación principal pero afectan el contexto:

| Elemento | Ubicación | Función |
| -------- | --------- | ------- |
| Toggle sidebar | Topbar izquierda | Colapsar / expandir |
| Tenant switcher | Topbar centro-derecha | Solo `SUPER_ADMIN` |
| User menu | Topbar derecha | Perfil, configuración, logout |
| Búsqueda global | Topbar | Fase 2+; no v1 Foundation |

---

## 2. Sidebar

### 2.1 Comportamiento (referencia UI audit)

Basado en `proyecto-ejemplo/src/components/layout/MainSidebar.tsx`:

| Modo | Ancho | Comportamiento |
| ---- | ----- | -------------- |
| Expandido | `220px` | Labels + secciones visibles |
| Colapsado | `56px` (`w-14`) | Solo iconos; grupos con flyout popover |

| Interacción | Comportamiento |
| ----------- | -------------- |
| Link directo | Navega y resalta ítem activo |
| Grupo con hijos | v1: no hay grupos con hijos en sidebar principal (excepto futuro) |
| Auto-expand | Si un hijo estuviera activo, el grupo padre se expande |
| Item activo | Barra lateral azul + fondo `bg-white/10` |
| RBAC | Ítems no visibles para el rol no se renderizan |

### 2.2 Mapeo iconId → ítem (propuesta v1)

| id | iconId sugerido |
| -- | --------------- |
| `inicio` | `home` |
| `propiedades` | `building` |
| `config-usuarios` | `users` |
| `config-tenant` | `settings` |
| `config-tenants` | `layers` |
| `salir` | `log-out` |

Implementación: subset de iconos SVG en `packages/ui` o `apps/admin/components/layout/icons.tsx`.

### 2.3 nav-config.ts — contrato TypeScript

Alineado con `admin-architecture.md`:

```ts
export type NavAccessRule = {
  superAdminOnly?: boolean;
  roles?: UserRole[];
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  action?: "sign-out";
  iconId: string;
  children?: NavChildItem[];
} & NavAccessRule;

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};
```

`UserRole`: `SUPER_ADMIN` | `TENANT_ADMIN` | `AGENT` (Prisma enum).

---

## 3. Breadcrumbs

### 3.1 Componente

`PageHeader` + `Breadcrumb` (patrón auditoría UI). Cada página del dashboard define su trail; el sidebar no genera breadcrumbs automáticamente.

### 3.2 Reglas

| Regla | Detalle |
| ----- | ------- |
| Idioma | Español |
| Primer ítem | Siempre «Inicio» → `/` |
| Penúltimo ítem | Padre navegable cuando tiene ruta |
| Último ítem | Página actual; **sin** link |
| Profundidad máxima v1 | 5 niveles (caso precios) |
| Datos dinámicos | Título de Property / tipo de listing en lugar de IDs |

### 3.3 Trails por pantalla (v1 Property Foundation)

| Ruta | Breadcrumb |
| ---- | ---------- |
| `/` | *(sin breadcrumb; solo título «Inicio»)* |
| `/propiedades` | Inicio › Propiedades |
| `/propiedades/crear` | Inicio › Propiedades › Nueva propiedad |
| `/propiedades/[id]` | Inicio › Propiedades › {título property} |
| `/propiedades/[id]/publicaciones` | Inicio › Propiedades › {título} › Publicaciones |
| `/propiedades/[id]/publicaciones/crear` | Inicio › Propiedades › {título} › Publicaciones › Nueva publicación |
| `/propiedades/[id]/publicaciones/[listingId]` | Inicio › Propiedades › {título} › Publicaciones › {tipo operación} |
| `/propiedades/[id]/publicaciones/[listingId]/precios` | Inicio › Propiedades › {título} › Publicaciones › {tipo} › Precios |
| `/propiedades/[id]/imagenes` | Inicio › Propiedades › {título} › Imágenes |
| `/configuracion/usuarios` | Inicio › Configuración › Usuarios |
| `/configuracion/inmobiliaria` | Inicio › Configuración › Inmobiliaria |
| `/configuracion/tenants` | Inicio › Configuración › Tenants |

**Labels dinámicos `{tipo operación}`:**

| listingType | Label |
| ----------- | ----- |
| `SALE` | Venta |
| `RENT` | Alquiler |
| `TEMPORARY_RENT` | Alquiler temporario |

### 3.4 Back button

En formularios de alta (`/crear`) y side panels profundos, `PageHeader` puede mostrar `back={true}` además del breadcrumb (patrón auditoría UI).

---

## 4. Jerarquía de rutas

### 4.1 Árbol completo v1

```txt
/                                    Dashboard (inicio)
/propiedades                         Listado properties
/propiedades/crear                   Alta property
/propiedades/[id]                    Ficha / edición property
/propiedades/[id]/publicaciones      Listado listings (contexto property)
/propiedades/[id]/publicaciones/crear    Alta listing
/propiedades/[id]/publicaciones/[listingId]   Edición listing
/propiedades/[id]/publicaciones/[listingId]/precios   Gestión prices
/propiedades/[id]/imagenes           Gestión images

/configuracion/usuarios              Usuarios tenant
/configuracion/usuarios/crear
/configuracion/usuarios/[id]
/configuracion/inmobiliaria          Settings tenant (TENANT_ADMIN)
/configuracion/tenants               Listado tenants (SUPER_ADMIN)
/configuracion/tenants/crear
/configuracion/tenants/[id]

/login                               Auth (route group auth)
```

### 4.2 Navegación contextual dentro de Property

Desde `/propiedades/[id]`, tabs o links secundarios (no sidebar):

```txt
┌──────────────────────────────────────────────────────────┐
│ {título property}                                        │
│ [Datos generales] [Publicaciones] [Imágenes]             │
└──────────────────────────────────────────────────────────┘
```

| Tab / link | Ruta | Resalta cuando |
| ---------- | ---- | -------------- |
| Datos generales | `/propiedades/[id]` | pathname exacto o edición campos |
| Publicaciones | `/propiedades/[id]/publicaciones` | pathname incluye `/publicaciones` |
| Imágenes | `/propiedades/[id]/imagenes` | pathname incluye `/imagenes` |

Desde detalle de listing (`/publicaciones/[listingId]`):

| Link secundario | Ruta |
| --------------- | ---- |
| Volver a publicaciones | `/propiedades/[id]/publicaciones` |
| Precios | `/propiedades/[id]/publicaciones/[listingId]/precios` |

### 4.3 Diagrama de dependencia de rutas

```txt
/propiedades
    │
    ├── /crear
    │
    └── /[id]  ◄── contexto obligatorio para sub-módulos
            │
            ├── /publicaciones
            │       ├── /crear
            │       └── /[listingId]
            │               └── /precios
            │
            └── /imagenes
```

**Regla:** no existen rutas `/property-listings`, `/property-prices` ni `/property-images` a nivel raíz del admin.

---

## 5. Matriz Ruta → Rol

Leyenda: ✅ acceso | ❌ oculto / redirect 403 | 🔒 visible en nav pero bloqueado hasta auth

Estado auth v1 Foundation: rutas de configuración y dashboard existen como placeholders; guards pendientes en API.

### 5.1 Rutas operativas

| Ruta | AGENT | TENANT_ADMIN | SUPER_ADMIN | Notas |
| ---- | ----- | ------------ | ----------- | ----- |
| `/` | ✅ | ✅ | ✅ | Dashboard |
| `/propiedades` | ✅* | ✅ | ✅* | *AGENT: solo propias + compartidas (API) |
| `/propiedades/crear` | ✅ | ✅ | ✅ | |
| `/propiedades/[id]` | ✅* | ✅ | ✅* | *ownership / canEdit |
| `/propiedades/[id]/publicaciones` | ✅* | ✅ | ✅* | |
| `/propiedades/[id]/publicaciones/crear` | ✅* | ✅ | ✅* | |
| `/propiedades/[id]/publicaciones/[listingId]` | ✅* | ✅ | ✅* | |
| `/propiedades/[id]/publicaciones/[listingId]/precios` | ✅* | ✅ | ✅* | |
| `/propiedades/[id]/imagenes` | ✅* | ✅ | ✅* | |

### 5.2 Rutas de configuración

| Ruta | AGENT | TENANT_ADMIN | SUPER_ADMIN | Sidebar |
| ---- | ----- | ------------ | ----------- | ------- |
| `/configuracion/usuarios` | ❌ | ✅ | ✅ | Sí (admin) |
| `/configuracion/usuarios/crear` | ❌ | ✅ | ✅ | — |
| `/configuracion/usuarios/[id]` | ❌ | ✅ | ✅ | — |
| `/configuracion/inmobiliaria` | ❌ | ✅ | ❌ | Sí (admin tenant) |
| `/configuracion/tenants` | ❌ | ❌ | ✅ | Sí (super) |
| `/configuracion/tenants/crear` | ❌ | ❌ | ✅ | — |
| `/configuracion/tenants/[id]` | ❌ | ❌ | ✅ | — |

### 5.3 Auth

| Ruta | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ---- | ----- | ------------ | ----------- |
| `/login` | ✅ (sin sesión) | ✅ | ✅ |

Usuarios autenticados que visitan `/login` → redirect `/`.

### 5.4 Matriz Sidebar → Rol

| Ítem sidebar | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ------------ | ----- | ------------ | ----------- |
| Inicio | ✅ | ✅ | ✅ |
| Propiedades | ✅ | ✅ | ✅ |
| Usuarios | ❌ | ✅ | ✅ |
| Inmobiliaria | ❌ | ✅ | ❌ |
| Tenants | ❌ | ❌ | ✅ |
| Cerrar sesión | ✅ | ✅ | ✅ |

---

## 6. Estados de navegación

### 6.1 Estado activo del sidebar

Un ítem del sidebar está **activo** cuando:

```ts
function matchPath(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
```

| Ítem | pathname ejemplo | ¿Activo? |
| ---- | ---------------- | -------- |
| Inicio | `/` | ✅ |
| Inicio | `/propiedades` | ❌ |
| Propiedades | `/propiedades` | ✅ |
| Propiedades | `/propiedades/abc/publicaciones` | ✅ |
| Propiedades | `/propiedades/abc/imagenes` | ✅ |
| Usuarios | `/configuracion/usuarios/xyz` | ✅ |

**Consecuencia:** «Propiedades» permanece activo en todo el sub-árbol `/propiedades/**`, incluyendo publicaciones, precios e imágenes.

### 6.2 Estado activo de tabs Property

Los tabs contextuales (`Datos generales`, `Publicaciones`, `Imágenes`) usan matching **más estricto**:

| Tab | Activo si |
| --- | --------- |
| Datos generales | pathname = `/propiedades/[id]` (sin sub-segmentos) |
| Publicaciones | pathname incluye `/publicaciones` |
| Imágenes | pathname incluye `/imagenes` |

Precios: tab bajo listing, no tab de property; breadcrumb indica contexto.

### 6.3 Sidebar colapsado

| Estado | Efecto en nav |
| ------ | ------------- |
| `collapsed: true` | Solo iconos; labels ocultos |
| Popover flyout | Solo si el ítem tuviera `children` (v1: no aplica a ítems raíz) |
| Persistencia | Session storage opcional Fase 2; default expandido |

### 6.4 SUPER_ADMIN sin tenant seleccionado

| Elemento | Estado |
| -------- | ------ |
| Sidebar | Visible; ítems operativos navegables |
| Páginas de datos (`/propiedades`, etc.) | `EmptyState`: «Seleccioná una inmobiliaria» |
| Tenant switcher topbar | Destacado / obligatorio |
| Breadcrumb | Normal |

No redirect automático; el usuario elige tenant desde topbar.

### 6.5 Sesión no autenticada (fase auth)

| Estado | Comportamiento |
| ------ | -------------- |
| Sin cookie JWT | Redirect `/login` desde `(dashboard)/*` |
| `/login` | Layout sin sidebar |

### 6.6 Placeholder Foundation (sin auth aún)

Durante implementación del shell sin auth:

* Todas las rutas `(dashboard)/*` accesibles en dev
* Sidebar renderiza todos los ítems según rol **mock** o rol hardcodeado en dev
* Documentar en `.env.example`: `ADMIN_DEV_ROLE`, `ADMIN_DEV_TENANT_ID`

---

## 7. Convenciones de URLs

### 7.1 Reglas generales

| Regla | Ejemplo correcto | Incorrecto |
| ----- | ---------------- | ---------- |
| Idioma español en path | `/propiedades` | `/properties` |
| kebab-case | `/configuracion/inmobiliaria` | `/configuracion/Inmobiliaria` |
| Sin trailing slash | `/propiedades` | `/propiedades/` |
| IDs opacos (cuid) | `/propiedades/clxyz123` | slug en `[id]` param |
| Segmentos fijos en español | `/publicaciones`, `/imagenes`, `/precios` | `/listings`, `/images` |
| Verbos en acciones | `/crear` | `/new`, `/create` |

### 7.2 Parámetros dinámicos

| Param | Tipo | Uso |
| ----- | ---- | --- |
| `[id]` | Property `cuid` | Contexto property |
| `[listingId]` | PropertyListing `cuid` | Contexto listing |

No usar `slug` de property en rutas admin (reservado para web pública `/propiedades/{slug}`).

### 7.3 Query params (admin)

| Param | Uso | Ejemplo |
| ----- | --- | ------- |
| `?isActive=true` | Filtro listado properties | `/propiedades?isActive=true` |
| `?status=ACTIVE` | Filtro listings en tabla | Tabla embebida |
| `?listingType=SALE` | Filtro tipo operación | Tabla publicaciones |

Query params de filtro **no** cambian el ítem activo del sidebar.

### 7.4 URLs reservadas (futuro)

| Ruta | Fase |
| ---- | ---- |
| `/leads` | Lead Domain |
| `/emprendimientos` | Development Domain |
| `/agentes` | User management extendido |
| `(internal)/ui-kit` | Solo dev; excluido de nav producción |

---

## 8. Estructura final App Router

### 8.1 Route groups

```txt
apps/admin/app/
├── layout.tsx                         # Root: fonts, globals, ToastProvider
├── globals.css
│
├── (auth)/
│   ├── layout.tsx                     # Centrado, sin sidebar
│   └── login/
│       └── page.tsx
│
└── (dashboard)/
    ├── layout.tsx                     # MainLayout + SidebarProvider + auth guard
    ├── page.tsx                       # / — Inicio
    │
    ├── propiedades/
    │   ├── page.tsx                   # Listado
    │   ├── crear/
    │   │   └── page.tsx
    │   └── [id]/
    │       ├── page.tsx               # Ficha property (tab Datos generales)
    │       ├── publicaciones/
    │       │   ├── page.tsx           # Listado listings
    │       │   ├── crear/
    │       │   │   └── page.tsx
    │       │   └── [listingId]/
    │       │       ├── page.tsx       # Edición listing
    │       │       └── precios/
    │       │           └── page.tsx   # Gestión prices
    │       └── imagenes/
    │           └── page.tsx           # Gestión images
    │
    └── configuracion/
        ├── usuarios/
        │   ├── page.tsx
        │   ├── crear/
        │   │   └── page.tsx
        │   └── [id]/
        │       └── page.tsx
        ├── inmobiliaria/
        │   └── page.tsx
        └── tenants/                   # SUPER_ADMIN only
            ├── page.tsx
            ├── crear/
            │   └── page.tsx
            └── [id]/
                └── page.tsx
```

### 8.2 Layouts anidados

| Layout | Responsabilidad |
| ------ | --------------- |
| `app/layout.tsx` | HTML, fuentes Geist, `AdminProviders` (Toast) |
| `app/(auth)/layout.tsx` | Fondo neutro, logo, sin sidebar |
| `app/(dashboard)/layout.tsx` | `requireAuth()`, `MainLayout`, sidebar + header |

No se crea `layout.tsx` intermedio en `propiedades/[id]/` en v1; los tabs se resuelven por componente `PropertySubNav` en cada page.

### 8.3 Archivos de soporte (fuera de app/)

```txt
apps/admin/components/layout/
├── MainLayout.tsx
├── MainSidebar.tsx
├── MainHeader.tsx
├── nav-config.ts              # ← implementación de este documento
├── sidebar-context.tsx
├── TenantSwitcher.tsx         # SUPER_ADMIN
├── PageHeader.tsx             # wrapper o re-export @repo/ui
└── PropertySubNav.tsx         # tabs Datos / Publicaciones / Imágenes

apps/admin/middleware.ts       # Protección (dashboard)/* — fase auth
```

### 8.4 Correspondencia ruta ↔ módulo admin-modules

| Ruta App Router | Módulo (`admin-modules.md`) |
| --------------- | --------------------------- |
| `/propiedades/**` | Properties |
| `/propiedades/[id]/publicaciones/**` | PropertyListings |
| `/propiedades/[id]/publicaciones/[listingId]/precios` | PropertyPrices |
| `/propiedades/[id]/imagenes` | PropertyImages |

---

## 9. Validación cruzada

### 9.1 vs `admin-ui-audit.md`

| Requisito audit | Cumplido en este doc |
| --------------- | -------------------- |
| Sidebar colapsable con RBAC | §2 |
| `nav-config.ts` declarativo | §2.3 |
| `PageHeader` + breadcrumb | §3 |
| `SettingsContainer` en forms config | Rutas `/configuracion/*` |
| Listings/Prices/Images no duplican nav global | §1.3, §4 |

### 9.2 vs `admin-architecture.md`

| Requisito architecture | Cumplido |
| ---------------------- | -------- |
| Route groups `(auth)` / `(dashboard)` | §8.1 |
| `nav-config` con roles | §2, §5 |
| Tenant switcher SUPER_ADMIN | §1.4, §6.4 |
| Property CRUD bajo `/propiedades` | §4 |
| Sin `/property-listings` raíz | §4.3 |

### 9.3 vs `admin-modules.md`

| Requisito modules | Cumplido |
| ----------------- | -------- |
| Pantallas listings bajo property | §4.1 |
| Precios bajo listing | §4.1 |
| Imágenes bajo property | §4.1 |
| Breadcrumbs por pantalla | §3.3 |
| Permisos AGENT / TENANT_ADMIN / SUPER_ADMIN | §5 |

---

## 10. Orden de implementación (solo navegación)

Alineado con Foundation sin CRUD ni auth:

1. [ ] Crear estructura carpetas `app/(dashboard)/` vacías con `page.tsx` placeholder
2. [ ] Implementar `nav-config.ts` según §1.2
3. [ ] `MainSidebar` + matching activo §6.1
4. [ ] `PropertySubNav` tabs §4.2
5. [ ] `PageHeader` + breadcrumbs §3.3 en cada placeholder
6. [ ] Placeholder «Próximamente» en hojas de ruta sin CRUD

---

## 11. Ejemplo nav-config v1 (referencia)

```ts
export const navigation: NavSection[] = [
  {
    id: "general",
    label: "General",
    items: [
      { id: "inicio", label: "Inicio", href: "/", iconId: "home" },
    ],
  },
  {
    id: "inmobiliaria",
    label: "Inmobiliaria",
    items: [
      {
        id: "propiedades",
        label: "Propiedades",
        href: "/propiedades",
        iconId: "building",
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    items: [
      {
        id: "config-usuarios",
        label: "Usuarios",
        href: "/configuracion/usuarios",
        iconId: "users",
        roles: ["TENANT_ADMIN", "SUPER_ADMIN"],
      },
      {
        id: "config-tenant",
        label: "Inmobiliaria",
        href: "/configuracion/inmobiliaria",
        iconId: "settings",
        roles: ["TENANT_ADMIN"],
      },
      {
        id: "config-tenants",
        label: "Tenants",
        href: "/configuracion/tenants",
        iconId: "layers",
        superAdminOnly: true,
      },
    ],
  },
  {
    id: "cuenta",
    label: "Cuenta",
    items: [
      {
        id: "salir",
        label: "Cerrar sesión",
        action: "sign-out",
        iconId: "log-out",
      },
    ],
  },
];
```

---

**Documento relacionado siguiente:** implementación del shell en `apps/admin` según §8 y §10, sin CRUD ni auth hasta fases posteriores.
