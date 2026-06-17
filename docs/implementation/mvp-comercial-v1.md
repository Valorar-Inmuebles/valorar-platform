# MVP Comercial v1 — Valorar Platform

Versión: 1.0  
Fecha: 2026-06-17  
Estado: Definición — sin implementación.

Referencias:

* `docs/audits/admin-property-ux-audit.md`
* `docs/implementation/admin-property-ux-implementation-plan.md`
* `docs/implementation/admin-property-ux-priority-matrix.md`
* `PROJECT_STATE.md`
* `docs/04-modules/property-complete-mvp.md`

---

## Pregunta central

> ¿Qué debe existir para que una inmobiliaria pueda utilizar Valorar en producción?

**Respuesta corta:** la inmobiliaria debe poder **cargar propiedades con fotos reales, publicarlas comercialmente con coherencia web, y operar el inventario diario** desde un admin que refleje el estado real del negocio — sin intervención técnica ni metadata manual.

**Respuesta de scope:** MVP comercial UX **no incluye** CRM/Leads admin, contratos, consorcios, configuración de inmobiliaria, ni RBAC API completo. Sí incluye lo ya implementado en API/web que el admin aún no expone bien.

---

## Lo que ya existe hoy (baseline verificado)

| Capacidad | Admin | API | Web pública |
| --------- | ----- | --- | ----------- |
| Auth login/logout JWT | ✅ | ✅ | N/A |
| Multi-tenant TenantGuard | ✅ | ✅ | N/A |
| CRUD Property | ✅ | ✅ | Lectura |
| CRUD PropertyListing + estados | ✅ | ✅ | Lectura |
| CRUD PropertyPrice + principal | ✅ | ✅ | Lectura |
| CRUD PropertyImage (metadata) | ⚠️ manual | ✅ | Lectura |
| CRUD PropertyFeature + assignment | ✅ | ✅ | Lectura |
| Public API publicación 4 reglas | N/A | ✅ | ✅ |
| Panel publicabilidad admin | ✅ | ❌ duplicado TS | N/A |
| Web listado + detalle + SEO básico | N/A | ✅ | ✅ |
| Dashboard operativo | ❌ | ❌ | N/A |
| Upload Storage R2 | ❌ | ❌ | N/A |
| Bloqueo activación = regla web | ❌ | parcial | N/A |

---

## Categorización de requisitos

### OBLIGATORIO — sin esto no hay producción

Requisitos que una inmobiliaria real **no puede operar sin ellos**.

| # | Requisito | Estado hoy | Épica / ID | Criterio de done |
| - | --------- | ---------- | ---------- | ---------------- |
| O1 | Login seguro + sesión tenant | ✅ | — | Ya cumple |
| O2 | CRUD propiedades completo (ficha física) | ✅ | — | Form extenso existe |
| O3 | **Upload imágenes real** (sin storageKey manual) | ❌ | EPIC-05 I27-I29 | Agente sube JPG, ve preview, portada auto |
| O4 | Galería con portada y orden | ⚠️ | EPIC-05 | `isCover` + `sortOrder` operativos |
| O5 | CRUD publicaciones venta/alquiler/temporario | ✅ | — | Ya cumple |
| O6 | CRUD precios con principal | ✅ | — | Ya cumple |
| O7 | **Activación listing alineada con web** (no fantasma) | ❌ | EPIC-06 I31-I34 | ACTIVE implica visible en Public API |
| O8 | Checklist publicación visible y accionable | ⚠️ parcial | EPIC-06 I35 | Progreso + links + gate en activar |
| O9 | **Listado con estado comercial** (Publicada/Borrador) | ❌ | EPIC-02 I01 | Visible sin abrir detalle |
| O10 | Ver en web desde admin (link confiable) | ⚠️ parcial | EPIC-02 I04 | Solo si publicable; URL configurada |
| O11 | Web pública muestra property publicada | ✅ | — | Fases 1-6 web |
| O12 | Características asignables en admin | ✅ | — | Tab existe |
| O13 | SUPER_ADMIN puede elegir tenant y operar | ⚠️ | EPIC-01 I10-I11 | Empty state + switcher usable |

**MVP comercial mínimo = O1-O13 cumplidos.**

```txt
Flujo mínimo producción:
  Login → Crear property → Subir fotos → Crear listing → Precio → Activar
  → Ver checklist verde → Ver en web → Cliente ve property en portal
```

---

### RECOMENDABLE — producto usable y vendible

