# Web Premium — Fase 4

Versión: v1

Estado: ✅ implementado en `apps/web`

Referencias:

* `docs/06-web/public-web-architecture.md`
* `docs/06-web/public-web-ui.md`
* `docs/06-web/component-inventory.md`
* `docs/08-geo/`
* `PROJECT_STATE.md`

---

## Objetivo

Convertir la web pública en un **portal inmobiliario premium**: confianza, jerarquía visual clara, GEO integrado y SEO sólido — sin depender de nuevas APIs.

---

## Auditoría (estado previo)

| Área | Funcionaba | Mejoras / faltantes | Acción Fase 4 |
| ---- | ---------- | ------------------- | ------------- |
| Hero | Imagen + buscador | Buscador no protagonista; sin provincia; sin quick searches | Rediseño search-first + GEO completo |
| Buscador | Localidad autocomplete | Falta provincia → localidad; tabs ok | Flujo Provincia → Localidad → Tipo → Operación |
| Listado | Cards + filtros sidebar | Cards densas; selects nativos; poco aire | Cards premium + filtros más ligeros |
| Detalle | Galería, precio sticky, JSON-LD | Sin compartir; mapa básico | Share + slot mapa futuro |
| SEO | OG, canonical, sitemap, robots | Twitter sin images; listados filtrados indexables | Twitter images + noindex filtros |
| Performance | ISR (`revalidate`), lazy images parcial | — | `loading="lazy"` en cards; ISR sin cambios |
| Landing SEO | — | No existía arquitectura | Rutas `/explorar/...` → redirect a listado |

---

## Hero y buscador

### Flujo GEO

1. **Operación** — Comprar / Alquiler / Emprendimientos (tabs)
2. **Provincia** — `GeoProvinceCombobox` (autocomplete, no select largo)
3. **Localidad** — `GeoLocalitySearch` filtrado por provincia
4. **Tipo** — `PropertyTypeDropdown`
5. **Buscar** — navega a `/propiedades?...`

### Búsquedas rápidas

Chips: Palermo, Caballito, Belgrano, Rosario, Mar del Plata, Córdoba.

Resuelven vía `GET /geo/localities/search` y navegan con IDs GEO (no texto libre ambiguo).

---

## Listado

### Cards (`PublicPropertyCard`)

* Más aire, `ring` sutil en lugar de borde pesado
* Precio + operación destacados
* Ubicación con `localityName` / `provinceName` (GEO)
* Botón **Favoritos** (UI placeholder, disabled)
* Imágenes con `loading="lazy"`

### Filtros (`PropertyFilters`)

* Misma jerarquía GEO que el hero
* Operación y moneda en chips
* Sidebar sin caja pesada — secciones con labels uppercase
* Mobile: drawer existente (`MobileFiltersButton`)

---

## Detalle

Orden visual:

1. Galería (protagonista)
2. Breadcrumb + JSON-LD
3. Badges + **Compartir** + Favoritos (placeholder)
4. Título + ubicación GEO
5. Precio (sticky desktop / inline mobile)
6. Características
7. Descripción
8. Mapa — OSM embed si hay coords; slot `data-map-slot="interactive-map-future"` si no
9. Relacionadas

### Compartir

`PropertyShareButton` — Web Share API o copiar enlace.

---

## SEO

| Elemento | Estado |
| -------- | ------ |
| Title / Description | Por página |
| Canonical | `/propiedades`, `/propiedades/[slug]` |
| Open Graph | Imágenes por página |
| Twitter | `summary_large_image` + images |
| JSON-LD | Organization, RealEstateListing, BreadcrumbList |
| Robots / Sitemap | `/robots.txt`, `/sitemap.xml` |
| Listados filtrados | `noIndex: true` cuando hay filtros activos |

---

## Landing SEO (arquitectura preparada)

Rutas bajo `/explorar/`:

```txt
/explorar/{provincia}
/explorar/{provincia}/{localidad}
/explorar/{provincia}/{localidad}/{tipo}
/explorar/{provincia}/{localidad}/{tipo}/{operacion}
```

Ejemplo: `/explorar/buenos-aires/palermo/departamentos/venta`

Implementación v1: **redirect server-side** a `/propiedades?provinceId=&localityId=&...` resolviendo slugs GEO.

Archivos:

* `lib/seo/landing-routes.ts` — slugs y parser
* `lib/seo/resolve-landing-redirect.ts` — resolución GEO
* `app/(site)/explorar/[...segments]/page.tsx` — redirect

Futuro: páginas estáticas con contenido SEO propio (sin cambiar URLs).

---

## Componentes nuevos

| Componente | Rol |
| ---------- | --- |
| `GeoProvinceCombobox` | Provincia searchable |
| `PropertyFavoriteButton` | Placeholder favoritos |
| `PropertyShareButton` | Compartir propiedad |
| `lib/constants/quick-searches.ts` | Búsquedas rápidas hero |
| `lib/seo/landing-routes.ts` | Contrato URLs SEO |
| `lib/seo/resolve-landing-redirect.ts` | Redirect explorar → listado |

---

## Responsive

| Breakpoint | Comportamiento |
| ---------- | -------------- |
| Mobile | Hero apilado; buscador full-width; filtros en drawer; cards 1 col |
| Tablet | Listado 2 cols; galería adaptativa |
| Desktop | Filtros sticky; detalle 2 cols con precio sticky |

---

## Performance

* ISR: home `300s`, listado `60s`, detalle `300s` (sin cambios)
* Imágenes card: lazy loading
* GEO: debounce 250ms en autocomplete
* Sin consultas duplicadas en una misma página

---

## No implementado (preparado)

* Favoritos persistentes
* Mapa interactivo / Street View
* Visita virtual
* Páginas SEO estáticas bajo `/explorar/` (solo redirect v1)
