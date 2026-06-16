# Auth Module

Versión: v1 (Auth Foundation)

Estado: **documentado — pendiente implementación**

Referencias:

* `docs/03-database/current-schema.md`
* `docs/03-database/multi-tenant.md`
* `docs/07-admin/admin-nav.md`
* `docs/07-admin/admin-modules.md`
* `docs/09-roadmap/property-api-roadmap.md` (§6 Seguridad Multi-Tenant)
* `PROJECT_STATE.md`

---

## Objetivo

Proveer autenticación y autorización mínima para el panel administrativo (`apps/admin`) y la API admin (`apps/api`).

Auth Foundation v1 habilita:

* Login con email y contraseña.
* Logout.
* Sesión basada en JWT (stateless).
* Protección de rutas admin vía guards en API y middleware en Next.js.
* RBAC básico con el enum `UserRole` existente.
* Contexto tenant derivado del usuario autenticado (no del cliente).

**No es Auth Enterprise.** Fuera de alcance v1: refresh tokens, OAuth, MFA, SSO, auditoría avanzada, blacklist de tokens, tablas de sesión.

---

## Alcance v1

| Incluido | Descripción |
| -------- | ----------- |
| Login | `POST /auth/login` — email + password → JWT en cookie httpOnly |
| Logout | `POST /auth/logout` — limpiar cookie |
| Perfil sesión | `GET /auth/me` — usuario autenticado |
| JWT stateless | Sin tabla `Session` ni refresh token |
| Guards API | `JwtAuthGuard`, `RolesGuard`, `TenantGuard` |
| Admin login UI | `/login` en `(auth)` route group |
| Admin middleware | Protección de `(dashboard)/*` |
| RBAC | Enum `UserRole`: `SUPER_ADMIN`, `TENANT_ADMIN`, `AGENT` |
| Contexto tenant | `User.tenantId` en JWT; header `X-Tenant-Id` solo para `SUPER_ADMIN` |
| Hash de contraseña | bcrypt en columna `User.passwordHash` (migración futura) |
| Desactivación usuario | `User.isActive` (migración futura) |

| Excluido v1 | Motivo |
| ----------- | ------ |
| Refresh tokens | Complejidad innecesaria; JWT con TTL razonable |
| Tabla `Session` | Logout = borrar cookie; no hay revocación server-side |
| Tabla `Credential` | Password vive en `User` |
| Tablas `Role` / `Permission` | Enum `UserRole` suficiente para RBAC v1 |
| OAuth / SSO / MFA | No requerido por producto |
| Reset de contraseña | Fase posterior |
| CRUD de usuarios | Fase posterior a auth (rutas placeholder en admin) |
| `PropertyAccessGuard` | Dominio Property; no bloqueante para auth foundation |
| Auth en Public API | `/public/*` permanece sin JWT |
| Auth en Public Web | `apps/web` sin login v1 |

---

## Auditoría Prisma (reconfirmación)

Auditoría aprobada sobre `apps/api/prisma/schema.prisma`. **Este documento no modifica Prisma.** Los cambios de schema se ejecutarán en una migración posterior, tras aprobación de este documento.

### Entidades existentes relevantes para auth

| Entidad | Estado | Uso en auth |
| ------- | ------ | ----------- |
| `Tenant` | ✅ Migrado | Frontera de aislamiento; owner de usuarios y datos |
| `User` | ✅ Migrado | Identidad (`email`, `name`), rol, membresía tenant |
| `UserRole` (enum) | ✅ Migrado | RBAC de plataforma |
| `TenantSetting` | ✅ Migrado | `domain` para resolución futura; no usado en login v1 |

### Campos actuales de `User`

```txt
id, tenantId?, name, email (@unique), role (default AGENT), createdAt, updatedAt
```

### Campos actuales de `Tenant`

```txt
id, name, slug (@unique), createdAt, updatedAt
```

### Entidades que NO son auth (no confundir)

| Entidad | Propósito |
| ------- | --------- |
| `PropertyAgentAccess` | Autorización a nivel propiedad (`canView`, `canEdit`). Complementa RBAC para agentes; implementación en dominio Property, no en AuthModule v1. |

