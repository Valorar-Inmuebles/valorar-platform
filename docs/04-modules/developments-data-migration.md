# Migración de emprendimientos (`local-developments-v1`)

Estado: **etapa 1.1 — audit / dry-run con localidades y estados resueltos**. La importación **no está autorizada**.

Rama: `feature/developments-data-migration`

---

## Alcance actual

Incluye:

* contrato de la fuente `migration-data/emprendimientos`;
* campo editorial `Development.sortOrder`;
* parser, inventario, overrides y planner;
* CLI `audit` y `dry-run`;
* tests de las reglas de normalización.

No incluye (todavía):

* escrituras en PostgreSQL;
* creación de filas `Development`;
* upload a R2 / storage;
* filas `MigrationSourceRef`;
* comando `import`;
* cleanup.

---

## Estructura del origen

Path por defecto (local, gitignored):

`migration-data/emprendimientos`

16 carpetas:

`NNN - Nombre público`

Cada carpeta tiene un `.txt` y imágenes `001`, `002`, … con extensión real (jpg/png/webp/gif).

* `001.*` es la portada.
* El orden de galería es el entero del stem, nunca mtime ni filesystem.
* `001` es el emprendimiento más nuevo / primero; `016` el más antiguo / último.

Las 16 carpetas se planifican como `Development`, **incluido** `013 - Dolores 226`.

---

## Nombres

Fuente canónica inicial: nombre de carpeta sin el prefijo `NNN -`.

Normalizaciones aprobadas por evidencia en el TXT:

| Carpeta | Título público |
| ------- | -------------- |
| `002 - Ramon Falcon 1691` | `Ramón Falcón 1691` |
| `014 - Los incas 5109` | `Los Incas 5109` |
| `015 - Camacua 372` | `Camacuá 372` |

El ordinal no forma parte del título.

---

## Mapeo

| Destino | Origen |
| ------- | ------ |
| `title` | carpeta (+ override de tildes) |
| `slug` | `slugifyTitle(title)` |
| `internalCode` | `DEV-001` … `DEV-016` |
| `sortOrder` | ordinal `1` … `16` |
| `shortDescription` | 1–2 frases comerciales, ≤ ~200 caracteres |
| `description` | texto plano, bloques separados por línea vacía |
| `status` | copy explícito; no inferir terminado por fecha vencida |
| `street` / `streetNumber` | parseo del título |
| geo | provincia Capital Federal + localidad solo si es inequívoca o hay override |
| `hasFinancing` / `financingDescription` | párrafo de cuotas o “consulte financiación” |
| `hasParkingSpaces` | mención de cocheras; cantidad solo si es explícita |
| `priceFrom` / `currency` | siempre `null` |
| features | solo slugs existentes con match inequívoco |
| tipologías | detectadas en el plan, **no persistidas** |
| imágenes | `001` portada `sortOrder=0`; resto correlativo |

`description` no usa HTML, Markdown ni headings `#`. No duplica título ni el párrafo de financiación estructurado.

---

## Excepciones (overrides versionados)

Definidos en `apps/api/src/modules/migration-developments/overrides/source-overrides.ts`.

Identidad geo estable: `provinceName` + `localityName` (y slugs derivados). **No** se hardcodean UUIDs de un ambiente. `provinceId` / `localityId` quedan `null` hasta el writer, que hará lookup contra el catálogo del ambiente objetivo.

| sourceId | Localidad | Status | Motivo extra |
| -------- | --------- | ------ | ------------ |
| 001 | Almagro (parser) | `UNDER_CONSTRUCTION` | |
| 002 | Caballito (parser) | `UNDER_CONSTRUCTION` | tildes en Ramón Falcón |
| 003 | Flores | `IN_PIT` | “Nuevo Flores” no es localidad de catálogo |
| 004 | Flores | `IN_PIT` | localidad no explícita; warning `STALE_DEVELOPMENT_STATUS` |
| 005 | Caballito | `UNDER_CONSTRUCTION` | localidad no explícita; warning `STALE_DEVELOPMENT_STATUS` |
| 006 | Flores | `UNDER_CONSTRUCTION` | localidad no explícita; warning `STALE_DEVELOPMENT_STATUS` |
| 007 | Flores (parser) | `UNDER_CONSTRUCTION` | encoding roto; warning `STALE_DEVELOPMENT_STATUS` |
| 008 | Flores | `COMPLETED` | localidad no explícita |
| 009 | Villa Luro | `COMPLETED` | localidad no explícita |
| 010 | Caballito (parser) | `COMPLETED` | TXT sin título |
| 011 | Flores (parser) | `COMPLETED` | copy sin estado explícito |
| 012 | Flores | `COMPLETED` | frase duplicada; warning `SOURCE_STATUS_OVERRIDDEN` (`UNDER_CONSTRUCTION` → `COMPLETED`) |
| 013 | Floresta | `COMPLETED` | copy de unidad/PH; se importa igual como Development; warning `UNIT_LIKE_COPY` |
| 014 | Villa Urquiza | `COMPLETED` | capitalización Los Incas |
| 015 | Flores (parser) | `COMPLETED` | `Camacua 372` → `Camacuá 372` / slug `camacua-372` |
| 016 | Flores | `COMPLETED` | localidad no explícita |

`UNRESOLVED_LOCALITY` solo se elimina cuando la provincia canónica existe, la localidad existe en esa provincia y el match de `search` es unívoco.

Si la localidad no está en el catálogo (seed CABA), el plan queda `blocked`, no se inserta la fila, y el dry-run agrupa el faltante en `missingCatalogEntries`.

