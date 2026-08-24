# Migración de emprendimientos (`local-developments-v1`)

Estado: **carga del lote `local-developments-v1` completada** en el Neon auditado / bucket `valorarinmuebles-images-prod` / tenant `demo` (16 Development, 87 imágenes, 16 portadas). `--target=development` sigue gated a un ambiente de desarrollo. `--target=production` exige `--confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION`.

Rama: `feature/developments-data-migration`

---

## Alcance actual

Incluye:

* contrato de la fuente `migration-data/emprendimientos`;
* campo editorial `Development.sortOrder`;
* parser, inventario, overrides y planner;
* CLI `audit`, `dry-run`, `preflight` e `import`;
* writer idempotente (`Development`, `DevelopmentImage`, `DevelopmentFeatureAssignment`, `MigrationSourceRef`);
* upload/reutilización de objetos en keys determinísticas;
* tests de las reglas de normalización y del writer.

No incluye:

* drag-and-drop de orden en el ABM;
* persistencia de `DevelopmentTypology`;
* creación de `Property`.

Cleanup del lote: comando acotado `cleanup --dry-run` / `cleanup --execute` (ver más abajo). No es un rollback general.

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

Villa Luro (`villa-luro`) y Floresta (`floresta`) se incorporan con la migración de datos `202608210002_add_villa_luro_floresta_localities` bajo provincia `capital-federal` / `AR-C`. No se crea una provincia nueva ni un CRUD de localidades.

---

## Catálogo geográfico (etapa 1.1)

Jerarquía real: `Country` → `Province` → `Locality` → `Neighborhood` (opcional). En CABA cada barrio es una **Locality**.

Alimentación:

* seed opt-in `SEED_GEO_CATALOG=true` desde `prisma/seed-data/provincias.sql` y `localidades.sql`;
* migraciones de datos puntuales (ej. `202608120001_add_parque_avellaneda_locality`, `202608210002_add_villa_luro_floresta_localities`);
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

Migración Prisma: `202608210001_development_sort_order`. Aplicar con `npx prisma migrate deploy` contra el destino autorizado. No usar `migrate reset`, `db push` ni `migrate dev` contra Neon compartido.

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

## Identidad de fuente

| Campo | Valor |
| ----- | ----- |
| `sourceSystem` | `local-developments-v1` |
| `entityType` raíz | `development` |
| `sourceId` | `001` … `016` |
| imagen `entityType` | `development_image` |
| imagen `sourceId` | `{ordinal}:{filename}` p.ej. `001:001.png` |

`MigrationSourceRef` es reutilizable: la unique es `(tenantId, sourceSystem, sourceId, entityType)`. Houzez usa `wordpress-houzez` + `property`. No hay colisión.

`internalCode` (`DEV-001`) es visible para operadores; **no** es la clave de idempotencia.

Storage key:

`{tenantId}/migrations/local-developments-v1/{sourceId}/{filename}`

Antes de subir se hace HEAD. Si el objeto existe y metadata/tamaño coinciden, se reutiliza. Si no coinciden, no se sobrescribe.

---

## Comandos

Desde `apps/api`:

```bash
npm run migration:developments -- audit
npm run migration:developments -- dry-run
npm run migration:developments -- preflight --target=development
npm run migration:developments -- import --target=development --tenant=demo --confirm=IMPORT_LOCAL_DEVELOPMENTS
npm run migration:developments -- preflight --target=production
npm run migration:developments -- import --target=production --tenant=demo --created-by=admin@demo.valorar.dev --confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION
npm run migration:developments -- cleanup --dry-run --target=production --tenant=demo
npm run migration:developments -- cleanup --execute --target=production --tenant=demo --confirm=DELETE_LOCAL_DEVELOPMENTS_PRODUCTION
```

Desde la raíz del monorepo:

```bash
npm run migration:developments -w api -- audit
npm run migration:developments -w api -- dry-run
npm run migration:developments -w api -- preflight --target=development
npm run migration:developments -w api -- import --target=development --tenant=demo --confirm=IMPORT_LOCAL_DEVELOPMENTS
npm run migration:developments -w api -- import --target=production --tenant=demo --created-by=admin@demo.valorar.dev --confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION
npm run migration:developments -w api -- cleanup --dry-run --target=production --tenant=demo
```

Opciones adicionales: `--source-path`, `--created-by`, `--json`.

Códigos de salida:

* `0` éxito sin warnings;
* `2` warnings, sin bloqueantes;
* `1` errores/bloqueantes, target inválido o confirm ausente.

`audit` y `dry-run` no abren Prisma ni S3.

`preflight`, `import` y `cleanup` exigen `--target=development` o `--target=production`. `import` exige el token de confirmación correspondiente. `cleanup --execute` exige `DELETE_LOCAL_DEVELOPMENTS` o `DELETE_LOCAL_DEVELOPMENTS_PRODUCTION`. Sin confirmación no hay escrituras.

El `dry-run` resuelve **nombres y slugs** de provincia/localidad contra el catálogo CABA offline. `provinceId` y `localityId` se resuelven en preflight/import contra el catálogo live. Si falta una localidad, el reporte incluye `missingCatalogEntries` y solo bloquea esos `sourceId`.

Features de cochera ausentes (`cochera-cubierta`, `cochera-fija`, `cochera-planta-baja`, `cochera-subsuelo`) generan warning `FEATURES_MISSING` / `FEATURE_NOT_IN_CATALOG`. **No se crean** y **no bloquean** el import.

---

## Seguridad

* Origen explícito (`--source-path` o default resuelto desde la raíz del workspace).
* No se imprimen credenciales, connection strings ni access keys.
* `--target=prod`, `staging` y `preview` están prohibidos.
* `--target=development` deniega el fingerprint Neon de producción auditado (Houzez E.5) y buckets con token `prod`/`production`/`staging`/`preview`.
* `--target=production` es un modo explícito: exige `--confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION` y solo autoriza el Neon auditado, el bucket `valorarinmuebles-images-prod`, el tenant `demo` y `sourceSystem = local-developments-v1`.
* Sin el token de confirmación no hay escrituras.
* No geocodificar. No inventar precios ni cantidades de cocheras.
* No se crean `Property` ni `DevelopmentTypology`.
* Un conflicto de slug/`internalCode` sin `MigrationSourceRef` bloquea ese registro; no se apropia.

---

## Cleanup del lote

Comando acotado para borrar **solo** este lote y reintentar. No es un rollback general.

Alcance:

* tenant `demo`;
* `sourceSystem = local-developments-v1`;
* `Development` vinculados por `MigrationSourceRef`;
* `DevelopmentImage` y asignaciones del mismo lote;
* objetos R2 bajo el prefijo exacto `{tenantId}/migrations/local-developments-v1/`.

Nunca toca:

* `Property`;
* Houzez (`wordpress-houzez`);
* otros `Development`;
* imágenes fuera del prefijo;
* otros tenants.

```bash
npm run migration:developments -w api -- cleanup --dry-run --target=production --tenant=demo
npm run migration:developments -w api -- cleanup --execute --target=production --tenant=demo --confirm=DELETE_LOCAL_DEVELOPMENTS_PRODUCTION
```

`--dry-run` solo cuenta. `--execute` exige el token y muestra conteos previos. No ejecutar cleanup si el import terminó correctamente.

---

## Destino autorizado para esta carga

El `DATABASE_URL` local coincide con el Neon de producción auditado y `STORAGE_BUCKET` es `valorarinmuebles-images-prod`. Esa combinación **sigue bloqueada** con `--target=development`.

La carga de los 16 emprendimientos se autoriza únicamente con:

```bash
npm run migration:developments -w api -- import --target=production --tenant=demo --created-by=admin@demo.valorar.dev --confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION
```

Migraciones Prisma de esta carga: `202608210001_development_sort_order` y `202608210002_add_villa_luro_floresta_localities`. Aplicar con `npx prisma migrate deploy`. No usar `migrate reset`, `db push` ni comandos destructivos.
