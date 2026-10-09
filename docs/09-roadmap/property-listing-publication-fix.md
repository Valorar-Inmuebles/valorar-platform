# Publicación y reactivación por operación

Estado: implementado, validado técnicamente y versionado en local; complementa
el UAT P1.3C. Acciones principales aprobadas manualmente; UAT complementario pendiente.

## Contrato

- Crear, editar (incluido cambiar estado) y cerrar un `PropertyListing` requieren
  JWT, tenant efectivo, permisos existentes `property.update.own/any` y autorización
  de edición sobre su Property padre mediante `PropertyAccessService`.
- Se conservan roles, políticas creator/assigned/shared y SUPER_ADMIN con tenant
  efectivo. No se incorporan permisos ni transiciones nuevos.
- Comercialización ofrece Publicar (`DRAFT`), Reactivar publicación (`PAUSED`) y
  Pausar publicación (`ACTIVE`) por operación, conservando Editar y Cerrar.
- Publicar/reactivar y editar hacia `ACTIVE` muestran el checklist de activación:
  Property activa, imagen, portada y precio principal de esa operación. Se reutiliza
  `evaluateActivationChecklist`; la API vuelve a validar al guardar.
- Restaurar Property no reactiva operaciones. Venta y Alquiler son independientes.
- Una mutación exitosa actualiza la fila y realiza una única actualización de la
  ficha RSC para alinear encabezado e indicadores. Se conserva la invalidación Web.
- El contexto de detalle puede agregar capacidad de edición para presentar acciones
  según la autorización calculada por API; el cambio es aditivo.

## Implementación

- `PropertyListingController` agrega `PermissionsGuard`, metadata de edición y
  `CurrentUser` en POST/PATCH/DELETE. `PropertyListingService` carga la Property del
  tenant efectivo y exige `assertCanEditProperty` antes de validar o escribir,
  incluso en cierre idempotente y PATCH vacío.
- `detail-context` agrega `canEdit`. Reutiliza la lectura de políticas y carga
  únicamente el acceso compartido del usuario/tenant junto con la Property. Sigue
  sin consultas por listing ni nuevos fetches Admin. Es una relación acotada
  adicional; los conteos de operaciones Prisma no equivalen a sentencias SQL.
- Los botones abren el SidePanel existente con el estado destino seleccionado y
  un CTA explícito. Editar permite también RESERVED/CLOSED → ACTIVE.
- El checklist usa hechos del contexto y precios de la operación seleccionada.
  Al elegir un nuevo principal, éste se persiste antes del PATCH del listing.
  La API reevalúa todos los requisitos y conserva sus errores estructurados.
- Al guardar se actualizan fila/visibilidad localmente, se cierra `?edit=` mediante
  History API integrada con Next y se ejecuta un solo `router.refresh()`. Abrir y
  cerrar el panel no duplica la carga RSC. Cerrar operaciones también refresca.
- El BFF espera la invalidación Web existente antes de devolver el éxito del
  cambio de listing; no se modifica la aplicación pública.

## Verificación (2026-10-08)

| Gate                                            | Resultado                                   |
| ----------------------------------------------- | ------------------------------------------- |
| API: Property, PropertyListing y PublicProperty | 157 PASS; 1 omitido opt-in de medición P1.2 |
| Admin completo                                  | 124 PASS en 17 archivos                     |
| Regresión P1.3B PostgreSQL y HTTP/guards reales | 45 PASS y limpieza de fixtures              |
| Typecheck API/Admin                             | PASS                                        |
| Build API (`nest build`) y Admin (`next build`) | PASS                                        |
| ESLint focalizado API/Admin                     | PASS, cero warnings                         |
| Prettier focalizado y `git diff --check`        | PASS                                        |
| Navegador Review                                | Bloqueado: `browser.disconnected`           |

Las nuevas pruebas cubren las mutaciones para Agent, Manager, Admin, Collaborator
y SUPER_ADMIN; creator/assigned/shared y políticas; tenant efectivo; transiciones,
checklist previo/definitivo, independencia entre operaciones, render de acciones,
rechazo API, refresh único del header e invalidación Web esperada por el BFF.
Las regresiones existentes verifican archivado/auto-pausa y restauración sin
reactivación, write path P1.1, carga agregada P1.2 y listado P1.3A/B/C.

PostgreSQL se ejecutó exclusivamente contra la branch inspeccionada
`br-hidden-mud-ach3itrr`, endpoint `ep-super-glade-ac3ywgv7`. Fixtures con prefijo
único `p13b-a70b5791-ed2c-453f-852b-ad435308e4c8`, eliminados por la suite.
Mediciones: `C:/Users/leomo/AppData/Local/Temp/opencode/property-list-publication-regression.json`.

## Decisión y pendientes UAT

**GO técnico para continuar UAT P1.3C.** Publicar, Reactivar y Pausar fueron
aprobadas manualmente por el usuario. No constituye cierre integral del UAT ni
autorización de P1.3D. Completar comprobaciones por rol, checklist y enlaces, responsive,
teclado, red lenta y actualización de fila/header/Web con Venta y Alquiler.

La comprobación Web automatizada cubre las reglas de visibilidad y la solicitud de
invalidación; el efecto visual/ISR real requiere Web local disponible y la
configuración existente de revalidación. Su helper conserva el comportamiento
best-effort si falta el secret o la Web está offline.

Sin cambios de schema, migraciones, Rental ni infraestructura. Sin operaciones
de storage, cambios productivos ni push. El fix tiene commit local separado.
Se preservaron los cambios
preexistentes de P1.3C, badge comercial y previews locales.
