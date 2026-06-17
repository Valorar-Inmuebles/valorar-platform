# V1.1 — Degradación post-activación (P0-1)

Versión: 1.0  
Estado: Implementado en `fix/v1-1-operational-trust`

## Problema

Una publicación `ACTIVE` podía dejar de cumplir el checklist de publicación (sin portada, sin precio principal, property archivada) y seguir mostrándose como activa en admin mientras la web pública la ocultaba.

## Estrategia elegida: **Opción B — Auto-pausar**

| Opción | Descartada porque |
| ------ | ----------------- |
| A — Bloquear | Impide flujos legítimos (cambiar portada, reorganizar galería). |
| C — Auto-cerrar | `CLOSED` implica cierre comercial; más destructivo y menos reversible. |

**Opción B:** cuando una mutación deja a una publicación `ACTIVE` incumpliendo `evaluateListingPublishability`, el sistema la transiciona automáticamente a `PAUSED`.

### Comportamiento

- Admin deja de mostrar `ACTIVE` fantasma.
- Web y admin quedan alineados (`PAUSED` no es visible públicamente).
- El operador puede corregir imágenes/precios/property y reactivar con el checklist existente.

### Puntos de sincronización

| Evento | Servicio |
| ------ | -------- |
| Quitar/borrar portada o imagen | `PropertyImageService` |
| Eliminar/demover precio principal | `PropertyPriceService` |
| Archivar property (`isActive: false`) | `PropertyService` |

Implementación: `ListingOperationalTrustService.syncActiveListingsAfterDegradation()`.