### Entidades auth que NO existen (y no se crearán en v1)

```txt
Session
RefreshToken
Credential
Role
Permission
UserRoleAssignment
ApiKey
AuditLog
```

### Brechas identificadas (resueltas en migración futura, no ahora)

| Brecha | Solución aprobada | ¿Nueva tabla? |
| ------ | ----------------- | ------------- |
| No hay credencial | `User.passwordHash` | No |
| No hay desactivación de usuario | `User.isActive` (default `true`) | No |
| No hay trazabilidad de login | `User.lastLoginAt` (opcional v1) | No |
| No hay desactivación de tenant | `Tenant.isActive` (opcional v1, recomendado) | No |

### Invariantes de datos (validación en aplicación)

| Rol | `tenantId` | Regla |
| --- | ---------- | ----- |
| `SUPER_ADMIN` | `null` | Usuario global; opera cross-tenant vía contexto runtime |
| `TENANT_ADMIN` | obligatorio | Debe existir y coincidir con tenant activo |
| `AGENT` | obligatorio | Debe existir y coincidir con tenant activo |

`email` es único globalmente (`@unique`). Un email = una cuenta en toda la plataforma.

Un usuario pertenece a **un único** tenant (`docs/03-database/multi-tenant.md`). No hay membresía N:M en v1.

---

## Decisiones de diseño

| Decisión | Elección | Alternativa descartada |
| -------- | -------- | ---------------------- |
| Modelo de sesión | JWT stateless en cookie httpOnly | Tabla `Session` + refresh token |
| Almacenamiento credencial | Columna `User.passwordHash` | Tabla `Credential` separada |
| RBAC | Enum `UserRole` + `@Roles()` decorator | Tablas `Role` / `Permission` |
| Fuente de `tenantId` en API admin | JWT (`tenantId` del usuario) | Query param `?tenantId=` confiado al cliente |
| SUPER_ADMIN cross-tenant | Header `X-Tenant-Id` validado en API | JWT con `activeTenantId` rotativo |
| Logout | Borrar cookie; sin invalidación server-side | Token blacklist / revocación en DB |
| Public API | Sin cambios; sin JWT | — |
| Admin dev sin auth | `ADMIN_DEV_*` solo en desarrollo local explícito | — |

---

## Modelo de datos

### Estado actual (Prisma migrado)

```txt
Tenant
└── User (0..n)
       role: UserRole
       tenantId?: String   → null si SUPER_ADMIN
```

### Estado objetivo post-migración (documentado, no aplicado)

Cambios planificados en entidades existentes — **sin tablas nuevas**:

```prisma
model Tenant {
  // campos existentes...
  isActive Boolean @default(true)   // recomendado v1
}

model User {
  // campos existentes...
  passwordHash String
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?             // opcional v1
}
```

Documentación de schema a actualizar en la misma migración: `docs/03-database/current-schema.md`.

---

## Roles y RBAC

### Definición de roles

Alineado con `docs/03-database/multi-tenant.md`:

| Rol | Descripción | `tenantId` |
| --- | ----------- | ---------- |
| `SUPER_ADMIN` | Administrador global de plataforma | `null` |
| `TENANT_ADMIN` | Administrador de una inmobiliaria | obligatorio |
| `AGENT` | Agente inmobiliario | obligatorio |

### Matriz RBAC — navegación admin

Fuente: `docs/07-admin/admin-nav.md` §5.

| Ruta / ítem | AGENT | TENANT_ADMIN | SUPER_ADMIN |
| ----------- | ----- | ------------ | ----------- |
| `/login` (sin sesión) | ✅ | ✅ | ✅ |
| `/` (dashboard) | ✅ | ✅ | ✅ |
| `/propiedades/**` | ✅ | ✅ | ✅ |
| `/configuracion/usuarios/**` | ❌ | ✅ | ✅ |
| `/configuracion/inmobiliaria/**` | ❌ | ✅ | ❌ |
| `/configuracion/tenants/**` | ❌ | ❌ | ✅ |
| Cerrar sesión | ✅ | ✅ | ✅ |

