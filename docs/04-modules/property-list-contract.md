# Property List — contrato canónico P1.3A

Estado: **P1.3A cerrado; P1.3B implementado y validado localmente**.
`GET /properties/list` disponible en API. Integración SQL real y evidencia en
[P1.3B](../09-roadmap/property-list-read-model-p1-3b.md). UI pendiente; P1.3C no iniciado.

Baseline: `main @ bcf12620f5b43b5d9fbcfb7485315d564bb7b658`.

Fuentes: `properties.md`, `property-complete-mvp.md`,
`../07-admin/fase5-admin-base.md`, `../07-admin/dashboard.md`,
`@repo/property-rules`, `@repo/rbac` y endpoints Property existentes.

## 1. Publicabilidad: visibilidad, no activación

Toda operación web-visible exige Property `isActive = true`, al menos una imagen
y una imagen `isCover = true` de esa propiedad/tenant. No se exige URL de imagen
no nula, descripción, características, `isFeatured` ni `publishedAt`.
En datos relacionales consistentes, tener portada implica tener al menos una imagen.

| Estado listing | Precio principal        | Visible con Property activa y portada | Sin precio       |
| -------------- | ----------------------- | ------------------------------------- | ---------------- |
| `ACTIVE`       | Obligatorio             | Sí, si existe precio principal        | No visible       |
| `RESERVED`     | Opcional                | Sí                                    | Consultar precio |
| `CLOSED`       | Opcional                | Sí                                    | Consultar precio |
| `DRAFT`        | No habilita visibilidad | No                                    | No visible       |
| `PAUSED`       | No habilita visibilidad | No                                    | No visible       |

- Property archivada: ninguna operación es visible, independientemente del estado/precio.
- Sin portada: ninguna operación es visible, aunque haya otras imágenes.
- Precio significa existencia de `PropertyPrice.isPrimary = true` del listing y
  tenant; no basta un precio secundario. El dominio de escritura ya exige monto positivo.
- Las reglas son iguales para `SALE`, `RENT` y `TEMPORARY_RENT`.
- La diferencia por operación es el label de `CLOSED`: **Vendida** para Venta,
  **Alquilada** para Alquiler y Temporario. `RESERVED`: **Reservada**.
- `CLOSED` sigue siendo cierre comercial; no es archivado de Property.
- Activar/reactivar **hacia ACTIVE** siempre exige Property activa, imagen,
  portada y precio principal, aun partiendo de RESERVED/CLOSED. El helper de
  activación evalúa los requisitos del estado destino y no hereda su excepción de precio.
- La Web pública ya implementa esta visibilidad. Sus destacadas siguen siendo
  sólo listings ACTIVE con precio; los filtros públicos de precio/moneda excluyen
  las operaciones sin precio principal. P1.3A no modifica esas consultas.

### Estado comercial de Property y contadores

Una Property tiene **un** estado derivado, no una nueva columna persistida:

1. `archived` si no está activa;
2. `published` si está activa y al menos un listing es publicable;
3. `commercial-draft` si está activa y ninguno es publicable, incluso sin listings.

`active` es un filtro que reúne Publicadas y Borradores, no un cuarto badge.
`listingTypes` contiene todas las operaciones configuradas, incluso DRAFT,
PAUSED y CLOSED; `activeListingsCount` cuenta exclusivamente ACTIVE.

La corrección de CLOSED aumenta Publicadas y reduce Borradores/Pendientes de
publicación cuando una operación cerrada es la única publicable. No cambia
`isActive`, estados de listings, fechas ni precios. Una propiedad puede estar
publicada por CLOSED/RESERVED y requerir atención por otro listing ACTIVE sin precio.

### Selección de URL pública

- Formato: `/propiedades/{slug}?listingType={tipo-publicable}` con slug escapado.
- Summary Admin actual: primera operación publicable del orden de listings
  `updatedAt DESC`; para el nuevo listado se fija desempate `id ASC`.