---

## Catálogo geográfico (etapa 1.1)

Jerarquía real: `Country` → `Province` → `Locality` → `Neighborhood` (opcional). En CABA cada barrio es una **Locality**.

Alimentación:

* seed opt-in `SEED_GEO_CATALOG=true` desde `prisma/seed-data/provincias.sql` y `localidades.sql`;
* migraciones de datos puntuales (ej. `202608120001_add_parque_avellaneda_locality`);
* API `GET /geo/*` de solo lectura;
* **no** hay CRUD admin de localidades;
* el importador de emprendimientos **no** crea Provincia ni Localidad.

Provincia canónica de este lote:

* nombre: `Capital Federal`
* slug: `capital-federal`
* isoCode: `AR-C`
* aliases de `search`: Capital Federal, Ciudad Autónoma de Buenos Aires, CABA, Ciudad de Buenos Aires, Cap. Fed.

El dry-run valida **nombres/slugs** contra el catálogo CABA offline (misma lista de barrios que el seed). Los IDs reales (`cuid`) se resuelven en la etapa de importación contra el ambiente objetivo. No se usa `updatedAt` ni coincidencias aproximadas. Una localidad homónima de otra provincia (ej. Flores en Neuquén) no aplica.

---

## `sortOrder`

Campo `Development.sortOrder Int @default(0)`.

Consulta (admin, público, recientes):

1. `sortOrder ASC`
2. `createdAt DESC`
3. `id ASC`

No se usa `updatedAt` para ordenar emprendimientos.

Semántica:

* lote importado: `001 → 1` … `016 → 16`;
* alta posterior por ABM: default `0` → aparece **antes** del lote histórico;
* seeds actuales **no** crean emprendimientos;
* registros preexistentes reciben `0` al migrar (mismo comportamiento que un alta nueva).

El ABM no expone el campo en esta etapa. Un futuro orden manual asignaría enteros `< 1` (antes del lote) o `> 16` (después), o reescribiría el rango.

Las imágenes siguen usando `DevelopmentImage.sortOrder`.

Migración Prisma: `202608210001_development_sort_order`. **No aplicada** a bases remotas en esta etapa.

---

## Status

| Texto | Enum |
| ----- | ---- |
| terminado / a estrenar | `COMPLETED` |
| construcción / obra en desarrollo | `UNDER_CONSTRUCTION` |
| pozo / lanzamiento | `IN_PIT` |
| sin evidencia | `null` + `UNKNOWN_DEVELOPMENT_STATUS` |

Una fecha de entrega histórica **no** cambia el enum; solo agrega warning.

---

## Features

Matches inequívocos al catálogo existente (`pileta`, `sum`, `gimnasio`, `parrilla`, `ascensor`, `portero`, `aire-acondicionado`, `calefaccion`, `apto-profesional`, `uso-comercial`, `cochera-cubierta`, `cochera-fija`, …).

No se crean `PropertyFeature` nuevos. Laundry, solarium, jacuzzi, grupo electrógeno, bauleras y tarjeta magnética quedan en `unmatchedFeatures` y en `description`.

---

## Tipologías

`detectedTypologies` es informativo. `persistTypologies = false`. No hay plan de `DevelopmentTypology`.

---

## Identidad de fuente (futura importación)

| Campo | Valor |
| ----- | ----- |
| `sourceSystem` | `local-developments-v1` |
| `entityType` raíz | `development` |
| `sourceId` | `001` … `016` |
| imagen `entityType` | `development_image` |
| imagen `sourceId` | `{ordinal}:{filename}` p.ej. `001:001.png` |

`MigrationSourceRef` es reutilizable: la unique es `(tenantId, sourceSystem, sourceId, entityType)`. Houzez usa `wordpress-houzez` + `property`. No hay colisión.

`internalCode` (`DEV-001`) es visible para operadores; **no** es la clave de idempotencia.

Storage key futura (no se escribe aún):

`{tenantId}/migrations/local-developments-v1/{sourceId}/{filename}`

---

## Comandos

Desde `apps/api`:

```bash
npm run migration:developments -- audit
npm run migration:developments -- dry-run
npm run migration:developments -- audit --source-path="migration-data/emprendimientos"
npm run migration:developments -- dry-run --json
```

Desde la raíz del monorepo:

```bash
npm run migration:developments -w api -- audit
npm run migration:developments -w api -- dry-run
```

Códigos de salida:

* `0` éxito sin warnings;
* `2` warnings, sin bloqueantes;
* `1` errores/bloqueantes, o comando `import`.

`audit` y `dry-run` no abren Prisma ni S3. No hay conexión a producción.

El `dry-run` resuelve **nombres y slugs** de provincia/localidad contra el catálogo CABA offline. `provinceId` y `localityId` quedan `null` hasta la etapa de importación (lookup real contra DB, con target explícito). Si falta una localidad, el reporte incluye `missingCatalogEntries` y solo bloquea esos `sourceId`.

---

## Seguridad

* Origen explícito (`--source-path` o default resuelto desde la raíz del workspace).
* No se imprimen credenciales.
* `import` rechazado en esta etapa.
* No geocodificar. No inventar precios ni cantidades de cocheras.

---

## Pasos no autorizados

1. `prisma migrate deploy` / aplicar `202608210001_development_sort_order` en remoto.
2. Comando `import`.
3. Writes a `Development`, `DevelopmentImage`, `MigrationSourceRef`.
4. Upload R2.
5. Cleanup del lote.