Comportamiento UI: ítems no permitidos **no se renderizan** en sidebar (no deshabilitar).

Comportamiento API: rol insuficiente → `403 Forbidden`.

### Matriz RBAC — operaciones Property (referencia)

Fuente: `docs/07-admin/admin-modules.md`. Auth v1 protege endpoints; el scoping fino por propiedad (`PropertyAgentAccess`) queda para fase Property security.

| Rol | Acceso admin Property v1 |
| --- | ------------------------ |
| `AGENT` | CRUD propias (`createdById`) + compartidas (`canEdit`) — cuando se implemente `PropertyAccessGuard` |
| `TENANT_ADMIN` | CRUD todas del tenant |
| `SUPER_ADMIN` | CRUD del tenant activo seleccionado |

Auth Foundation v1 implementa **autenticación + rol + tenant**. El guard de acceso por propiedad es entregable separado del roadmap Property.

### Decorador de roles (API)

```ts
@Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
```

Orden de guards: `JwtAuthGuard` → `TenantGuard` → `RolesGuard`.

---

## Contexto tenant

### Usuarios con tenant fijo

`TENANT_ADMIN` y `AGENT`:

* `tenantId` proviene del JWT (`User.tenantId`).
* Toda query admin filtra por ese `tenantId`.
* El cliente **no** envía `tenantId` en query/body en rutas protegidas.

### SUPER_ADMIN

* `User.tenantId = null` en JWT.
* Debe seleccionar tenant activo en admin (TenantSwitcher — UI topbar).
* API recibe tenant activo vía header:

```txt
X-Tenant-Id: <cuid>
```

Reglas:

* Header obligatorio en operaciones de datos si `role === SUPER_ADMIN`.
* API valida que el tenant exista y `Tenant.isActive === true` (cuando el campo exista).
* Sin header: operaciones de lectura/escritura de datos → `400 Bad Request` con mensaje claro.
* Rutas de auth (`/auth/me`, `/auth/logout`) no requieren `X-Tenant-Id`.

Comportamiento admin documentado en `admin-nav.md` §6.4: sin tenant seleccionado, páginas de datos muestran empty state «Seleccioná una inmobiliaria», no redirect.

### Resolución de tenant por contexto

| Contexto | Mecanismo v1 |
| -------- | ------------ |
| Admin API | JWT → `user.tenantId` o `X-Tenant-Id` (SUPER_ADMIN) |
| Public API | Sin JWT; tenant por dominio / env (futuro) |
| Admin UI | Cookie JWT + cookie/header interno de tenant activo para SUPER_ADMIN |

---

## API (NestJS)

Módulo: `AuthModule` en `apps/api/src/modules/auth` (pendiente implementación).

Dependencias previstas:

* `@nestjs/jwt`
* `@nestjs/passport`
* `passport`
* `passport-jwt`
* `bcrypt`

### Endpoints

