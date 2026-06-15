# Public Web UI / UX

Versión: v1

Estado: Especificación de diseño — referencia visual externa (Airbnb, Zillow, Zonaprop, Argenprop) sin copiar marca ni contenido.

Referencias:

* `docs/01-business/vision.md`
* `docs/05-development/conventions.md`
* `docs/06-web/public-web-architecture.md`

---

## Principios de diseño

| Principio | Descripción |
| --------- | ----------- |
| Mobile First | Diseñar primero para 320–428px; escalar a tablet y desktop. |
| Jerarquía clara | Precio y ubicación visibles de inmediato en cards y detalle. |
| Espacios amplios | Padding generoso, respiración entre secciones. |
| Interfaces limpias | Tipografía legible, paleta limitada, imágenes protagonistas. |
| Confianza | Información completa, CTAs visibles, footer con datos de contacto. |
| White label | Colores primarios/secundarios del tenant vía CSS variables. |
| Español | Toda la UI visible al usuario en español. |

### Paleta y tipografía (base)

Hasta existir endpoint de branding:

* **Primario**: variable `--color-primary` (default desde env `PUBLIC_PRIMARY_COLOR`)
* **Secundario**: variable `--color-secondary`
* **Neutros**: escala gris para textos y bordes
* **Tipografía**: sans-serif moderna (Geist o equivalente); pesos 400 / 500 / 600 / 700

### Breakpoints

| Nombre | Ancho | Comportamiento clave |
| ------ | ----- | -------------------- |
| Mobile | `< 768px` | Una columna; menú hamburguesa; filtros en drawer |
| Tablet | `768px – 1023px` | Grid 2 columnas; filtros colapsables |
| Desktop | `≥ 1024px` | Grid 3 columnas; sidebar filtros fijo |

---

## Navegación global

### Header

**Desktop (≥ 1024px)**

```txt
[Logo]   Inicio | Propiedades | Emprendimientos | Servicios | Nosotros | Asesoramiento Jurídico | Contacto
```

* Logo: enlace a `/` (desde `TenantSetting.logoUrl` o placeholder)
* Links activos con indicador visual (underline o color primario)
* Altura fija ~64–72px; fondo blanco o semitransparente con blur al scroll
* Sticky top opcional en listados y detalle

**Mobile**

* Logo centrado o izquierda
* Icono hamburguesa derecha → panel full-screen o drawer
* Menú vertical con los mismos ítems
* Cierre con X o tap fuera

**Estados**

| Estado | Tratamiento |
| ------ | ----------- |
| Link activo | Color primario + indicador |
| Hover | Ligero cambio de color / underline |
| Focus | Outline accesible |

---

## Home (`/`)

Estructura vertical de secciones:

```txt
Header
Hero
SearchTabs + Buscador
Propiedades destacadas
Propiedades recientes
Categorías (Casas | Departamentos | Emprendimientos)
Footer
```

### Hero principal

**Objetivo:** comunicar propuesta de valor del tenant y anclar el buscador.

| Elemento | Especificación |
| -------- | -------------- |
| Fondo | Imagen full-width con overlay oscuro semitransparente, o gradiente + imagen |
| Título | H1 grande: mensaje comercial del tenant (ej. «Encontrá tu próximo hogar») |
| Subtítulo | Una línea de apoyo, tono profesional |
| Altura | Mobile: ~50vh; Desktop: ~60–70vh |
| Contenido | Centrado verticalmente sobre el overlay |

No usar textos de marcas de referencia; copy configurable por tenant (env o CMS futuro).

### Search Tabs (buscador)

Tres tabs horizontales sobre el formulario de búsqueda:

| Tab UI | Acción al buscar |
| ------ | ---------------- |
| Alquiler | `/propiedades?listingType=RENT` + filtros del form |
| Comprar | `/propiedades?listingType=SALE` + filtros del form |
| Emprendimientos | `/emprendimientos` (+ filtros cuando exista API) |

**Campos del formulario (MVP propiedades):**

| Campo | Control | Mapeo API |
| ----- | ------- | --------- |
| Ubicación | Input texto o combobox | `city` y/o `neighborhood` |
| Tipo de propiedad | Select opcional | `propertyType` |
| Dormitorios | Select opcional | `bedrooms` |
| Botón | «Buscar» primario | Submit → navegación |

Diseño: card flotante sobre el hero (desktop) o debajo del hero (mobile). Tabs con estilo pill o underline.

### Propiedades destacadas

