# Performance P1.1 — Lectura de ficha Property

## Alcance y baseline

Base: `main`, `c0bdbd75a3388641d5af6e6fb2d616fb1ed960e1`, limpio y sincronizado
al inicio. Cambio limitado a lecturas de ficha. Railway permanece en Virginia;
Neon en São Paulo. Sin modificaciones de infraestructura, schema o migraciones.

Una selección read-only de una Property existente confirmó esta forma de datos:
activa, **1 listing, 33 imágenes y 5 características**. La fixture del harness
reproduce esa cardinalidad con identificadores y valores sintéticos; no contiene
datos personales ni pretende reproducir los valores comerciales reales.

Antes de modificar los loaders se ejecutaron las cuatro páginas reales junto con
el loader del header, interceptando `apiFetch`. Resultado: **15, 10, 9, 8**
invocaciones. Después se repitió el mismo flujo y cardinalidad: **4, 1, 3, 2**.

El harness Node simula explícitamente el límite de `React.cache` por render y no
deduplica `apiFetch`. No mide requests de red reales ni verifica internals del
renderer RSC. Excluye auth y dashboard layout. Cada fila representa apertura
completa de header + tab, no una transición cliente con layout ya preservado.

## Causa y arquitectura

Antes: header → contexto comercial → Property/listings → checklist por listing →
precios por listing; además galería y asignaciones completas para indicadores.
Datos repetía todo el contexto; Comercialización repetía las operaciones;
Características e Imágenes volvían a leer Property y sus datasets específicos.

Después: un endpoint `GET /properties/:id/detail-context`, con
Controller → Service → Repository → Prisma. Carga Property visible, listings y
precios con relaciones tenant-scoped; usa conteos de imágenes/características y
existencia de portada. Evalúa checklist en memoria usando la regla compartida.
Admin reutiliza explícitamente esa promesa con `React.cache` de request/render,
sin caché persistente, y conserva los builders existentes.

Las tabs agregan únicamente sus lecturas específicas:

- Datos: usuarios, catálogo y asignaciones que utiliza el formulario actual.
- Comercialización: ninguna lectura adicional.
- Características: catálogo y asignaciones.
- Imágenes: galería.

## Resultados controlados

### Invocaciones Admin → API, N = 1

| Flujo            | ANTES | DESPUÉS |   REDUCCIÓN |
| ---------------- | ----: | ------: | ----------: |
| Datos            |    15 |       4 | 11 / 73,3 % |
| Comercialización |    10 |       1 |  9 / 90,0 % |
| Características  |     9 |       3 |  6 / 66,7 % |
| Imágenes         |     8 |       2 |  6 / 75,0 % |

Los máximos estáticos previos (`11+4N`, `6+4N`, `7+2N`, `6+2N`) coinciden con
este caso N=1. El contexto nuevo mantiene una invocación con N=0, 1 y 3 en las
regresiones. El header aislado pasa de `4+2N` invocaciones a **1**.

### Operaciones Prisma relevantes, N = 1

| Flujo            | ANTES | DESPUÉS |   REDUCCIÓN |
| ---------------- | ----: | ------: | ----------: |
| Datos            |    32 |       4 | 28 / 87,5 % |
| Comercialización |    26 |       2 | 24 / 92,3 % |
| Características  |    19 |       4 | 15 / 78,9 % |
| Imágenes         |    19 |       4 | 15 / 78,9 % |

Esta segunda comparación se reconstruyó después de implementar, ejecutando los
servicios/repositorios legacy todavía presentes y el nuevo servicio contra
delegates Prisma instrumentados. La orquestación anterior está congelada en el
test según `c0bdbd7`. Incluye políticas de visibilidad; excluye guards/auth,
usuarios/catálogo y expansión SQL de relaciones. **No son sentencias SQL ni
round-trips PostgreSQL medidos.** Para N=3, el anterior da 60/54/33/33 operaciones;
el nuevo mantiene 4/2/4/4.