Ruta base: `/auth`

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/login` | No | Validar credenciales; emitir JWT en cookie |
| POST | `/auth/logout` | No* | Limpiar cookie JWT |
| GET | `/auth/me` | Sí | Devolver usuario autenticado |

\* Logout no requiere JWT válido; siempre limpia cookie.

Swagger tag: `Auth`.

### POST /auth/login

**Request body:**

```json
{
  "email": "agente@inmobiliaria.com",
  "password": "********"
}
```

Validación:

* `email`: string, formato email, obligatorio.
* `password`: string, min 8 caracteres (v1).

**Flujo:**

1. Buscar `User` por `email` (case-insensitive en comparación; persistir email normalizado en minúsculas al crear usuarios).
2. Verificar `User.isActive === true`.
3. Verificar `User.passwordHash` con bcrypt.
4. Si `User.tenantId` no es null: verificar `Tenant` existe y `Tenant.isActive === true` (cuando exista el campo).
5. Actualizar `User.lastLoginAt` (si el campo existe).
6. Firmar JWT y setear cookie httpOnly.
7. Responder con DTO de usuario (sin `passwordHash`).

**Response 200:**

```json
{
  "id": "clxyz...",
  "email": "agente@inmobiliaria.com",
  "name": "María García",
  "role": "AGENT",
  "tenantId": "cltenant..."
}
```

**Errores:**

| Código | Condición | Mensaje UI (español) |
| ------ | --------- | -------------------- |
| 400 | Validación DTO | Según campo |
| 401 | Credenciales inválidas | «Email o contraseña incorrectos» |
| 401 | Usuario inactivo | «Tu cuenta está desactivada» |
| 403 | Tenant inactivo | «La inmobiliaria está desactivada» |

No revelar si el email existe (mismo mensaje para email inexistente y password incorrecta).

### POST /auth/logout

**Flujo:**

1. Limpiar cookie JWT (`Max-Age=0` o `Expires` en el pasado).
2. Responder `204 No Content`.

### GET /auth/me

**Headers:** cookie JWT.

**Response 200:** mismo DTO que login.

**Errores:**

| Código | Condición |
| ------ | --------- |
| 401 | Sin cookie, JWT inválido o expirado |
| 401 | Usuario inactivo desde emisión del token |

---

## JWT

### Payload

```ts
{
  sub: string;              // User.id
  email: string;
  role: UserRole;
  tenantId: string | null;  // null para SUPER_ADMIN
  iat: number;
  exp: number;
}
```

No incluir datos sensibles ni permisos granulares en v1.

### Configuración

| Parámetro | Valor v1 | Env |
| --------- | -------- | --- |
| Algoritmo | HS256 | — |
| Secret | Obligatorio | `JWT_SECRET` |
| TTL access token | 8 horas | `JWT_EXPIRES_IN` (default `8h`) |
| Issuer | `valorar-api` | opcional |
| Audience | `valorar-admin` | opcional |

Sin refresh token. Al expirar, el usuario debe volver a `/login`.

### Cookie

| Atributo | Valor |
| -------- | ----- |
| Nombre | `access_token` |
| `HttpOnly` | `true` |
| `Secure` | `true` en producción |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | Igual a TTL JWT |

En desarrollo local (HTTP): `Secure=false` permitido vía env `COOKIE_SECURE=false`.

### Estrategia Passport

* Estrategia: `jwt` con extractor desde cookie `access_token`.
* Header `Authorization: Bearer` **no** es requerido v1 (admin usa cookie). Puede habilitarse en fase posterior para clientes API.

---

## Guards

Ubicación prevista: `apps/api/src/modules/auth/guards/`.

### JwtAuthGuard

* Valida firma y expiración del JWT.
* Carga `User` desde DB por `sub`.
* Rechaza si `User.isActive === false`.
* Adjunta `request.user` con shape:

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
}
```

### TenantGuard

Resuelve `request.tenantId` efectivo:

```ts
if (user.role === 'SUPER_ADMIN') {
  tenantId = request.headers['x-tenant-id'];
  // validar existencia + isActive
} else {
  tenantId = user.tenantId;
}
```

Rechaza:

* `TENANT_ADMIN` / `AGENT` sin `tenantId` en JWT → `403`.
* `SUPER_ADMIN` sin header en rutas que requieran tenant → `400`.

Decorador `@RequireTenant()` para marcar controllers que necesitan tenant resuelto.

### RolesGuard

* Lee metadata `@Roles(...)` del handler/controller.
* Compara con `request.user.role`.
* Sin metadata → permite cualquier rol autenticado.

### Aplicación en módulos existentes

| Módulo | Protección v1 |
| ------ | ------------- |
| `PropertyModule` | JwtAuthGuard + TenantGuard |
| `PropertyListingModule` | Idem |
| `PropertyPriceModule` | Idem |
| `PropertyImageModule` | Idem |
| `PublicPropertyModule` | **Sin guards** (público) |
| `AuthModule` | Login/logout públicos; `/auth/me` protegido |

### Refactor de endpoints admin existentes

Estado actual: `tenantId` en query DTOs (`PropertyTenantQueryDto`).

Estado objetivo auth v1:

