# Auth Foundation v1 — Plan de Implementación

Versión: v1

Estado: **pendiente aprobación — no implementar hasta confirmación explícita**

Especificación funcional: `docs/04-modules/auth.md` (aprobada)

---

## Verificación pre-implementación (auditoría 2026-06-16)

### Consistencia `auth.md` ↔ Prisma actual

| Punto auth.md | Estado en repo | Acción |
| ------------- | -------------- | ------ |
| `User` sin `passwordHash` | ✅ Confirmado — schema sin columna | Fase 1 |
| `User` sin `isActive` | ✅ Confirmado | Fase 1 |
| `User` sin `lastLoginAt` | ✅ Confirmado | Fase 1 |
| Enum `UserRole` (`SUPER_ADMIN`, `TENANT_ADMIN`, `AGENT`) | ✅ Migrado | Sin cambio |
| `User.tenantId` nullable para SUPER_ADMIN | ✅ Migrado | Sin cambio |
| Sin tablas `Session`, `Credential`, etc. | ✅ Confirmado | No crear |
| `Tenant.isActive` opcional en auth.md | ❌ No en schema | **Fuera de Fase 1** — diferido; login v1 no lo exige |

### Consistencia `auth.md` ↔ código actual

| Punto | Estado actual | Impacto |
| ----- | ------------- | ------- |
| Sin `AuthModule` | ✅ `apps/api/src/app.module.ts` solo importa Property + Public | Fase 2 |
| Sin guards JWT | ✅ Controllers admin sin `@UseGuards` | Fase 3–4 |
| `tenantId` en query/body | ✅ 4 controllers + 4 create DTOs + query DTOs | Fase 4 |
| Admin usa `ADMIN_DEV_*` | ✅ `apps/admin/lib/tenant/get-admin-context.ts` | Fase 5 |
| Login placeholder | ✅ `apps/admin/app/(auth)/login/page.tsx` | Fase 5 |
| Sin `middleware.ts` | ✅ No existe en admin | Fase 5 — crear |
| `apiFetch` sin cookies | ✅ `apps/admin/lib/api/client.ts` | Fase 5 |
| Nav RBAC mock | ✅ `DEV_NAV_CONTEXT` en `nav-config.ts` + `MainSidebar.tsx` | Fase 5 |
| Sign-out toast placeholder | ✅ `MainSidebar.handleSignOut` | Fase 5 |
| Public API sin auth | ✅ `PublicPropertyModule` | Sin cambio |
| Sin CORS / cookie-parser en API | ✅ `main.ts` mínimo | Fase 2 |
| Sin seed Prisma | ✅ No hay `prisma/seed.ts` | Fase 6 |
| Sin deps auth en `apps/api/package.json` | ✅ Confirmado | Fase 2 |

### Endpoints admin afectados por Fase 4

| Controller | Rutas | Patrón actual `tenantId` |
| ---------- | ----- | ------------------------ |
| `property.controller.ts` | `/properties` | query + body create |
| `property-listing.controller.ts` | `/property-listings` | query + body create |
| `property-price.controller.ts` | `/property-prices` | query + body create |
| `property-image.controller.ts` | `/property-images` | query + body create |

### Cliente admin afectado por Fase 4–5

| Archivo | Uso actual |
| ------- | ---------- |
| `apps/admin/lib/api/property.ts` | `?tenantId=` + body create |
| `apps/admin/lib/api/property-listing.ts` | Idem |
| `apps/admin/lib/api/property-price.ts` | Idem |
| `apps/admin/lib/api/property-image.ts` | Idem |

---

## Dependencias npm

Instalar en **`apps/api`** (Fase 2):

| Paquete | Tipo | Uso |
| ------- | ---- | --- |
| `@nestjs/jwt` | dependency | Firma y verificación JWT |
| `@nestjs/passport` | dependency | Integración guards |
| `passport` | dependency | Base estrategias |
| `passport-jwt` | dependency | Estrategia JWT |
| `bcrypt` | dependency | Hash de contraseñas |
| `cookie-parser` | dependency | Leer cookie `access_token` en API |

DevDependencies en **`apps/api`**:

| Paquete | Uso |
| ------- | --- |
| `@types/passport-jwt` | Tipos TS |
| `@types/bcrypt` | Tipos TS |
| `@types/cookie-parser` | Tipos TS |

**`apps/admin`:** sin dependencias npm nuevas en v1 (login vía Route Handlers + `fetch` nativo).

---

## Orden de ejecución y dependencias entre fases

```txt
Fase 1 (Prisma)
    ↓
Fase 2 (AuthModule) ──requiere──► usuario con password (seed manual mínimo para probar)
    ↓
Fase 3 (Guards)
    ↓
Fase 4 (Refactor endpoints) ──requiere──► Fase 3
    ↓
Fase 5 (Admin) ──requiere──► Fase 2 + Fase 4
    ↓
Fase 6 (Seeds formales)
```

**Nota:** Fase 6 está al final según alcance acordado, pero para probar Fase 2–5 en local hace falta al menos un `INSERT` manual o script temporal. Fase 6 formaliza el seed reproducible.

---

## Fase 1 — Migración Prisma

**Objetivo:** agregar columnas de credencial y estado en `User`. Sin tablas nuevas.

### Cambios schema (`apps/api/prisma/schema.prisma`)

```prisma
model User {
  // existentes...
  passwordHash String
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
}
```

### Archivos a crear

| Archivo | Descripción |
| ------- | ----------- |
| `apps/api/prisma/migrations/<timestamp>_auth_foundation/migration.sql` | Generado por `prisma migrate dev` |

### Archivos a modificar

| Archivo | Cambio |
| ------- | ------ |
| `apps/api/prisma/schema.prisma` | Columnas en `User` |
| `docs/03-database/current-schema.md` | Documentar campos `passwordHash`, `isActive`, `lastLoginAt` |
| `PROJECT_STATE.md` | Mover ítems Foundation pendientes; marcar auth schema planificado → migrado |

### Comandos (referencia)

```bash
cd apps/api
npx prisma migrate dev --name auth_foundation
npx prisma generate
```

### Riesgos Fase 1

| Riesgo | Mitigación |
| ------ | ---------- |
| `passwordHash NOT NULL` falla si hay filas `User` existentes | DB dev: truncar/reseed; prod: no hay usuarios productivos aún — confirmar antes de migrar |
| Client Prisma desincronizado | Ejecutar `prisma generate` post-migración |
| Olvidar actualizar docs | Checklist obligatorio en PR |

### Criterio de done

- [ ] Migración aplicada en Neon/dev
- [ ] `prisma generate` OK
- [ ] `current-schema.md` actualizado
- [ ] Sin tablas nuevas en PostgreSQL

---

## Fase 2 — AuthModule API

**Objetivo:** login, logout, me, JWT strategy, bcrypt, cookie httpOnly.

### Archivos a crear

| Archivo | Responsabilidad |
| ------- | --------------- |
| `apps/api/src/modules/auth/auth.module.ts` | Registro JwtModule, PassportModule, providers |
| `apps/api/src/modules/auth/auth.controller.ts` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| `apps/api/src/modules/auth/auth.service.ts` | Validación credenciales, firma JWT, `lastLoginAt` |
| `apps/api/src/modules/auth/auth.repository.ts` | Queries Prisma User + Tenant |
| `apps/api/src/modules/auth/dto/login.dto.ts` | `email`, `password` |
| `apps/api/src/modules/auth/dto/auth-user-response.dto.ts` | Respuesta pública sin `passwordHash` |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | Extrae JWT de cookie `access_token` |
| `apps/api/src/modules/auth/utils/password.util.ts` | `hashPassword`, `verifyPassword` (bcrypt, rounds 12) |
| `apps/api/src/modules/auth/utils/cookie.util.ts` | Set/clear cookie `access_token` |
| `apps/api/src/modules/auth/constants/auth.constants.ts` | Nombre cookie, TTL defaults |
| `apps/api/src/common/types/authenticated-user.type.ts` | Shape de `request.user` |

### Archivos a modificar

