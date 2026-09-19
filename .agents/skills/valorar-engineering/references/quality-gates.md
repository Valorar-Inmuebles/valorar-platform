# Quality gates

Selecciona controles según la superficie y el riesgo; no ejecutes toda la matriz por rutina.

## Estrategia de pruebas

1. Durante la implementación, ejecuta tests focalizados del comportamiento cambiado.
2. Al estabilizar, ejecuta la suite del módulo afectado.
3. Al cerrar, amplía la regresión si el cambio cruza módulos, tipos compartidos, persistencia, seguridad o contratos HTTP.

Prioriza tenant-negative, RBAC, invariantes, errores de dominio, concurrencia, idempotencia, límites, fechas y regresiones observadas. Las pruebas deben proteger comportamiento, no copiar líneas de implementación.

## Validaciones aplicables

- Prisma: format, validate, generate y migration status cuando corresponda.
- API: tests focalizados/módulo, typecheck, lint focalizado y build.
- Admin/Web: tests disponibles, typecheck, lint focalizado y build cuando cambien UI, rutas o tipos consumidos.
- Paquetes compartidos: tests, typecheck/build y consumidores relevantes.
- Git: `git diff --check`, revisión del diff y `git status` final.

Usa scripts reales del workspace y ejecuta linters desde el workspace cuya configuración los gobierna. Distingue fallas introducidas por el gate de deuda preexistente y no arregles archivos ajenos sin autorización.

## Revisión técnica y performance

- Busca N+1, queries duplicadas, payloads excesivos, colecciones completas y endpoints demasiado chatty.
- Comprueba que filtros, búsqueda, sort allowlisted y paginación ocurran server-side para conjuntos potencialmente grandes.
- Prefiere selecciones/includes controlados o read models específicos para pantallas con varias relaciones.
- Revisa atomicidad, round trips evitables, renders y requests repetidos cuando sean relevantes.
- Agrega índices sólo para patrones de consulta implementados y verifica su orden de columnas contra filtros/sort reales.

No optimices sin evidencia. Una solución simple y medible prevalece sobre infraestructura especulativa.