- El filtro `listingType` selecciona propiedades por operación configurada, no
  obliga a enlazar una operación no publicable. La URL se elige entre todas las
  operaciones publicables de la propiedad, independientemente de ese filtro.
- Detalle público sin `listingType`: prioridad existente SALE → RENT → TEMPORARY_RENT.
  Con tipo explícito, selecciona ese tipo publicable; no sustituye uno inexistente.
- API construye URL absoluta con `PUBLIC_WEB_URL`. Si falta, `publicUrl = null`;
  eso no cambia `isAnyPublishable`, badge ni contadores. El contrato conserva
  `slug` para el fallback server-side Admin ya existente
  (`PUBLIC_WEB_URL` / `NEXT_PUBLIC_SITE_URL`). Si no hay base válida, no hay enlace.
- No se cambia el resolvedor de dominio/tenant ni la Web pública en este gate.

## 2. Siete filtros de atención

Identificadores públicos estables de `/propiedades?atencion=...`:

| ID URL/API futuro           | Clave wire Dashboard actual | Predicado                                                |
| --------------------------- | --------------------------- | -------------------------------------------------------- |
| `without-images`            | `withoutImages`             | Activa y cantidad de imágenes = 0                        |
| `without-commercialization` | `withoutCommercialization`  | Activa y cantidad de listings = 0, sin excluir estados   |
| `without-description`       | `withoutDescription`        | Activa y `(description?.trim().length ?? 0) < 40`        |
| `without-features`          | `withoutFeatures`           | Activa y cantidad de asignaciones de características = 0 |
| `pending-publication`       | `pendingPublication`        | Activa, con algún listing y ninguno publicable           |
| `without-price`             | `withoutPrice`              | Activa y existe un listing ACTIVE sin precio principal   |
| `recently-archived`         | `recentlyArchived`          | Archivada y `updatedAt >= threshold(now)`                |

Semántica precisa:

- Las primeras seis excluyen todas las archivadas. La última excluye todas las activas.
- Sin imágenes no significa sin portada. Una imagen sin portada evita
  `without-images`, pero puede dejar `pending-publication` si existen listings.
- Características cuenta asignaciones, incluso si la característica se desactivó;
  no cuenta únicamente las visibles en la Web.
- Descripción usa `String.trim()` y longitud JavaScript **UTF-16**, conserva texto
  HTML si existe y no normaliza contenido. Whitespace Unicode se recorta. Una
  traducción SQL con `length(trim(...))` no es automáticamente equivalente:
  P1.3B debe probar whitespace y caracteres suplementarios, sin cambiar el umbral.
- RESERVED/CLOSED sin precio no entran en `without-price`; DRAFT/PAUSED tampoco.
- Un listing CLOSED cuenta como comercialización y puede impedir Pendientes si
  es publicable. Un DRAFT/PAUSED cuenta como comercialización, pero no publica.
- Umbral reciente: copia de `now`, `setDate(getDate() - 30)`, conserva hora y
  timezone del runtime, comparación inclusiva. No se introduce timezone tenant,
  truncamiento al inicio del día ni una ventana nueva de 720 horas.
- Se preserva el comportamiento existente sin límite superior: un `updatedAt`
  futuro también pasa el umbral. No es una auditoría histórica de archivado;
  editar una archivada puede volver a incluirla. Mejorarlo exige otro gate.
- El caller captura un único `now` para filas, filtros y conteos de una respuesta.

Implementación pura reutilizable: `evaluatePropertyAttention` e
`isRecentlyArchivedProperty` en `@repo/property-rules`. Reciben hechos ya
tenant-scoped; no cargan relaciones ni otorgan permisos. El Dashboard consume
estos helpers. P1.3B debe construir predicados DB equivalentes **antes de paginar**,
no ejecutar estos helpers sobre el inventario completo en memoria.

### Adaptación explícita Dashboard → Admin

