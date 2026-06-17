# Propuesta — Tab SEO en `/propiedades/[id]`

Versión: 1.0  
Fecha: 2026-06-17  
Branch: `feature/admin-property-ux`  
Estado: Propuesta — sin implementación.

Referencias:

* `apps/web/app/(site)/propiedades/[slug]/page.tsx`
* `apps/web/lib/seo/metadata.ts`
* `apps/api/prisma/schema.prisma` (model `Property`)
* `docs/proposals/property-module-v2.md`

---

## Objetivo

Definir dónde y cómo encaja la gestión SEO dentro del detalle de propiedad, preparando el admin para control de visibilidad en buscadores sin implementar aún.

---

## Navegación futura propuesta

### Sub-nav ampliado

```txt
[Resumen] [Datos generales] [Ubicación] [Características] [Imágenes] [Publicaciones] [SEO]
```

| Tab | Ruta | Fase |
| --- | ---- | ---- |
| Resumen | `/propiedades/[id]` o `/propiedades/[id]/resumen` | 2 |
| Datos generales | `/propiedades/[id]/datos` | 2 (split del form actual) |
| Ubicación | `/propiedades/[id]/ubicacion` | 2 |
| Características | `/propiedades/[id]/caracteristicas` | ✅ existe |
| Imágenes | `/propiedades/[id]/imagenes` | ✅ existe |
| Publicaciones | `/propiedades/[id]/publicaciones` | ✅ existe |
| **SEO** | `/propiedades/[id]/seo` | **3** |

**Implementación recomendada:** agregar tab en `PropertySubNav` (`navigation.ts` → `PropertySubNavTab` + `property-sub-nav.tsx`).

### Resolver de tab activo

```ts
// lib/property/navigation.ts — extensión
export type PropertySubNavTab =
  | "resumen"
  | "datos"
  | "ubicacion"
  | "publicaciones"
  | "caracteristicas"
  | "imagenes"
  | "seo";
```

---

## Estado actual — SEO sin tab dedicada

### Base de datos

Model `Property` **no tiene** campos SEO dedicados. Campos relevantes hoy:

| Campo | Uso SEO actual |
| ----- | -------------- |
| `slug` | URL pública `/propiedades/{slug}` |
| `title` | Base del `<title>` y JSON-LD `name` |
| `description` | Meta description (slice 160 chars) |
| `city`, `neighborhood`, `province` | Sufijo de título |
| `PropertyImage` cover `url`, `altText` | OG image + alt |

### Web pública (`apps/web`)

`generateMetadata` en detalle:

```ts
// Derivado — no editable independientemente
title = `${property.title} — ${listingTypeLabel} en ${location}`
description = property.description?.slice(0, 160) ?? fallback template
canonical = `/propiedades/${property.slug}`  // sin listingType
openGraph.images = cover URL
```

JSON-LD: `PropertyJsonLd` con schema.org `RealEstateListing`.

**Limitaciones actuales:**

* Sin override de meta title/description
* Canonical único por slug (multi-listing comparte URL con `?listingType=`)
* Sin `noIndex` por property
* Slug editable post-publicación (riesgo SEO)

---

## Modelo de datos sugerido

### Opción A — Campos en `Property` (recomendada MVP SEO)

Agregar a `Property`:

```prisma
model Property {
  // ... campos existentes ...

  // SEO overrides (null = usar derivado)
  metaTitle           String?  @db.VarChar(70)
  metaDescription     String?  @db.VarChar(160)
  seoSlug             String?  // alias semántico; ver nota slug
  canonicalUrl        String?  @db.VarChar(500)
  openGraphTitle      String?  @db.VarChar(70)
  openGraphDescription String? @db.VarChar(200)
  noIndex             Boolean  @default(false)

  // Auditoría
  seoUpdatedAt        DateTime?
}
```

### Opción B — Entidad `PropertySeo` (escala futura)

