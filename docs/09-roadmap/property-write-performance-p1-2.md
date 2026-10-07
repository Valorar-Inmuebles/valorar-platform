# Performance P1.2 — Guardado de Property

## ANTES — capturado antes de modificar implementación

Base: `main = origin/main = 6a97c0a83716f9f033a037b7c9304350e8ffdf4c`,
verificado con fetch; worktree inicialmente limpio. Fecha: 2026-10-07.

Harness Admin: `apps/admin/lib/property/write-path.spec.ts`. Ejecuta handlers
reales de `PropertyForm`, Server Actions y serializadores HTTP. Hooks, router,
revalidatePath y transporte son dobles controlados. El fixture tiene GEO completo,
código y asignado. C/D tienen dos features (cochera fija + pileta con valor).

Harness API: `apps/api/src/modules/property/services/property-write-path.spec.ts`.
Reproduce exactamente los bodies exportados por Admin contra Service, AccessService,
GeoService y repositories reales, interceptando la frontera Prisma. No conecta DB.

| Escenario                                  | Campos PATCH JSON | Actions / HTTP writes | Invocaciones ORM | Fases ORM secuenciales | Resoluciones GEO / consultas | Writes assignments      | Transacciones assignments | revalidatePath / router.refresh |
| ------------------------------------------ | ----------------: | --------------------- | ---------------: | ---------------------: | ---------------------------- | ----------------------- | ------------------------: | ------------------------------- |
| A: sólo título (HOUSE)                     |                15 | 1 / PATCH             |               12 |                     11 | 1 / 4                        | 0                       |                         0 | 2 / 1                           |
| B: provincia+localidad, quitar barrio      |                14 | 1 / PATCH             |               11 |                     10 | 1 / 3                        | 0                       |                         0 | 2 / 1                           |
| C: agregar cochera cubierta                |                15 | 2 / PATCH → PUT       |               19 |                     18 | 1 / 4                        | deleteMany + createMany |                         1 | 4 / 1                           |
| D: sólo descripción (GARAGE con atributos) |                15 | 2 / PATCH → PUT       |               18 |                     17 | 1 / 4                        | deleteMany + createMany |                         1 | 4 / 1                           |

Secuencia A: `property.findFirst` → acceso compartido + política (paralelos) →
unicidad slug → unicidad código → usuario activo del tenant → provincia → localidad
→ barrio → país → `property.updateMany` → `property.findFirst` con relaciones.
B omite barrio. C/D añaden lectura Property tenant-scoped → validación por feature
(3 en C, 2 en D, secuenciales) → transacción delete/create/read de assignments.

Campos A/C/D: slug, title, propertyType, city, provinceId, localityId,
neighborhoodId, province, description, internalCode, street, streetNumber,
neighborhood, postalCode, assignedToId. B omite texto neighborhood y envía
neighborhoodId null. El objeto JS del serializador contiene 34 claves; sólo los
campos definidos sobreviven a JSON. El conteo de tabla mide JSON efectivamente enviado.

Invalidaciones PATCH: `/propiedades`, `/propiedades/property-1`. PUT añade
`/propiedades/property-1/caracteristicas`, `/propiedades/property-1`. Luego el
formulario invoca `router.refresh()`.

### Límites de medición

- Invocaciones ORM, no sentencias SQL: includes pueden generar varias consultas.
- Fase ORM = grupo de operaciones simultáneamente pendientes en el harness.
- No incluye queries de guards JWT/Tenant, tráfico RSC ni recarga P1.1: son
  fronteras distintas, conservadas. Actions/HTTP cuentan invocaciones, no red real.
- No se atribuyen tiempos de tests a latencia de producción ni a click→usable.

### Reproducción

Desde raíz (Bash; usar un path temporal absoluto en Windows):

```bash
PROPERTY_WRITE_BASELINE=1 PROPERTY_WRITE_REPORT=C:/Users/leomo/AppData/Local/Temp/opencode/property-write-before.json npm test -w admin -- lib/property/write-path.spec.ts -t 'A-title|B-geo|C-attributes|D-description'
PROPERTY_WRITE_REPORT=C:/Users/leomo/AppData/Local/Temp/opencode/property-write-before.json npm test -w api -- --runInBand property-write-path.spec.ts -t instrumentation
```

Para repetir ANTES después del cambio, ejecutar estos mismos harnesses en una copia
aislada del SHA base. No restaurar archivos sobre el worktree de trabajo. Para
DESPUÉS, usar `property-write-after.json` con el código actual.

## Diseño acotado posterior al baseline

- Edición diferencial respecto del snapshot que inicializó el formulario;
  mantener create y el ciclo explícito de archivar/restaurar.