El wire actual conserva camelCase. `DashboardSummaryResponse` describe ese wire;
`getDashboardSummary()` lo convierte a `DashboardSummary` con claves kebab-case
para los consumidores Admin. No se cambian DTO HTTP, URLs ni componentes.
Los errores API se propagan; no se sustituyen por conjuntos vacíos ficticios.

## 3. Seguridad y capacidades por fila

El futuro endpoint requiere `JwtAuthGuard`, `TenantGuard`, `PermissionsGuard`,
`RequireTenant` y `property.read`. Tenant efectivo: usuario autenticado, o
`X-Tenant-Id` validado para SUPER_ADMIN. Un tenant suspendido se rechaza.
No admite `tenantId` del query ni un modo de lectura global sin tenant.

### Lectura

Fuente: `PropertyAccessService.buildListWhere` y `@repo/rbac`.

| Rol/política                        | Universo visible                                     |
| ----------------------------------- | ---------------------------------------------------- |
| SUPER_ADMIN, TENANT_ADMIN, MANAGER  | Todas las propiedades del tenant efectivo            |
| AGENT/COLLABORATOR + AGENT_SEE_ALL  | Todas las propiedades del tenant efectivo            |
| AGENT/COLLABORATOR + AGENT_OWN_ONLY | Creador, asignado o compartición explícita `canView` |

La propiedad archivada no se excluye por visibilidad. `shared.canEdit` sin
`shared.canView` no amplía el listado. Nunca asumir que el creador es el asignado:
el fallback visual del responsable no reemplaza `assignedToId` para permisos.

### Edición y lifecycle

Contexto `E = canEditProperty(context)` de `@repo/rbac`, para una fila visible del
tenant efectivo. Incluye rol, creador, asignado, políticas y compartición del usuario.

- COLLABORATOR: `E = false`.
- `property.update.any`: `E = true` dentro del tenant efectivo.
- Sin `property.update.own`/`any`: `E = false`.
- `CREATOR_ONLY`: creador o `shared.canEdit`.
- `CREATOR_OR_ASSIGNEE`: creador, asignado o `shared.canEdit`.
- `AGENT_SEE_ALL` concede lectura, nunca edición adicional.

| Capacidad    | Fórmula para fila visible                                 | Endpoint cuya autorización se respeta                   |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| `canEdit`    | `E`                                                       | PATCH: permiso update own/any + `assertCanEditProperty` |
| `canArchive` | `isActive && E && hasPermission(role, 'property.delete')` | DELETE: property.delete + `assertCanEditProperty`       |
| `canRestore` | `!isActive && E`                                          | PATCH `{isActive: true}`: misma autorización de edición |

| Rol                                 | canEdit                                  | canArchive (activa)              | canRestore (archivada) |
| ----------------------------------- | ---------------------------------------- | -------------------------------- | ---------------------- |
| SUPER_ADMIN con tenant seleccionado | Sí                                       | Sí                               | Sí                     |
| TENANT_ADMIN / MANAGER              | Sí                                       | Sí                               | Sí                     |
| AGENT                               | Según creador/asignado/shared y política | **No**: no posee property.delete | Según edición          |
| COLLABORATOR                        | No                                       | No                               | No                     |

Las condiciones activa/archivada expresan disponibilidad de la acción UI; los
endpoints existentes pueden aceptar repetir una operación ya aplicada. Editar una
archivada está permitido si `E` es verdadero. No se agrega `property.restore`.

**Asimetría existente:** PATCH también admite `{isActive: false}` bajo permisos
de edición, mientras la acción Archivar del Admin usa DELETE y exige
`property.delete`. Por eso `canArchive` describe la acción DELETE, no una
prohibición global de que un agente desactive mediante otro endpoint. Alinear
ambas autorizaciones requiere un gate de seguridad; P1.3A no cambia guards ni
amplía capacidades para aprovechar esa diferencia.