No bloquea el primer cliente, pero **diferencia** Valorar de un CRUD interno.

| # | Requisito | Estado hoy | Épica / ID | Justificación |
| - | --------- | ---------- | ---------- | ------------- |
| R1 | Dashboard con KPIs reales | ❌ | EPIC-03 I17-I21 | Orientación operativa diaria |
| R2 | Búsqueda y filtros en listado | ❌ | EPIC-02 I02-I03 | Productividad con 20+ propiedades |
| R3 | Tab Resumen con próximo paso | ❌ | EPIC-04 I22 | Flujo guiado estilo Airbnb |
| R4 | Split form Datos / Ubicación | ❌ | EPIC-04 I23 | Reduce fricción edición |
| R5 | Acciones globales en header (archivar, ver web) | ❌ | EPIC-04 I24 | Menos navegación |
| R6 | Soft warnings (descripción, min fotos) | ❌ | EPIC-06 I36 | Calidad de publicación |
| R7 | Slug inmutability post-publicación | ❌ | EPIC-06 I38 | Protege SEO existente |
| R8 | Endpoint publishability (fuente única) | ❌ | EPIC-06 I32 | Evita drift admin/API |
| R9 | Loading skeletons y empty states | ⚠️ | EPIC-01 I09-I10 | Percepción producto |
| R10 | Tab SEO preview (sin migración) | ❌ | EPIC-07 I40 | Transparencia SEO |
| R11 | ListingSubNav (Datos \| Precios) | ❌ | EPIC-04 I25 | Wayfinding listing |
| R12 | Restaurar property desde listado | ❌ | EPIC-01 I05 | Operación inversa rápida |
| R13 | Características en catálogo seed poblado | ⚠️ | Property MVP A | Features útiles en web |

---

### OPCIONAL — valor agregado pre-escala

Implementar **después** del primer cliente en producción o con inventario grande.

| # | Requisito | Épica / ID | Trigger para implementar |
| - | --------- | ---------- | ------------------------ |
| OP1 | Paginación server-side listado | EPIC-02 I14 | > 50 properties por tenant |
| OP2 | Thumbnail + precio en columnas | EPIC-02 I15 | Listado como vista principal |
| OP3 | Reorder imágenes drag & drop | EPIC-05 I30 | Galerías 10+ fotos frecuentes |
| OP4 | Dashboard activity feed preciso | EPIC-03 I19 + I47 | Necesidad auditoría |
| OP5 | PropertyPickerModal nueva publicación | EPIC-03 I49 | Dashboard como home real |
| OP6 | Duplicar property | I44 | Alto volumen altas similares |
| OP7 | Bulk archivar | I45 | Limpieza inventario |
| OP8 | Vista card mobile listado | I46 | Uso admin desde móvil |
| OP9 | Filtros avanzados API (city, type, publishStatus) | EPIC-02 I16 | Inventario heterogéneo |
| OP10 | DataTable con sort columnas | EPIC-08 I13 | Power users |

---

### POST-MVP — fuera del MVP comercial UX

Explícitamente **no** requerido para producción inicial. Documentado en roadmap general.

| # | Tema | Motivo exclusión |
| - | ---- | ---------------- |
| P1 | CRM / Leads admin | Lead Domain congelado |
| P2 | Configuración usuarios / inmobiliaria | Placeholders; no bloquea property flow |
| P3 | RBAC API `@Roles` en endpoints | Auth v1.1; TenantGuard activo |
| P4 | PropertyAgentAccess / compartir | Post-MVP sharing |
| P5 | Contratos / consorcios | Fuera de scope sprint |
| P6 | Emprendimientos (Development) | Módulo aparte |
| P7 | SEO editable con migración | OP si preview alcanza v1 |
| P8 | Geocoding Google Places activo | Enriquecimiento |
| P9 | Resolución tenant por dominio Public API | Infra multi-site |
| P10 | Buscador avanzado features web | Property MVP Fase E |
| P11 | Leads formulario web → admin | Lead Domain |
| P12 | AdminActivity audit log | Dashboard v2 |
| P13 | Video / Matterport | Post-MVP |
| P14 | Importación bulk CSV | Escala |

---

## Definición formal MVP Comercial v1

### Incluye (módulos existentes mejorados)

