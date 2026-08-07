# Migración Houzez → Valorar

Estado: infraestructura **audit / dry-run / import individual** (writer local) + safety staging.
Rama: `feature/houzez-migration` (desde `main`).

**Fase D (local):** idempotencia `MigrationSourceRef` + writer seguro de una propiedad + fingerprint dry-run↔import.
**No autorizado aún:** `migrate deploy`, import real contra staging, R2 real, Neon desde esta fase, commit/push.

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

### Conteo `plannedEntities` (contrato dry-run)

`plannedEntities` **no** significa “filas que el writer insertará en DB”.

Es la lista de **elementos del plan/reporte** del dry-run (operaciones planificadas + artefacto de trazabilidad).

Para WP 5312 sin blockers, `plannedEntities.length = 12`:

1. `property`
2. `property_listing`
3. `property_price`
4–10. siete `property_image` (payload incluye `sha256` del binario local)
11. `property_feature_assignment`
12. `batch_manifest` — **artefacto de plan/reporte**, no una tabla Prisma ni un INSERT del writer. Agrupa `wpId`, `oldUrl` e `inferences` bajo el `batchId` para trazabilidad/rollback futuro.

**No** incluye:

- `PropertyAgentAccess` (el writer lo crea aparte para el owner)
- `MigrationSourceRef` (control de idempotencia; el writer lo inserta en la misma TX)

Semántica propuesta (sin rename en esta fase): mantener el nombre `plannedEntities` por compatibilidad con reportes ya generados; documentar explícitamente “plan items”, no “DB rows”. Un rename futuro (`plannedPlanItems` / separar `controlEntities`) requeriría versión de reporte y actualización de consumidores.

### Escrituras reales del writer (piloto 5312)

1 Property + 1 PropertyListing + 1 PropertyPrice + 7 PropertyImage + 1 PropertyFeatureAssignment + 1 PropertyAgentAccess + 1 MigrationSourceRef.

### Política futura post-piloto (documentada; no habilitada)

Separar tres conceptos:

1. **Safety baseline de staging** — target `staging-houzez`, gates de host/URL, tenant ACTIVE, owner resoluble, geo/feature piloto, schema `MigrationSourceRef` presente.
2. **Idempotencia individual** — unique `(tenantId, sourceSystem, sourceId, entityType=property)`; pre-check + P2002.
3. **Árbol Property vacío** — gate del **primer piloto** únicamente (`propertyTreeEmpty` / `PROPERTY_TREE_NOT_EMPTY`).

Después de importar `5312`, un dry-run/import de otra propiedad **fallaría hoy** con `PROPERTY_TREE_NOT_EMPTY` / baseline no vacío. Eso es intencional hasta autorización.

Cambio mínimo futuro (no implementar ahora):

- Introducir modo/flag explícito p.ej. `requireEmptyPropertyTree` (default `true` mientras dure el piloto).
- Tras piloto aprobado: permitir import individuales sucesivos con `requireEmptyPropertyTree=false`, manteniendo:
  - mismo tenant;
  - `--wp-id` individual obligatorio;
  - `MigrationSourceRef` + rechazo de duplicados;
  - verificaciones estructurales (tenant/owner/feature/geo/schema);
  - sin import masivo / multi-id / `all` / glob.
- No vaciar staging entre las otras 18.

### Regla definitiva de imágenes

1. Resolver `_thumbnail_id`
2. Resolver `fave_property_images` en orden original
3. Si la portada ∈ galería → conservar su posición como portada, sin duplicar
4. Si la portada ∉ galería → anteponerla
5. Deduplicar por attachment ID y luego por hash de contenido
6. Registrar diferencias entre cantidad de galería y cantidad final
7. Nunca descartar la portada en silencio

---

## Trazabilidad: `MigrationSourceRef`

Migración Prisma preparada (no aplicada): `202608070001_migration_source_ref`.

Campos: `tenantId`, `entityType`, `entityId`, `sourceSystem`, `sourceId`, `migrationBatchId`, `metadata`, timestamps.

Unique: `(tenantId, sourceSystem, sourceId, entityType)`.

Índices: `migrationBatchId`; `(tenantId, entityType, entityId)`; `(tenantId, sourceSystem, migrationBatchId)`.

Identidad de origen (piloto):

- `sourceSystem = wordpress-houzez`
- `sourceId =` ID WordPress
- `entityType = property`
- `entityId =` id de la `Property` creada

**Limitación explícita:** `entityId` **no** es FK polimórfica. PostgreSQL no puede garantizar integridad referencial hacia Property | Listing | Price | Image | … desde una sola columna. La integridad es responsabilidad de la aplicación.

Garantía de idempotencia:

1. Pre-check legible (`SOURCE_ALREADY_IMPORTED`)
2. Insert de `MigrationSourceRef` en la misma transacción del árbol Property
3. Violación unique (`P2002`) → rollback completo + compensación de uploads de esa ejecución

### Política por modo

| Modo               | `MigrationSourceRef` ausente                                          |
| ------------------ | --------------------------------------------------------------------- |
| `dry-run`          | **Warning** + `importBlockers[]` (no bloquea el plan; sin escrituras) |
| `import` / `write` | **Blocker** obligatorio                                               |

---