P1.3B cargará políticas una vez y accesos compartidos del usuario en batch para la
página, reutilizando `canEditProperty`; no llamará un método con I/O por fila.
Tenant/visibilidad se validan antes de producir capacidades. Las mutaciones
siempre reautorizan: las capacidades no son un token ni una garantía transaccional.

## 4. Contrato definitivo GET /properties/list

Endpoint aditivo de lectura. Registro estático antes de `:id`.
`GET /properties` conserva su contrato array para compatibilidad API-first.

### Query

Todos los parámetros son opcionales y escalares. Parámetros desconocidos,
repetidos o con tipos/enums inválidos: 400. Sin un filtro se omite su parámetro.

| Parámetro          | Valores/default                                                       | Semántica                                         |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------- |
| `page`             | Entero 1..1.000.000; default 1                                        | Página solicitada                                 |
| `pageSize`         | 20, 50, 100; default 20                                               | Máximo de filas                                   |
| `search`           | Trim, máximo 160 caracteres; vacío equivale a ausencia                | Subcadena literal case-insensitive                |
| `commercialStatus` | all, active, published, commercial-draft, archived; default all       | Estado Property derivado                          |
| `propertyType`     | Enum PropertyType                                                     | Tipo exacto                                       |
| `listingType`      | SALE, RENT, TEMPORARY_RENT                                            | Existe operación de ese tipo, en cualquier estado |
| `attention`        | Uno de los siete IDs anteriores                                       | Un criterio de atención                           |
| `provinceId`       | ID no vacío de catálogo                                               | Igualdad por FK                                   |
| `localityId`       | ID no vacío de catálogo                                               | Igualdad por FK                                   |
| `neighborhoodId`   | ID no vacío de catálogo                                               | Igualdad por FK                                   |
| `sortBy`           | updatedAt, title, propertyType, location, commercialStatus, createdBy | Default updatedAt                                 |
| `sortOrder`        | asc, desc                                                             | Default desc                                      |

Los filtros de dimensiones diferentes se combinan con AND. Valores GEO
bien formados sin coincidencias o jerárquicamente incompatibles dan cero filas,
sin buscar por texto ni inventar IDs. Los IDs pueden enviarse independientemente;
el Admin ofrecerá selección jerárquica. Registros legacy sin FK siguen accesibles
por búsqueda de texto, pero no coinciden artificialmente con un filtro por ID.

Búsqueda preserva la semántica del listado: concatenar con un espacio los valores
no vacíos de título, código, localidad efectiva y barrio efectivo, convertir a
minúsculas y buscar la subcadena normalizada. Sin tokenización, sin remover acentos;
`%` y `_` son literales. Localidad/barrio efectivos usan catálogo y fallback legacy,
igual que `resolvePropertyLocation`. No se busca descripción ni email del creador.
P1.3B debe verificar equivalencia entre normalización JS y SQL/collation elegida.

El filtro de operación no redefine publicabilidad: una Property con Venta DRAFT
y Alquiler publicable coincide con `listingType=SALE&commercialStatus=published`.
Combinaciones incompatibles como archived + without-images devuelven cero resultados.

### Sorting

- Un campo por consulta; siempre desempate `id ASC`, incluso en descendente.
- Default `updatedAt DESC, id ASC`; no requiere agregar columna de fecha a UI.
- `title`: título en minúsculas, orden lexicográfico determinístico.
- `propertyType`: ranking por label español: Campo, Casa, Casa quinta, Cochera,
  Departamento, Galpón, Industrial, Local, Oficina, Otro, PH, Terreno.
- `location`: localidad efectiva, luego barrio efectivo; minúsculas, vacíos al final.
- `commercialStatus`: ranking ascendente published, commercial-draft, archived.
- `createdBy`: nombre con trim; si vacío, email con trim; minúsculas, ausentes al final.
- Descendente invierte las claves principales; no el desempate ni la regla nulls-last.
- Para texto se fija comparación determinística de código/collation `C` en DB;
  no se promete collation lingüística española ni orden sin acentos.
