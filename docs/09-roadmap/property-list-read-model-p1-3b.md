# P1.3B — Read model paginado de Propiedades

## Gate y Git

- Rama: `main`; HEAD inicial/final: `bfd358c9473262f7d58ab25a83f33285ec93cd1f`.
- Inicio limpio, un commit local ahead de origin/main (P1.3A).
- Implementación local sin commit/push/deployment. P1.3C no iniciado.
- Contrato canónico: [Property List](../04-modules/property-list-contract.md).
- Endpoint aditivo `GET /properties/list`; contrato array legacy conservado.
- Sin modificaciones de Admin, Web, Rental, infraestructura, schema ni migraciones.

## Arquitectura

`PropertyListController → PropertyListService → PropertyListRepository → PostgreSQL`.

Controller registrado antes de `PropertyController` (`:id`). Mantiene
JwtAuthGuard, TenantGuard, PermissionsGuard, RequireTenant, property.read y
`Cache-Control: private, no-store`. Query DTO valida escalares, defaults,
rangos, enums y allowlist; Swagger describe query y respuesta.

Service abre REPEATABLE READ. `PropertyAccessService` lee políticas una sola vez
con el cliente transaccional y utiliza `shouldScopePropertyList` de `@repo/rbac`.
Su predicado parametrizado expresa tenant AND visibilidad. Las reglas de los
métodos legacy y endpoints de mutación conservan su comportamiento.

Repository usa una consulta SQL parametrizada con CTEs:

1. Universo autorizado materializado: ID, isActive y publicabilidad por EXISTS.
2. Contadores comerciales del universo, sin filtros operativos.
3. Conjunto filtrado: búsqueda, tipo, operación, GEO, estado y atención.
4. Total, totalPages y clamp de página.
5. Orden SQL allowlisted, LIMIT/OFFSET y proyección de la página.

Operaciones y URL usan sólo listings del tenant. Acceso compartido y creador
tienen proyección segura; un creador SUPER_ADMIN global es una referencia válida,
un usuario de otro tenant no se expone. La respuesta SQL usa un agregado JSON
de la página; nunca devuelve el inventario entero para paginarlo en Node.

Service transforma los hechos de la página a capacidades mediante `canEditProperty`
y `hasPermission`, y arma las URLs con el builder existente. No hay consultas por fila.
Contrato público: `PaginatedResponse<PropertyListItem>` + `commercialCounts`.

## Semántica verificada

- ACTIVE requiere precio principal; RESERVED/CLOSED lo omiten. Todos necesitan
  Property activa y portada. DRAFT/PAUSED no publican.
- Las operaciones configuradas incluyen todos los estados. activeListingsCount
  cuenta únicamente ACTIVE. El filtro de operación no redefine publicabilidad.
- URL: listing publicable por updatedAt DESC, id ASC, independiente del filtro.
- Los siete filtros preservan los predicados P1.3A. SQL de descripción reproduce
  trim ECMAScript y UTF-16. recently-archived conserva updatedAt y setDate(-30).
- GEO efectivo por COALESCE de catálogo y legacy; filtros GEO por FK, sin inferencias.
- Búsqueda por subcadena literal concatenada; %, \_ y backslash no son comodines.
- Casing mediante ICU root existente; orden determinístico C y desempate id ASC.
  Cada campo se probó asc/desc, con nulls-last donde corresponde.
- Snapshot real: una prueba intercepta la entrada al repositorio tras leer políticas,
  escribe política/Property desde otra conexión y verifica que el Service conserve
  filas y contadores del snapshot anterior. No sustituye ninguna consulta por mocks.

## Base de datos aislada

Preflight y postflight: `npm run db:dev:check -w api` y
`npm run db:dev:inspect -w api`. Identidad confirmada mediante SELECT:

| Campo         | Valor                                             |
| ------------- | ------------------------------------------------- |
| Proyecto      | `square-lab-71259415`                             |
| Branch        | `br-hidden-mud-ach3itrr`                          |
| Endpoint      | `ep-super-glade-ac3ywgv7`                         |
| Host          | `ep-super-glade-ac3ywgv7.sa-east-1.aws.neon.tech` |
| Base / schema | `neondb` / `public`                               |

Branch y endpoint distintos de la identidad productiva protegida por el repositorio.
No se consultó ni escribió la DB main/productiva.

