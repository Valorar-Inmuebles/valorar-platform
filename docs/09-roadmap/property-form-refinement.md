# Refinamiento de Datos de Propiedades — A/B/C y diagnóstico D

## Auditoría de compatibilidad

| Superficie     | Contrato auditado                                                                                   | Decisión                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Slug           | POST exigía slug manual 3..120; unique `(tenantId, slug)`; PATCH bloquea cambios con listing ACTIVE | POST acepta omisión de forma aditiva. El cliente explícito conserva validación/conflicto. Admin edición no regenera |
| Código interno | Texto editable, trim y unique por tenant, sin generador                                             | Copiar; mismas reglas                                                                                               |
| Creador        | `createdById` autenticado en alta; proyección readonly nombre/email                                 | Autoría histórica intacta                                                                                           |
| Responsable    | `assignedToId`, validación tenant; vacío usa creador operativo                                      | Mismo selector/opciones/disponibilidad, card aparte                                                                 |
| Cantidades     | rooms, bedrooms, bathrooms, halfBathrooms, parkingSpaces: Int, mínimo API 0                         | Entrada entera, máximo representable Int32, vacío sin cero implícito                                                |
| Medidas        | totalArea, coveredArea, uncoveredArea, lotFront, lotDepth: Decimal(10,2), mínimo API 0              | UI 0..99999999,99 y hasta dos decimales; sin miles; API sigue recibiendo number                                     |
| Año            | yearBuilt Int, API 1800..2100                                                                       | Cuatro dígitos al validar, borrado y edición parcial permitidos                                                     |
| Dirección      | streetNumber, floor, apartment, postalCode son String                                               | Se conservan texto: PB, subsuelo, 12 bis, CPA, etc.                                                                 |
| Coordenadas    | latitude/longitude Decimal(10,7); API number con rangos ±90/±180                                    | Sin cambio de schema ni persistencia automática                                                                     |
| GEO            | country/province/locality/neighborhood IDs; PropertyGeoService valida jerarquía y texto legacy      | P1.2 conserva la unidad GEO y override postal sólo ante cambios                                                     |
| Mapas          | Leaflet/react-leaflet declarados en Web; import dinámico sin SSR, tiles OSM; sin geocodificador     | D detenido por requerir dependencias Admin y nueva integración de búsqueda                                          |

La validación numérica del backend no restringe actualmente la escala de las
medidas a dos decimales; la columna sí. Este gate evita redondeo silencioso desde
el formulario, sin endurecer los contratos de otros consumidores API/Houzez.

## A — Slug y copiar

- `propertySlugFromTitle` compartido entre API y Admin normaliza acentos,
  puntuación y espacios. Longitud máxima 120; títulos sin una base de tres
  caracteres ASCII utilizan `propiedad`.
- Vista previa local readonly en alta; sin consultas por tecla. El texto explica
  que el sufijo definitivo se decide al guardar. Admin omite slug del POST.
- `createWithGeneratedSlug` lee únicamente slugs del prefijo, dentro del tenant;
  selecciona base, -2, -3, etc., reservando espacio para el sufijo.
- INSERT usa el unique existente como autoridad. Ante P2002 de tenant/slug
  intenta otro sufijo (hasta 20 colisiones concurrentes); otra constraint o un
  error de resultado incierto se propagan sin reintento. Contención extrema
  devuelve 409 para reintento explícito.
- Slug explícito sigue usando el camino previo. No se modifica el importador
  Houzez, ni URLs persistidas, ni reglas de publicación/edición.
- Edición conserva slug al cambiar título. No incorpora regeneración ni redirects.
- `CopyInput` reutiliza Input y Button; icono Copy de la familia central existente.
  Clipboard sólo ante click, fallback manual si falla, feedback role=status,
  padding derecho para evitar solapar texto; ambos controles type=button.

## B — Organización

Identificación: título; slug/tipo; código interno; condición. Mismas opciones de
tipo/condición. Responsables inmediatamente debajo, con dos columnas desde md y
una en mobile. Autoría readonly; selector y fallback operativo sin cambios.

## C — Entrada numérica

`NumericInput` reutiliza Input. Cantidades/año usan inputMode=numeric;
medidas inputMode=decimal. Rechaza la entrada inválida completa en lugar de
eliminar caracteres y cambiar su significado (por ejemplo, 1e2 no se vuelve 12).
Pegado válido, borrado y parciales decimales están permitidos. Coma/punto se
representan con coma; no se introducen separadores de miles. No usa CurrencyInput
porque su sanitizado de moneda y miles no sirve para estas medidas.

El serializer normaliza coma a punto y produce number. P1.2 compara valores
normalizados: `80.4`, `80.40` y `80,40` no generan PATCH diferentes. Campo opcional
vacío nuevo se omite; vaciado intencional en edición envía null. No redondea ni
recorta la parte decimal. Latitud/longitud conservan su input con signo y rangos.

## D — Diagnóstico, STOP y propuesta

No hay servicio de geocodificación, endpoint de búsqueda ni caché configurados.
`geocodeSource` admite MANUAL/GOOGLE_PLACES/IMPORT; su presencia no constituye
una integración Google activa. Web sólo representa coordenadas que ya existen.
Admin no declara Leaflet/react-leaflet ni sus tipos. No se importan componentes
entre apps ni se depende del hoisting de node_modules.

**D queda sin implementar hasta aprobar:**

