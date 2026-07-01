# Fase 6 — Plataforma (Super Admin)

Versión: v1

Estado: **implementado**

Referencias:

* `docs/04-modules/auth.md`
* `docs/03-database/current-schema.md`
* `docs/03-database/multi-tenant.md`
* `docs/07-admin/admin-nav.md`
* `PROJECT_STATE.md`

---

## Objetivo

Cerrar la capa SaaS de Valorar con administración global de tenants, exclusiva para `SUPER_ADMIN`.

**Fuera de alcance:** Planes, facturación, logs, analytics, API keys, CRM plataforma, auditoría global.

---

## Auditoría inicial (código — pre Fase 6)

### Qué existía

| Área | Estado |
| ---- | ------ |
| Modelo `Tenant` | `id`, `name`, `slug`, timestamps — sin estado |
| `TenantSetting` | Branding, contacto, `domain` (placeholder) |
| Auth SUPER_ADMIN | Usuario platform sin `tenantId`; JWT + guards |
| `TenantGuard` | Resuelve tenant vía `X-Tenant-Id` para SUPER_ADMIN |
| `TenantSwitcher` | Input manual de tenant ID en header/sidebar |
| Nav admin | Tenants bajo Configuración (`/configuracion/tenants`) — placeholder |
| `RolesGuard` + `@Roles()` | Implementado; usado en PropertyFeature writes |
| Seeds | Tenant `demo` + usuarios multi-rol incl. SUPER_ADMIN |

### Qué faltaba

| Brecha | Impacto |
| ------ | ------- |
| `Tenant.status` (ACTIVE / SUSPENDED) | Sin suspensión lógica |
| API CRUD tenants | Sin gestión platform |
| Validación tenant suspendido en login/guards | Usuarios podían acceder |
| Área Plataforma separada de Configuración | UX mezclada |
| UI listado/KPIs/SidePanel tenants | Solo placeholder |
| Tenant detail (resumen ejecutivo) | Inexistente |
| TenantSwitcher usable | Requería conocer UUID manual |

### Qué se reutiliza

* Patrones admin: `PageShell`, KPI cards, tablas, `SidePanel`, Server Actions + `apiFetch`
* `RolesGuard` + `@Roles(SUPER_ADMIN)` para endpoints platform
* `TenantSetting` para logo, email, teléfono, WhatsApp, dominio
* `UserAvatar` para logo/iniciales del tenant
* Cookie `active_tenant_id` + header `X-Tenant-Id` para contexto operativo

---

## Arquitectura Plataforma

```txt
apps/admin/
├── app/(dashboard)/plataforma/tenants/     # Listado SUPER_ADMIN
├── app/(dashboard)/plataforma/tenants/[id] # Detalle resumen
├── components/platform/                    # TenantsManager, TenantDetailHeader
└── lib/api/platform-tenants.ts           # Cliente API platform

apps/api/
└── src/modules/platform-tenant/
    ├── controllers/platform-tenant.controller.ts  # /platform/tenants/*
    ├── services/platform-tenant.service.ts
    └── repositories/platform-tenant.repository.ts
```

**Separación de concerns:**

| Área | Rol | Tenant context |
| ---- | --- | -------------- |
| Plataforma | SUPER_ADMIN | No requiere `X-Tenant-Id` |
| Configuración / Propiedades / Dashboard | Tenant roles | Requiere tenant activo |

Nav admin:

```txt
General
Inmobiliaria
Plataforma          ← nueva sección
└── Tenants
Configuración       ← sin Tenants
Cuenta
```

---

## Modelo de datos

Migración: `202607020002_platform_tenants`

```prisma
enum TenantStatus {
  ACTIVE
  SUSPENDED
}

model Tenant {
  status TenantStatus @default(ACTIVE)
  // name, slug, settings, relations…
}
```

Datos administrables por tenant:

| Campo | Origen |
| ----- | ------ |
| name, slug, status | `Tenant` |
| logoUrl, email, phone, whatsapp, domain | `TenantSetting` |
| createdAt, updatedAt | `Tenant` |
| userCount, propertyCount | Agregados en API (no persistidos) |

**Reglas:**

* Nunca borrado físico de tenant
* Suspender = `status = SUSPENDED`
* Reactivar = `status = ACTIVE`

---

## API Platform Tenants

Base: `/platform/tenants`

Guard: `JwtAuthGuard` + `RolesGuard` + `@Roles(SUPER_ADMIN)`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/platform/tenants` | Listado + KPIs platform |
| GET | `/platform/tenants/stats` | Solo KPIs |
| GET | `/platform/tenants/options` | Tenants activos (switcher) |
| GET | `/platform/tenants/:id` | Detalle con contadores |
| POST | `/platform/tenants` | Alta |
| PATCH | `/platform/tenants/:id` | Edición |
| POST | `/platform/tenants/:id/suspend` | Suspender |
| POST | `/platform/tenants/:id/reactivate` | Reactivar |

Respuesta 403 para roles distintos de SUPER_ADMIN.

---

## Seguridad — tenant suspendido

| Punto | Comportamiento |
| ----- | -------------- |
| Login (`AuthService`) | Usuarios con `tenantId` en tenant SUSPENDED → 401 |
| `TenantGuard` | Tenant SUSPENDED → 403 (incluye SUPER_ADMIN con `X-Tenant-Id`) |
| TenantSwitcher | Solo lista tenants ACTIVE (`/platform/tenants/options`) |
| UI Plataforma | `requireSuperAdminSession()` — redirect `/` si no es SUPER_ADMIN |

Los datos del tenant suspendido permanecen intactos.

---

## Flujo Super Admin

1. Login como `super@valorar.dev`
2. **Plataforma → Tenants:** CRUD global, suspender/reactivar
3. **TenantSwitcher:** elegir inmobiliaria activa para operar Propiedades/Dashboard/Configuración
4. Sin tenant activo: Dashboard/Propiedades muestran empty state

Ruta legacy `/configuracion/tenants` redirige a `/plataforma/tenants`.

---

## UI

### Listado (`/plataforma/tenants`)

KPIs: activos, suspendidos, usuarios totales, propiedades totales.

Tabla: logo, nombre, slug, estado, usuarios, propiedades, creado, acciones.

SidePanels: alta, edición, confirmación suspender/reactivar.

### Detalle (`/plataforma/tenants/[id]`)

Cabecera ejecutiva: nombre, slug, estado, KPIs, contacto, fechas, acciones.

Sin dashboard operativo del tenant — solo resumen.

### TenantSwitcher

Select con inmobiliarias activas (nombre + slug). Solo visible para SUPER_ADMIN.

---

## Validación manual sugerida

1. `npm run check-types` y `npm run build`
2. Login SUPER_ADMIN → Plataforma → Tenants
3. Crear tenant, editar datos, ver detalle
4. Suspender tenant → login usuario tenant falla
5. Reactivar → login OK
6. TenantSwitcher aplica tenant activo para operar admin

---

## Commits lógicos sugeridos

1. `feat(api): add TenantStatus and platform-tenant module`
2. `feat(api): block auth and tenant guard for suspended tenants`
3. `feat(admin): platform tenants UI and navigation`
4. `feat(admin): improve tenant switcher for super admin`
5. `docs: fase 6 platform super admin`
