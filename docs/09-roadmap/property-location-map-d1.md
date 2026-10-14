# D1 — Mapa manual de ubicación de Propiedades

## Gate y arquitectura

Fecha: 2026-10-13. Branch: `main`, siete commits ahead.
HEAD inicial/final: `334870429402b1fead315cd24d69fb36868be10c`.

D1 implementa el mapa manual aprobado. D2 (geocodificación) no se inició.

- Admin declara `leaflet ^1.9.4`, `react-leaflet ^5.0.0` y tipos `^1.9.22`;
  el lock resuelve **1.9.4 / 5.0.0 / 1.9.22**, idénticos y deduplicados con Web.
  React-Leaflet 5 es compatible con React 19 del Admin.
- Editor específico de Admin: el visor público tiene otra responsabilidad
  (presentación, múltiples marcadores/popups y branding Web). No se importan
  componentes entre apps ni se agrega una dependencia Leaflet al UI Kit global.
- URL de tiles, atribución y zoom de referencia se centralizan en
  `packages/shared-types/src/map-config.ts`; Web conserva su API de reexports.
- `next/dynamic({ ssr: false })` encapsula Leaflet y su CSS. El contenedor tiene
  altura responsive reservada, ancho completo y stacking context `z-0` para
  convivir con overlays. ResizeObserver reajusta el tamaño del mapa.
- Se reutilizan Input, Button, FormField, Label y ErrorMessage del UI Kit y el
  token verde institucional para un DivIcon sin descargas de imágenes auxiliares.

## UX y estados

El editor está debajo de los campos postales/GEO dentro de Ubicación.

1. Con coordenadas completas, muestra el punto existente y zoom 15.
2. Sin coordenadas, muestra Argentina de referencia (zoom 4), sin marcador ni
   asignación implícita de un punto.
3. Click selecciona; arrastrar mueve el marcador. Latitud y longitud son la
   alternativa manual y de teclado, con soporte de signo y coma/punto.
4. Cada ajuste queda en un **borrador local**. El estado accesible advierte que
   guardar sin confirmar no aplica ese borrador.
5. **Confirmar ubicación** valida el par y lo aplica al estado del formulario.
   No invoca Server Action ni HTTP. **Cancelar ajuste** restaura el último par
   del formulario (incluida una confirmación previa todavía sin guardar).
6. Sólo Guardar cambios/Crear propiedad persiste. Salir sin guardar descarta los
   valores locales. Un fallo del guardado conserva el punto confirmado para retry.

Coordenadas validadas en rangos ±90/±180 y normalizadas explícitamente a siete
decimales, compatibles con Decimal(10,7). Una coordenada vacía aislada no se
confirma; vaciar ambas y confirmar conserva la capacidad previa de quitar ubicación.
Se aceptan representaciones exponenciales válidas para no perder números existentes
cercanos a cero que Number.toString representa así. No se aceptan hexadecimales,
NaN, infinito ni separadores ambiguos.

Loading de módulo/cartografía, error contenido del canvas y error de tiles con
reintento explícito. Los errores permiten continuar con coordenadas manuales.
Atribución OpenStreetMap visible; zoom Acercar/Alejar; scroll-wheel desactivado
para no capturar el scroll del formulario. Click/drag y campos se bloquean durante
submit. Labels, región identificada, errores asociados y role=status/alert.

## Guardado y seguridad

- El editor sólo entrega `{ latitude, longitude }` al estado del formulario.
- P1.2 existente compara numbers normalizados contra el baseline guardado. Si
  sólo cambia latitud, sólo se envía latitud; un cambio de formato no es un PATCH.
- Dirección postal, jerarquía GEO, slug, geocodeSource y publicabilidad no se
  modifican al mover/confirmar el punto. No se presume un nuevo origen geográfico.
- Sin lecturas de propiedades adicionales, geolocalización del navegador,
  router.refresh, acciones de servidor nuevas ni consultas por tecla. Las únicas
  solicitudes cartográficas son tiles OSM conforme al viewport.
- La API autenticada, tenant-scoped y autorizada sigue siendo el único write path.
  Las protecciones RealData permanecen en esa frontera; regresiones ejecutadas
  sin acceder a RealData ni escribir DB.
- Base de datos: **no afectada**. Sin cambios de schema, migraciones ni datos.

## Pruebas y evidencia

| Gate                                         | Resultado                                          |
| -------------------------------------------- | -------------------------------------------------- |
| Admin completo                               | **234/234**, 29 archivos; 27 regresiones D1 nuevas |
| API write path, permisos y RealData          | **73 aprobados**, 1 skip preexistente, 3 suites    |
| Typecheck Admin / Web / shared-types         | OK                                                 |
| Builds Admin / Web                           | OK                                                 |
| ESLint focalizado Admin / Web / shared-types | OK (shared-types usa base, detalle debajo)         |
| Prettier código D1 / reporte                 | OK                                                 |
| git diff --check                             | OK                                                 |

