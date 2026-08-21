# Development Domain (Emprendimientos)

Versión: D1 Foundation + refinamiento tipologías/características (cocheras + whitelist) + orden editorial

## Objetivo

Entidad independiente para emprendimientos inmobiliarios (proyectos en pozo, en construcción o terminados). No comparte tabla con `Property`.

---

## Modelo de datos

```txt
Development
├── DevelopmentImage
├── DevelopmentFeatureAssignment → PropertyFeature (GENERAL, SERVICE, AMENITY)
├── hasParkingSpaces / parkingSpacesCount (cocheras a nivel emprendimiento)
├── sortOrder (orden editorial de listados)
└── DevelopmentTypology
        └── DevelopmentTypologyFeatureAssignment → PropertyFeature (ROOM, whitelist)
```

---

## Orden editorial (`sortOrder`)

Campo en `Development`: `sortOrder Int @default(0)`.

Listados admin y públicos (incluye “recientes”) ordenan:

1. `sortOrder ASC`
2. `createdAt DESC`
3. `id ASC`

No se usa `updatedAt` como criterio de listado: editar un emprendimiento no cambia su posición.

Valores:

* default `0` — altas del ABM y registros preexistentes tras la migración; quedan **antes** del lote histórico importado;
* lote `migration-data/emprendimientos`: `001 → 1` … `016 → 16`.

El ABM no expone el campo en esta etapa. Las imágenes siguen usando `DevelopmentImage.sortOrder`.

Documentación de la migración de datos: `docs/04-modules/developments-data-migration.md`.

---

## Cocheras (Development)

Las cocheras pertenecen al **Emprendimiento**, no a la Tipología.

| Campo | Tipo | Obligatorio | Notas |
| ----- | ---- | ----------- | ----- |
| hasParkingSpaces | Boolean | Sí (default `false`) | ¿Tiene cocheras? |
| parkingSpacesCount | Int? | No | Solo si `hasParkingSpaces = true`. Si queda vacío, no se publica en web. |

---

## Características por nivel

### Emprendimiento (edificio)

Solo atributos del edificio. Categorías permitidas del catálogo global `PropertyFeature`:

| Categoría | Ejemplos |
| --------- | -------- |
| `GENERAL` | Apto profesional, Apto crédito, Uso comercial, Acepta permuta |
| `SERVICE` | Agua corriente, Cloacas, Electricidad, Internet, Gas |
| `AMENITY` | Piscina, SUM, Gimnasio, Seguridad, Parrilla, Laundry, Ascensores |

**No permitido en Development:** categoría `ROOM` (Ambientes).

### Tipología (unidad)

Características de configuración de la unidad. Solo categoría `ROOM` y **únicamente** estos slugs:

| Slug | Nombre |
| ---- | ------ |
| `banos` | Baños |
| `bano-en-suite` | Baño en Suite |
| `toilette` | Toilette |
| `cocina` | Cocina |
| `living` | Living |
| `comedor` | Comedor |
| `escritorio` | Escritorio |
| `dependencia` | Dependencia |
| `lavadero` | Lavadero |
| `balcon` | Balcón |
| `terraza` | Terraza |
| `patio` | Patio |
| `baulera` | Baulera |

**Excluido de tipologías:** Cochera, Dormitorios, Jardín y cualquier otro slug fuera de la lista.

---

## DevelopmentTypology

| Campo | Tipo | Obligatorio |
| ----- | ---- | ----------- |
| name | String | Sí |
| description | String | Sí — descripción comercial (textarea) |
| totalCount | Int? | No |
| availableCount | Int? | No |
| surfaceFrom | Decimal? | No |
| surfaceTo | Decimal? | No |
| priceFrom | Decimal? | No |
| currency | Currency? | No |
| sortOrder | Int | Default 0 |

Validaciones cruzadas (solo si ambos campos están definidos):

* `availableCount <= totalCount`
* `surfaceTo >= surfaceFrom`
* `priceFrom > 0` cuando está definido

---

## DevelopmentTypologyFeatureAssignment

| Campo | Tipo |
| ----- | ---- |
| typologyId | String |
| featureId | String |
| value | String? |

`@@unique([typologyId, featureId])`

Solo features de categoría `ROOM` cuyo slug esté en la whitelist de tipologías.

---

## Presentación web

Regla: **nunca mostrar placeholders**. Si un dato no existe, el bloque no se renderiza.

* Cocheras: solo si `hasParkingSpaces = true` **y** `parkingSpacesCount` está definido.
* Tipologías: solo características asignadas; sin textos como «No configurado», «-» o «Sin datos».

Lógica compartida:

* `apps/web/lib/development/typology-display.ts`
* `apps/web/lib/development/development-display.ts`

---

## Migraciones

* `202607020004_development_foundation`
* `202607030001_development_typology_refinement`
* `202607030002_development_parking_typology_features`
* `202608210001_development_sort_order`