| Aspecto | Detalle |
| ------- | ------- |
| Título sección | «Propiedades destacadas» |
| Fuente datos | `GET /public/properties/featured` |
| Layout | Carrusel horizontal mobile; grid 4 cols desktop |
| Card | Ver `PropertyCard` |
| Empty state | Mensaje amable si no hay destacadas |
| CTA sección | Link «Ver todas» → `/propiedades` |

Badge opcional «Destacada» en cards (listing `isFeatured`).

### Propiedades recientes

| Aspecto | Detalle |
| ------- | ------- |
| Título sección | «Recientes» o «Últimas publicaciones» |
| Fuente datos | `GET /public/properties?limit=8` (orden `updatedAt desc`) |
| Layout | Igual que destacadas |
| CTA | «Ver todas las propiedades» → `/propiedades` |

### Categorías

Tres bloques visuales grandes (cards con imagen de fondo + overlay):

| Categoría UI | Destino |
| ------------ | ------- |
| Casas | `/propiedades?propertyType=HOUSE` |
| Departamentos | `/propiedades?propertyType=APARTMENT` |
| Emprendimientos | `/emprendimientos` |

Mobile: stack vertical. Tablet/Desktop: grid 3 columnas.

Imágenes: stock genéricas o assets del tenant; no copiar referencias externas.

### Footer completo

Columnas sugeridas:

```txt
[Logo + descripción breve]

Navegación          Contacto              Legal
- Inicio            - Teléfono            - Términos (futuro)
- Propiedades       - Email               - Privacidad (futuro)
- Emprendimientos   - WhatsApp
- Servicios         - Dirección oficina
- Contacto

[Redes sociales — cuando existan en TenantSetting]

© {año} {companyName}. Todos los derechos reservados.
```

Fondo oscuro o neutro; links con hover; iconos redes cuando estén disponibles.

---

## Propiedades — Listado (`/propiedades`)

### Layout desktop

```txt
Header
Breadcrumbs: Inicio > Propiedades
Título + contador resultados
┌─────────────────┬──────────────────────────────────┐
│ Sidebar filtros │  Toolbar (orden — futuro API)     │
│ (280–320px)     │  Grid 3 cols PropertyCard        │
│                 │  Paginación                        │
└─────────────────┴──────────────────────────────────┘
Footer
```

### Layout mobile

```txt
Header
Título + «X propiedades»
[Botón Filtros] → drawer bottom sheet
Grid 1 col
Paginación
Footer
```

### Sidebar filtros

Filtros alineados con query params de la API (MVP):

| Filtro UI | Control | Param API |
| --------- | ------- | --------- |
| Operación | Radio / chips | `listingType` |
| Tipo de inmueble | Multi-select o select | `propertyType` |
| Ciudad | Input / select | `city` |
| Barrio | Input | `neighborhood` |
| Precio mínimo | Number | `priceMin` |
| Precio máximo | Number | `priceMax` |
| Moneda | Toggle ARS / USD | `currency` |
| Dormitorios | Select mínimo | `bedrooms` |
| Baños | Select mínimo | `bathrooms` |

Acciones:

* «Aplicar filtros» (mobile drawer)
* «Limpiar filtros» → `/propiedades`

Filtros **no** disponibles en API (omitir en MVP): condición, características, superficie.

Chips de filtros activos sobre el grid (desktop y mobile).

### Grid de cards

Ver sección PropertyCard más abajo.

* Gap consistente (16–24px)
* Skeleton loaders durante transiciones (Client) o Suspense boundaries (Server)

### Paginación

* Controles: Anterior | números | Siguiente
* Basada en `meta.page`, `meta.totalPages`, `meta.total`
* Preserva filtros en query string
* Accesible: links reales, no solo botones JS

### Empty state

Ilustración ligera + «No encontramos propiedades con estos filtros» + botón limpiar filtros.

---

## PropertyCard

Componente central del listado y secciones home.

**Estructura visual:**

```txt
┌────────────────────────────┐
│  [Imagen cover 16:10]        │
│  Badge operación (Venta/     │
│  Alquiler/Temporario)        │
├────────────────────────────┤
│  Precio destacado            │
│  Título (2 líneas max)       │
│  📍 Barrio, Ciudad           │
│  🛏 N dorm · 🛁 N baños · m² │
└────────────────────────────┘
```

| Campo | Fuente DTO |
| ----- | ---------- |
| Imagen | `coverImage.url` (fallback placeholder si null) |
| Badge operación | `listingType` → «Venta» / «Alquiler» / «Alquiler temporario» |
| Precio | `price` + `currency` formateado |
| Título | `title` |
| Ubicación | `neighborhood`, `city` |
| Métricas | `bedrooms`, `bathrooms`, `totalArea` (ocultar si null) |

