# Matriz de Prioridad — Admin Property UX

Versión: 1.0  
Fecha: 2026-06-17  
Estado: Planificación.

Referencias:

* `docs/implementation/admin-property-ux-implementation-plan.md`
* `docs/implementation/mvp-comercial-v1.md`

---

## Leyenda de clasificación

| Clasificación | Significado |
| ------------- | ----------- |
| **Quick Win** | Bajo esfuerzo, impacto visible rápido, sin backend nuevo |
| **Alto Impacto** | Mejora significativa en operación diaria o publicación |
| **Bajo Impacto** | Pulido, nice-to-have, o beneficio en escala grande solamente |
| **Costosa** | Alta complejidad, múltiples capas, o migración |
| **Bloqueante** | Sin esto el MVP comercial o la coherencia del sistema falla |

Una iniciativa puede tener **múltiples etiquetas**.

---

## Matriz completa

| ID | Iniciativa | Quick Win | Alto Impacto | Bajo Impacto | Costosa | Bloqueante | EPIC |
| -- | ---------- | :-------: | :----------: | :----------: | :-----: | :--------: | ---- |
| I01 | Badges comerciales en listado | | ✅ | | | ✅ | 02 |
| I02 | Filtro Activas/Archivadas | ✅ | ✅ | | | | 02 |
| I03 | Búsqueda client-side | ✅ | ✅ | | | | 02 |
| I04 | Ver en web desde listado | ✅ | ✅ | | | | 02 |
| I05 | Restaurar property desde listado | ✅ | | | | | 01 |
| I06 | Copy «Cerrar publicación» | ✅ | | | | | 01 |
| I07 | Warning slug publicada | ✅ | ✅ | | | | 01 |
| I08 | Feature manager sticky save | ✅ | | | | | 01 |
| I09 | Loading skeletons | ✅ | | | | | 01 |
| I10 | SUPER_ADMIN empty state | ✅ | ✅ | | | ✅ | 01 |
| I11 | TenantSwitcher tablet | ✅ | ✅ | | | | 01 |
| I12 | Actualizar docs drift | ✅ | | | | | 09 |
| I13 | DataTable compartida | | ✅ | | | | 08 |
| I14 | Paginación server-side | | ✅ | | ✅ | | 02 |
| I15 | Thumbnail + precio en listado | | ✅ | | | | 02 |
| I16 | Filtros API (q, city, type) | | ✅ | | | | 02 |
| I17 | Dashboard KPI cards | | ✅ | | ✅ | ✅ | 03 |
| I18 | Dashboard acciones rápidas | ✅ | ✅ | | | | 03 |
| I19 | Dashboard activity feed | | | ✅ | | | 03 |
| I20 | Dashboard publish alerts | | ✅ | | | | 03 |
| I21 | GET /admin/dashboard/summary | | ✅ | | ✅ | ✅ | 03 |
| I22 | Tab Resumen property | | ✅ | | ✅ | | 04 |
| I23 | Split form Datos/Ubicación | | ✅ | | ✅ | | 04 |
| I24 | PropertyDetailHeader acciones | | ✅ | | | | 04 |
| I25 | ListingSubNav | | ✅ | | | | 04 |
| I26 | Layout [id] anidado | | | | ✅ | | 04 |
| I27 | StorageModule + R2 | | ✅ | | ✅ | ✅ | 05 |
| I28 | Upload signed URL API | | ✅ | | ✅ | ✅ | 05 |
| I29 | PropertyImageUploader UI | | ✅ | | | ✅ | 05 |
| I30 | Reorder imágenes drag&drop | | ✅ | | ✅ | | 05 |
| I31 | Bloqueo activación sin imágenes | | ✅ | | | ✅ | 06 |
| I32 | GET /publishability endpoint | | ✅ | | | ✅ | 06 |
| I33 | property-rules shared package | | ✅ | | ✅ | ✅ | 08 |
| I34 | PublicationGateModal | | ✅ | | | ✅ | 06 |
| I35 | Progress bar checklist | | ✅ | | | | 06 |
| I36 | Soft warnings publicación | | ✅ | | | | 06 |
| I37 | Badge Activa (no visible) | ✅ | ✅ | | | | 06 |
| I38 | Slug inmutability server | | ✅ | | | | 06 |
| I39 | Batch publishability listado | | ✅ | | | | 08 |
| I40 | Tab SEO preview | | | ✅ | | | 07 |
| I41 | Campos SEO + migración | | ✅ | | ✅ | | 07 |
| I42 | Web SEO overrides | | ✅ | | ✅ | | 07 |
| I43 | Route guards config RBAC | | | | | | 09 |
| I44 | Duplicar property | | | ✅ | ✅ | | 04+ |
| I45 | Bulk archivar listado | | | ✅ | ✅ | | 02+ |
| I46 | Vista card mobile listado | | | ✅ | | | 02+ |
| I47 | AdminActivity audit log | | | ✅ | ✅ | | 03+ |
| I48 | Virtualización listado >200 | | | ✅ | ✅ | | 02+ |
| I49 | PropertyPickerModal | | ✅ | | | | 03 |
| I50 | not-found con shell | ✅ | | | | | 01 |

---

## Resumen por clasificación

### Quick Wins (ejecutar primero — Sprint 1-2)

