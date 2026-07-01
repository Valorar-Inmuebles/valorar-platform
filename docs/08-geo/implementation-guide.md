# Geo Catalog — Implementation guide

## Migraciones

```bash
cd apps/api
npx prisma migrate deploy
npm run generate
```

Migración activa final: `202607010005_geo_catalog_slug_search` (requiere re-seed).

## Paquete compartido `@repo/geo-text`

Ubicación: `packages/geo-text/`

| Función | Uso |
| ------- | --- |
| `createSlug(name)` | URLs SEO |
| `createSearch(name)` | Búsquedas normalizadas |
| `buildGeoTextFields(name)` | Devuelve `{ slug, search }` |
| `ensureUniqueSlug(base, used)` | Resolución de colisiones en seed |

**Todo el proyecto debe usar estas funciones.** No duplicar lógica.

En la API, punto de entrada para futuros CRUD Admin:

```txt
apps/api/src/modules/geo/utils/geo-entity-text.ts
```

## Fuente de importación

Archivos en `apps/api/prisma/seed-data/`:

| Archivo | Uso en seed |
| ------- | ----------- |
| `provincias.sql` | Provincias activas |
| `localidades.sql` | Localidades activas deduplicadas + barrios CABA |

## Seeds

```txt
apps/api/prisma/
├── seed-country.ts
├── seed-provinces.ts
├── seed-localities.ts
├── seed-neighborhoods.ts      # no-op en GEO-001
├── seed-geo.ts
├── seed-utils/
│   ├── parse-geo-import-sql.ts
│   ├── dedupe-localities.ts
│   ├── prepare-locality-records.ts
│   └── geo-text-fields.ts
└── seed-data/
    ├── provincias.sql
    └── localidades.sql
```

Durante importación:

```txt
slug   = createSlug(name)
search = createSearch(name)
```

### Performance — localidades

- **No** usa upsert fila a fila (demasiado lento sobre Neon remoto).
- Elimina `Neighborhood` + `Locality` existentes y reimporta con `createMany` en lotes de **500**.
- Logs de progreso: `[geo seed] localities: 500/20376 (2.5%)` cada 500 registros.
- Tiempo esperado: ~10–30 s (vs horas con upserts secuenciales).

Auditoría: `node prisma/scripts/audit-geo-seed-performance.mjs`

### Activación

```env
SEED_GEO_CATALOG=true
SEED_DEFAULT_PASSWORD=...
```

```bash
cd apps/api
npx prisma db seed
```

## Análisis de dataset

```bash
node prisma/scripts/audit-geo-import-dataset.mjs
node prisma/scripts/analyze-postal-codes.mjs
node prisma/scripts/audit-geo-seed-performance.mjs
```

## API

- `GET /geo/provinces`
- `GET /geo/provinces/:id/localities`
- `GET /geo/localities/:id/neighborhoods`

DTOs exponen `slug` (para URLs). `search` es interno — no se expone.

## Verificación

```bash
curl http://localhost:3002/geo/provinces
curl http://localhost:3002/geo/provinces/{cabaProvinceId}/localities
```

Capital Federal → Palermo, Belgrano, Caballito, … como localidades con `slug`.
