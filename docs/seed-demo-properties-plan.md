# Seed Demo Properties — Plan

Versión: 1.0  
Estado: Implementado  
Fecha: 2026-06-23

---

## Objetivo

Poblar la base de datos de desarrollo con **30 propiedades demo publicables** para validar:

- Home (destacados y recientes)
- Listado de propiedades
- Detalle de propiedad
- Filtros por operación, tipo y ubicación
- Dual listing (SALE + RENT en la misma propiedad)

**Emprendimientos:** proxy vía `Property` con `internalCode` prefijo `DEV-`. No existe dominio `Development` migrado; `/emprendimientos` sigue siendo placeholder web.

---

## Decisiones aprobadas

| Tema | Decisión |
| ---- | -------- |
| Emprendimientos | Opción A — Proxy Property (`DEV-` internalCode) |
| Imágenes | Assets locales en `apps/web/public/seed/properties/` |
| Seed | Opt-in con `SEED_DEMO_PROPERTIES=true` |
| Dual listing | 2 propiedades con SALE + RENT activos |
| Cantidad | 30 propiedades |
| Idempotencia | Re-ejecutable sin duplicar |
| Alcance excluido | API runtime, Prisma schema, Admin, Web components, reglas publishability |

---

## Esquema y publishability

Fuente de verdad: `apps/api/prisma/schema.prisma`, `docs/03-database/property-domain.md`.

### Regla de publicación (Public API)

Una propiedad aparece en `/public/properties`, `/public/properties/featured` y `/public/properties/:slug` cuando:

1. `Property.isActive = true`
2. Existe `PropertyListing` con `status = ACTIVE`
3. Ese listing tiene `PropertyPrice` con `isPrimary = true`
4. Existe `PropertyImage` con `isCover = true`

Implementación: `apps/api/src/modules/public-property/repositories/public-property.repository.ts`.

### Destacados adicionales

`GET /public/properties/featured` requiere además `PropertyListing.isFeatured = true` y ordena por `publishedAt DESC`.

### Recientes (web)

Home usa `GET /public/properties?limit=8` ordenado por `Property.updatedAt DESC`.

---

## Distribución de las 30 propiedades

| Segmento | Cant. | `listingType` | `propertyType` |
| -------- | ----- | ------------- | -------------- |
| Venta — Deptos | 8 | `SALE` | `APARTMENT` |
| Venta — Casas | 4 | `SALE` | `HOUSE` |
| Venta — PH | 2 | `SALE` | `PH` |
| Venta — Terrenos | 2 | `SALE` | `LAND` |
| Alquiler — Deptos | 6 | `RENT` | `APARTMENT` |
| Alquiler — Casas | 2 | `RENT` | `HOUSE` |
| Alquiler — Oficinas | 2 | `RENT` | `OFFICE` |
| Emprendimientos (proxy) | 4 | `SALE` | `APARTMENT` |

**Dual listing (2 propiedades, 32 listings totales):**

- `venta-depto-palermo-01` → `SALE` + `RENT`
- `venta-casa-san-isidro-01` → `SALE` + `RENT`

**Destacados (`isFeatured = true`):** 6 listings para home y pruebas de featured.

---

## Imágenes

- Assets WebP por propiedad en `apps/web/public/seed/properties/{slug}/`.
- Cada propiedad recibe 4 registros `PropertyImage` (`cover.webp`, `01.webp`, `02.webp`, `03.webp`).
- `storageKey`: `tenants/demo/properties/{slug}/{file}.webp`
- `url`: `/seed/properties/{slug}/{file}.webp` (same-origin, sin CDN ni R2).
- `mimeType`: `image/webp`

---

## Estructura de archivos

```txt
apps/api/prisma/
├── seed.ts                      # orquestador (opt-in demo)
├── seed-data.ts                 # tenant + users
├── seed-features.ts             # catálogo global
├── seed-demo-properties.ts      # lógica idempotente
└── seed-demo-properties-data.ts # 30 specs declarativos

apps/web/public/seed/properties/
├── index.json
└── {slug}/
    ├── cover.webp
    ├── 01.webp
    ├── 02.webp
    └── 03.webp
```

---

## Uso

```bash
cd apps/api

# .env requerido:
# SEED_DEFAULT_PASSWORD=...
# SEED_DEMO_PROPERTIES=true

npx prisma db seed
```

Sin `SEED_DEMO_PROPERTIES=true` el seed carga solo tenant, usuarios y features.

---

## Idempotencia

- `Property`: upsert por `@@unique([tenantId, slug])`
- `PropertyListing`: upsert por `@@unique([propertyId, listingType])`
- `PropertyPrice`: deleteMany + createMany por listing
- `PropertyImage`: deleteMany + createMany por property
- `PropertyFeatureAssignment`: upsert por `@@unique([propertyId, featureId])`

---

## Registros estimados

| Entidad | Cantidad |
| ------- | -------- |
| `Property` | 30 |
| `PropertyListing` | 32 |
| `PropertyImage` | 120 |
| `PropertyPrice` | 32 |
| `PropertyFeatureAssignment` | ~180 |

---

## Validación post-seed

```bash
# Obtener tenantId del log del seed, luego:
curl "http://localhost:3002/public/properties?tenantId={id}&limit=5"
curl "http://localhost:3002/public/properties/featured?tenantId={id}&limit=8"
```

Checklist:

- [ ] `meta.total >= 30` en listado público
- [ ] Featured devuelve ≥ 6 items
- [ ] Dual listing responde con `?listingType=SALE` y `?listingType=RENT`
- [ ] Emprendimientos proxy tienen `internalCode` `DEV-00x` (solo admin; no expuesto en API pública)

---

## Referencias

- `docs/03-database/property-domain.md`
- `docs/04-modules/properties.md`
- `docs/06-web/public-web-architecture.md`