El checklist individual ejecutaba 5 operaciones Prisma por listing: Property,
listing, cantidad de imágenes, portada y precio principal. El precio ejecutaba
otras 2: validar listing y listar precios. El contexto elimina esas `7N`
operaciones independientes. Su costo es una lectura de políticas más una
operación Prisma con relaciones agrupadas. Prisma puede expandir esta operación
en varias sentencias SQL; no se incorporó un tracing SQL productivo.

### Fases

Antes: 3 fases HTTP dependientes en la rama comercial: Property/listings →
checklists → precios. El checklist tiene a su vez 3 fases de repositorio:
Property → listing → verificaciones paralelas. Después: 1 fase HTTP para
contexto, paralela a las lecturas específicas de la tab. Dentro de API:
políticas → lectura agregada → evaluación en memoria; las relaciones pueden
requerir fases internas adicionales de Prisma.

No se reportan milisegundos del harness como latencia de usuario. No se midió
tiempo productivo ni se extrapoló el benchmark Railway/Neon a un tiempo de ficha.

## Reproducción y regresiones

Desde la raíz:

```sh
npm run test -w admin -- --config vitest.property-detail-baseline.config.ts
npm run test -w admin -- lib/property/detail-loaders.spec.ts
npm run test -w api -- --runInBand property-detail-context
```

El test Admin cuenta llamadas en páginas reales, verifica props de datos
específicos, snapshot completo del header, ausencia de endpoints por-listing,
precios primarios/secundarios, lifecycle/labels y propagación de errores.

La primera orden usa `git show` sobre `c0bdbd7` desde un plugin exclusivo de Vitest
para cargar los siete archivos de loaders/páginas anteriores. Ejecuta el mismo
harness con budgets 15/10/9/8 y omite regresiones del endpoint nuevo. No modifica
el worktree ni accede a PostgreSQL. Requiere ese commit en el historial local. El
baseline original se ejecutó antes del cambio de loaders; esta configuración
permite repetirlo junto con el resultado nuevo sin un checkout alternativo.

API compara checklist agregado con el servicio legacy para los cinco estados de
listing, Property activa/archivada y con/sin imágenes/precio. Verifica presupuestos
Prisma constantes, filtros tenant en raíz/relaciones/conteos, visibilidad
creador/asignado/compartido y políticas, guards JWT/tenant/permission, rechazo de
tenant suspendido y selección explícita de tenant para SUPER_ADMIN. Son tests
controlados, no una integración contra datos multi-tenant reales en PostgreSQL.

## Gates de cierre

- API: 55 tests aprobados en 9 suites Property/Listing (incluye 24 casos nuevos).
- Admin: 76 tests aprobados en 9 suites (incluye 10 casos nuevos).
- Baseline reproducible: 4 casos aprobados; los 6 casos exclusivos del endpoint
  nuevo se omiten intencionalmente en el modo anterior.
- Typecheck y build API/Admin aprobados.
- ESLint focalizado y Prettier aprobados.
- `git diff --check` aprobado.
- Build Admin conserva el aviso preexistente de Next sobre `middleware` → `proxy`.
- Cierre Git local sobre `main`, sin push, deployment ni operaciones de DB.

## Riesgos residuales y siguiente cuello de botella

- Falta validar latencia y cantidad de requests/SQL con tracing en el despliegue
  real. La reducción del harness no es un porcentaje de mejora de tiempo.
- La caché comparte dentro del render; navegar con layout preservado puede
  producir otra carga de contexto, y el router/prefetch puede agregar requests.
- La query relacional de Prisma puede implicar varios round-trips constantes.
- Todas las operaciones/precios de esa Property se incluyen para mantener el
  header y Comercialización; el payload crece con sus precios, no con galerías.
- Las tabs conservan sus lecturas específicas y sus validaciones de pertenencia.
  Datos aún requiere usuarios/catálogo/asignaciones; Imágenes aún requiere galería.
- El contrato de despliegue requiere API nueva antes de Admin consumidor.
- El siguiente cuello de botella esperado son los round-trips residuales de
  Prisma y los guards por request, más las lecturas específicas de Datos/Imágenes.
  No se optimizaron en este gate.

La UI reutiliza componentes y builders existentes. La evidencia de este gate es
de contratos/props y builds; no reemplaza UAT visual autenticada de las cuatro tabs.