Interacciones:

* Card entera clickable → `/propiedades/{slug}`
* Hover desktop: elevación sutil + zoom imagen ligero
* Focus visible para teclado

---

## Detalle de propiedad (`/propiedades/[slug]`)

### Layout desktop

```txt
Header
Breadcrumbs: Inicio > Propiedades > {título corto}

[Galería full width]

┌──────────────────────────────┬─────────────────┐
│ Título H1                    │ PriceCard       │
│ Ubicación                    │ (sticky)        │
│ Chips operación / tipo       │ WhatsApp CTA    │
├──────────────────────────────┴─────────────────┤
│ Características (grid iconos)                  │
│ Descripción                                    │
│ Mapa (si hay coordenadas — pendiente API)      │
│ Propiedades relacionadas (carrusel/grid)       │
└────────────────────────────────────────────────┘
Footer
```

### Galería

| Aspecto | Detalle |
| ------- | ------- |
| Fuente | `gallery[]` ordenado por API |
| Desktop | Grid 1 grande + 4 thumbnails; click abre lightbox |
| Mobile | Carrusel swipeable full-width |
| Portada | Primera imagen o `isCover = true` |
| Alt text | `altText` o `{title} — foto {n}` |

Client Component por lightbox y gestos.

### Información principal

| Elemento | Fuente |
| -------- | ------ |
| Título | `title` |
| Ubicación | `neighborhood`, `city` |
| Tipo | `propertyType` → label español |
| Operación | `listingType` |
| Publicación | `listing.publishedAt` (formato relativo o fecha) |

Selector de operación si la propiedad tiene múltiples listings activos: tabs `Venta | Alquiler | Temporario` que recargan con `?listingType=`.

### Precio (PriceCard)

| Elemento | Fuente |
| -------- | ------ |
| Precio principal | `price.amount`, `price.currency`, `price.label` |
| Expensas | `listing.expensesAmount`, `listing.expensesCurrency` |
| Formato | ARS con separador local; USD con prefijo US$ |

Card sticky en desktop al hacer scroll; en mobile va debajo del título o fijo bottom bar con precio + CTA.

### Características (PropertyFeatures)

Dos niveles:

**Datos numéricos de Property** (disponibles parcialmente en detalle DTO actual):

* Dormitorios, baños, superficie total — desde DTO
* Ambientes, cocheras, antigüedad — **pendiente extensión DTO**; ocultar hasta API

**Features asignadas** (`features[]`):

Agrupar por categoría API:

| Categoría API | Título UI |
| ------------- | --------- |
| GENERAL | Generales |
| SERVICE | Servicios |
| ROOM | Ambientes |
| AMENITY | Amenities |

Presentación: grid de chips o lista con iconos genéricos + `name` + `value` opcional.

### Descripción

* Texto completo `description`
* Tipografía body, line-height cómodo
* «Leer más» solo si supera ~6 líneas en mobile

### Mapa

**Estado MVP:** la API pública no expone `latitude`, `longitude` ni dirección completa.

Opciones documentadas:

1. **Fase 4 sin mapa:** mostrar solo barrio/ciudad en texto
2. **Post extensión API:** mapa estático o interactivo centrado en coordenadas
3. **Intermedio:** mapa aproximado por ciudad (baja prioridad)

Cuando esté disponible: Client Component con marcador único; sin exponer dirección exacta si política comercial lo requiere.

### Propiedades relacionadas

Heurística MVP:

* Misma `city` + mismo `propertyType`
* Excluir slug actual
* Limit 4 vía listado API

Título: «Propiedades similares». Grid/carrusel de `PropertyCard`.

### CTA WhatsApp

| Elemento | Detalle |
| -------- | ------- |
| Copy botón | «Consultar por WhatsApp» |
| Link | `https://wa.me/{phone}?text={encoded message}` |
| Mensaje predefinido | «Hola, me interesa {title} — {url canonical}» |
| Teléfono | `PUBLIC_WHATSAPP` env (futuro: `TenantSetting.whatsapp`) |
| Ubicación | PriceCard desktop; barra fija mobile |

Componente `WhatsAppCTA`: icono WhatsApp + botón primario verde o primario tenant.

---

## Emprendimientos

**Estado dominio:** entidades `Development` y `DevelopmentUnit` planificadas en `PROJECT_STATE.md`; **sin API pública**.