```txt
apps/admin
├── Auth + tenant operativo
├── Dashboard básico (KPIs)          [RECOMENDABLE pero casi obligatorio comercialmente]
├── /propiedades listado inteligente
├── /propiedades/[id] navegación v2  (mínimo: Resumen + tabs actuales mejorados)
├── Upload imágenes
├── Publicación con checklist + gate
└── Links Ver en web confiables

apps/api
├── Endpoints existentes Property domain
├── + publishability endpoint
├── + dashboard summary
├── + storage upload-url
└── + bloqueo activación coherente

apps/web
├── Sin cambios estructurales MVP UX
└── (Opcional) SEO overrides en post-MVP
```

### No incluye

* Nuevos módulos de negocio
* Migraciones SEO (fase opcional posterior)
* Configuración admin completa

---

## Checklist de aceptación — demo inmobiliaria producción

Un `TENANT_ADMIN` de tenant `demo` puede completar **sin ayuda técnica**:

| # | Paso | Obligatorio |
| - | ---- | ----------- |
| 1 | Iniciar sesión en admin `:3001` | ✅ |
| 2 | Ver listado propiedades con estado comercial | ✅ |
| 3 | Crear property con título, tipo, ciudad | ✅ |
| 4 | Subir ≥ 1 imagen por drag & drop (no storageKey) | ✅ |
| 5 | Asignar ≥ 3 características | Recomendable |
| 6 | Crear publicación SALE en DRAFT | ✅ |
| 7 | Agregar precio ARS o USD principal | ✅ |
| 8 | Intentar activar sin imagen → **bloqueado** con mensaje claro | ✅ |
| 9 | Activar con todo completo → checklist verde | ✅ |
| 10 | «Ver en web» abre property en `:3000` | ✅ |
| 11 | Web muestra galería, precio, features, descripción | ✅ |
| 12 | Dashboard muestra conteo properties/publicadas | Recomendable |

---

## Gap analysis: hoy → MVP comercial

| Gap | Esfuerzo | Bloqueante |
| --- | -------- | ---------- |
| Upload imágenes | 2-3 sem | **Sí** |
| Gate activación + API | 1-2 sem | **Sí** |
| Badges listado | 1 sem | **Sí** |
| Dashboard KPIs | 1-2 sem | Casi |
| Tab Resumen | 1-2 sem | Recomendable |
| Storage infra + env | 0.5-1 sem | **Sí** |

**Tiempo estimado a MVP comercial:** 6-8 semanas (1 dev), alineado con Épicas 01+02+05+06+03 parcial.

---

## Priorización MVP: orden de cierre

```txt
1. EPIC-05 Storage + upload          (O3, O4)     — BLOQUEANTE
2. EPIC-06 Publicación + gate          (O7, O8)     — BLOQUEANTE
3. EPIC-02 Listado badges + filtros  (O9, O10)    — BLOQUEANTE
4. EPIC-01 Shell fixes               (O13, R9)    — OBLIGATORIO operativo
5. EPIC-08 Publishability endpoint   (R8)         — RECOMENDABLE técnico
6. EPIC-03 Dashboard KPIs            (R1)         — RECOMENDABLE comercial
7. EPIC-04 Tab Resumen               (R3-R5)      — RECOMENDABLE UX
8. EPIC-07 SEO preview               (R10)        — OPCIONAL v1
```

---

## Riesgos de lanzar sin elementos obligatorios

| Si falta | Consecuencia |
| -------- | ------------ |
| Upload (O3) | Inmobiliaria depende de dev para subir fotos → **no SaaS** |
| Gate activación (O7) | Listings «activos» invisibles en web → **pérdida de confianza** |
| Estado comercial listado (O9) | Operador no sabe qué está publicado → **caos operativo** |
| SUPER_ADMIN tenant UX (O13) | Equipo Valorar no puede soportar clientes → **ops internas rotas** |

---

## Resumen ejecutivo para stakeholders

| Categoría | Cantidad items | Semanas adicionales est. |
| --------- | -------------- | ------------------------ |
| **Obligatorio** | 13 | 5-7 |
| **Recomendable** | 13 | 3-4 |
| **Opcional** | 10 | 2-4 |
| **Post-MVP** | 14 | — |

**MVP Comercial v1 mínimo estricto:** Obligatorios O1-O12 + O13.  
**MVP Comercial v1 vendible:** Obligatorios + R1, R2, R3, R8, R9.

El código base **ya cubre ~60%** del MVP comercial (CRUD, auth, web, publicabilidad informativa). El **40% restante** es UX operativa, upload, y coherencia de publicación — exactamente el scope de este plan de implementación.
