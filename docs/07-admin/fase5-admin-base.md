# Fase 5 — Administración Base (Organización + Usuarios + Roles)

Versión: v1

Estado: **en implementación**

Referencias:

* `docs/04-modules/auth.md`
* `docs/03-database/current-schema.md`
* `docs/07-admin/admin-nav.md`
* `PROJECT_STATE.md`

---

## Objetivo

Transformar Valorar en una plataforma SaaS multi-tenant con administración de tenant: organización, usuarios, roles predefinidos y capa de permisos reutilizable.

**Fuera de alcance:** CRM, nuevas funcionalidades inmobiliarias, editor de roles personalizados, equipos/sucursales, dominio personalizado, invitaciones por email.

---

## Auditoría inicial (código — pre Fase 5)

### Qué existía

| Área | Estado |
| ---- | ------ |
| Auth Foundation v1 | Login/logout/me, JWT cookie, JwtAuthGuard, TenantGuard |
| User (Prisma) | `name`, `email`, `passwordHash`, `isActive`, `lastLoginAt`, `role`, `tenantId` |
| UserRole enum | `SUPER_ADMIN`, `TENANT_ADMIN`, `AGENT` |
| Tenant + TenantSetting | Branding parcial (`companyName`, `logoUrl`, colores, whatsapp, email, `domain`) |
| Property ownership | `createdById` obligatorio; `PropertyAgentAccess` en schema |
| RolesGuard | Implementado; solo en PropertyFeature writes |
| Admin nav RBAC | `nav-config.ts` + `sessionToNavContext()` |
| Configuración admin | Placeholders; nav oculta (`HIDE_CONFIGURATION_NAV`) |
| Avatar | Iniciales derivadas de `name` en header |

### Qué faltaba

| Brecha | Impacto |
| ------ | ------- |
| CRUD usuarios / organización (API + UI) | Sin gestión de tenant |
| Roles `MANAGER`, `COLLABORATOR` | Matriz incompleta |
| Capa de permisos (`property.read`, etc.) | RBAC hardcodeado o ausente |
| RBAC en endpoints Property | Cualquier rol autenticado accede a todo el tenant |
| `Property.assignedToId` | Sin propietario lógico distinto del creador |
| `PropertyAgentAccess` en runtime | Schema sin uso en código |
| Campos User: apellido, teléfono, avatar | Perfil incompleto |
| TenantSetting: razón social, dirección, redes, SEO | Organización incompleta |
| Perfil / Preferencias / Roles (UI) | Rutas inexistentes |

### Qué se reutiliza

* Patrones admin: `PageShell`, SidePanel, tablas, Server Actions + `apiFetch`
* Auth: guards, decoradores `@CurrentUser`, `@CurrentTenant`, `@RequireTenant`
* `getUserInitials()` — extendido a componente `UserAvatar`
* Seeds dev — ampliados con nuevos roles y campos

### Qué se modifica

* Prisma: User, UserRole, TenantSetting, Property (`assignedToId`)
* `@repo/rbac`: permisos y matriz rol → permiso
* API: módulos `Organization`, `User`; `PermissionsGuard`; scoping Property
* Admin: nav Configuración visible; rutas organización/usuarios/roles/perfil
* Auth `/auth/me`: DTO enriquecido con permisos del rol

---

## Modelo de datos (post migración)

### User

| Campo | Tipo | Notas |
| ----- | ---- | ----- |
| firstName | String | Nombre |
| lastName | String | Apellido |
| name | String | Denormalizado `firstName + lastName` (compatibilidad) |
| phone | String? | Teléfono |
| avatarUrl | String? | URL futura; UI usa iniciales si null |
| … | | Campos auth existentes |

### TenantSetting (Organización)

| Campo | UI |
| ----- | -- |
| companyName | Nombre comercial |
| legalName | Razón social (opcional) |
| logoUrl | Logo |
| email, phone, whatsapp | Contacto |
| website | Sitio web |
| address | Dirección |
| facebookUrl, instagramUrl, linkedinUrl | Redes |
| primaryColor, secondaryColor | Colores |
| shortDescription | Descripción corta |
| seoTitle, seoDescription | SEO básico |
| domain | Reservado (sin UI de dominio custom v1) |

### Property

| Campo | Notas |
| ----- | ----- |
| createdById | Creador (sin cambio) |
| assignedToId | Propietario lógico / agente asignado (nullable; compatibilidad) |

---

## Roles predefinidos (V1 fijos)

| Rol | Alcance propiedades | Admin tenant |
| --- | ------------------- | ------------ |
| SUPER_ADMIN | Tenant activo (cross-tenant) | Plataforma |
| TENANT_ADMIN | Todas del tenant | Completo |
| MANAGER | Todas del tenant *(equipos → V2)* | Operativo limitado |
| AGENT | Asignadas + creadas + compartidas | — |
| COLLABORATOR | Idem AGENT, solo lectura | — |

Arquitectura preparada para roles personalizados V2 (`Role` / `Permission` tablas — no creadas en V1).

---

## Permisos (`@repo/rbac`)

Los roles agrupan permisos. No hardcodear en componentes — usar `hasPermission(role, permission)`.

Permisos iniciales:

```txt
property.read
property.create
property.update.own
property.update.any
property.delete
property.publish
listing.manage
user.read
user.create
user.update
organization.update
dashboard.view
```

Enforcement:

* **API:** `PermissionsGuard` + `@RequirePermissions()`
* **Admin:** `getSessionPermissions()` / `<Can permission="…">` / helpers en server components

---

## Ownership

```txt
createdById   → quien registró la propiedad
assignedToId  → agente responsable (nullable; default lógico = createdBy en UI)
PropertyAgentAccess → compartición explícita (canView / canEdit)
```

Reglas de visibilidad (API Property list/detail):

* AGENT / COLLABORATOR: `createdById`, `assignedToId`, o `PropertyAgentAccess`
* MANAGER / TENANT_ADMIN: todo el tenant
* SUPER_ADMIN: tenant activo vía `X-Tenant-Id`

---

## API

| Módulo | Base path | Permisos |
| ------ | --------- | -------- |
| Organization | `/organization` | `organization.update` (PATCH), read autenticado |
| Users | `/users` | `user.read`, `user.create`, `user.update` |
| Auth | `/auth/me` | Incluye `permissions[]` |

---

## Admin — Navegación Configuración

| Ruta | Label | Roles |
| ---- | ----- | ----- |
| `/configuracion/organizacion` | Organización | TENANT_ADMIN |
| `/configuracion/usuarios` | Usuarios | TENANT_ADMIN, SUPER_ADMIN |
| `/configuracion/roles` | Roles y permisos | TENANT_ADMIN, SUPER_ADMIN |
| `/configuracion/perfil` | Perfil | Todos |
| `/configuracion/preferencias` | Preferencias | Todos |
| `/configuracion/tenants` | Tenants | SUPER_ADMIN |

Redirect: `/configuracion/inmobiliaria` → `/configuracion/organizacion`

---

## Migración

`202607020001_admin_fase5`

---

## Criterios de aceptación

1. TENANT_ADMIN edita organización y gestiona usuarios del tenant.
2. UI oculta acciones no permitidas según permisos del rol.
3. API valida permisos y ownership en Property.
4. Avatar muestra foto o iniciales con color consistente.
5. AGENT solo ve propiedades asignadas/creadas/compartidas.
6. `npm run check-types` y `npm run build` pasan.