- Comercialización y Acciones no admiten sorting. No se admite SQL/columnas arbitrarias.

### Respuesta compacta

Contrato implementado en `packages/shared-types/src/property-list.ts`; reutiliza el
`PaginatedResponse<T>` ya exportado, sin crear otro envelope.

```ts
import type {
  PaginatedResponse,
  PropertyListingType,
  PropertyType,
} from "@repo/shared-types";

type PropertyCommercialStatus = "published" | "commercial-draft" | "archived";

type PropertyListItem = {
  id: string;
  slug: string;
  title: string;
  internalCode: string | null;
  propertyType: PropertyType;
  isActive: boolean;
  location: {
    localityName: string;
    neighborhoodName: string | null;
  };
  listingTypes: PropertyListingType[];
  statusVariant: PropertyCommercialStatus;
  isAnyPublishable: boolean;
  publicUrl: string | null;
  activeListingsCount: number;
  createdBy: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
  capabilities: {
    canEdit: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };
};

type PropertyListResponse = PaginatedResponse<PropertyListItem> & {
  commercialCounts: {
    all: number;
    active: number;
    published: number;
    commercialDraft: number;
    archived: number;
  };
};
```

- Envelope existente: `items`, `page`, `pageSize`, `total`, `totalPages`.
- Una fila por Property. `listingTypes` sin duplicados, orden SALE, RENT, TEMPORARY_RENT.
- `total`: cantidad de propiedades autorizadas que cumplen **todos** los filtros,
  antes de paginar. No cuenta listings ni filas de joins.
- `commercialCounts`: universo autorizado completo, **sin filtros** de búsqueda,
  estado, tipo, operación, GEO o atención. Conserva los contadores globales del listado.
- Invariantes: all = active + archived; active = published + commercialDraft.
- No exponer IDs fuera de página, filterSets, descripción, galerías, precios,
  asignaciones completas ni campos de User ajenos a la proyección segura existente.
- Cero coincidencias: items=[], total=0, totalPages=0, page=1; contadores del universo
  autorizado pueden ser positivos. Universo vacío: también todos los contadores en 0.
- Página solicitada fuera de rango: clamp a última página válida; devolver `page`
  efectivo para canonicalizar URL. totalPages = ceil(total/pageSize).
- `total`, página y contadores deben pertenecer al mismo snapshot de lectura:
  una sentencia o transacción breve con aislamiento apropiado. No asumir que
  `$transaction` con el aislamiento default basta.
- Filtros/sorting preceden a paginación. Consultas batch y proyecciones de relaciones
  acotadas; nunca cargar todo el inventario para filtrar/paginar en Node o Admin.
- El número de sentencias debe ser acotado, sin N+1. Una operación Prisma con
  relaciones puede emitir varias sentencias SQL; medirlo durante P1.3B.
- Transporte privado/no-store. Sin caché persistente compartida entre tenants/usuarios.

### Aislamiento, errores y compatibilidad URL

Tenant y visibilidad se aplican a filas, total, contadores y relaciones de negocio.
Componer `tenant AND visibility AND search AND filters`; nunca sobrescribir el OR
de visibilidad con el de búsqueda. SQL parametrizado debe utilizar el mismo contexto
de políticas de PropertyAccessService, sin políticas paralelas ni listas completas
de IDs autorizados materializadas previamente en la aplicación.

- 401: sesión ausente/inválida; 403: permiso insuficiente/tenant suspendido.
- SUPER_ADMIN sin tenant o tenant inexistente: 400, conforme TenantGuard existente.
- 400: query inválida. Colección sin coincidencias: 200 con respuesta vacía, no 404.
- UI conserva `estado`/`atencion`; su adaptador los traduce a
  `commercialStatus`/`attention`. No se renombran links del dashboard.
