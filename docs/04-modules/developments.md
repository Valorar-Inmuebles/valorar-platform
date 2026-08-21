# Developments Module (Emprendimientos)

Versión: D1 Foundation

## Objetivo

Administrar emprendimientos inmobiliarios dentro de un tenant. Entidad hermana de Property con la misma UX admin pero modelo de dominio independiente.

Documentación técnica: `docs/03-database/development-domain.md`

---

## API (NestJS)

### Development

Ruta base admin: `/developments`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/developments` | Crear emprendimiento |
| GET | `/developments` | Listar por tenant |
| GET | `/developments/:id` | Detalle |
| PATCH | `/developments/:id` | Actualizar |
| DELETE | `/developments/:id` | Archivar (`isActive = false`) |

### DevelopmentImage

Ruta base: `/development-images` — mismo patrón que PropertyImage.

### Development Feature Assignments

Ruta base: `/developments/:developmentId/features` — reutiliza catálogo `PropertyFeature`.

### Development Feature Assignments

Ruta base: `/developments/:developmentId/features` — reutiliza catálogo `PropertyFeature`.

**Categorías permitidas:** `GENERAL`, `SERVICE`, `AMENITY` (excluye `ROOM`).

### DevelopmentTypology Feature Assignments

Ruta base: `/development-typologies/:typologyId/features`

**Categorías permitidas:** `ROOM` (Ambientes / configuración de unidad).

**Slugs permitidos:** `banos`, `bano-en-suite`, `toilette`, `cocina`, `living`, `comedor`, `escritorio`, `dependencia`, `lavadero`, `balcon`, `terraza`, `patio`, `baulera`.

**Excluido:** Cochera y cualquier slug fuera de la lista anterior.

### Cocheras (Development)

Campos en `Development`: `hasParkingSpaces` (boolean), `parkingSpacesCount` (int opcional). Configurables en Datos generales del admin.

### DevelopmentTypology

Ruta base: `/development-typologies` — CRUD por `developmentId`.

Campos obligatorios: `name`, `description`. Resto opcional.

### Public Development

Ruta base: `/public/developments` — solo lectura, sin JWT.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/public/developments` | Listado paginado |
| GET | `/public/developments/:slug` | Detalle público |

Filtros del listado público:

* Ubicación (`provinceId`, `localityId`, `neighborhoodId`, `city`)
* Rango de precio (`priceMin`, `priceMax`, `currency`)
* Estado de la obra (`status`): Pozo, En construcción, Terminado

---

## Admin UI

Rutas:

| Ruta | Sección |
| ---- | ------- |
| `/emprendimientos` | Listado |
| `/emprendimientos/crear` | Alta |
| `/emprendimientos/[id]` | Datos generales |
| `/emprendimientos/[id]/comercializacion` | Precio desde + financiación |
| `/emprendimientos/[id]/caracteristicas` | Amenidades |
| `/emprendimientos/[id]/imagenes` | Galería |
| `/emprendimientos/[id]/tipologias` | Tipologías |

Tabs: Datos / Comercialización / Características / Imágenes / Tipologías.

---

## Web pública

* Listado: `/emprendimientos`
* Detalle: `/emprendimientos/[slug]`
* Filtro dinámico **Estado de la obra** por `Development.status`.

Secciones del detalle: Hero, Descripción, Amenidades, Ubicación, Tipologías.

---

## Orden de listados

Admin `GET /developments` y público `GET /public/developments` (incluye el bloque de recientes) ordenan por `sortOrder ASC`, `createdAt DESC`, `id ASC`. Ver `docs/03-database/development-domain.md`.

El ABM no muestra ni edita `sortOrder` en esta versión.

---

## Fuera de alcance D1

Videos, PDFs, brochure, masterplan, avance de obra, etapas, torres, planos, administración unidad por unidad, CRM, reservas.