1. Reutilización del stack ya usado en Web mediante un componente compartido
   o incorporación de las mismas dependencias/versiones al workspace Admin.
   Primer subgate posible: mapa y ajuste manual sin geocodificación.
2. Proveedor de búsqueda y contrato aditivo de geocodificación autenticado,
   tenant-scoped y con autorización existente de edición. Leaflet no geocodifica.

UX propuesta después de aprobación:

- Cargar mapa dinámicamente sin SSR; marcador inicial sólo con ambas coordenadas
  válidas. Punto ajustable más alternativa de teclado/campos numéricos.
- Separar punto persistido, sugerencia y borrador confirmado. Buscar únicamente
  con botón; confirmar copia ambas coordenadas al draft, normalizadas a 7 decimales.
- Guardar formulario es la única persistencia, vía PATCH diferencial existente;
  mover marcador no altera dirección postal ni GEO. No inferir confirmación de
  registros importados ni cambiar automáticamente geocodeSource.
- Estados loading/error/sin resultado; retry explícito; atribución OSM; sin
  solicitudes por tecla ni escritura al arrastrar. Tests de esos estados se
  incorporarán con D, no se presenta el mapa como implementado ni validado.

### Evaluación Nominatim

Política oficial revisada: <https://operations.osmfoundation.org/policies/nominatim/>.
El servicio público exige máximo **1 request/segundo para toda la aplicación**,
identificación mediante User-Agent/Referer y atribución. Prohíbe autocomplete;
recomienda proxy, caché y capacidad de cambiar proveedor sin actualizar clientes.
No se debe enviar información personal/confidencial. La adopción requiere una
decisión informada del responsable de la aplicación.

Para uso moderado: proponer un adaptador backend intercambiable, búsqueda manual,
caché por consulta y control global entre instancias (un debounce de cada usuario
no basta). Para mayor volumen o garantías operativas: evaluar proveedor dedicado
o instancia propia con presupuesto aprobado. No se hizo ninguna búsqueda de
direcciones ni se agregaron servicios, secretos, dependencias o migraciones.

## Validación

- Admin: 24 archivos, **207/207** tests. Incluye P1.1/P1.2/P1.3, B3 y 9 pruebas
  DOM nuevas del formulario; helper de formulario: 32 casos.
- API afectada/RealData: 14 suites, **193 aprobados**, un skip preexistente.
- Property-rules: **44/44**, incluidos 3 casos de slug.
- Concurrencia: prueba de tres altas simultáneas sobre un doble atómico del
  unique, con P2002 y resultados base/-2/-3. No es una prueba PostgreSQL real.
- DTO: omisión aceptada, explícito válido conservado; null/vacío/inválido
  rechazados al crear. Permisos, autoría, tenant y asignación cubiertos por
  regresiones de frontera y servicio.
- GEO/coordenadas: PATCH de título no incluye ubicación; modificación exclusiva
  de coordenadas no resuelve nuevamente GEO ni toca slug/dirección/source.
- Responsive probado estructuralmente a 390/1440 en jsdom. UAT CSS real,
  portapapeles nativo y accesibilidad con lector pendientes: navegador desconectado.
- Typecheck API/Admin/UI/icons y build property-rules aprobados.
- Builds API (`nest build`) y Admin (`next build`): aprobados. Advertencia
  preexistente de Next sobre middleware → proxy.
- ESLint focalizado API/Admin/UI/icons aprobado. Property-rules no tiene flat config;
  sus archivos pasan con la configuración base del repositorio invocada por la
  API de ESLint, sin modificar configuración ni dependencies.

### Decisión de gate

**GO para UAT A/B/C**. Pendientes: navegador real (desktop/mobile, foco,
portapapeles), alta simultánea contra PostgreSQL Development y revisión de la
URL definitiva con sufijo tras guardar. No hubo prueba concurrente con DB real
en este gate; la simulación de P2002 no se presenta como esa evidencia.

**NO-GO D** hasta aprobar dependencias/reutilización del mapa y decidir el
geocodificador. No se habilita una búsqueda ficticia ni una integración externa
sin aprobación. Prettier del código cambiado/reporte y `git diff --check`
forman parte del cierre.

## Archivos

- `apps/admin/components/property/property-form.tsx`
- `apps/admin/lib/api/types/property.ts`
- `apps/admin/lib/property/form.ts`
- `apps/admin/lib/property/form.spec.ts`
- `apps/admin/lib/property/property-form-refinement.spec.ts` (nuevo)
- `apps/api/src/modules/property/dto/create-property.dto.ts`
- `apps/api/src/modules/property/services/property.service.ts`
- `apps/api/src/modules/property/services/property-write-path.spec.ts`
- `apps/api/src/modules/property/repositories/property.repository.ts`
- `apps/api/src/modules/property/repositories/property-slug.spec.ts` (nuevo)
- `apps/api/src/modules/property/controllers/property-write.controller.spec.ts`
- `packages/property-rules/src/property-slug.ts` (nuevo)
- `packages/property-rules/src/property-slug.spec.ts` (nuevo)
- `packages/property-rules/src/index.ts`
- `packages/icons/src/system-icons.ts`
- `packages/ui/src/copy-input.tsx` (nuevo)
- `packages/ui/src/numeric-input.tsx` (nuevo)
- `docs/04-modules/properties.md`
- Este reporte.

Cambios locales previos preservados, siete commits ahead sin cambios de historial.
Sin acceso a DB en este gate, sin tocar RealData, schema, migraciones, proveedores,
ni dependencias. Sin commit, push o deployment.
