# Geo Catalog — Modelo funcional

## Jerarquía

```txt
Country (Argentina)
└── Province (24 jurisdicciones)
    └── Locality (localidades de mercado)
        └── Neighborhood (opcional — subdivisiones futuras)
```

## Enfoque de negocio

Valorar modela la geografía como la usa el **mercado inmobiliario argentino**, no únicamente la división administrativa.

- Una localidad es lo que un usuario espera seleccionar al publicar o buscar una propiedad.
- Un neighborhood es una subdivisión opcional cuando el mercado la distingue (Palermo Soho, Lanús Este, City Bell, etc.).

## slug y search

Campos derivados automáticamente de `name`. **Nunca editables por el usuario.**

| Campo | Propósito | Ejemplo (`José C. Paz`) |
| ----- | --------- | ----------------------- |
| slug | URLs SEO | `jose-c-paz` |
| search | Búsquedas internas | `josecpaz` |

Funciones compartidas (`@repo/geo-text`):

- `createSlug(name)` — minúsculas, sin acentos, espacios → `-`, sin caracteres especiales
- `createSearch(name)` — minúsculas, sin acentos, sin espacios/guiones/puntos/comas/apóstrofes

En cada alta o modificación de entidad geográfica se regeneran `slug` y `search` a partir del `name` actualizado.

## Country

Solo Argentina en GEO-001. Identificación ISO (`iso2`).

## Province

Provincia o jurisdicción. Incluye **Capital Federal**.

Campos: `name`, `isoCode`, `slug`, `search`.

## Locality

Unidad geográfica principal del catálogo.

Campos: `name`, `postalCode` (opcional), `slug`, `search`.

Fuera de CABA: localidades del país (La Plata, Lanús, Rosario, etc.).

Varias localidades pueden compartir el mismo código postal (Lanús y Gerli → 1824).

### Capital Federal

Cada barrio de CABA es una **localidad**, no un neighborhood:

```txt
Argentina
└── Capital Federal (Province)
    ├── Palermo (Locality, CP 1425)
    ├── Belgrano (Locality, CP 1428)
    ├── Caballito (Locality)
    └── …
```

## Neighborhood

Subdivisión opcional de una localidad. **No se usa en GEO-001** para CABA.

Ejemplos futuros:

```txt
Palermo (Locality)
├── Palermo Soho (Neighborhood)
├── Palermo Hollywood (Neighborhood)
└── Palermo Chico (Neighborhood)
```

## Importación desde dump legacy

Reglas aplicadas en seed:

| Regla | Descripción |
| ----- | ----------- |
| Solo activas | `status = 1` |
| Deduplicación | Por provincia + nombre normalizado |
| Desempate | Menor `id` del dump |
| CABA | Barrio → Locality con CP de la fila ganadora |
| slug/search | Generados con `@repo/geo-text` |

## Multi-tenant

Catálogo global compartido (mismo patrón que `PropertyFeature`).

## Property

Sin integración en GEO-001. Ver GEO-002.
