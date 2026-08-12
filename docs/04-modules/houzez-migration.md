# Migración Houzez → Valorar

Estado: **piloto WP 5312 importado en production** + pipeline **houzez-webp-v2** (trim conservador de letterbox + presentación 16:9 en UI).
Rama: `feature/houzez-migration` (desde `main`).

**E.5 (cerrada):** preflight read-only de production (33 props demo, MSR ausente, 7 keys R2 del piloto).
**E.6 (cerrada en código):** target production, gates Neon, cleanup dual, fingerprint v2, R2 preexisting.
**Import piloto:** WP 5312 escrito en production (13 filas + 7 WebP). Re-import bloqueado por idempotencia.
**Upgrade imágenes piloto:** comando operativo `migration:houzez:upgrade-pilot-images` (solo WP 5312, attachments 5315+5314, keys R2 nuevas `*.houzez-webp-v2.webp`, conserva v1).
**Pendiente autorizado:** continuar migración por lotes controlados (CLI 1×`--wp-id`) — **no automático**. Pipeline desbloqueado en código vía baseline `post-pilot-controlled`.

---

## Identidad production (owner-confirmada)

- Proyecto Neon único: `valorar-db`.
- Branch destino: `production` (principal/default).
- `DATABASE_URL` habitual apunta a ese branch (app); el CLI **nunca** la usa como destino.
- Destino CLI: `HOUZEZ_PRODUCTION_DATABASE_URL` (endpoint **directo**, sin `-pooler`).
- Fingerprint Neon auditado (E.5) exigido vía env + `current_setting` live:
  - `neon.project_id` / `neon.branch_id` / `neon.endpoint_id`
- Tenant: `demo` · Owner: `admin@demo.valorar.dev`
- Checkpoint previo: `checkpoint-pre-houzez-cleanup`
- Staging `staging-houzez`: solo prueba; no autoriza import production.

---

## Contrato aprobado (ola publish)

Alcance inicial:

- Solo propiedades `post_status = publish`.
- Excluidos: drafts, pending, expired, alquileres sin evidencia.
- Tenant: `demo`.
- Owner: `admin@demo.valorar.dev` → `createdById` + `assignedToId`.
- Emprendimientos Houzez: no hay origen migrable.
- Piloto: WP ID `5312`.

### Reglas de transformación (solo publish auditado)

| Campo                   | Regla                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Moneda                  | Markers `u$s` / `U$S` / `USD` en prefix/postfix → `USD`. Default USD solo dentro de ola publish venta. |
| `bedrooms`              | `fave_property_bedrooms` (entero). Nunca mapear a `rooms`.                                             |
| `rooms`                 | Parse del título (`N ambientes` / monoambiente). Si no hay → `null`.                                   |
| `bathrooms`             | Entero; `0` → `null` en no-habitables; `"2 y 1/2"` → baths=2 + halfBathrooms=1.                        |
| Superficie              | Solo size → `totalArea`; solo land → `totalArea`; ambos → covered=size, total=land. Unidad m².         |
| Coords Miami default    | Inválidas → `null`. Sin geocode automático en piloto.                                                  |
| `lotFront` / `lotDepth` | Ausentes en V1.                                                                                        |

Toda inferencia se registra en el reporte (`inferences[]`) con origen y regla.

### Piloto WP 5312

- Tipo `LAND`, listing `SALE` + `ACTIVE`, precio `195000 USD`
- `totalArea=202`, resto null según contrato
- **7 imágenes únicas** (galería Houzez = 6; `_thumbnail_id=5315` es una 7.ª fuera de la galería → se antepone como portada)
- Features: importar solo matches (`Uso Comercial`); omitir `Pavimento` con warning; no crear catálogo
- Sin geocodificación
- Optimización de imágenes (**houzez-webp-v2**):
  1. autorotación EXIF
  2. recorte conservador de relleno blanco/casi-blanco en bordes externos (`edge-fill-v1`, fail-closed)
  3. fit inside 1600×1200 sin ampliar
  4. WebP quality 82 / effort 4 + strip metadata
  - Dry-run e import comparten el mismo transformador; el import sube únicamente bytes WebP validados.
  - **Archivo almacenado:** proporción natural (nunca forzar 16:9, nunca padding, nunca deformar).
  - **Presentación UI:** cards/covers/miniaturas en contenedor 16:9 + `object-cover` + `object-center`; galería ampliada/lightbox con `object-contain` + fondo oscuro/neutro (el área libre del visor no es parte de la foto).
- Keys R2 determinísticas (siempre `.webp`; no reutilizar keys históricas `.jpg`/`.png` del passthrough):
  `{tenantId}/migrations/wordpress-houzez/5312/00-wp5315.webp` … `06-wp8965.webp`
- `PropertyImage` persiste `storageKey`, `mimeType=image/webp`, `fileSize` del WebP final (el schema no tiene width/height; dimensiones y metadata de trim viven en el plan/reporte/manifest).
- Metadata de trim por imagen (dry-run / manifest / import report): `trimApplied`, dimensiones original/trimmed, píxeles por lado, `reason`/`confidence`, hashes y bytes.

