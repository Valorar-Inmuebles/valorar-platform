# Geo Catalog — Status

## GEO-001 ✅ (cerrado)

Catálogo global Argentina. Ver historial en commits `202607010001`–`202607010005`.

---

## GEO-002 ✅ (cerrado)

Integración del catálogo geográfico con Property, Admin y Web.

### Property (schema)

Migración: `202607010006_property_geo_fks`

| Campo nuevo | Tipo | Notas |
| ----------- | ---- | ----- |
| countryId | FK → Country | nullable |
| provinceId | FK → Province | nullable |
| localityId | FK → Locality | nullable |
| neighborhoodId | FK → Neighborhood | nullable |

Campos legacy **mantenidos**: `country`, `province`, `city`, `neighborhood`.

Backfill automático en migración + re-sync al final del seed GEO (`backfillPropertyGeoFks`).

Estadísticas persistidas en tabla `PropertyGeoMigrationAudit` (id `geo-002-backfill`).

Reglas de backfill:

1. Country por `iso2` / `search`
2. Province por `search` del texto legacy; fallback CABA → Capital Federal
3. Locality por `city`; fallback CABA → `neighborhood` como localidad (Palermo, Belgrano, …)
4. Neighborhood solo si difiere de la localidad matched

### API

- Property DTOs: IDs + `provinceName`, `localityName`, `neighborhoodName`
- Public filters: `provinceId`, `localityId`, `neighborhoodId` + legacy `city`/`neighborhood`
- Resolución display: FK si presente, si no legacy
- Geo cache in-memory en `GeoService`
- Nuevo endpoint: `GET /geo/localities/search`
- Query `q` en localities/neighborhoods por provincia/localidad

### Admin

- Formulario Property: Provincia (select) → Localidad (autocomplete) → Barrio (autocomplete opcional)
- Cascada: cambio provincia limpia localidad/barrio; cambio localidad limpia barrio
- Cliente: `apps/admin/lib/api/geo-client.ts` (fetch público, usable en client components)

### Web

- Hero search: autocomplete de localidades vía `/geo/localities/search`
- Filtros listado: select provincia + autocomplete localidad
- URLs: soporta `provinceId`, `localityId` + legacy `city`/`neighborhood`

### Documentación actualizada

- `docs/08-geo/*`
- `docs/03-database/current-schema.md`
- `docs/07-admin/admin-modules.md`
- `PROJECT_STATE.md`

---

## Volumen catálogo (post-seed dev)

| Entidad | Cantidad |
| ------- | -------- |
| Countries | 1 |
| Provinces | 24 |
| Localities | 20.376 |
| Neighborhoods | 0 |

## Migración Property (entorno dev demo)

| Métrica | Valor |
| ------- | ----- |
| Properties totales | 33 |
| countryId matched | 33 (100 %) |
| provinceId matched | 31 (93,9 %) |
| localityId matched | 10 (30,3 %) |
| neighborhoodId matched | 0 |
| Fully matched (country+province+locality) | 10 (30,3 %) |

Propiedades sin match completo conservan campos legacy operativos.

---

## Próximo hito

Sin hito geo pendiente. Futuro: subdivisions Neighborhood (Palermo Soho, Lanús Este, …).