| Antes | Después |
| ----- | ------- |
| `GET /properties?tenantId=xxx` | `GET /properties` + header `X-Tenant-Id` si SUPER_ADMIN |
| `POST /properties` body `{ tenantId, ... }` | `tenantId` inferido del guard; remover del DTO de entrada |
| `createdById` en body | Inferido de `request.user.id` en create |

El `tenantId` en respuestas DTO se mantiene (dato de salida).

Compatibilidad dev: durante transición, puede aceptarse `tenantId` en query **solo si coincide** con tenant resuelto — eliminar en fase de limpieza post-auth.

---

## Admin (Next.js)

App: `apps/admin`.

### Rutas

```txt
app/
├── (auth)/
│   └── login/page.tsx          # Formulario login
└── (dashboard)/
    └── ...                     # Protegido por middleware
```

### Login UI

Ruta: `/login`

| Campo UI | Campo API |
| -------- | --------- |
| Email | `email` |
| Contraseña | `password` |
| Iniciar sesión | `POST /auth/login` |

Comportamiento:

* Layout `(auth)`: fondo neutro, logo, sin sidebar (`admin-nav.md` §8).
* Error de credenciales: mensaje genérico en español.
* Éxito: redirect a `/`.
* Usuario autenticado que visita `/login` → redirect `/`.

Implementación: Server Action o Route Handler proxy hacia API; cookie seteada por API (preferido) o reenviada por admin con mismos atributos de seguridad.

### Logout

* Acción sidebar «Cerrar sesión» (`action: sign-out` en `nav-config.ts`).
* Llama `POST /auth/logout`.
* Redirect a `/login`.

### Middleware

Archivo: `apps/admin/middleware.ts`

Reglas:

| Ruta | Sin JWT | Con JWT |
| ---- | ------- | ------- |
| `(dashboard)/**` | Redirect `/login` | Permitir |
| `/login` | Permitir | Redirect `/` |
| Assets estáticos | Permitir | Permitir |

Matcher: excluir `_next`, archivos estáticos, favicon.

Verificación: presencia de cookie `access_token`. Validación completa del JWT puede delegarse a layout server component vía `GET /auth/me` (middleware solo chequea existencia de cookie en v1).

### Cliente API admin

Server-side fetch hacia `API_URL`:

* Reenviar cookie `access_token` en requests a API.
* Si `SUPER_ADMIN`: incluir `X-Tenant-Id` desde cookie/contexto de tenant activo.

Reemplazar `getAdminTenantId()` / `getAdminUserId()` basados en env cuando exista sesión:

| Prioridad | Fuente tenantId | Fuente userId |
| --------- | --------------- | ------------- |
| 1 | Sesión JWT (+ tenant activo SUPER_ADMIN) | Sesión JWT |
| 2 (solo dev) | `ADMIN_DEV_TENANT_ID` / `TENANT_ID` | `ADMIN_DEV_USER_ID` |

En producción, `ADMIN_DEV_*` no deben estar definidos.

### TenantSwitcher (SUPER_ADMIN)

v1 mínimo:

* Selector en topbar.
* Persistir tenant activo en cookie `active_tenant_id` (httpOnly, server-set).
* Enviar como `X-Tenant-Id` en cada request API.

Sin tenant seleccionado: empty state en páginas de datos; no bloquear navegación general.

---

## Seguridad

### Password

| Regla | Valor v1 |
| ----- | -------- |
| Hash | bcrypt |
| Salt rounds | 12 |
| Longitud mínima | 8 caracteres |
| Almacenamiento | Solo hash; nunca password en logs ni respuestas |

### Rate limiting

Recomendado en fase de implementación: limitar `POST /auth/login` (ej. 10 intentos / 15 min por IP). No bloqueante para merge inicial; documentar como hardening inmediato post-v1.

### CORS

API admin debe permitir credenciales desde origen admin:

* Dev: `http://localhost:3001`
* Prod: dominio admin del tenant / plataforma

`credentials: true` en requests con cookie.

### Principio fundamental

El tenant es la frontera de seguridad (`docs/03-database/multi-tenant.md`). Auth v1 cierra la vulnerabilidad actual donde cualquier cliente puede enviar un `tenantId` arbitrario en query/body.

---

## Variables de entorno