Advertencia de build Admin preexistente: Next recomienda middleware → proxy.

- `location-map.spec.ts`: coordenadas existentes, incompletas, cero, rangos,
  signos/locale, precisión y guardado diferencial/limpieza.
- `location-editor.spec.ts`: borrador, confirmar/cancelar, salir sin confirmar,
  alternativa por teclado, disabled, labels, errores asociados y responsive
  estructural 390/1440.
- `location-map-canvas.spec.ts`: Leaflet y React-Leaflet reales en jsdom, con
  un probe de contexto; marcador draggable, dragend, click, wrap de longitud,
  bloqueo durante submit, recentrado sin recrear mapa, tiles y retry, atribución,
  control de errores y montaje con StrictMode. Los eventos se disparan sobre
  instancias Leaflet; no es una prueba de gesto táctil físico.
- `location-map-ssr.spec.ts`: renderToString en Node sin window con Next dynamic
  real; muestra loading y campos sin evaluar Leaflet.
- `location-map-hydration.spec.ts`: markup inicial + hydrateRoot + importación
  del canvas real, sin errores recuperables ni pérdida de coordenadas. Sólo la
  frontera next/dynamic se sustituye en esta prueba: el loader independiente de
  Next resuelve React anidado y entra en conflicto con el alias canónico de Vitest.
  Esto no sustituye UAT de hidratación en navegador Next real; ambos builds pasan.
- `property-form-refinement.spec.ts`: borrador no enviado, confirmación sin HTTP,
  PATCH sólo del campo cambiado, segundo guardado sin reenviar coordenadas y retry
  después de error conservando el punto.
- API: regresiones existentes del write path, frontera de permisos y RealData,
  incluido update exclusivo de coordenadas sin resolver GEO ni cambiar dirección.
  No se ejecutó persistencia contra PostgreSQL real en D1.

### Comandos de verificación

```bash
npm test -w admin
npm test -w api -- --runInBand --testPathPatterns='modules/property/services/property-write-path|modules/property/controllers/property-write|common/safety/realdata'
npm run check-types -w admin
npm run check-types -w web
npm run check-types -w @repo/shared-types
npm run build -w admin
npm run build -w web
git -c core.safecrlf=false diff --check
```

ESLint focalizado desde los workspaces Admin/Web. Shared-types tiene un import
preexistente inválido en su configuración local; los dos archivos cambiados se
verificaron con la configuración base del repo mediante la API ESLint, sin
modificar la configuración. Prettier sobre archivos D1 y este reporte.

## Archivos D1

- `apps/admin/package.json`, `package-lock.json` (dependencias aprobadas; conserva
  las dependencias/testing previas de B3/overlays).
- `apps/admin/components/property/property-form.tsx` (integración).
- `apps/admin/components/property/property-location-editor.tsx` (nuevo).
- `apps/admin/components/property/property-location-map.tsx` (nuevo).
- `apps/admin/components/property/property-location-map-canvas.tsx` (nuevo).
- `apps/admin/lib/property/location-map.ts` (nuevo).
- `apps/admin/lib/property/location-map.spec.ts` (nuevo).
- `apps/admin/lib/property/location-editor.spec.ts` (nuevo).
- `apps/admin/lib/property/location-map-canvas.spec.ts` (nuevo).
- `apps/admin/lib/property/location-map-ssr.spec.ts` (nuevo).
- `apps/admin/lib/property/location-map-hydration.spec.ts` (nuevo).
- `apps/admin/lib/property/property-form-refinement.spec.ts` (regresión adicional).
- `packages/shared-types/src/map-config.ts` (nuevo), `src/index.ts` (export).
- `apps/web/components/map/map-types.ts` (reexport compatible).
- `docs/04-modules/properties.md` (contrato D1) y este reporte.

## UAT y próximo gate

**D1: GO técnico para UAT**, con las limitaciones de evidencia descritas abajo.

Navegador no disponible: `[browser.disconnected]`. UAT visual pendiente en
`/propiedades/crear` y `/propiedades/[id]`, desktop/mobile: altura/overflow,
arrastre táctil, zoom, foco visible y teclado, atribución, tiles bloqueados/offline,
confirmar/cancelar, salir sin guardar y volver a abrir luego de un guardado en
Development autorizado. jsdom no prueba layout CSS ni lector de pantalla real.

**D2: NO-GO para implementación.** Requiere aceptación UAT de D1 y autorización
independiente del proveedor/contrato de geocodificación, caché y control global
de frecuencia según la propuesta previa. No se hicieron llamadas a Nominatim,
Geoapify, geocodificadores ni servicios pagos.

P1.3, Configuración UX, B2/B3, overlays y A/B/C locales preservados. Sin commit,
push ni deployment. STOP al cerrar D1.
