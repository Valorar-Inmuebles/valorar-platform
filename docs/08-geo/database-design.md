# Geo Catalog — Database design

## Migraciones

| Migración | Descripción |
| --------- | ----------- |
| `202607010001_geo_catalog` | Tablas base |
| `202607010002_geo_catalog_assurant_fields` | *(obsoleta — revertida por v3)* |
| `202607010003_geo_catalog_simplify` | Eliminación de campos Assurant |
| `202607010004_geo_catalog_realestate_model` | Modelo mercado inmobiliario (CABA = localities) |
| `202607010005_geo_catalog_slug_search` | **slug + search para URLs y búsquedas** |

## Country

| Campo | Tipo | Descripción |
| ----- | ---- | ----------- |
| id | String (cuid) | PK |
| name | String | |
| iso2 | String | ISO 3166-1 alpha-2 (`AR`) |
| slug | String | URL-safe, único global |
| search | String | Normalizado para búsqueda |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## Province

| Campo | Tipo | Descripción |
| ----- | ---- | ----------- |
| id | String (cuid) | PK |
| countryId | String | FK → Country |
| name | String | |
| isoCode | String? | ISO 3166-2 (`AR-C`, `AR-B`) |
| slug | String | URL-safe, único por country |
| search | String | Normalizado para búsqueda |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## Locality

| Campo | Tipo | Descripción |
| ----- | ---- | ----------- |
| id | String (cuid) | PK |
| provinceId | String | FK → Province |
| name | String | |
| postalCode | String? | Código postal tradicional (4 dígitos). **No unique** |
| slug | String | URL-safe, único por province |
| search | String | Normalizado para búsqueda |
| createdAt | DateTime | |
| updatedAt | DateTime | |

En Capital Federal, cada barrio es una localidad (Palermo, Belgrano, Caballito, etc.).

## Neighborhood

| Campo | Tipo | Descripción |
| ----- | ---- | ----------- |
| id | String (cuid) | PK |
| localityId | String | FK → Locality |
| name | String | |
| slug | String | URL-safe, único por locality |
| search | String | Normalizado para búsqueda |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Subdivisión **opcional** de una localidad. GEO-001 no carga neighborhoods desde el dump.

## slug y search

| Campo | Uso | Editable |
| ----- | --- | -------- |
| slug | URLs SEO (`/propiedades/buenos-aires/la-plata`) | **No** — generado automáticamente |
| search | Búsquedas rápidas (sin acentos, espacios ni puntuación) | **No** — generado automáticamente |

Implementación compartida: `@repo/geo-text` (`createSlug`, `createSearch`).

En la API: `apps/api/src/modules/geo/utils/geo-entity-text.ts` — reutilizar en futuros altas/modificaciones desde Admin.

## Relaciones

```txt
Country 1 ── * Province 1 ── * Locality 1 ── * Neighborhood (opcional)
```

## Restricciones e índices

| Modelo | Unicidad | Índices |
| ------ | -------- | ------- |
| Country | `iso2`, `slug` | `search` |
| Province | `[countryId, name]`, `[countryId, slug]` | `countryId`, `search` |
| Locality | `[provinceId, name]`, `[provinceId, slug]` | `provinceId`, `search` |
| Neighborhood | `[localityId, name]`, `[localityId, slug]` | `localityId`, `search` |

`postalCode` no tiene restricción UNIQUE. Localidades distintas pueden compartir CP (ej. Lanús y Gerli → 1824).

## Volumen post-seed

| Entidad | Cantidad aprox. |
| ------- | --------------- |
| Country | 1 |
| Province | 24 |
| Locality | ~20.375 |
| Neighborhood | 0 |

## Reglas de importación (seed)

1. Solo filas con `status = 1` (activas).
2. Deduplicación por `(provincia, nombre normalizado)`.
3. Desempate: menor `id` del dump Assurant.
4. CABA: `CABA - {Barrio}` → `Locality.name = {Barrio}` con su `postalCode`.
5. `slug` y `search` derivados de `name` vía `@repo/geo-text` — nunca hardcodeados.
