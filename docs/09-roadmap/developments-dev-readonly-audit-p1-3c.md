# Emprendimientos reales en Dev — auditoría read-only para P1.3C

Estado: **NO-GO para importar**; auditoría ejecutada sin escrituras el 2026-10-08.
Esta nota no autoriza la importación ni cambia la configuración de las bases.

## Fuente y destino

Se leyeron por separado, con `default_transaction_read_only=on`,
`BEGIN READ ONLY` y `ROLLBACK`; antes de consultar se verificaron
`neon.project_id`, `neon.branch_id`, `neon.endpoint_id` y
`transaction_read_only=on`. No se usó `db-development.ts` para producción.

| Ambiente            | Branch                    | Endpoint                  | Tenant lógico |              Emprendimientos |
| ------------------- | ------------------------- | ------------------------- | ------------- | ---------------------------: |
| Producción (origen) | `br-rapid-bread-acsu0836` | `ep-mute-sun-ac6nva0v`    | `demo`        | 17 (16 activos, 1 archivado) |
| Dev (destino)       | `br-hidden-mud-ach3itrr`  | `ep-super-glade-ac3ywgv7` | `demo`        |                            0 |

Ambas branches pertenecen al proyecto `square-lab-71259415`. El origen tiene
91 imágenes (17 portadas; 91 URLs HTTPS absolutas con host `pub-220b22089f6147499f7bf4e7e315b174.r2.dev`), 2 tipologías, 56 asignaciones de
características, 0 asignaciones de tipología y 103 referencias de origen
(`local-developments-v1`: 16 Development + 87 DevelopmentImage).
Hay un emprendimiento archivado adicional fuera del lote trazado; sus imágenes
y tipologías se deben tratar explícitamente al definir el alcance.

Una imagen pública de muestra respondió **200 `image/jpeg`** sin autenticación.
No se verificaron individualmente las 91 URLs; hacerlo es parte del preflight
antes de importar. No se copiaron archivos ni se usaron credenciales de R2.

## Relaciones y diferencias

- `Development` es independiente de `Property`: no hay FK entre ellos en el
  modelo. Tiene FKs a Tenant, User creador y GEO (Country, Province, Locality y
  Neighborhood). Dependientes: DevelopmentImage, DevelopmentFeatureAssignment,
  DevelopmentTypology y DevelopmentTypologyFeatureAssignment (vacía).
- Tenant `demo` existe en ambos, pero sus **IDs difieren**. El creador del lote
  productivo es uno; en Dev existe un administrador activo del tenant con la
  identidad lógica del importador histórico. No se copia ningún User.
- Las características usan `PropertyFeature` global: 11 slugs de origen están
  presentes en el catálogo Dev, con **IDs distintos**; se deben resolver por
  categoría + slug, no por ID. Producción tiene 36 características de catálogo
  y Dev 44.
- Los siete slugs GEO utilizados por origen son `almagro`, `caballito`,
  `flores`, `floresta`, `palermo`, `villa-luro`, `villa-urquiza`, todos bajo
  `AR/capital-federal`; Dev carece actualmente de **floresta y villa-luro**.
  Aunque la migración de esas localidades figura como aplicada, sus filas no
  están presentes. No inferir otros barrios ni reutilizar IDs productivos.
- No hay hoy colisiones de IDs entre emprendimientos, imágenes, tipologías,
  asignaciones y refs, ni de slugs/códigos de Development (Dev está vacío).
  La detección debe repetirse justo antes de ejecutar. Índices únicos de
  `Development(tenantId,slug)`, `Development(tenantId,internalCode)`,
  `DevelopmentFeatureAssignment(developmentId,featureId)` y
  `MigrationSourceRef(tenantId,sourceSystem,sourceId,entityType)` coinciden.
- Ambos lados registran 30 migraciones con los mismos nombres, sin columnas
  faltantes ni tipos/nullability diferentes en las 11 tablas auditadas;
  **cuatro checksums iniciales difieren**. Antes de importar, revisar el SQL de
  esas cuatro migraciones y comparar constraints/índices completos y tipos
  relevantes; la igualdad de nombres no prueba equivalencia total de esquema.
- En las relaciones existentes se detectaron cero FKs lógicas cruzadas entre
  tenant y creador/imágenes/asignaciones/tipologías. No hay datos Dev de
  Development que sustituir.

## Procedimiento propuesto (requiere autorización posterior)

1. **Preflight:** confirmar de nuevo identidad de ambas branches y alcance
   aprobado: 16 históricos o 17 incluyendo el archivado. Resolver las dos
   localidades faltantes mediante el procedimiento GEO oficial previamente
   aprobado; no improvisar un cambio de schema/datos. Comparar SQL de las cuatro
   migraciones divergentes. Verificar todas las URLs públicas con GET/HEAD.
   Aislar storage de desarrollo antes del UAT con operaciones mutantes; el
   ambiente local puede heredar configuración R2 productiva.
2. **Checkpoint Dev:** crear snapshot/branch recuperable de
   `br-hidden-mud-ach3itrr`, registrar branch/fecha/identidad y verificar que
   puede leerse. No crear ni restaurar ese checkpoint durante esta auditoría.
3. **Exportación selectiva:** en origen, transacción read-only consistente para
   Development, imágenes, tipologías, asignaciones y referencias seleccionadas.
   Excluir usuarios, contactos, contratos, Property y otros datos personales;
   no exportar secretos ni blobs. Mantener las URLs HTTPS públicas de imágenes.
4. **Mapeo:** tenant por slug, creador por identidad lógica autorizada y tenant,
   GEO por país/provincia/localidad/barrio, catálogo por slug+categoría.
   Crear mapa explícito de IDs destino para padres, hijos y refs. Validar
   unicidad de `slug`, `internalCode`, `sourceSystem/sourceId/entityType` y
   asociaciones antes de escribir. No copiar IDs/FKs de origen sin cotejo.
5. **Importación idempotente:** ejecutar sólo en la branch Dev comprobada,
   dentro de transacción; registrar batch/import manifest y mapear cada fila
   dependiente. Ante una coincidencia no atribuible al mismo batch y contenido
   idéntico, **abortar**; no sobrescribir registros Dev. Reejecutar en una
   branch descartable primero para probar no duplicación, fallos parciales y
   rollback.
6. **Validación:** comparar conteos/portadas por Development, FKs y tenant de
   todas las relaciones, slugs/códigos, checksums de payload no personal,
   accesibilidad de imágenes, estado de archivado, listado/detalle Admin y Web.
   Confirmar que Property preexistente no cambió.
7. **Rollback probado:** en branch descartable, inducir fallo controlado y
   verificar reversión transaccional y conteos; ensayar restauración del
   checkpoint en una **branch de prueba**, nunca sobre producción. Para la
   ejecución Dev autorizada, detener escrituras, conservar evidencia y
   restaurar el checkpoint verificado o eliminar únicamente el batch si la
   reversión selectiva fue probada y no hubo datos Dev posteriores dependientes.
8. **UAT:** validar los 16/17 emprendimientos según alcance aprobado, orden,
   ubicación, características, tipologías, portadas y galerías en Admin/Web.

No se ejecutó importación, checkpoint, rollback ni cambios de DB o storage.