La UI se documenta como objetivo de diseño; implementación bloqueada hasta API.

### Listado (`/emprendimientos`)

Layout análogo a propiedades:

```txt
Header
Hero compacto «Emprendimientos»
Filtros (futuro): ubicación, estado obra, tipología
Grid DevelopmentCard
Paginación
Footer
```

**MVP placeholder:** página estática con mensaje «Próximamente» o listado mock deshabilitado en sitemap (`noindex`).

### DevelopmentCard (objetivo)

```txt
┌────────────────────────────┐
│  Imagen del emprendimiento   │
│  Badge estado obra           │
├────────────────────────────┤
│  Nombre del emprendimiento   │
│  📍 Ubicación                │
│  Desde USD/ARS ...           │
│  N unidades disponibles      │
└────────────────────────────┘
```

### Detalle (`/emprendimientos/[slug]`)

Secciones objetivo:

* Galería del emprendimiento
* Nombre, ubicación, estado de obra
* Descripción comercial
* Amenities del proyecto
* **Unidades disponibles**: tabla/cards con tipología, m², precio, estado
* Plano / brochure descargable (futuro)
* Mapa ubicación
* CTA WhatsApp contextual

### Unidades disponibles

Tabla responsive:

| Columna | Descripción |
| ------- | ----------- |
| Unidad | Identificador (ej. 3° A) |
| Tipología | Mono / 2 amb / 3 amb |
| Superficie | m² totales y cubiertos |
| Precio | Moneda + monto |
| Estado | Disponible / Reservada / Vendida |
| Acción | Consultar (WhatsApp) |

Mobile: cards apiladas por unidad.

---

## Páginas estáticas

### Servicios (`/servicios`)

* Hero con título «Servicios»
* Grid de servicios (tasaciones, administración, etc.) — contenido editable
* CTA contacto

### Nosotros (`/nosotros`)

* Historia de la inmobiliaria
* Valores / equipo (opcional)
* Imagen corporativa

### Asesoramiento Jurídico (`/asesoramiento-juridico`)

* Descripción del servicio jurídico
* Lista de trámites cubiertos
* CTA WhatsApp o contacto

### Contacto (`/contacto`)

* Datos de contacto (teléfono, email, dirección, horarios)
* Mapa oficina (coordenadas estáticas del tenant)
* Formulario lead (futuro — dominio Lead API pendiente)

Layout común: `StaticPageHero` + secciones de contenido + CTA.

---

## Responsive — resumen por página

### Home

| Breakpoint | Comportamiento |
| ---------- | -------------- |
| Mobile | Hero compacto; buscador debajo; carruseles 1 card visible |
| Tablet | Grid 2 cols en destacadas/recientes |
| Desktop | Buscador superpuesto hero; grids 4 cols; categorías 3 cols |

### Listado propiedades

| Breakpoint | Comportamiento |
| ---------- | -------------- |
| Mobile | Sin sidebar; filtros en drawer; 1 col |
| Tablet | 2 cols; filtros colapsables top |
| Desktop | Sidebar fijo; 3 cols |

### Detalle

| Breakpoint | Comportamiento |
| ---------- | -------------- |
| Mobile | Galería carrusel; PriceCard inline; CTA WhatsApp fijo bottom |
| Tablet | Galería grid; PriceCard lateral no sticky |
| Desktop | Galería amplia; PriceCard sticky; 3 cols relacionadas |

### Emprendimientos

Misma lógica responsive que propiedades.

---

## Accesibilidad

* Contraste WCAG AA mínimo en textos y botones
* `alt` en todas las imágenes de propiedad
* Navegación por teclado en menú, filtros, galería, paginación
* `aria-label` en iconos (WhatsApp, filtros, cerrar menú)
* Focus trap en drawer mobile y lightbox

---

## Estados de carga y error

| Estado | Patrón UI |
| ------ | --------- |
| Loading listado | Skeleton cards (3–6) |
| Loading detalle | Skeleton hero + texto |
| Error API | Banner «Error al cargar» + reintentar |
| 404 propiedad | Página dedicada con link a listado |
| Imagen rota | Placeholder genérico inmueble |

---

## Referencia visual (sin copiar)

Las referencias externas informan:

* Densidad de información en cards
* Proporción imagen/texto
* Ubicación del buscador en hero
* Sidebar de filtros en listados
* Galería tipo grid + lightbox en detalle
* Footer informativo multi-columna

No replicar: logos, paletas específicas, textos legales, fotografías ni naming de terceros.