- GEO como unidad jerárquica cuando cambia: IDs completos para conservar el
  contrato; evitar consultas cuando no cambia. Mantener validaciones de jerarquía.
- No reemplazar atributos sin cambio efectivo; conservar PUT replace y el PATCH
  previo, que también aplica la política de edición.
- Usar resultado de update tenant-scoped con el include existente; mismo DTO.
- Conservar revalidaciones/refresh salvo evidencia suficiente de redundancia en
  Next real (un mock de revalidatePath no demuestra actualización de layout).

### Evidencia previa al retiro de router.refresh de edición

Chrome headless real + Next 16.2.6 development + API HTTP local en memoria:
un PATCH de título ejecutó dos ciclos GET completos (auth/me, detail-context,
users, property-features, assignments). Header mostró el título persistido.
PATCH → PUT ejecutó tres ciclos completos. Traza capturada con los scripts
`apps/admin/scripts/property-write-{uat,browser-uat}.mjs` antes de retirar refresh.
La primera pasada detectó un endpoint faltante en el doble del listado
(`/property-listings`); se completó el doble antes de validar navegación.

## DESPUÉS — mismos escenarios y fixtures A–D

| Escenario                   | Métrica                         | Antes | Después |  Reducción |
| --------------------------- | ------------------------------- | ----: | ------: | ---------: |
| A título                    | Campos PATCH JSON               |    15 |       1 |      93,3% |
| A título                    | Actions / HTTP writes           |     1 |       1 |         0% |
| A título                    | Invocaciones ORM                |    12 |       4 |      66,7% |
| A título                    | Fases ORM secuenciales          |    11 |       3 |      72,7% |
| A título                    | Resoluciones GEO / consultas    | 1 / 4 |   0 / 0 |       100% |
| A título                    | Writes assignments              |     0 |       0 |          — |
| A título                    | revalidatePath / router.refresh | 2 / 1 |   2 / 0 |  0% / 100% |
| B GEO                       | Campos PATCH JSON               |    14 |       7 |        50% |
| B GEO                       | Actions / HTTP writes           |     1 |       1 |         0% |
| B GEO                       | Invocaciones ORM                |    11 |       7 |      36,4% |
| B GEO                       | Fases ORM secuenciales          |    10 |       5 |        50% |
| B GEO                       | Resoluciones GEO / consultas    | 1 / 3 |   1 / 3 |         0% |
| B GEO                       | Fases GEO                       |     3 |       2 |      33,3% |
| B GEO                       | Writes assignments              |     0 |       0 |          — |
| B GEO                       | revalidatePath / router.refresh | 2 / 1 |   2 / 0 |  0% / 100% |
| C atributos                 | Campos PATCH JSON               |    15 |       0 |       100% |
| C atributos                 | Actions / HTTP writes           |     2 |       2 |         0% |
| C atributos                 | Invocaciones ORM                |    19 |      11 |      42,1% |
| C atributos                 | Fases ORM secuenciales          |    18 |      10 |      44,4% |
| C atributos                 | Resoluciones GEO / consultas    | 1 / 4 |   0 / 0 |       100% |
| C atributos                 | Writes assignments              |     2 |       2 |         0% |
| C atributos                 | Transacciones assignments       |     1 |       1 |         0% |
| C atributos                 | revalidatePath / router.refresh | 4 / 1 |   4 / 0 |  0% / 100% |
| D descripción con atributos | Campos PATCH JSON               |    15 |       1 |      93,3% |
| D descripción con atributos | Actions / HTTP writes           |     2 |       1 |        50% |
| D descripción con atributos | Invocaciones ORM                |    18 |       4 |      77,8% |
| D descripción con atributos | Fases ORM secuenciales          |    17 |       3 |      82,4% |
| D descripción con atributos | Resoluciones GEO / consultas    | 1 / 4 |   0 / 0 |       100% |
| D descripción con atributos | Writes assignments              |     2 |       0 |       100% |
| D descripción con atributos | Transacciones assignments       |     1 |       0 |       100% |
| D descripción con atributos | revalidatePath / router.refresh | 4 / 1 |   2 / 0 | 50% / 100% |

En B las siete claves son city, provinceId, localityId, neighborhoodId,
province, neighborhood, postalCode. El código postal se incluye como override
para impedir que el resolver lo sustituya por el default de la nueva localidad.
Provincia/localidad/barrio se consultan en paralelo y se valida la misma jerarquía
antes de escribir. País sigue dependiendo de la provincia. Un `null` postal
explícito se conserva también si se modifica GEO simultáneamente.

La lectura de seguridad inicial y las dos consultas paralelas de acceso/política
se conservan. El PATCH vacío de C no se elimina: aplica la política de edición
antes del PUT independiente, cuyo contrato y guards no se modificaron.
El repositorio toca `updatedAt` cuando el diff está vacío, conservando la fecha
de guardado que antes producía el payload completo del formulario.