```prisma
model PropertySeo {
  id          String   @id @default(cuid())
  propertyId  String   @unique
  property    Property @relation(...)
  tenantId    String

  metaTitle           String?
  metaDescription     String?
  canonicalUrl        String?
  openGraphTitle      String?
  openGraphDescription String?
  openGraphImageId    String?  // FK PropertyImage opcional
  noIndex             Boolean  @default(false)
  structuredDataOverrides Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Recomendación:** Opción A para MVP SEO (menos joins, alineado con «sin migraciones salvo necesidad» — documentar necesidad estricta: control comercial de SEO).

### Nota sobre `seoSlug` vs `slug`

| Campo | Propósito |
| ----- | --------- |
| `slug` (existente) | URL canónica admin + web; único por tenant |
| `seoSlug` (propuesto) | **Opcional** — alias legible para marketing; solo si se implementa redirect 301 |

**Recomendación v1:** no introducir `seoSlug` separado. Usar `slug` existente con regla de inmutabilidad post-publicación (Fase D). Campo `seoSlug` reservado para v2 con redirect service.

---

## Campos — especificación

| Campo | Tipo | Obligatorio | Default / fallback | Validación |
| ----- | ---- | ----------- | ------------------ | ---------- |
| `metaTitle` | string | No | `{title} — {tipo} en {ciudad}` | max 70 chars |
| `metaDescription` | string | No | `description.slice(0,160)` o template | max 160 chars |
| `seoSlug` | string | No | = `slug` | Mismo patrón que slug; **diferir v1** |
| `canonicalUrl` | string | No | `{SITE_URL}/propiedades/{slug}` | URL absoluta o path |
| `openGraphTitle` | string | No | = `metaTitle` o title derivado | max 70 chars |
| `openGraphDescription` | string | No | = `metaDescription` | max 200 chars |
| `noIndex` | boolean | No | `false` | Si true → `robots: noindex` |

### Campos de solo lectura en tab (preview)

| Preview | Fuente |
| ------- | ------ |
| URL pública | `{PUBLIC_WEB_URL}/propiedades/{slug}` |
| OG image | Cover `url` + selector alternativa (fase 2) |
| JSON-LD preview | Generado como en web |
| Google snippet mock | Title + description + URL |

---

## Wireframe tab SEO

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ SEO — Casa en Belgrano                                                      │
│ Inicio › Propiedades › Casa en Belgrano › SEO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Configuración               │  │ Vista previa Google                 │  │
│  │                             │  │                                     │  │
│  │ Meta título                 │  │ Casa en Belgrano — Venta en...     │  │
│  │ [________________________]  │  │ www.inmobiliaria.com › propiedades │  │
│  │ 42/70 caracteres            │  │ Departamento luminoso en Belgrano..│  │
│  │                             │  │                                     │  │
│  │ Meta descripción            │  │ Vista previa compartir (OG)        │  │
│  │ [________________________]  │  │ [imagen portada]                   │  │
│  │ 128/160 caracteres          │  │ Casa en Belgrano — Venta en...     │  │
│  │                             │  │                                     │  │
│  │ URL canónica                │  └─────────────────────────────────────┘  │
│  │ [/propiedades/casa-belgrano]│                                            │
│  │                             │  ⚠ El slug no debería cambiarse después   │
│  │ OG título (opcional)        │    de publicar. [Más info]                │
│  │ [________________________]  │                                            │
│  │                             │  ☐ No indexar en buscadores (noIndex)     │
│  │ OG descripción (opcional)   │                                            │
│  │ [________________________]  │                                            │
│  │                             │                                            │
│  │         [Guardar cambios]   │                                            │
│  └─────────────────────────────┘                                            │
│                                                                             │
│  Estado indexación: ✓ Incluida en sitemap · Visible si publicable           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Impacto SEO

### Con tab SEO implementada

| Aspecto | Mejora |
| ------- | ------ |
| Control de snippet | Títulos/descripciones optimizados por inmobiliaria |
| CTR en Google | Meta descriptions persuasivas vs autogeneradas vacías |
| OG / redes | Títulos específicos para compartir en WhatsApp/Instagram |
| Propiedades internas | `noIndex` para operaciones off-market |
| Consistencia | Admin ve exactamente lo que renderiza web |

### Sin migración (MVP preview-only)

Tab de **solo lectura** mostrando valores derivados + warnings:

* Descripción vacía → «SEO débil»
* Slug editable en property publicada → warning
* Cover sin `altText` → warning accesibilidad/SEO

**Esfuerzo bajo, valor inmediato** — candidato quick win Fase 2.

---

## Migraciones necesarias

### Fase 3a — Preview only (sin migración)

* Nueva ruta `/propiedades/[id]/seo`
* Componente `PropertySeoPreview` lee property + cover + listing activo
* Warnings basados en datos existentes

### Fase 3b — Campos editables (con migración)

1. Documentar en `docs/03-database/property-domain.md`
2. Agregar campos a `schema.prisma` (Opción A)
3. Migración Prisma: `20260XXX_property_seo_fields`
4. Extender DTOs: `UpdatePropertyDto`, `PropertyResponseDto`
5. Extender Public DTO si campos deben reflejarse en web
6. Actualizar `apps/web` `generateMetadata` para usar overrides
7. Sitemap: excluir `noIndex = true`

### Reglas de negocio API

| Regla | Servicio |
| ----- | -------- |
| `metaTitle` max 70 | DTO validation |
| `metaDescription` max 160 | DTO validation |
| Slug inmutable si listing ACTIVE | `property.service.ts` (Fase D) |
| `canonicalUrl` debe pertenecer al tenant domain | Validación futura multi-domain |

---

## Compatibilidad futura con web pública

### Contrato Public API

Extender `PublicPropertyDetailDto`:

```ts
{
  // existentes...
  seo?: {
    metaTitle: string;        // resuelto (override o derivado)
    metaDescription: string;
    canonicalPath: string;
    openGraph: {
      title: string;
      description: string;
      imageUrl: string;
      imageAlt: string;
    };
    noIndex: boolean;
  };
}
```

Web consume un solo objeto SEO — no duplica lógica de derivación.

### Sitemap (`apps/web`)

```ts
// Excluir si:
property.noIndex === true
// O si no cumple regla publicación (ya implícito)
```

### Multi-operación (SALE + RENT)

| Tema | Decisión v1 |
| ---- | ----------- |
| Meta por listing | **No** — un SEO por property (MVP) |
| `listingType` en URL | Query param; canonical sin query |
| Futuro v2 | `PropertyListingSeo` si copy distinto por operación |

### JSON-LD

Mantener `RealEstateListing`; overrides en `name`/`description` si `metaTitle`/`metaDescription` definidos.

---

## Componentes sugeridos

| Componente | Fase | Descripción |
| ---------- | ---- | ----------- |
| `PropertySeoPage` | 3a | Server page en ruta seo |
| `PropertySeoPreview` | 3a | Mock Google + OG |
| `PropertySeoForm` | 3b | Formulario overrides |
| `SeoCharacterCounter` | 3b | Input con límite visual |
| `PropertySeoWarnings` | 3a | Lista warnings no bloqueantes |
| `SlugImmutabilityNotice` | 3a | Banner si publicada |

---

## Cambios backend (resumen)

| Endpoint | Cambio |
| -------- | ------ |
| `PATCH /properties/:id` | Aceptar campos SEO |
| `GET /properties/:id` | Retornar campos SEO |
| `GET /public/properties/:slug` | Incluir `seo` resuelto |
| `GET /properties/:id/seo/preview` | Opcional — preview sin persistir |

---

## Cambios frontend (resumen)

| Archivo | Cambio |
| ------- | ------ |
| `property-sub-nav.tsx` | Tab SEO |
| `navigation.ts` | Tipo + resolver + href |
| `breadcrumbs.ts` | Trail «SEO» |
| `property-form.tsx` | Mover slug a tab SEO o Datos con warning cruzado |
| `apps/web/.../page.tsx` | Consumir overrides en `generateMetadata` |

---

## Prioridad

| Orden | Entregable | Migración | Impacto |
| ----- | ---------- | --------- | ------- |
| 1 | Tab SEO preview-only + warnings | No | Medio |
| 2 | Slug inmutability (Fase D) | No | Alto (protege SEO) |
| 3 | Campos `metaTitle` / `metaDescription` | Sí | Alto |
| 4 | `noIndex` + sitemap | Sí | Medio |
| 5 | OG overrides separados | Sí | Bajo-Medio |
| 6 | `canonicalUrl` custom multi-domain | Sí | Bajo (futuro) |

---

## Criterios de aceptación

1. Tab SEO accesible desde sub-nav de cualquier property.
2. Preview muestra título/description/OG idénticos a lo que generaría web hoy.
3. Warnings visibles para descripción vacía, slug editable post-publicación, cover sin alt.
4. (Fase 3b) Overrides persisten y se reflejan en metadata de web en < 5 min (revalidate).
5. `noIndex` excluye property del sitemap.
6. Documentación `property-domain.md` actualizada antes de migración.