| Archivo | Cambio |
| ------- | ------ |
| `apps/api/package.json` | Dependencias npm (ver sección arriba) |
| `apps/api/src/app.module.ts` | Import `AuthModule` |
| `apps/api/src/main.ts` | `cookie-parser`; CORS `{ origin: CORS_ORIGIN, credentials: true }`; Swagger tag `Auth` |
| `apps/api/.env.example` | `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `COOKIE_SECURE` |
| `docs/04-modules/auth.md` | Estado → «AuthModule implementado» (al cerrar fase) |

### Contratos (alineados a auth.md)

**POST `/auth/login`**

- Body: `{ email, password }`
- Valida `isActive`, bcrypt, tenant activo (cuando exista `Tenant.isActive`)
- Set-Cookie: `access_token` httpOnly
- Response 200: `AuthUserResponseDto`

**POST `/auth/logout`**

- Clear cookie → `204`

**GET `/auth/me`**

- Requiere JWT válido (guard en Fase 3; en Fase 2 puede usar guard inline temporal)
- Response 200: `AuthUserResponseDto`

### Riesgos Fase 2

| Riesgo | Mitigación |
| ------ | ---------- |
| `JWT_SECRET` débil o ausente | Validar al bootstrap; fallar si falta en prod |
| Cookie no llega al browser en dev (admin :3001, api :3002) | API setea cookie para clientes directos; admin usará BFF en Fase 5 que reenvía cookie al dominio admin |
| Email case sensitivity | Normalizar a lowercase en login y en seed |
| Swagger sin auth documentada | Tag `Auth` + ejemplos en controller |

### Criterio de done

- [ ] Login/logout/me probados con curl/Postman contra `:3002`
- [ ] Cookie `access_token` presente en respuesta login
- [ ] `passwordHash` nunca en respuestas ni logs
- [ ] `.env.example` actualizado

---

## Fase 3 — Guards

**Objetivo:** `JwtAuthGuard`, `RolesGuard`, `TenantGuard`.

### Archivos a crear

| Archivo | Responsabilidad |
| ------- | --------------- |
| `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` | Extiende `AuthGuard('jwt')`; adjunta user activo desde DB |
| `apps/api/src/modules/auth/guards/roles.guard.ts` | Lee `@Roles()` metadata |
| `apps/api/src/modules/auth/guards/tenant.guard.ts` | Resuelve `request.tenantId` efectivo |
| `apps/api/src/common/decorators/roles.decorator.ts` | `@Roles(UserRole.TENANT_ADMIN, ...)` |
| `apps/api/src/common/decorators/require-tenant.decorator.ts` | Marca handlers que exigen tenant |
| `apps/api/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| `apps/api/src/common/decorators/current-tenant.decorator.ts` | `@CurrentTenant()` param decorator |

### Archivos a modificar

| Archivo | Cambio |
| ------- | ------ |
| `apps/api/src/modules/auth/auth.module.ts` | Export guards para otros módulos |
| `apps/api/src/modules/auth/auth.controller.ts` | `@UseGuards(JwtAuthGuard)` en `GET /auth/me` |

### Reglas TenantGuard

```txt
TENANT_ADMIN / AGENT  → request.tenantId = user.tenantId
SUPER_ADMIN           → request.tenantId = header X-Tenant-Id (validar existencia)
Sin tenant resuelto   → 400 TENANT_REQUIRED (rutas @RequireTenant)
```

### Riesgos Fase 3

| Riesgo | Mitigación |
| ------ | ---------- |
| Orden incorrecto de guards | Documentar: Jwt → Tenant → Roles |
| SUPER_ADMIN sin header rompe CRUD | `@RequireTenant()` solo en controllers de datos |
| JWT válido pero user desactivado post-emisión | JwtAuthGuard re-carga user y rechaza si `!isActive` |

### Criterio de done

- [ ] Guards exportados desde `AuthModule`
- [ ] Unit tests mínimos opcionales para `RolesGuard` / `TenantGuard`
- [ ] `GET /auth/me` protegido

---

## Fase 4 — Refactor endpoints admin

**Objetivo:** eliminar `tenantId` enviado por cliente; tenant y `createdById` derivados del JWT.

