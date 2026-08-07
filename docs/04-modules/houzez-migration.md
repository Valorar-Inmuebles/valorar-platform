# Migración Houzez → Valorar

Estado: infraestructura **audit / dry-run** (sin escritura) + **hardening de conexión staging** (Fase A).  
Rama: `feature/houzez-migration` (desde `main`).

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

**Limitación explícita:** `entityId` **no** es FK polimórfica. PostgreSQL no puede garantizar integridad referencial hacia Property | Listing | Price | Image | … desde una sola columna. La integridad es responsabilidad de la aplicación.

`MigrationSourceRef` **no** es rollback por sí solo. El importador debe registrar todas las entidades del batch. Rollback futuro:

1. Seleccionar solo entidades del `migrationBatchId`
2. Comprobar que no fueron editadas/usadas fuera de la migración
3. Dry-run primero
4. Borrar en orden transaccional seguro
5. No tocar catálogos globales ni preexistentes
6. Reportar exactamente qué eliminaría/eliminó

### Política por modo

| Modo               | `MigrationSourceRef` ausente                                          |
| ------------------ | --------------------------------------------------------------------- |
| `dry-run`          | **Warning** + `importBlockers[]` (no bloquea el plan; sin escrituras) |
| `import` / `write` | **Blocker** obligatorio (modo aún deshabilitado)                      |

---

## Seguridad de conexión (Fase A)

El CLI `migration:houzez` **nunca** usa `DATABASE_URL` como destino ni como fallback.

Para cualquier dry-run con acceso DB (sin `--skip-db`) se exige:

| Variable                      | Rol                                                                   |
| ----------------------------- | --------------------------------------------------------------------- |
| `HOUZEZ_STAGING_DATABASE_URL` | Endpoint directo Neon (sin `-pooler`)                                 |
| `HOUZEZ_STAGING_DB_HOST`      | Hostname autorizado; debe coincidir exactamente con el host de la URL |
| `HOUZEZ_MIGRATION_TARGET`     | Debe ser exactamente `staging-houzez`                                 |

Barreras adicionales:

- Host staging ≠ host de `HOUZEZ_CHECKPOINT_DATABASE_URL` (si está definida)
- Host staging ≠ host de `DATABASE_URL` (si está definida)
- Sin ambigüedad entre staging, checkpoint y conexión ordinaria
- Errores solo muestran target + hostname sanitizado (nunca connection strings ni secretos)

`HOUZEZ_CLEANUP_TARGET` es exclusivo del CLI de cleanup y **no** se reutiliza aquí.

`--skip-db` es el único modo permitido para audit/dry-run sin variables ni conexión DB.

---

## Manifiesto del dataset

Manifiesto versionable (sin dumps en Git):

`apps/api/src/modules/migration-houzez/dataset/houzez-dataset-manifest.v1.json`

- `manifestId`: `houzez-sql-dump-v1`
- Seis fragmentos `valorar-houzez-001.sql` … `006.sql`
- `sha256` + `bytes` por fragmento

Validación local **antes** del parseo del dump (audit y dry-run):

- Faltantes / extras `valorar-houzez-*.sql` / hash o tamaño distinto → **falla**
- No se auto-actualiza el manifiesto; requiere revisión del owner

Los dumps y `uploads/` viven fuera de Git (`migration-data/`).

---

## CLI

```bash
cd apps/api
npm run migration:houzez -- audit --source-dir <migration-data> --report-dir <reports>
npm run migration:houzez -- dry-run --wp-id=5312 --tenant=demo --owner-email=admin@demo.valorar.dev
npm run migration:houzez -- dry-run --skip-db --wp-id=5312
```

Opciones: `--statuses`, `--batch-id`, `--skip-db`.

Modo `import`/`write`: **deshabilitado** en esta fase (writer inexistente).

Ambos modos reportan `wouldWrite=false`.

### Preflight (estructura lista; ejecución remota en fase posterior)

El dry-run con DB ejecuta preflight de solo lectura:

- tenant `demo` ACTIVE + owner resoluble
- Property tree en cero
- feature piloto `uso-comercial`
- catálogo geo disponible
- presencia/ausencia de `MigrationSourceRef`
- baseline informativo de Users / Development (no gates rígidos)

---

## Lectura SQL

- Seis fragmentos en orden `valorar-houzez-001` … `006`
- Streaming por statement (`;` fuera de quotes), **manteniendo estado entre los 6 fragmentos** (el dump parte sentencias a mitad de archivo).
- Se ignoran comentarios `--` / `/* */` previos al verbo SQL (si no, un `INSERT` tras comentarios no se detectaba).
- Tokenizer de VALUES con escapes/comillas/multilínea
- Prefijo real: `val_`
- No se restaura el dump sobre bases del proyecto

---

## Límite de imágenes

`MAX_PROPERTY_IMAGES = 30` **sin cambiar**.

Bloqueadas hasta subir el límite a 50 (decisión posterior):

- WP `12559` (33)
- WP `11928` (40)

El importador **bloquea** explícitamente; nunca trunca en silencio.

La regla de merge portada/galería/dedupe está en la sección anterior. Parser SQL: **específico para este dump Houzez** (no es un motor SQL general).

---

## Backup obligatorio antes de escritura

Antes de `migrate deploy` o cualquier import:

1. Branch/snapshot Neon del ambiente
2. `pg_dump` custom format a `backups/` (fuera de Git)
3. Validar con `pg_restore --list`
4. Restore de prueba solo en branch/DB aislada — **nunca** `pg_restore --clean` sobre destino

---

## URL antigua

Reconstruir desde `home`/`siteurl` + `permalink_structure` + `post_date` + `post_name`.

Si faltan tokens resolubles: conservar `oldSlug` + `postDate`, marcar `oldUrl` unverified — no inventar.

---

## Prohibiciones durante esta etapa

- `prisma db seed` / cualquier seed / `SEED_DEMO_PROPERTIES`
- migraciones Prisma aplicadas a staging sin autorización
- cleanup / import / PutObject / DeleteObject
- DML o DDL fuera de procedimientos autorizados