### Conteo `plannedEntities` (contrato dry-run)

`plannedEntities` **no** significa “filas que el writer insertará en DB”.

Es la lista de **elementos del plan/reporte** del dry-run (operaciones planificadas + artefacto de trazabilidad).

Para WP 5312 sin blockers, `plannedEntities.length = 12` (property + listing + price + 7 images + feature_assignment + batch_manifest).

**No** incluye: `PropertyAgentAccess`, `MigrationSourceRef`.

### Escrituras reales del writer (piloto 5312)

1 Property + 1 PropertyListing + 1 PropertyPrice + 7 PropertyImage + 1 PropertyFeatureAssignment + 1 PropertyAgentAccess + 1 MigrationSourceRef.

### Gate de baseline del árbol Property

El import distingue dos baselines seguros (sin `--force`):

| Modo | Condición | Efecto |
|------|-----------|--------|
| `initial-empty-tree` | Árbol Property del tenant vacío | Primer import (piloto) |
| `post-pilot-controlled` | Piloto WP `5312` presente + consistente; **todas** las Property del tenant trazadas por `MigrationSourceRef` (`wordpress-houzez` / `entityType=property`) | Imports posteriores uno a uno |
| `blocked` | Propiedades ajenas/sin MSR, piloto incompleto/inconsistente, MSR huérfano, etc. | Abortar |

Consistencia mínima del piloto WP 5312: 1 listing, 1 price, 7 images, 1 feature assignment, 1 agent access.

- Re-import del mismo WP ID → bloqueado por idempotencia (`SOURCE_ALREADY_IMPORTED` / `IDEMPOTENT_HIT`).
- CLI sigue siendo **un solo** `--wp-id` por invocación (sin mass/bulk).
- Dry-run post-piloto de otro WP ID registra warning `POST_PILOT_PRESERVE_PILOT` (no planifica mutar 5312).
- Cero overwrite R2 y cero DeleteObject se mantienen en el writer.

---

## Fases E.6–E.11 (plan operativo)

| Fase | Acción | Estado |
|------|--------|--------|
| **E.6** | Código + tests: target production, confirms, Neon fingerprint, cleanup dual, fingerprint v2, R2 preexisting, docs | **Hecho** |
| **E.7** | Backup/checkpoint + aplicar migración `202608070001_migration_source_ref` en production | **Hecho** (MSR presente en production) |
| **E.8** | Dry-run + execute cleanup demo (33 props) con confirms production | **Hecho** |
| **E.9** | Dry-run production WP 5312 (fingerprint ligado a production; localidad Flores exacta) | **Hecho** |
| **E.10** | Import piloto WP 5312 con dry-run production + confirms | **Hecho** |
| **E.11** | Validación visual/funcional + preflight idempotencia (segundo import rechazado) | **Hecho** |
| **Post-piloto** | Baseline `post-pilot-controlled` en código (permite lotes controlados 1×1) | **Hecho (código)** — import de lotes **aún no autorizado / no ejecutado** |

---
## Seguridad de conexión

El CLI `migration:houzez` **nunca** usa `DATABASE_URL` como destino ni como fallback.

### Staging

| Variable | Rol |
|----------|-----|
| `HOUZEZ_STAGING_DATABASE_URL` | Endpoint directo Neon (sin `-pooler`) |
| `HOUZEZ_STAGING_DB_HOST` | Hostname autorizado = host de la URL |
| `HOUZEZ_MIGRATION_TARGET` | Exactamente `staging-houzez` |

### Production

| Variable | Rol |
|----------|-----|
| `HOUZEZ_PRODUCTION_DATABASE_URL` | Endpoint **directo** del branch production (sin `-pooler`; no reutilizar staging URL) |
| `HOUZEZ_PRODUCTION_DB_HOST` | Hostname autorizado = host de la URL |
| `HOUZEZ_PRODUCTION_NEON_PROJECT_ID` | Debe coincidir con identidad E.5 |
| `HOUZEZ_PRODUCTION_NEON_BRANCH_ID` | Debe coincidir con identidad E.5 |
| `HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID` | Debe coincidir con identidad E.5 |
| `HOUZEZ_MIGRATION_TARGET` | Exactamente `production` |
| `HOUZEZ_CHECKPOINT_DATABASE_URL` | Checkpoint; host distinto de production |

Confirmaciones import:

| Target | `--confirm-target` | `--confirm-write` |
|--------|--------------------|-------------------|
| staging | `staging-houzez` | `IMPORT_ONE_HOUZEZ_PROPERTY` |
| production | `production` | `IMPORT_ONE_HOUZEZ_PROPERTY_PRODUCTION` |

Fingerprint dry-run **v2** incluye `migrationTarget`. Un reporte staging **no** autoriza import production.