### API (`apps/api/.env`)

| Variable | Obligatorio | Descripción |
| -------- | ----------- | ----------- |
| `DATABASE_URL` | Sí | PostgreSQL |
| `JWT_SECRET` | Sí | Secreto de firma (min 32 chars aleatorios) |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `COOKIE_SECURE` | No | Default `true` en prod, `false` en dev |
| `CORS_ORIGIN` | Sí (prod) | Origen admin permitido |

### Admin (`apps/admin/.env`)

| Variable | Obligatorio | Descripción |
| -------- | ----------- | ----------- |
| `API_URL` | Sí | Base URL API (server-side) |
| `ADMIN_DEV_TENANT_ID` | No | Solo dev sin sesión |
| `ADMIN_DEV_USER_ID` | No | Solo dev sin sesión |

Actualizar `.env.example` de ambas apps en fase de implementación.

---

## Seed de desarrollo

Script seed (fase implementación) — datos mínimos:

| Entidad | Datos |
| ------- | ----- |
| `Tenant` | 1 tenant demo (`slug: demo`) |
| `User` | 3 usuarios, uno por rol, password conocido documentado en README dev |
| `TenantSetting` | Opcional, branding mínimo |

Password dev sugerido: documentar en README, nunca commitear en código.

---

## Errores estándar API

| HTTP | Código interno | Cuándo |
| ---- | -------------- | ------ |
| 401 | `UNAUTHORIZED` | JWT ausente, inválido, expirado |
| 403 | `FORBIDDEN` | Rol insuficiente |
| 400 | `TENANT_REQUIRED` | SUPER_ADMIN sin `X-Tenant-Id` |
| 400 | `TENANT_NOT_FOUND` | Tenant inválido |
| 403 | `TENANT_INACTIVE` | Tenant desactivado |

Respuesta error (formato existente NestJS + filter global):

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## Relación con otros módulos

| Módulo | Impacto auth v1 |
| ------ | --------------- |
| Property admin API | Guards + remover `tenantId` del cliente |
| Public Property API | Sin cambios |
| Lead (futuro) | Usará mismos guards al implementarse |
| Admin Property UI | Reemplazar env mock por sesión |
| Admin nav / RBAC | Filtrar sidebar por `request.user.role` |
| `PropertyAgentAccess` | Sin cambios en schema; guard de dominio posterior |

---

## Criterios de aceptación (Auth Foundation v1)

1. Usuario con credenciales válidas accede a `/login` y llega al dashboard.
2. Usuario sin sesión en `(dashboard)/*` es redirigido a `/login`.
3. `POST /auth/logout` cierra sesión; dashboard queda inaccesible.
4. Endpoints admin (`/properties`, etc.) rechazan requests sin JWT → `401`.
5. Usuario `AGENT` no puede acceder a endpoints reservados a `TENANT_ADMIN` → `403`.
6. `tenantId` en operaciones admin proviene del JWT, no manipulable por el cliente.
7. `SUPER_ADMIN` opera sobre tenant seleccionado vía `X-Tenant-Id`.
8. Public API `/public/*` sigue funcionando sin JWT.
9. No existen tablas nuevas de auth en PostgreSQL.
10. Documentación `current-schema.md` actualizada tras migración (entregable de fase schema).

---

## Orden de implementación (post-aprobación)

Este documento es prerrequisito. **No implementar hasta aprobación explícita.**

Secuencia acordada:

```txt
1. Aprobación de docs/04-modules/auth.md
2. Plan de implementación detallado (tareas por app)
3. Migración Prisma (columnas User + opcional Tenant)
4. AuthModule en apps/api (login, logout, me, guards)
5. Protección endpoints admin existentes
6. Admin login + middleware + integración sesión
7. Retirada progresiva de ADMIN_DEV_* en flujos con sesión
```

Cada fase estructural incluye actualización de `docs/03-database/current-schema.md` y `PROJECT_STATE.md` según convenciones del repositorio.

---

## Historial

| Versión | Fecha | Cambio |
| ------- | ----- | ------ |
| v1 | 2026-06-16 | Especificación Auth Foundation — documento inicial |