### Patrón controller (todos los módulos Property admin)

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('properties')
export class PropertyController {
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPropertiesQueryDto, // sin tenantId
  ) { ... }
}
```

### API — archivos a modificar

**Controllers (4):**

| Archivo |
| ------- |
| `apps/api/src/modules/property/controllers/property.controller.ts` |
| `apps/api/src/modules/property-listing/controllers/property-listing.controller.ts` |
| `apps/api/src/modules/property-price/controllers/property-price.controller.ts` |
| `apps/api/src/modules/property-image/controllers/property-image.controller.ts` |

Cambios: `@UseGuards`; `@CurrentTenant()` / `@CurrentUser()`; quitar `@Query() ...TenantQueryDto` para tenantId.

**Create DTOs (4) — remover `tenantId`:**

| Archivo |
| ------- |
| `apps/api/src/modules/property/dto/create-property.dto.ts` |
| `apps/api/src/modules/property-listing/dto/create-property-listing.dto.ts` |
| `apps/api/src/modules/property-price/dto/create-property-price.dto.ts` |
| `apps/api/src/modules/property-image/dto/create-property-image.dto.ts` |

**Create Property — remover también `createdById`** (inferir de `@CurrentUser()`).

**Query DTOs (4) — remover `tenantId`:**

| Archivo |
| ------- |
| `apps/api/src/modules/property/dto/property-query.dto.ts` |
| `apps/api/src/modules/property-listing/dto/property-listing-query.dto.ts` |
| `apps/api/src/modules/property-price/dto/property-price-query.dto.ts` |
| `apps/api/src/modules/property-image/dto/property-image-query.dto.ts` |

Opción: eliminar clases `*TenantQueryDto` y dejar solo filtros de negocio.

**Services (4) — sin cambio de firma interna** (siguen recibiendo `tenantId` como argumento desde controller):

| Archivo |
| ------- |
| `apps/api/src/modules/property/services/property.service.ts` |
| `apps/api/src/modules/property-listing/services/property-listing.service.ts` |
| `apps/api/src/modules/property-price/services/property-price.service.ts` |
| `apps/api/src/modules/property-image/services/property-image.service.ts` |

**Modules (4) — import AuthModule o guards globales:**

| Archivo |
| ------- |
| `apps/api/src/modules/property/property.module.ts` |
| `apps/api/src/modules/property-listing/property-listing.module.ts` |
| `apps/api/src/modules/property-price/property-price.module.ts` |
| `apps/api/src/modules/property-image/property-image.module.ts` |

**Sin modificar:**

| Archivo | Motivo |
| ------- | ------ |
| `apps/api/src/modules/public-property/**` | Público, sin JWT |
| Response DTOs (`*ResponseDto`) | `tenantId` en salida se mantiene |

### Admin — archivos a modificar (preparación parcial; integración completa en Fase 5)

| Archivo | Cambio |
| ------- | ------ |
| `apps/admin/lib/api/property.ts` | Quitar `?tenantId=` y campos del body |
| `apps/admin/lib/api/property-listing.ts` | Idem |
| `apps/admin/lib/api/property-price.ts` | Idem |
| `apps/admin/lib/api/property-image.ts` | Idem |

### Documentación a modificar

| Archivo |
| ------- |
| `docs/04-modules/properties.md` | Tablas API sin `?tenantId=` |
| `docs/07-admin/admin-modules.md` | Nota guards implementados |

### Riesgos Fase 4

| Riesgo | Mitigación |
| ------ | ---------- |
| Breaking change total en admin si Fase 5 no está lista | Implementar Fase 4 + 5 en la misma PR o mantener fallback dev temporal |
| Admin deja de funcionar sin cookie | Coordinar deploy api + admin |
| Tests e2e inexistentes para admin API | Probar manualmente con curl autenticado antes de merge |
| `forbidNonWhitelisted` rechaza `tenantId` legacy | Comunicar breaking change; no periodo de compatibilidad en v1 |

### Criterio de done

- [ ] Requests sin JWT → `401` en los 4 módulos admin
- [ ] Requests con JWT pero `tenantId` manipulado en query → ignorado / no requerido
- [ ] `POST /properties` sin `tenantId` ni `createdById` en body funciona
- [ ] Public API intacta

---

## Fase 5 — Admin

**Objetivo:** login real, middleware, logout, session context, RBAC nav.

### Arquitectura cookie (dev cross-port)

Admin (`:3001`) y API (`:3002`) son orígenes distintos. Patrón **BFF**:

```txt
Browser → POST /api/auth/login (admin Route Handler)
       → POST /auth/login (API, server-to-server)
       ← JWT en Set-Cookie de API
Admin Route Handler → Set-Cookie access_token en dominio :3001
RSC apiFetch → reenvía Cookie access_token a API :3002
```

### Archivos a crear

| Archivo | Responsabilidad |
| ------- | --------------- |
| `apps/admin/middleware.ts` | Proteger `(dashboard)/*`; redirect `/login` |
| `apps/admin/lib/auth/types.ts` | `AuthUser`, `AdminSession` |
| `apps/admin/lib/auth/session.ts` | `getSession()`, `requireSession()` vía `GET /auth/me` |
| `apps/admin/lib/auth/nav-context.ts` | `sessionToNavContext(user)` |
| `apps/admin/lib/auth/active-tenant.ts` | Cookie `active_tenant_id` para SUPER_ADMIN |
| `apps/admin/app/api/auth/login/route.ts` | BFF login → set cookie admin |
| `apps/admin/app/api/auth/logout/route.ts` | BFF logout → clear cookies |
| `apps/admin/components/auth/login-form.tsx` | Formulario client con validación UI |

### Archivos a modificar

| Archivo | Cambio |
| ------- | ------ |
| `apps/admin/app/(auth)/login/page.tsx` | Formulario real (reemplazar placeholder) |
| `apps/admin/app/(auth)/layout.tsx` | Redirect si ya autenticado |
| `apps/admin/app/(dashboard)/layout.tsx` | Cargar sesión; pasar nav context |
| `apps/admin/lib/api/client.ts` | Reenviar cookies (`cookies()` → `Cookie` header); `X-Tenant-Id` si SUPER_ADMIN |
| `apps/admin/lib/tenant/get-admin-context.ts` | Prioridad sesión > `ADMIN_DEV_*` |
| `apps/admin/components/layout/MainSidebar.tsx` | Nav context real; logout → `/api/auth/logout` |
| `apps/admin/components/layout/MainHeader.tsx` | Iniciales / nombre usuario |
| `apps/admin/components/layout/nav-config.ts` | Eliminar export `DEV_NAV_CONTEXT` o marcar deprecated |
| `apps/admin/components/shared/api-error-panel.tsx` | Mensaje 401 → redirect login |
| `apps/admin/.env.example` | Documentar auth vars; marcar `ADMIN_DEV_*` como fallback dev |
| `apps/admin/README.md` | Flujo login, variables, quitar referencia solo placeholder |

### Archivos opcionales v1 mínimo (TenantSwitcher)

| Archivo | Alcance v1 |
| ------- | ---------- |
| `apps/admin/components/layout/tenant-switcher.tsx` | Selector básico SUPER_ADMIN + cookie `active_tenant_id` |

Si se difiere UI switcher: SUPER_ADMIN opera con empty state hasta seleccionar tenant vía cookie manual en dev — **no recomendado**; incluir switcher mínimo en Fase 5.

### Middleware matcher

```ts
export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

Rutas `(dashboard)/*` protegidas; `/login` y `/api/auth/*` públicas.

### Riesgos Fase 5

| Riesgo | Mitigación |
| ------ | ---------- |
| Server Components no reenvían cookie | Centralizar en `apiFetch` con `import { cookies } from "next/headers"` |
| Loop redirect login ↔ dashboard | Middleware solo chequea presencia cookie; validación en layout vía `/auth/me` |
| `ADMIN_DEV_*` en prod | Documentar prohibición; optional runtime warning |
| CORS credentials mal configurado | Verificar `CORS_ORIGIN=http://localhost:3001` en api dev |

### Criterio de done

- [ ] Login UI funcional end-to-end
- [ ] Dashboard inaccesible sin sesión
- [ ] Logout limpia sesión
- [ ] Sidebar filtra por rol real
- [ ] Property CRUD funciona con sesión (sin `ADMIN_DEV_*`)
- [ ] SUPER_ADMIN puede operar con tenant seleccionado

---

## Fase 6 — Seeds

**Objetivo:** datos reproducibles para desarrollo local.

### Archivos a crear

| Archivo | Responsabilidad |
| ------- | --------------- |
| `apps/api/prisma/seed.ts` | Tenant demo + 3 usuarios + passwords hasheados |
| `apps/api/prisma/seed-data.ts` | Constantes (emails, roles) separadas del script |

### Archivos a modificar

| Archivo | Cambio |
| ------- | ------ |
| `apps/api/package.json` | `"prisma": { "seed": "ts-node ..." }` o `tsx prisma/seed.ts` |
| `apps/api/README.md` | Instrucciones seed + credenciales dev |
| `docs/02-architecture/monorepo.md` | Paso seed en setup local |
| `PROJECT_STATE.md` | Auth seeds documentados |

### Datos seed

| Entidad | Rol | `tenantId` | Email sugerido |
| ------- | --- | ---------- | -------------- |
| User | `SUPER_ADMIN` | `null` | `super@valorar.dev` |
| User | `TENANT_ADMIN` | tenant demo | `admin@demo.valorar.dev` |
| User | `AGENT` | tenant demo | `agent@demo.valorar.dev` |

| Entidad | Datos |
| ------- | ----- |
| `Tenant` | `name: Demo Inmobiliaria`, `slug: demo` |
| `TenantSetting` | Opcional — branding mínimo |

Password dev única documentada en README (ej. `ValorarDev2026!`) — **no hardcodear en código commiteado**; usar env `SEED_DEFAULT_PASSWORD` en seed script.

### Comando

```bash
cd apps/api
npx prisma db seed
```

### Riesgos Fase 6

| Riesgo | Mitigación |
| ------ | ---------- |
| Seed idempotente | Upsert por email |
| Password en repo | Solo via env var en seed |
| Seed en prod accidental | Guard clause `if (process.env.NODE_ENV === 'production')` |

### Criterio de done

- [ ] `npx prisma db seed` crea tenant + 3 usuarios
- [ ] Login funciona con cada rol
- [ ] README documenta credenciales dev

---

## Resumen de archivos

### Crear (total: ~28)

```txt
apps/api/prisma/migrations/<timestamp>_auth_foundation/migration.sql
apps/api/prisma/seed.ts
apps/api/prisma/seed-data.ts
apps/api/src/modules/auth/auth.module.ts
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
apps/api/src/modules/auth/dto/login.dto.ts
apps/api/src/modules/auth/dto/auth-user-response.dto.ts
apps/api/src/modules/auth/strategies/jwt.strategy.ts
apps/api/src/modules/auth/utils/password.util.ts
apps/api/src/modules/auth/utils/cookie.util.ts
apps/api/src/modules/auth/constants/auth.constants.ts
apps/api/src/modules/auth/guards/jwt-auth.guard.ts
apps/api/src/modules/auth/guards/roles.guard.ts
apps/api/src/modules/auth/guards/tenant.guard.ts
apps/api/src/common/types/authenticated-user.type.ts
apps/api/src/common/decorators/roles.decorator.ts
apps/api/src/common/decorators/require-tenant.decorator.ts
apps/api/src/common/decorators/current-user.decorator.ts
apps/api/src/common/decorators/current-tenant.decorator.ts
apps/admin/middleware.ts
apps/admin/lib/auth/types.ts
apps/admin/lib/auth/session.ts
apps/admin/lib/auth/nav-context.ts
apps/admin/lib/auth/active-tenant.ts
apps/admin/app/api/auth/login/route.ts
apps/admin/app/api/auth/logout/route.ts
apps/admin/components/auth/login-form.tsx
apps/admin/components/layout/tenant-switcher.tsx          # recomendado v1
```

### Modificar (total: ~35)

```txt
apps/api/prisma/schema.prisma
apps/api/package.json
apps/api/src/app.module.ts
apps/api/src/main.ts
apps/api/.env.example
apps/api/src/modules/property/property.module.ts
apps/api/src/modules/property/controllers/property.controller.ts
apps/api/src/modules/property/dto/create-property.dto.ts
apps/api/src/modules/property/dto/property-query.dto.ts
apps/api/src/modules/property-listing/property-listing.module.ts
apps/api/src/modules/property-listing/controllers/property-listing.controller.ts
apps/api/src/modules/property-listing/dto/create-property-listing.dto.ts
apps/api/src/modules/property-listing/dto/property-listing-query.dto.ts
apps/api/src/modules/property-price/property-price.module.ts
apps/api/src/modules/property-price/controllers/property-price.controller.ts
apps/api/src/modules/property-price/dto/create-property-price.dto.ts
apps/api/src/modules/property-price/dto/property-price-query.dto.ts
apps/api/src/modules/property-image/property-image.module.ts
apps/api/src/modules/property-image/controllers/property-image.controller.ts
apps/api/src/modules/property-image/dto/create-property-image.dto.ts
apps/api/src/modules/property-image/dto/property-image-query.dto.ts
apps/admin/app/(auth)/login/page.tsx
apps/admin/app/(auth)/layout.tsx
apps/admin/app/(dashboard)/layout.tsx
apps/admin/lib/api/client.ts
apps/admin/lib/api/property.ts
apps/admin/lib/api/property-listing.ts
apps/admin/lib/api/property-price.ts
apps/admin/lib/api/property-image.ts
apps/admin/lib/tenant/get-admin-context.ts
apps/admin/components/layout/MainSidebar.tsx
apps/admin/components/layout/MainHeader.tsx
apps/admin/components/layout/nav-config.ts
apps/admin/components/shared/api-error-panel.tsx
apps/admin/.env.example
apps/admin/README.md
docs/03-database/current-schema.md
docs/04-modules/properties.md
docs/04-modules/auth.md
docs/07-admin/admin-modules.md
docs/02-architecture/monorepo.md
PROJECT_STATE.md
```

---

## Riesgos globales

| # | Riesgo | Severidad | Mitigación |
| - | ------ | --------- | ---------- |
| 1 | Breaking change API admin (`tenantId` removido) | Alta | PR única Fase 4+5; no deploy parcial |
| 2 | Cookie cross-port en dev | Alta | Patrón BFF documentado en Fase 5 |
| 3 | Usuarios existentes sin password post-migración | Media | Seed Fase 6; verificar DB antes de Fase 1 |
| 4 | `JWT_SECRET` no configurado | Alta | Fail fast en bootstrap |
| 5 | Public API rota por guards globales | Alta | Guards solo en controllers admin, no global APP_GUARD |
| 6 | SUPER_ADMIN bloqueado sin TenantSwitcher | Media | Incluir switcher mínimo en Fase 5 |
| 7 | Regresión Property CRUD admin | Alta | Checklist manual post-implementación |
| 8 | `Tenant.isActive` diferido | Baja | Documentado; login no valida tenant inactive hasta migración futura |

---

## Checklist de aceptación final (Auth Foundation v1)

Referencia: `docs/04-modules/auth.md` § Criterios de aceptación.

1. Login → dashboard OK
2. Sin sesión → redirect `/login`
3. Logout → dashboard bloqueado
4. Admin API → `401` sin JWT
5. AGENT → `403` en rutas TENANT_ADMIN
6. `tenantId` no manipulable por cliente
7. SUPER_ADMIN + `X-Tenant-Id` operativo
8. Public API sin JWT intacta
9. Sin tablas auth nuevas
10. Docs actualizados

---

## Próximo paso

**Esperar aprobación explícita de este plan.**

Tras aprobación, implementar en orden Fase 1 → 6. Se recomienda **una PR por fase** o **PR combinada Fase 4+5** para evitar estado roto intermedio.

---

## Historial

| Versión | Fecha | Cambio |
| ------- | ----- | ------ |
| v1 | 2026-06-16 | Plan inicial post-aprobación auth.md |