- Cambio de búsqueda/filtros/sort/tamaño vuelve a página 1. Columnas no afectan consulta.
- Fuente UX: Contratos Rental. 20/50/100 y columnas persistidas: Comunicaciones Rental.
  P1.3A no modifica esos módulos ni la pantalla de Propiedades.

## 5. Decisiones y riesgos residuales

1. La regla compartida se alinea con Web/documentación: CLOSED visible con precio
   opcional. Activación continúa estricta. No cambia estados ni datos históricos.
2. Se extraen reglas de atención sin cambiar sus umbrales, interpretación temporal
   o semántica de descripción/características. Las equivalencias SQL son gate de P1.3B.
3. La adaptación Dashboard se hace en la frontera HTTP Admin. El wire permanece
   compatible y los componentes actuales reciben el shape que ya esperaban.
4. P1.3B implementa las capacidades en el read model; guards, roles y políticas
   actuales permanecen como fuente de autorización.
5. Summary/listings/dashboard legacy no comparten todavía todo el scoping por usuario
   de GET /properties. P1.3A no remedia esa superficie. El nuevo endpoint debe hacerlo
   para sus filas/contadores; dejar de consumir legacy no corrige acceso HTTP directo.
6. `recently-archived` no es auditoría y depende de timezone runtime. Cambio de
   timezone/semántica histórica requiere decisión propia; no inventar archivedAt.
7. Selección actual de URL con timestamps empatados no es determinística. P1.3B
   agregará desempate sólo al contrato nuevo; no cambia prioridad de Web pública.
8. Los conteos exactos, sorting derivado y búsquedas requieren medición real. No
   se promete costo O(1) ni un número de milisegundos sin medir. No se requieren
   schema, migraciones ni índices nuevos para definir este contrato.

## 6. Validación P1.3A

Regresiones focalizadas: matriz de estados/precios, propiedad archivada/sin portada,
reactivación estricta, CLOSED por los tres tipos y URL, contadores/atención del
Dashboard, límites de descripción/fecha y adaptación de los siete links existentes.
También se ejecutan regresiones existentes de los consumidores de la regla compartida.

Gates y resultados de ejecución se registran en
`../09-roadmap/property-list-consistency-p1-3a.md`.

## 7. Implementación P1.3B

- Un controller estático aditivo, DTO de query estricto y DTO Swagger que implementa
  los tipos públicos compartidos. Arrays/repeticiones y parámetros desconocidos: 400.
- `PropertyAccessService.listReadContext` reutiliza `shouldScopePropertyList` y
  las políticas actuales. Su predicado SQL compone tenant AND (creador OR asignado
  OR compartición canView). Las comparticiones se acotan además por tenant.
- Lectura de políticas y consulta agregada en la misma transacción REPEATABLE READ.
  El universo materializado contiene IDs, lifecycle y publicabilidad; su agregado
  produce contadores. El conjunto filtrado se ordena y pagina dentro de PostgreSQL.
- La consulta final devuelve sólo la página, metadatos y contadores. Las operaciones,
  creador y acceso compartido se proyectan compactos; no hay I/O por fila en Node.
- Portada se comprueba con EXISTS sobre imágenes del tenant: una portada es una
  imagen existente, por lo que satisface también el requisito de al menos una imagen.
- `lower(... COLLATE "und-x-icu")` aplica casing Unicode; el orden usa `COLLATE "C"`.
  Se verificó la collation ICU preexistente en la DB aislada, sin crear collations.
  Se prueban acentos, I con punto, sigma contextual y caracteres suplementarios.
- Descripción: btrim con los caracteres ECMAScript y longitud de codepoints más
  cantidad de caracteres suplementarios para reproducir UTF-16. El umbral de fecha
  se calcula con el helper compartido y se envía como parámetro.
- NUL se rechaza como query inválida (PostgreSQL text no lo admite). Base URL
  pública ausente/inválida produce null, sin alterar publicabilidad ni contadores.
- No se agregaron índices, schema, migraciones ni caché persistente.
