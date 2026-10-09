# P1.3C — Listado Admin de Propiedades

Estado: implementación local completada y versionada; UAT principal aprobado
manualmente. UAT complementario pendiente; sin push/deployment.
Baseline `main @ 1cb79be0478d490e3c215325adcdf6cefafeed28`.

## Diseño

- La ruta RSC valida y normaliza parámetros URL, verifica tenant/permiso y consume sólo `GET /properties/list` mediante `apiFetch` no-store; catálogo GEO se obtiene por separado y nunca carga propiedades completas.
- La vista cliente mantiene búsqueda en borrador con debounce 350 ms. El resto de los filtros, sorting, tamaño y página navegan por URL; cambios de criterio reinician página. La consulta del servidor es la única fuente de filas y contadores.
- Siete columnas existentes, selector de visibilidad no persistente (Propiedad y Acciones fijas), encabezados ordenables y paginación del UI Kit.
- Capacidad por fila gobierna acciones de edición/archivo/restauración. Se reutilizan confirmaciones, toasts y Server Actions existentes; API revalida permisos.
- Se mantienen `estado`/`atencion` para links del Dashboard y se traducen a `commercialStatus`/`attention` sólo al enviar al endpoint.
- Sin API, migraciones, Rental, Web ni preferencias persistidas. P1.3D queda fuera de alcance.

## Integración y componentes

`app/(dashboard)/propiedades/page.tsx` verifica sesión, permiso de lectura y
tenant activo, normaliza la URL y llama `getPropertyList` con `cache: no-store`.
La provincia se consulta del catálogo por separado; localidad/barrio usan
`GeoAutocomplete` y la API pública GEO existente. No se llama al array legacy de
`GET /properties`, summary, todos los listings o filterSets de Dashboard.

`PropertyListView` compone AdminTable, AdminTableHeader (aria-sort),
AdminTableState, FilterBar, Input, Select, DropdownMenu, Pagination, Badge,
PropertyStatusBadge, PropertyRowActions, ConfirmModal, PropertyArchiveModalContent,
Toast y Server Actions actuales. Están visibles las siete columnas aprobadas por
default; el selector no persiste cambios y conserva Propiedad/Acciones fijas.
La tabla mantiene scroll horizontal dentro de su contenedor y loading de ruta
usa el skeleton preexistente. El error HTTP conserva explicación y botón Reintentar.

URL: `estado`/`atencion` mantienen su forma histórica, y el adaptador serializa
`commercialStatus`/`attention` al API. Filtros de tipo/operación/GEO, search,
sortBy/sortOrder y page/pageSize también se sincronizan. Cambios de criterio
vuelven a página 1; la búsqueda se aplica después de 350 ms, con cancelación del
timer en otras acciones y en back/forward. Se usa URL deseada para impedir que
respuestas RSC anteriores reescriban borradores. Una página fuera de rango se
canonicaliza a la página que devuelve la API. Los filtros activos se muestran
como chips eliminables. No se consulta un set completo para paginar en cliente.

Acciones Editar, Archivar y Restaurar dependen respectivamente de `canEdit`,
`canArchive` y `canRestore`. Ver en web sólo se presenta con URL y la ficha sigue
siendo navegable en modo lectura. Las mutaciones reutilizan las Server Actions
actuales y sus guardas backend, no las capacidades de la UI como autorización.

## Verificación local

- DB de desarrollo: `db:dev:check` aprobó `br-hidden-mud-ach3itrr`, distinto del
  endpoint productivo protegido. Se inició la API exclusivamente con el wrapper
  `start:dev:database`; UAT ejecutó sólo SELECT/GET sobre la branch de desarrollo.
- Admin levantado en `http://localhost:3101` porque el puerto 3001 estaba ocupado
  por otra app, sin modificar su proceso. HTTP autenticado con JWT temporal firmado
  para un usuario de la branch aislada, sin login ni escritura de `lastLoginAt`:
  `/propiedades`, `/propiedades?atencion=without-price&estado=active&pageSize=50`
  y `/propiedades?search=__none__&page=900` respondieron 200. SSR mostró las
  siete columnas; el link de atención y la búsqueda imposible mostraron vacío
  contextual, sin panel de error. Se cerraron los procesos locales propios.
- Tests Admin: 102 aprobados en 14 archivos, incluidas validación de adaptación
  URL, debounce/cancelación, límites/combos, reset de página, ruta sin fan-out legacy, 7 columnas,
  permisos por fila y vacíos. Typecheck/build Admin: aprobados. El test SSR
  necesitó resolver una sola copia de React/React DOM en Vitest para los
  paquetes enlazados del monorepo; no se cambió runtime ni dependencias.
- ESLint focalizado, Prettier y `git diff --check`: verificados en gate final.

**Límite de la verificación inicial:** el navegador de Review estaba desconectado. El
HTTP y el SSR no verifican interacciones reales de teclado, viewport angosto,
back/forward, debounce ni apertura de modales. Se requieren pruebas visuales
interactivas complementarias antes de aprobar P1.3D.

Validación manual posterior informada por el usuario: listado general, badge de
estado sin texto secundario, filtros y búsqueda combinados, sorting, paginación
20/50/100 y responsive 390/768: PASS. Los badges de operación usan Venta `info`,
Alquiler `success` y Temporario `neutral`; el badge de estado conserva su semántica.
Pendientes: permisos por rol, teclado, back/forward con debounce y red lenta,
y render de previews en Admin autenticado. Estos pendientes no se presentan como
aprobados por tests de SSR ni por la disponibilidad HTTP de imágenes.

## Riesgos residuales / gate

- La búsqueda y filtros usan transiciones RSC por URL; la inspección visual del
  comportamiento bajo red lenta y navegación histórica sigue pendiente.
- El fallback público Admin sin `PUBLIC_WEB_URL` conserva el comportamiento
  previo (`NEXT_PUBLIC_SITE_URL`, sin `listingType` cuando lo arma el cliente).
- Estado de archivo y permisos pueden cambiar después de la lectura; la API
  reautoriza las acciones de mutación y el Toast muestra errores de concurrencia.
- No se implementaron cookies/localStorage, returnTo, breadcrumbs de retorno ni
  refactor de listado genérico. Riesgos legacy HTTP persisten fuera de esta UI.

**NO-GO para iniciar P1.3D hasta completar el UAT complementario.** Commit local
de P1.3C preparado separadamente del fix de publicación, previews y RealData;
sin push, deployment ni migración.
