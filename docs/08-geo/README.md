# Geo Catalog



Módulo transversal de catálogo geográfico para Valorar Platform.



## Objetivo



Normalizar la información geográfica de Argentina mediante un catálogo global de plataforma, alineado al **mercado inmobiliario**:



```txt

Country → Province → Locality → Neighborhood (opcional)

```



Independiente de `Property`. Integración **GEO-002** ✅ — Property, Admin y Web.



## Capital Federal



Los barrios de CABA (Palermo, Belgrano, Caballito, …) son **localidades** de la provincia Capital Federal, no neighborhoods.



## Modelo



Catálogo global sin `tenantId`. Campos de negocio + `slug` y `search` auto-generados vía `@repo/geo-text`.

## slug y search

- `slug` → URLs SEO (expuesto en API)
- `search` → búsquedas internas (indexado, no expuesto)
- Generados automáticamente desde `name` — nunca editables



## Importación



Los datos iniciales se cargan desde dumps SQL legacy (`provincias.sql`, `localidades.sql`). Esos archivos son **solo fuente de importación**.



El seed importa únicamente localidades activas, deduplicadas por provincia + nombre.



## Documentación



| Documento | Contenido |

| --------- | --------- |

| [functional-model.md](./functional-model.md) | Reglas de negocio |

| [database-design.md](./database-design.md) | Modelo de datos |

| [api.md](./api.md) | Endpoints REST |

| [implementation-guide.md](./implementation-guide.md) | Seeds y desarrollo local |

| [status.md](./status.md) | Estado e hitos |



## Estado



GEO-001 y GEO-002 cerrados. Ver [status.md](./status.md).