### Revalidation y UI

Se conservaron:

- `/propiedades`: invalida la vista/listado visitado para la próxima navegación;
- `/propiedades/:id`: actualiza cabecera, formulario, badges, KPIs y publishability;
- `/propiedades/:id/caracteristicas`: actualiza la pestaña de asignaciones tras PUT.

Se quitó exclusivamente `router.refresh()` del save **edit**. Create y acciones
explícitas de ciclo de vida conservan sus flujos. En Chrome + Next real se verificó:
título nuevo en h1 y formulario, atributos persistidos, listado actualizado y
recarga de ficha en viewport de 390px. También se comprobaron los KPIs
Características = 3 y Publicable = 1/1. La pasada final se repitió con el build
optimizado mediante `next start`, con los mismos conteos HTTP y resultados.
La prueba local con API en memoria no sustituye UAT contra backend/DB reales.

Traza HTTP Admin→API real contra el doble en memoria, después de optimizar los writes:

| Guardado                              | Con refresh explícito | Sin refresh explícito |
| ------------------------------------- | --------------------: | --------------------: |
| Título, ciclos de lectura de ficha    |            2 (10 GET) |             1 (5 GET) |
| Atributos, ciclos de lectura de ficha |            3 (15 GET) |            2 (10 GET) |

Cada ciclo incluye auth/me + las cuatro lecturas de Datos ya optimizadas por
P1.1. Es una medición local separada de la tabla ORM. No se extrapola a SQL o
tiempos productivos. No se eliminaron revalidaciones entre PATCH y PUT: los writes
son independientes y, si falla el segundo, el primero ya debe verse persistido.

Reproducción UAT local (API en memoria, sin credenciales ni DB):

```bash
# Primero generar el reporte Admin como arriba, sin PROPERTY_WRITE_BASELINE para DESPUÉS.
node apps/admin/scripts/property-write-uat.mjs C:/Users/leomo/AppData/Local/Temp/opencode/property-write-after.json
# En apps/admin, en otro proceso:
API_URL=http://127.0.0.1:3099 npx next dev --port 3101
# Para verificar el build optimizado, detener dev y usar:
# API_URL=http://127.0.0.1:3099 npx next start --port 3101
# En apps/admin, con Chrome instalado:
node scripts/property-write-browser-uat.mjs 'C:/Program Files/Google/Chrome/Application/chrome.exe' 'C:/Users/leomo/AppData/Local/Temp/opencode/p12-chrome'
```

### Concurrencia y límites residuales

- El diferencial reduce lost updates de campos escalares ajenos: editar título
  ya no reenvía descripción, asignado ni GEO desde un snapshot viejo.
- Dos editores del mismo campo siguen last-write-wins, igual que antes. No hay
  versionado/optimistic locking nuevo. GEO sigue siendo una unidad jerárquica.
- Cuando realmente cambian atributos, PUT sigue siendo reemplazo completo y
  puede pisar cambios concurrentes de otra pestaña/editor. No se convirtió a merge.
- PATCH y PUT no son una transacción común. Si PUT falla, el baseline local
  escalar avanza sólo tras PATCH exitoso; el draft de atributos queda para retry.
- Prisma update conserva include y DTO; reducir dos invocaciones a una no prueba
  una única sentencia SQL ni ausencia de lecturas internas del ORM.
- Continúan las carreras preexistentes entre validación y write (slug/listings,
  asignado y políticas). Constraints tenant/slug/código siguen vigentes.
- Sin mediciones productivas de click→usable ni SQL real; requieren observación
  posterior al despliegue. El siguiente costo esperado es el render/read autorizado
  de la ficha y, en C, el segundo round trip y validaciones secuenciales por feature.

## Matriz de regresión y cierre

