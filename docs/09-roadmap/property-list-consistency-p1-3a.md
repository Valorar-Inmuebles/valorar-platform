# P1.3A — Cierre de contrato y consistencia Property List

## Alcance y Git

- Rama: `main`.
- HEAD inicial/final: `bcf12620f5b43b5d9fbcfb7485315d564bb7b658`.
- Inicio limpio. `git ls-remote origin refs/heads/main` confirmó el mismo SHA remoto.
- Cambios locales sin commit/push.
- Contrato canónico: [Property List](../04-modules/property-list-contract.md).
- No se implementó `GET /properties/list`, paginación ni UI del listado.
- Schema/migraciones/datos, Rental, Web pública e infraestructura no modificados.
- No hubo conexión de aplicación a DB ni ejecución de migraciones. El prebuild
  estándar API ejecutó `prisma generate` para el cliente local, sin alterar schema.

## Correcciones

1. `evaluateListingPublishability` incluye CLOSED con precio principal opcional,
   alineado con la Web pública. Property activa e imagen/portada siguen obligatorias.
2. `evaluateActivationChecklist` evalúa ACTIVE como estado destino y siempre exige
   precio principal, incluso si recibe RESERVED/CLOSED como estado de origen.
3. Predicados de atención extraídos a `@repo/property-rules` y reutilizados por el
   builder Dashboard. Sin cambios de umbral, alcance temporal ni reglas de actividad.
4. Cliente `getDashboardSummary` adapta explícitamente wire camelCase a IDs
   kebab-case de URLs/consumidores existentes. Componentes de listado intactos.
5. Capacidades, seguridad, query, sorting, proyección, totales y contadores quedan
   definidos documentalmente para P1.3B; aún no hay DTO/controller/repository nuevos.

## Tests

| Suite                                       | Resultado                                          |
| ------------------------------------------- | -------------------------------------------------- |
| `@repo/property-rules`                      | 2 archivos, 41 tests aprobados                     |
| API focalizada y consumidores               | 12 archivos, 102 aprobados, 1 omitido preexistente |
| Admin adaptación + regresión P1.1/lifecycle | 3 archivos, 15 aprobados                           |

El test API omitido es el reporte opt-in de medición de escritura de P1.2,
condicionado por `reportPath`; no corresponde al comportamiento de P1.3A.
El patrón de selección también incluyó la suite existente del writer Houzez;
se ejecutaron mocks, no imports ni escrituras DB.

Casos nuevos: matriz estados/precios, archivada/sin imagen/sin portada, activación
desde todos los estados, CLOSED sin precio en Venta/Alquiler/Temporario con URL,
conteos y filtros derivados, descripción 39/40 y Unicode, fecha inclusiva y clock
inmutable, adaptación de los siete links, conjuntos vacíos y propagación de errores.

Dos ajustes de regresión durante los gates:

- P1.1 esperaba `listing-active` como bloqueo de CLOSED. Se actualizó para exigir
  sólo `property-active` cuando el inmueble está archivado.
- La fixture Dashboard de julio había quedado fuera de la ventana real de actividad.
  Se fijó el reloj de esa suite en su fecha de referencia; no cambió el código de actividad.

Comandos desde raíz:

```sh
npm run test -w @repo/property-rules
npm run test -w api -- --runInBand "property-publishability|property-detail-context|property-write|property-listing.service|listing-operational-trust|admin-dashboard|public-property"
npm run test -w admin -- lib/api/dashboard.spec.ts lib/property/detail-loaders.spec.ts lib/api/property-actions.spec.ts
```

## Gates

- Typecheck: property-rules, API y Admin aprobados.
- Build: property-rules, API y Admin aprobados (scripts estándar del workspace).
- ESLint focalizado API/Admin: cero errores y warnings.
- ESLint property-rules: cero errores y warnings sobre los cinco archivos TS
  afectados usando programáticamente la configuración canónica
  `@repo/eslint-config/base` (`overrideConfigFile: true`, `overrideConfig: config`).
  El paquete no tiene configuración propia; reutilizar el wrapper de shared-types
  falló por su import preexistente `base.js` no exportado. No se modificó tooling:
  se cargó directamente el export válido `base` mediante la API de ESLint.
- Prettier focalizado: código afectado y los dos documentos nuevos. Se preservó
  el formato histórico de los documentos canónicos existentes con cambios de enlace/estado.
- `git diff --check`: aprobado.
- Build Admin conserva el aviso preexistente de deprecación `middleware` → `proxy`.

## Riesgos y decisión

- Endpoints legacy de summary/listings/dashboard siguen tenant-wide sin todo el
  scoping por usuario de Property. El contrato nuevo exige visibilidad también en conteos.
- PATCH admite desactivar bajo permiso de edición; DELETE exige property.delete.
  Las capacidades documentadas reflejan las acciones actuales, no corrigen esa asimetría.
- P1.3B debe comprobar equivalencia de predicados SQL, incluyendo trim/UTF-16,
  timezone runtime, fecha inclusiva, nulls, GEO legacy y búsqueda literal.
- `recently-archived` continúa aproximando archivado por updatedAt; no hay auditoría nueva.
- No se realizaron mediciones de rendimiento productivo ni UAT visual en este gate.

**GO técnico para P1.3B** sobre el contrato canónico y sus requisitos de seguridad,
paridad y medición. Esta conclusión no inicia ni implementa P1.3B.