El setup exige `.env.development.local`, valida el mismo guard development,
rechaza el endpoint baseline/protegido y requiere `PROPERTY_LIST_TEST_BRANCH_ID`
explícito. Antes de escribir compara identidad real de branch/endpoint y verifica ICU.
No usa credenciales JWT reales: servidor Nest in-process y tokens efímeros de prueba.

Fixtures por ejecución: 3 tenants nuevos (A, B y vacío), 7 usuarios, 137 propiedades
de A y 1 de B, 118 listings iniciales y sus imágenes/precios/features/comparticiones.
Un barrio y una feature global de prueba se crean con UUID propio; el catálogo
de localidades existente sólo se lee. Pruebas específicas agregan relaciones
cross-tenant deliberadamente inconsistentes y operaciones RENT/TEMPORARY_RENT.
Todo se elimina por IDs propios al terminar. No hay seeds generales ni alteraciones
de registros existentes; ningún flujo Rental/provider/scheduler se inicia.

La primera corrida SQL completa aprobó sus 38 tests pero falló al limpiar
TenantSetting por una FK restrictiva. Se corrigió el orden de cleanup y se
eliminaron exclusivamente los IDs remanentes de esa corrida bajo guard e identidad
verificada. Las corridas finales aprobaron **45 tests y cleanup**.

Postflight coincide con preflight: 1 Tenant, 5 Users, 30 Properties y 30 migraciones
aplicadas. Conteos Rental inspeccionados también coinciden (1 contrato, 2 obligaciones,
2 occurrences, 0 fulfillments). No se ejecutaron migraciones; `prisma generate`
se ejecutó únicamente como parte del prebuild estándar, para generar el cliente local.

## Integración PostgreSQL

**45 tests aprobados**, sin guards reemplazados ni consultas SQL simuladas:

- 401 sin sesión, SUPER_ADMIN sin tenant/inexistente/suspendido, tenant efectivo
  del usuario y header ajeno ignorado para un agente.
- Contrato compacto, todos los roles existentes y políticas OWN_ONLY/SEE_ALL,
  creador/asignado/shared, edición CREATOR_ONLY y Collaborator sin mutación.
- Universo visible idéntico para filas y contadores; cross-tenant negativo en
  Property, compartición, listing, price, image, feature y creador.
- Parámetros inválidos/desconocidos/repetidos, allowlists y límites.
- Matriz comercial, precio, portada, URL y operaciones múltiples con empate.
- Siete filtros contra reglas compartidas, Unicode/UTF-16, umbral inclusivo y futuro.
- Búsqueda + RBAC + filtros, GEO efectivo y legacy, combinaciones sin coincidencias.
- Seis sorts asc/desc, paginación 20/50/100 sin duplicados/omisiones y clamp.
- Concurrencia real del snapshot y número de sentencias constante según pageSize.

## Baseline reproducible y medición real

Fixture: 137 propiedades y 118 listings en A. Tenant Admin, mismo dataset y misma
DB para legacy y nuevo. HTTP local Supertest sobre Nest real; PostgreSQL remoto
sa-east-1. Un warm-up por escenario y tres muestras medidas. Legacy lanza sus
requests en paralelo, como el loader Admin actual. Incluye queries de guards.
No representa latencia productiva, navegador/RSC, TLS HTTP externo ni cold starts.

| Escenario         | Requests | Operaciones Prisma | SQL reales | Filas DB→API | Bytes HTTP JSON | Mediana ms |
| ----------------- | -------: | -----------------: | ---------: | -----------: | --------------: | ---------: |
| Legacy            |        3 |                 16 |         28 |          864 |          236984 |     386,26 |
| Legacy + atención |        4 |                 25 |         43 |         1631 |          253015 |     410,52 |
| Nuevo 20          |        1 |                  5 |          8 |            5 |           13582 |     291,08 |
| Nuevo 50          |        1 |                  5 |          8 |            5 |           33421 |     297,88 |
| Nuevo 100         |        1 |                  5 |          8 |            5 |           66432 |     299,34 |

Muestras individuales ms, en orden de ejecución:

- Legacy: 404,47 / 336,21 / 386,26.
- Legacy + atención: 454,14 / 410,52 / 396,71.
- Nuevo 20: 297,01 / 291,08 / 285,64.
- Nuevo 50: 348,98 / 297,81 / 297,88.
- Nuevo 100: 299,34 / 298,70 / 392,86.