| Orden | ID | Iniciativa |
| ----- | -- | ---------- |
| 1 | I12 | Actualizar docs drift |
| 2 | I10 | SUPER_ADMIN empty state |
| 3 | I11 | TenantSwitcher tablet |
| 4 | I09 | Loading skeletons |
| 5 | I02 | Filtro Activas/Archivadas |
| 6 | I03 | Búsqueda client-side |
| 7 | I06 | Copy cerrar publicación |
| 8 | I05 | Restaurar desde listado |
| 9 | I07 | Warning slug |
| 10 | I08 | Feature manager UX |
| 11 | I50 | not-found consistente |
| 12 | I37 | Badge activa-no-visible (tras I32) |

### Alto Impacto (núcleo del sprint comercial)

| Orden | ID | Iniciativa |
| ----- | -- | ---------- |
| 1 | I27-I29 | Storage + upload (bloqueante) |
| 2 | I31-I34 | Publicación gates + endpoint |
| 3 | I17-I21 | Dashboard |
| 4 | I01, I39 | Listado con estado comercial |
| 5 | I22-I25 | Navegación detalle v2 |
| 6 | I35-I36 | Checklist UX completo |

### Bloqueantes (MVP comercial — no negociables)

| ID | Iniciativa | Razón |
| -- | ---------- | ----- |
| I27 | StorageModule | Sin upload no hay operación real de fotos |
| I28 | Signed URL API | Prerequisito upload |
| I29 | Upload UI | Elimina storageKey manual |
| I31 | Bloqueo activación | Evita listings fantasma |
| I32 | Endpoint publishability | Fuente de verdad; elimina N+1 |
| I33 | Shared rules | Coherencia admin/API/web |
| I34 | PublicationGateModal | UX de bloqueo |
| I10 | SUPER_ADMIN empty state | Operabilidad multi-tenant |
| I17 + I21 | Dashboard KPIs | Producto no es solo CRUD |
| I01 | Badges listado | Visibilidad estado comercial |

### Costosas (planificar con buffer)

| ID | Iniciativa | Semanas est. |
| -- | ---------- | ------------ |
| I14 | Paginación | 0.5-1 |
| I21 | Dashboard endpoint | 1-1.5 |
| I23 | Split form | 1-2 |
| I27 | Storage completo | 2-3 |
| I33 | Shared package | 1 |
| I41 | Migración SEO | 1-2 |

### Bajo Impacto (post-MVP o escala)

| ID | Iniciativa | Cuándo |
| -- | ---------- | ------ |
| I19 | Activity feed preciso | Con I47 audit log |
| I40 | SEO preview only | Antes de I41 si tiempo |
| I44 | Duplicar property | Productividad avanzada |
| I45 | Bulk archivar | Inventarios grandes |
| I46 | Vista card mobile | Polish responsive |
| I47 | AdminActivity log | Dashboard v2 |
| I48 | Virtualización | > 200 properties |

---

## Orden óptimo de ejecución

### Ola 0 — Preparación (3-5 días)

```txt
I12 → I10 → I11 → I09 → I50
```

**Resultado:** admin usable para SUPER_ADMIN; percepción de producto pulido.

### Ola 1 — Listado operativo (1-2 semanas)

```txt
I02 → I03 → I13 → I06 → I05 → I07 → I08
     ↓
I33 (inicio package) → I39 → I01 → I04
```

**Resultado:** encontrar propiedades y ver estado comercial.

### Ola 2 — Storage bloqueante (2-3 semanas, paralelo Ola 1 si 2 devs)

```txt
I27 → I28 → I29 → I30
```

**Resultado:** galería operativa sin metadata manual.

### Ola 3 — Publicación coherente (2 semanas)

```txt
I33 (completar) → I32 → I31 → I34 → I35 → I36 → I38 → I37
```

**Resultado:** imposible activar listing no publicable.

### Ola 4 — Dashboard + detalle (2-3 semanas)

```txt
Paralelo A: I21 → I17 → I18 → I20 → I49
Paralelo B: I22 → I24 → I25 → I23
```

**Resultado:** centro operativo + navegación property clara.

### Ola 5 — Escala y SEO (2+ semanas)

```txt
I14 → I15 → I16
I40 → I41 → I42
I43
```

**Resultado:** listados grandes + control SEO.

---

## Diagrama de prioridad

```txt
                    IMPACTO
                 Alto    Bajo
              ┌─────────┬─────────┐
    Bajo      │ QUICK   │ DEJAR   │
  ESFUERZO    │ WINS    │ PARA    │
              │ I02 I03 │ I46 I48 │
              ├─────────┼─────────┤
    Alto      │ CORE    │ COSTOSA │
              │ I27-I34 │ I41 I47 │
              │ I17-I25 │         │
              └─────────┴─────────┘

BLOQUEANTES (corte transversal): I27, I28, I29, I31, I32, I33, I34
```

---

## Decisiones de trade-off

| Si hay presión de tiempo | Sacrificar primero | Nunca sacrificar |
| ------------------------ | ------------------ | ---------------- |
| 2 semanas | I19, I40, I30, I46 | I29, I31, I34 |
| 4 semanas | I41, I14, I30 | I32, I33, I17 |
| 6 semanas | I47, I44, I45 | I27-I29, I01, I22 |

---

## Métricas de éxito por ola

| Ola | Métrica verificable |
| --- | ------------------- |
| 0 | SUPER_ADMIN ve empty state guiado, no error API |
| 1 | Listado filtra y muestra badge Publicada/Borrador |
| 2 | Imagen subida sin tipear storageKey |
| 3 | Activar listing sin portada retorna 400 + modal |
| 4 | Dashboard muestra 5 KPIs reales; tab Resumen existe |
| 5 | Listado pagina 50+ items; SEO preview funcional |