## Writer seguro (una propiedad)

Flujo:

1. Safety gates staging
2. Manifiesto dataset
3. Preflight
4. Resolución tenant/owner/catálogos
5. Pre-check `MigrationSourceRef`
6. Preparación local de imágenes
7. Uploads vía `MigrationObjectStore` (inyectable; tests = fake en memoria)
8. Una transacción PostgreSQL: Property → Listing → Price → Images → FeatureAssignment → AgentAccess → MigrationSourceRef
9. Reporte sanitizado

### Frontera DB / R2

PostgreSQL y object storage **no** comparten transacción.

Claves determinísticas:

`{tenantId}/migrations/wordpress-houzez/{sourceId}/{sortOrder}-wp{attachmentId}.{ext}`

- Fallo de upload → no confirma DB; compensa solo keys escritas en esa ejecución
- Fallo de DB tras upload → rollback DB + compensación de keys propias
- Fallo de compensación → error explícito + `pendingKeys` en reporte
- Objetos **preexistentes** en reintento: se reutilizan, **no** se borran

---

## Vinculación dry-run ↔ import

Todo dry-run genera `reportFingerprint` (SHA256 del payload normalizado con claves ordenadas).

Import exige `--dry-run-report` y valida en dos capas:

1. **Integridad del reporte:** recalcula el fingerprint desde los campos del JSON y debe coincidir con `reportFingerprint` (detecta edición parcial).
2. **Recomputación live independiente:** vuelve a parsear SQL + hashear imágenes locales + resolver catálogos, reconstruye el plan y exige que ese fingerprint live == `reportFingerprint` aprobado. Forjar payload+fingerprint en el JSON **no basta** si el origen en disco no cambió igual.

También compara wp-id, tenant, owner, `manifestId` y digests de fragmentos (contra el manifiesto versionado y contra los SQL actuales).

Cobertura de imágenes: el fingerprint incluye `sha256` por imagen del plan (contenido binario local). No embebe el blob en el JSON; el import recalcula hashes desde `uploads/` y debe coincidir.

---

## Seguridad de conexión

El CLI `migration:houzez` **nunca** usa `DATABASE_URL` como destino ni como fallback.

Para dry-run/import con DB se exige:

| Variable                      | Rol                                                                   |
| ----------------------------- | --------------------------------------------------------------------- |
| `HOUZEZ_STAGING_DATABASE_URL` | Endpoint directo Neon (sin `-pooler`)                                 |
| `HOUZEZ_STAGING_DB_HOST`      | Hostname autorizado; debe coincidir exactamente con el host de la URL |
| `HOUZEZ_MIGRATION_TARGET`     | Debe ser exactamente `staging-houzez`                                 |

`--skip-db` solo para audit/dry-run; **import lo rechaza**.

---

## Manifiesto del dataset

`apps/api/src/modules/migration-houzez/dataset/houzez-dataset-manifest.v1.json`

- `manifestId`: `houzez-sql-dump-v1`
- Seis fragmentos `valorar-houzez-001.sql` … `006.sql`
- `sha256` + `bytes` por fragmento (incluidos en reportes como `fragmentDigests`)

---

## CLI

```bash
cd apps/api
npm run migration:houzez -- audit --source-dir <migration-data> --report-dir <reports>
npm run migration:houzez -- dry-run --wp-id=5312 --tenant=demo --owner-email=admin@demo.valorar.dev
npm run migration:houzez -- dry-run --skip-db --wp-id=5312
npm run migration:houzez -- import \
  --wp-id=5312 \
  --tenant=demo \
  --owner-email=admin@demo.valorar.dev \
  --source-dir=<migration-data> \
  --dry-run-report=<reports>/houzez-dry-run-5312.json \
  --confirm-target=staging-houzez \
  --confirm-write=IMPORT_ONE_HOUZEZ_PROPERTY
```

Import: un solo `--wp-id` (sin default); sin multi/mass/glob/rangos; confirmaciones duales obligatorias.

`audit` y `dry-run` siguen con `wouldWrite=false` y sin escritura.

---

## Lectura SQL

- Seis fragmentos en orden `valorar-houzez-001` … `006`
- Streaming por statement (`;` fuera de quotes), **manteniendo estado entre los 6 fragmentos**
- Prefijo real: `val_`
- No se restaura el dump sobre bases del proyecto

---

## Límite de imágenes

`MAX_PROPERTY_IMAGES = 30` **sin cambiar**.

Bloqueadas hasta subir el límite a 50 (decisión posterior):

- WP `12559` (33)
- WP `11928` (40)

---

## Backup obligatorio antes de escritura remota

Antes de `migrate deploy` o cualquier import real:

1. Branch/snapshot Neon del ambiente
2. `pg_dump` custom format a `backups/` (fuera de Git)
3. Validar con `pg_restore --list`
4. Restore de prueba solo en branch/DB aislada — **nunca** `pg_restore --clean` sobre destino

---

## Prohibiciones durante esta etapa

- `prisma db seed` / cualquier seed / `SEED_DEMO_PROPERTIES`
- migraciones Prisma aplicadas a staging sin autorización
- cleanup / import real / PutObject / DeleteObject contra R2 de staging
- DML o DDL fuera de procedimientos autorizados
- `prisma db push`