`--skip-db` solo para audit/dry-run; **import lo rechaza**.

---

## Cleanup demo (production)

CLI: `npm run migration:houzez:cleanup-demo`

- Solo `--tenant=demo`.
- Elimina árbol Property (CASCADE) del tenant; conserva Tenant, User, geo, PropertyFeature, TenantSetting.
- R2: solo allowlist de seeds `tenants/demo/properties/…` — **nunca** keys `…/migrations/wordpress-houzez/5312/`.
- Conteos esperados (E.5): Property=33, Listing=36, Price=38, Image=129, FeatureAssignment=104, AgentAccess=0.
- Execute exige `--confirm-target=production` + `--confirm-token=DELETE-DEMO-PROPERTIES-PRODUCTION` (+ manifest/hash).
- Staging conserva token `DELETE-DEMO-PROPERTIES-STAGING`.

---

## Manifiesto del dataset

`apps/api/src/modules/migration-houzez/dataset/houzez-dataset-manifest.v1.json`

- `manifestId`: `houzez-sql-dump-v1`
- Seis fragmentos `valorar-houzez-001.sql` … `006.sql`
- `sha256` + `bytes` por fragmento

---

## CLI

```bash
cd apps/api

# Dry-run production (tras E.7–E.8; requiere env production)
npm run migration:houzez -- dry-run --wp-id=5312 --tenant=demo \
  --owner-email=admin@demo.valorar.dev --source-dir=<migration-data> \
  --report-dir=<reports/e9-prod-dry-run-5312>

# Import production (solo tras dry-run production aprobado)
npm run migration:houzez -- import \
  --wp-id=5312 \
  --tenant=demo \
  --owner-email=admin@demo.valorar.dev \
  --source-dir=<migration-data> \
  --dry-run-report=<reports/e9-prod-dry-run-5312>/houzez-dry-run-5312.json \
  --confirm-target=production \
  --confirm-write=IMPORT_ONE_HOUZEZ_PROPERTY_PRODUCTION
```

Import: un solo `--wp-id`; sin multi/mass/glob; confirmaciones duales; MSR obligatorio; árbol vacío; R2 preexisting compatible.

### Upgrade imágenes piloto (WP 5312 → houzez-webp-v2)

Solo attachments que cambian con `edge-fill-v1` (`5315`, `5314`). Sube keys **nuevas** versionadas y actualiza exactamente 2 filas `PropertyImage`. Conserva keys v1. No usa `import`.

```bash
cd apps/api

# Preflight (sin escrituras) — exige HOUZEZ_MIGRATION_TARGET=production + gates Neon/R2
npm run migration:houzez:upgrade-pilot-images -- \
  --wp-id=5312 \
  --tenant=demo \
  --owner-email=admin@demo.valorar.dev \
  --approved-manifest=../../migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/preparation-manifest.json \
  --confirm-target=production \
  --confirm-write=UPGRADE_PILOT_IMAGES_WEBP_V2_PRODUCTION

# Escritura controlada (una sola ejecución)
npm run migration:houzez:upgrade-pilot-images -- \
  --wp-id=5312 \
  --tenant=demo \
  --owner-email=admin@demo.valorar.dev \
  --approved-manifest=../../migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/preparation-manifest.json \
  --confirm-target=production \
  --confirm-write=UPGRADE_PILOT_IMAGES_WEBP_V2_PRODUCTION \
  --execute
```

Keys propuestas:

- `…/5312/00-wp5315.houzez-webp-v2.webp`
- `…/5312/04-wp5314.houzez-webp-v2.webp`

Manifest aprobado (SHA-256): `3813083d41e9e1e1ad636a7984b66449e638f2f2b7e45d52b3318851380f91a1`

---

## Lectura SQL

- Seis fragmentos en orden `valorar-houzez-001` … `006`
- Streaming por statement; prefijo real: `val_`
- No se restaura el dump sobre bases del proyecto

---

## Límite de imágenes

`MAX_PROPERTY_IMAGES = 30` **sin cambiar**.

Bloqueadas hasta subir el límite a 50: WP `12559` (33), `11928` (40).

---

## Backup obligatorio antes de escritura remota

Antes de `migrate deploy`, cleanup execute o import:

1. Confirmar checkpoint Neon (`checkpoint-pre-houzez-cleanup` u otro snapshot inmediato)
2. `pg_dump` custom format a `backups/` (fuera de Git)
3. Validar con `pg_restore --list`
4. Restore de prueba solo en branch/DB aislada — **nunca** `pg_restore --clean` sobre destino

---

## Prohibiciones (hasta autorización por fase)

- Ejecutar E.7–E.11 sin OK explícito
- Reutilizar dry-run staging E.2/E.3 para import production
- Sobrescribir o borrar las 7 keys R2 del piloto
- `prisma db seed` / `SEED_DEMO_PROPERTIES` sobre production
- `prisma db push`
- Commit/push sin autorización
