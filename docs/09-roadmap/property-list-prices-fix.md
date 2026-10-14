# Fix P1.3 — Precios de operaciones publicadas

## Auditoría y alcance

`GET /properties/list` devolvía `listingTypes`, estado derivado y capacidades,
sin importes ni monedas. Se extendió el read model de forma aditiva, conservando
el envelope y todos los campos anteriores. Contrato canónico actualizado:
`docs/04-modules/property-list-contract.md`, §4.

`publishedOperations` contiene tipo y precio principal (importe numérico/moneda)
de las operaciones publicables; principal ausente se representa con `null`.
No se descargan relaciones completas ni precios secundarios.

La columna Comercialización conserva los badges y agrega el precio junto al
badge correspondiente. Operaciones no publicables conservan sólo su badge.
RESERVED/CLOSED publicables sin principal muestran «Consultar precio». Formato
institucional compartido: `USD 150.000,25` y `$ 850.000,00` para ARS.

## Rendimiento y límites

- Mismas siete columnas, filtros, sorting, paginación y capacidades.
- Proyección agregada en el lateral de operaciones de la misma sentencia SQL,
  después de limitar la página. No se agregan queries/requests por fila.
- Reutiliza la elegibilidad SQL existente y exige publicabilidad de la propiedad.
  Listing y precio están acotados por tenant.
- Selección escalar de un único precio principal; nunca fallback a secundario.
  Si datos legacy violan la unicidad lógica de principal, desempata por createdAt
  e id para no multiplicar operaciones ni contadores. No repara esos datos.
- UI: una línea por operación, wrap entre badge/precio y scroll horizontal del
  AdminTable existente. No se oculta información en mobile.

## Pruebas sin escrituras

La integración nueva ejecuta la consulta real del repository sobre PostgreSQL,
con fixtures sintéticos definidos mediante CTEs que usan los tipos compuestos del
schema. No inserta fixtures, crea tablas ni modifica registros. Conexión
`default_transaction_read_only=on`, transacción `REPEATABLE READ READ ONLY` y
ROLLBACK al cerrar. El setup existente lee `.env.development.local`, verifica las
protecciones development y exige branch explícita; nunca hereda el baseline.

Identidad comprobada antes de consultar:

- Proyecto: `square-lab-71259415`.
- Branch: `br-hidden-mud-ach3itrr`.
- Endpoint: `ep-super-glade-ac3ywgv7`.
- Host: `ep-super-glade-ac3ywgv7.sa-east-1.aws.neon.tech`.
- Base: `neondb`.

18 tests SQL: Venta USD, Alquiler ARS, operaciones múltiples, secundarios,
RESERVED/CLOSED sin precio, DRAFT/PAUSED, ACTIVE sin principal, archivada/sin
portada, tenant-negative, duplicados legacy y pageSize 20/50/100 con una sentencia,
sorting, total y contadores. Son pruebas de contrato/SQL, no un benchmark de carga
ni una repetición de la suite HTTP/RBAC histórica de P1.3B.

24 tests Admin focalizados: 14 de vista SSR, 5 de query URL, 3 de ruta y 2 de DOM
montado. Los dos últimos montan 100 filas a 390/1440 y verifican cero llamadas
fetch, siete columnas, precios y contenedor de scroll. jsdom prueba estructura,
no layout CSS real. Navegador desconectado: UAT visual pendiente.

Regresión API del dominio Property/PropertyListing: 12 suites, 153 aprobados,
un skip preexistente.

### Comandos

```bash
npm run db:dev:check -w api
npm test -w admin -- lib/property/property-list
npm test -w api -- --runInBand --testPathPatterns='modules/property/|modules/property-listing/|modules/property-price/'
npm run check-types -w api
npm run check-types -w admin
npm run check-types -w @repo/shared-types
npm run build -w admin
```

Desde `apps/api` (el override testMatch es obligatorio para ejecutar sólo la
suite read-only, no la suite histórica que inserta fixtures):

```bash
PROPERTY_LIST_TEST_BRANCH_ID=br-hidden-mud-ach3itrr node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config test/jest-property-list-postgres.json --testMatch '**/property-list-prices.readonly-spec.ts' --runInBand
npx nest build
```

Typecheck API/Admin/shared-types, builds API/Admin, ESLint focalizado API/Admin,
Prettier de los siete archivos TS/TSX y `git diff --check`: aprobados.

ESLint nativo de shared-types tiene un import preexistente inválido de
`@repo/eslint-config/base.js` (el paquete exporta `./base`). Se verificó el archivo
modificado mediante la API de ESLint, con exactamente la misma configuración
base importada por ruta y cero warnings/errores; no se alteró configuración.

## Archivos del fix

- `packages/shared-types/src/property-list.ts`.
- `apps/api/src/modules/property/dto/property-list-response.dto.ts`.
- `apps/api/src/modules/property/repositories/property-list.repository.ts`.
- `apps/api/test/property-list-prices.readonly-spec.ts` (nuevo).
- `apps/admin/components/property/property-list-view.tsx`.
- `apps/admin/lib/property/property-list-view.spec.ts`.
- `apps/admin/lib/property/property-list-prices.spec.ts` (nuevo).
- `docs/04-modules/property-list-contract.md`.
- Este reporte.

Configuración UX, B2/B3 y overlays locales preservados. Sin cambios de schema,
migraciones, precios ni estados; sin escrituras DB, commit, push o deployment.
