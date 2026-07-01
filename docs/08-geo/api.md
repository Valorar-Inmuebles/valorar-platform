# Geo Catalog — API

Base path: `/geo`

Autenticación: **ninguna** (catálogo público de referencia).

Swagger tag: `Geo`

Cache en memoria (API): provincias 5 min; localidades/barrios por clave 2 min.

## Endpoints

### GET /geo/provinces

Lista provincias de Argentina.

**Response** `200`: array de `ProvinceResponseDto`

### GET /geo/localities/search

Autocomplete de localidades (evita descargar catálogo completo).

**Query params**

| Param | Descripción |
| ----- | ----------- |
| q | Término de búsqueda (requerido, min. 2 caracteres recomendado en UI) |
| provinceId | Opcional — restringe a una provincia |
| limit | Opcional — default 20, max 50 |

**Response** `200`: array de `LocalitySearchResultDto`

```json
[
  {
    "id": "clx...",
    "provinceId": "clx...",
    "provinceName": "Capital Federal",
    "name": "Palermo",
    "slug": "palermo",
    "postalCode": "1425"
  }
]
```

### GET /geo/provinces/:id/localities

Lista o filtra localidades de una provincia.

**Path params**

| Param | Descripción |
| ----- | ----------- |
| id | ID de la provincia (cuid) |

**Query params**

| Param | Descripción |
| ----- | ----------- |
| q | Opcional — filtra por `search` normalizado |
| limit | Opcional — default 50, max 200 |

**Response** `200`: array de `LocalityResponseDto`

**Response** `404`: provincia no encontrada

### GET /geo/localities/:id/neighborhoods

Lista o filtra subdivisiones opcionales de una localidad.

**Path params**

| Param | Descripción |
| ----- | ----------- |
| id | ID de la localidad (cuid) |

**Query params**

| Param | Descripción |
| ----- | ----------- |
| q | Opcional — filtra por `search` normalizado |
| limit | Opcional — default 50, max 200 |

**Response** `200`: array de `NeighborhoodResponseDto`

**Response** `404`: localidad no encontrada

## DTOs

Campos expuestos sin `createdAt`, `updatedAt` ni `search`.

| DTO | Campos |
| --- | ------ |
| ProvinceResponseDto | id, name, slug, isoCode |
| LocalityResponseDto | id, provinceId, name, slug, postalCode |
| LocalitySearchResultDto | id, provinceId, provinceName, name, slug, postalCode |
| NeighborhoodResponseDto | id, localityId, name, slug |

## Property API (GEO-002)

Los DTOs de Property (admin y public) exponen además de campos legacy:

| Campo | Descripción |
| ----- | ----------- |
| countryId | FK opcional |
| provinceId | FK opcional |
| localityId | FK opcional |
| neighborhoodId | FK opcional |
| provinceName | Nombre resuelto (FK o legacy) |
| localityName | Nombre resuelto (FK o legacy) |
| neighborhoodName | Nombre resuelto (FK o legacy) |

Filtros public list: `provinceId`, `localityId`, `neighborhoodId` + legacy `city`, `neighborhood`.

## Implementación

| Capa | Archivo |
| ---- | ------- |
| Controller | `apps/api/src/modules/geo/controllers/geo.controller.ts` |
| Service | `apps/api/src/modules/geo/services/geo.service.ts` |
| Repository | `apps/api/src/modules/geo/repositories/geo.repository.ts` |
| Property location | `apps/api/src/modules/property/utils/property-location.ts` |
| Property geo sync | `apps/api/src/modules/property/services/property-geo.service.ts` |

## Ejemplos

```bash
curl http://localhost:3002/geo/provinces
curl "http://localhost:3002/geo/localities/search?q=palermo"
curl "http://localhost:3002/geo/provinces/{provinceId}/localities?q=pal"
curl http://localhost:3002/geo/localities/{localityId}/neighborhoods
```
