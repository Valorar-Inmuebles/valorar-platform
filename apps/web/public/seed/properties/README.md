# Demo property images

WebP assets for seed demo properties (`SEED_DEMO_PROPERTIES=true`).

## Structure

```txt
properties/
├── index.json              # Catalog of all demo slugs
└── {slug}/
    ├── cover.webp          # Portada (isCover)
    ├── 01.webp
    ├── 02.webp
    └── 03.webp
```

Each `{slug}` matches `DEMO_PROPERTIES[].slug` in `apps/api/prisma/seed-demo-properties-data.ts`.

The seed references these files via public URLs:

- `/seed/properties/{slug}/cover.webp`
- `/seed/properties/{slug}/01.webp`
- etc.

## Featured slugs

See `index.json` entries with `"featured": true`.

## Dual listing

- `venta-depto-palermo-01` — SALE + RENT
- `venta-casa-san-isidro-01` — SALE + RENT