Interpretación de las métricas:

- Operaciones ORM: extensión `$allOperations`. No equivale a SQL ni incluye
  `$transaction` como otra lectura de negocio.
- SQL reales y filas: instrumentación de `pg.Client.query`, incluyendo BEGIN,
  SET TRANSACTION y COMMIT. Prisma emite sólo 6 query events para el nuevo flujo;
  omite BEGIN/SET en esos eventos, por eso se reportan **8** sentencias reales.
- Las 5 lecturas incluyen User + Tenant de autenticación, TenantGuard, políticas
  y consulta del read model. Éste usa 2 lecturas más 3 sentencias transaccionales.
- Las 5 filas DB→API incluyen **una fila JSON con 20/50/100 items** y cuatro filas
  de autenticación/tenant/políticas. No significan que PostgreSQL examine 5 filas.
- Legacy entrega 313 items en sus tres arrays (137 + 137 + 39 ACTIVE). El Dashboard
  adicional devuelve un objeto con filterSets; sus IDs están incluidos en bytes,
  no en ese conteo de items. El nuevo endpoint entrega exactamente 20/50/100 items.
- Payload medido como bytes UTF-8 del body HTTP sin compresión ni headers.
- El costo de agregación/orden aún depende del universo autorizado. Esta muestra
  verifica bounded queries/egress y no sustituye EXPLAIN/carga de tenants grandes.

### Reproducción

Desde raíz:

```sh
npm run db:dev:check -w api
npm run db:dev:inspect -w api
npm run test -w api -- --runInBand "modules/property/|guards/permissions.guard|guards/tenant.guard"
```

Desde `apps/api` (bash; usar exclusivamente la branch inspeccionada):

```sh
PROPERTY_LIST_TEST_BRANCH_ID=br-hidden-mud-ach3itrr \
PROPERTY_LIST_REPORT_PATH='C:/Users/leomo/AppData/Local/Temp/opencode/property-list-p13b.json' \
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js \
  --config test/jest-property-list-postgres.json --runInBand
```

`PROPERTY_LIST_REPORT_PATH` es opcional. Emite todas las muestras, sin secretos.
La configuración dedicada no incluye los e2e legacy que usan datos demo.
El flag VM Modules es requerido por el import dinámico del runtime Prisma 7 en Jest.

## Gates

- API focalizada: **9 suites, 91 tests aprobados, 1 omitido opt-in P1.2**.
- Integración SQL real: **45 aprobados**. Total: **136 aprobados**.
- API typecheck y build: aprobados.
- Shared-types typecheck y compilación: aprobados. El paquete es source-first y no
  posee script build; se ejecutó `tsc -p packages/shared-types/tsconfig.json --outDir`
  sobre un directorio temporal, sin agregar artefactos al repo.
- ESLint focalizado API/tests: cero errores/warnings. Shared-types: configuración
  canónica `@repo/eslint-config/base` vía API de ESLint, porque el wrapper existente
  importa el subpath no exportado `base.js` (deuda preexistente, no modificada).
- Prettier focalizado, revisión completa del diff y `git diff --check`: aprobados.

## Riesgos residuales y decisión

1. ICU `und-x-icu` es un prerrequisito de PostgreSQL para esta paridad Unicode.
   Existe y fue probado en la branch aislada; no se agregó estructura. Versiones
   futuras de ICU/Node pueden diferir en caracteres Unicode recién incorporados.
2. Baseline pequeño y warm; falta medir carga de tenants grandes, concurrencia
   sostenida y planes EXPLAIN en un gate de performance apropiado. Los totales
   exactos y sorts derivados necesariamente procesan más que la página.
3. Endpoints legacy summary/listings/dashboard conservan el scoping tenant-wide
   previamente documentado. Este endpoint no expone su universo sin autorización.
4. Persiste la asimetría PATCH isActive=false versus DELETE property.delete.
   Las capacidades reflejan las acciones actuales; mutaciones siguen reautorizando.
5. recently-archived sigue siendo updatedAt, no auditoría histórica de archivado.
6. Admin todavía consume el flujo legacy; la mejora del recorrido UI requiere P1.3C.

**GO técnico para P1.3C**. No se inició ese gate ni se creó commit/push/deployment.