|   # | Control                                   | Evidencia                                                                                                                                       |
| --: | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Sólo título                               | Admin A → replay API; un campo, sin GEO ni PUT                                                                                                  |
|   2 | Sólo descripción                          | Admin D → replay API; conserva features existentes                                                                                              |
|   3 | Limpiar opcionales                        | Serializer y servicio: texto, número, enum y asignado → null                                                                                    |
|   4 | Omitidos, vacíos y PATCH parcial          | Serializer, DTO y servicio; description vacío admitido, datos ajenos preservados                                                                |
|   5 | GEO válido y textos canónicos             | Admin B; servicio valida provincia/localidad/barrio y postal explícito                                                                          |
|   6 | GEO inválido                              | Servicio rechaza jerarquías incorrectas y barrio cambiado sin padres                                                                            |
|   7 | Slug                                      | Servicio valida unicidad tenant-scoped y bloqueo con listing activo; omite consultas si no cambia                                               |
|   8 | Código interno                            | Normalización, null y rechazo de duplicado en el tenant                                                                                         |
|   9 | Asignado                                  | Usuario activo del tenant, rechazo de referencia ajena y clear explícito                                                                        |
|  10 | Create                                    | Serializer original y servicio/repositorio/GEO: defaults, autor y tenant                                                                        |
|  11 | Archive/restore e isActive                | Formulario sin isActive; edición de archivada, restore explícito y sincronización sólo al archivar                                              |
|  12 | Tenant y JWT                              | Rechazo tenant-negative; metadata de guards en PATCH y suite previa de guards compartidos                                                       |
|  13 | RBAC, políticas y SUPER_ADMIN             | Guard de permisos real, Service/AccessService real, creador/asignado y selección de tenant de suite P1.1                                        |
|  14 | Atributos sin cambios                     | D y segundo guardado: no PUT ni transacción de assignments                                                                                      |
|  15 | Atributos modificados, replace y fallos   | C preserva features ajenas/valores; validación tenant y transacción; no PUT tras PATCH denegado; retry tras PUT fallido                         |
|  16 | DTO, lecturas y reglas dependientes       | Contrato completo con relaciones/decimales; suites publishability, listings, confianza operacional, pública y detail-context (incluye imágenes) |
|  17 | UI fresca, saves sucesivos y concurrencia | Chrome + Next dev/start; header/form/KPIs/listado/mobile; baseline local y dos editores de escalares distintos                                  |

La matriz combina unit/integration tests con dobles de Prisma y UAT HTTP local.
No es una suite end-to-end contra PostgreSQL. Los e2e existentes de auth y
publication-gates requieren DB/fixtures reales y no se ejecutaron. No hay suites
unitarias independientes de property-price/property-image en el repositorio;
su consumo por publishability/detail-context sí está incluido en la regresión.

### Gates ejecutados

- Admin: suite completa, **10 archivos / 86 tests** aprobados, incluido P1.1.
- API: suites Property, PropertyListing y PublicProperty, **12 suites / 103 tests**
  aprobados, incluido replay A–D, guards, publishability y confianza operacional.
- Typecheck Admin/API aprobado; build API aprobado con Prisma 7.8.0 generate;
  build Admin optimizado aprobado (Next 16.2.6).
- Lint focalizado en todos los archivos TS/TSX/MJS afectados, sin warnings.
- Prettier sobre código afectado e informe P1.2; documento canónico conserva su
  formato preexistente fuera del bloque agregado para evitar una reescritura cosmética.
- Revisión de diff y `git diff --check`.
- UAT Chrome headless + API HTTP en memoria + Next dev y build optimizado:
  título/header, atributos, KPIs, listado y recarga móvil aprobados.

Incidencias de ejecución: el primer build Admin falló descargando Google Fonts;
el reintento normal pasó sin cambios de configuración. Una selección inicial de
tests por `property` incluyó Houzez y tuvo un timeout de 5 s; la suite Houzez
aislada pasó sus 10 tests. La selección final explícita del dominio pasó completa.
El build informa la deprecación preexistente de middleware → proxy.

Comando de regresión API final desde raíz:

```bash
PROPERTY_WRITE_REPORT=C:/Users/leomo/AppData/Local/Temp/opencode/property-write-after.json npm test -w api -- --runInBand --testPathPatterns='modules/(property/|property-listing/|public-property/)'
```

### Archivos afectados

Implementación:

- `apps/admin/components/property/property-form.tsx`
- `apps/admin/lib/property/form.ts`
- `apps/admin/lib/api/types/property.ts`
- `apps/api/src/modules/property/services/property.service.ts`
- `apps/api/src/modules/property/services/property-geo.service.ts`
- `apps/api/src/modules/property/repositories/property.repository.ts`

Pruebas y reproducción:

- `apps/admin/lib/property/form.spec.ts`
- `apps/admin/lib/property/write-path.spec.ts`
- `apps/admin/scripts/property-write-uat.mjs`
- `apps/admin/scripts/property-write-browser-uat.mjs`
- `apps/api/src/modules/property/services/property-write-path.spec.ts`
- `apps/api/src/modules/property/controllers/property-write.controller.spec.ts`
- `apps/api/src/modules/property/repositories/property.repository.spec.ts`

Documentación:

- `docs/04-modules/properties.md`
- `docs/09-roadmap/property-write-performance-p1-2.md`

Branch `main`; HEAD inicial/final `6a97c0a83716f9f033a037b7c9304350e8ffdf4c`.
Sin commit/push. Sin schema, migraciones ni operaciones sobre DB real.
P1.3/P2 no iniciados.
