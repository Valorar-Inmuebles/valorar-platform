# Lead Domain

Versión: v1 (congelada — inquiry-centric)

Estado: documentado. Pendiente de migración Prisma.

---

## Concepto

Un `Lead` representa una **consulta capturada** (modelo *inquiry-centric*).

**No representa un contacto único.** Cada envío de formulario, llamada registrada o carga manual genera un lead independiente, aunque el email o teléfono ya existan en otros leads del mismo tenant.

Puede originarse en:

* Formularios de la web pública (consulta sobre una propiedad o contacto general).
* Carga manual desde el panel admin.
* Canales externos registrados por el tenant (WhatsApp, teléfono, portales, redes).

### Reglas semánticas v1

* Un mismo contacto (mismo email o teléfono) puede generar **múltiples leads**.
* Cada lead puede asociarse a **una propiedad** (`propertyId`) o ser **general** (`propertyId = null`).
* El pipeline (`LeadStatus`) aplica a la **consulta**, no al contacto global.
* La consolidación de contactos se resolverá en versiones futuras mediante `Client` y/o `LeadInterest`.

El dominio soporta asignación a agentes, historial de cambios, notas internas y conversión futura a `Client`.

Referencias:

* `docs/03-database/multi-tenant.md`
* `docs/03-database/property-domain.md`
* `docs/04-modules/leads.md`

---

## Modelo

```txt
Lead
│
├── Property? (opcional)
├── User? (assignedTo — agente actual)
├── User? (createdBy — quien registró el lead)
├── Client? (futuro — conversión)
│
├── LeadAssignment[] (historial de asignaciones)
├── LeadActivity[] (timeline, notas, cambios de estado)
└── LeadTagAssignment[]
       │
       └── LeadTag (catálogo por tenant)
```

---

## Lead

Entidad principal. Cada registro es una **consulta capturada**, no un contacto único. Toda consulta pertenece a un `tenantId`.

### Responsabilidades

* Registrar una consulta comercial individual (inquiry).
* Datos de contacto del prospecto en el momento de la consulta.
* Estado comercial del pipeline de esa consulta (`LeadStatus`).
* Origen de captación (`LeadSource`).
* Asociación opcional a una `Property` consultada.
* Agente responsable actual (`assignedToId`).
* Preparación para conversión futura a `Client`.

### Campos propuestos

| Campo                | Tipo         | Descripción                                      |
| -------------------- | ------------ | ------------------------------------------------ |
| id                   | String       | Identificador (`cuid`)                           |
| tenantId             | String       | Tenant propietario                               |
| propertyId           | String?      | Propiedad consultada (opcional)                  |
| assignedToId         | String?      | Agente asignado actual                           |
| createdById          | String?      | Usuario que creó el lead (`null` en web anónima) |
| sourceId             | String       | → `LeadSource`                                   |
| status               | LeadStatus   | Estado del pipeline                              |
| name                 | String       | Nombre del contacto                              |
| email                | String?      | Email                                            |
| phone                | String?      | Teléfono / WhatsApp                              |
| message              | String?      | Mensaje inicial de consulta                      |
| preferredContact     | String?      | Preferencia de contacto (email, phone, whatsapp) |
| clientId             | String?      | Cliente convertido (dominio futuro)              |
| convertedAt          | DateTime?    | Fecha de conversión                              |
| lastContactedAt      | DateTime?    | Último contacto registrado                       |
| createdAt            | DateTime     |                                                  |
| updatedAt            | DateTime     |                                                  |

### Restricciones propuestas

* Índices: `tenantId`, `[tenantId, status]`, `[tenantId, assignedToId]`, `[tenantId, propertyId]`, `[tenantId, sourceId]`, `[tenantId, createdAt]`, `[tenantId, email]`
* `propertyId` debe pertenecer al mismo `tenantId` (validación en aplicación).
* `assignedToId` y `createdById` deben pertenecer al mismo `tenantId` (validación en aplicación).
* Al menos `email` o `phone` requerido (validación en aplicación).
* Sin `@@unique` en email/phone: un mismo contacto puede tener múltiples leads.

### Relaciones

```txt
Lead
├── Tenant
├── Property? (opcional)
├── User? (assignedTo)
├── User? (createdBy)
├── LeadSource
├── Client? (futuro)
├── LeadAssignment[]
├── LeadActivity[]
└── LeadTagAssignment[]
```

---

## LeadStatus

Enum global del pipeline comercial.

### Valores

```txt
NEW              → Nuevo (sin contactar)
CONTACTED        → Contactado
QUALIFIED        → Calificado (interés confirmado)
VISIT_SCHEDULED  → Visita agendada
NEGOTIATING      → En negociación
CONVERTED        → Convertido a cliente
LOST             → Perdido
ARCHIVED         → Archivado
```

### Flujo típico

```txt
NEW → CONTACTED → QUALIFIED → VISIT_SCHEDULED → NEGOTIATING → CONVERTED
                                                              ↘ LOST
Cualquier estado → ARCHIVED
```

### Reglas

* `CONVERTED` implica `clientId` y `convertedAt` poblados (dominio `Client` futuro).
* `LOST` y `ARCHIVED` son estados terminales (reactivación documentada en aplicación).
* Cambios de estado generan `LeadActivity` tipo `STATUS_CHANGE`.

---

## LeadSource

Catálogo de orígenes de captación **por tenant**.

Alineado con `conventions.md`: fuentes configurables y extensibles por inmobiliaria.

### Responsabilidades

* Identificar de dónde provino el lead.
* Diferenciar formularios web, carga manual y canales externos.
* Permitir personalización por tenant sin modificar enums.

### Campos propuestos

| Campo       | Tipo              | Descripción                           |
| ----------- | ----------------- | ------------------------------------- |
| id          | String            |                                       |
| tenantId    | String            |                                       |
| name        | String            | Nombre visible (ej. "Formulario web") |
| slug        | String            | Identificador único por tenant        |
| channel     | LeadSourceChannel | Categoría de canal                    |
| isSystem    | Boolean           | Creado por seed; no eliminable        |
| isActive    | Boolean           |                                       |
| sortOrder   | Int               |                                       |
| createdAt   | DateTime          |                                       |
| updatedAt   | DateTime          |                                       |

### LeadSourceChannel (enum global)

```txt
WEB_PROPERTY     → Formulario en ficha de propiedad
WEB_GENERAL      → Formulario de contacto general
MANUAL           → Carga manual admin/agente
PHONE            → Llamada telefónica
WHATSAPP         → WhatsApp
EMAIL            → Email directo
REFERRAL         → Referido
SOCIAL_MEDIA     → Redes sociales
PORTAL           → Portal externo (Zonaprop, MercadoLibre, etc.)
WALK_IN          → Presencial en oficina
OTHER            → Otro
```

### Restricciones propuestas

* `@@unique([tenantId, slug])`
* Índice: `[tenantId, channel]`

### Seeds al crear tenant

| name                         | slug              | channel      |
| ---------------------------- | ----------------- | ------------ |
| Formulario web — Propiedad   | web-property      | WEB_PROPERTY |
| Formulario web — Contacto    | web-general       | WEB_GENERAL  |
| Carga manual                 | manual            | MANUAL       |
| WhatsApp                     | whatsapp          | WHATSAPP     |
| Teléfono                     | phone             | PHONE        |

`TENANT_ADMIN` puede agregar fuentes propias (ej. "Instagram", "Zonaprop").

---

## LeadAssignment

Historial de asignaciones de agentes.

El agente actual se denormaliza en `Lead.assignedToId` para consultas rápidas. `LeadAssignment` conserva el historial completo.

### Campos propuestos

| Campo          | Tipo      | Descripción                        |
| -------------- | --------- | ---------------------------------- |
| id             | String    |                                    |
| tenantId       | String    |                                    |
| leadId         | String    |                                    |
| assignedToId   | String    | Agente asignado                    |
| assignedById   | String    | Usuario que realizó la asignación  |
| assignedAt     | DateTime  | Inicio de asignación               |
| unassignedAt   | DateTime? | Fin de asignación (`null` = activa) |
| reason         | String?   | Motivo de reasignación             |
| createdAt      | DateTime  |                                    |

### Restricciones propuestas

* Solo una asignación activa por lead: `unassignedAt IS NULL` (validación en aplicación).
* Índices: `[tenantId]`, `[leadId]`, `[assignedToId]`, `[leadId, unassignedAt]`

### Reglas

* Nueva asignación cierra la asignación activa anterior (`unassignedAt = now`).
* Actualiza `Lead.assignedToId`.
* Genera `LeadActivity` tipo `ASSIGNMENT`.

### Asignación automática (futuro)

| Regla                         | Descripción                                      |
| ----------------------------- | ------------------------------------------------ |
| Por propiedad                 | Si `propertyId` existe → `Property.createdById`  |
| Round robin                   | Distribución equitativa entre agentes activos    |
| Manual                        | `TENANT_ADMIN` asigna o reasigna                 |

---

## LeadActivity

Timeline unificado: cambios de estado, notas internas, contactos y eventos.

### Campos propuestos

| Campo       | Tipo             | Descripción                              |
| ----------- | ---------------- | ---------------------------------------- |
| id          | String           |                                          |
| tenantId    | String           |                                          |
| leadId      | String           |                                          |
| userId      | String?          | Autor (`null` en eventos automáticos/web)|
| type        | LeadActivityType | Tipo de actividad                        |
| title       | String?          | Título breve                             |
| content     | String?          | Nota o descripción (`@db.Text`)          |
| metadata    | Json?            | Datos estructurados (ver abajo)          |
| createdAt   | DateTime         |                                          |

### LeadActivityType (enum global)

```txt
STATUS_CHANGE    → Cambio de estado
NOTE             → Nota interna
ASSIGNMENT       → Asignación / reasignación
CONTACT          → Contacto genérico
CALL             → Llamada telefónica
EMAIL            → Email enviado/recibido
WHATSAPP         → Mensaje WhatsApp
VISIT            → Visita realizada o agendada
CONVERSION       → Conversión a cliente
SYSTEM           → Evento automático (web, integración)
```

### Metadata por tipo

| Tipo           | metadata ejemplo                                      |
| -------------- | ----------------------------------------------------- |
| STATUS_CHANGE  | `{ "from": "NEW", "to": "CONTACTED" }`                |
| ASSIGNMENT     | `{ "fromUserId": "...", "toUserId": "..." }`          |
| CONVERSION     | `{ "clientId": "..." }`                               |
| SYSTEM         | `{ "ip": "...", "userAgent": "...", "referrer": "..." }` |

### Restricciones propuestas

* Índices: `[tenantId]`, `[leadId, createdAt]`, `[leadId, type]`

### Notas internas

Las notas del equipo se modelan como `LeadActivity` con `type = NOTE`.

* Visibles solo para usuarios con acceso al lead.
* No se exponen en web pública.
* `userId` identifica al autor.

---

## LeadTag

Catálogo de etiquetas **por tenant** para segmentación CRM.

### Evaluación

**Incluido en v1.** Aporta valor en:

* Segmentación ("Inversor", "Urgente", "Primera vivienda").
* Filtros en panel admin.
* Reportes por tenant.

Alternativa descartada: array de strings en `Lead` — dificulta filtros e informes consistentes.

### Campos propuestos — LeadTag

| Campo     | Tipo     | Descripción              |
| --------- | -------- | ------------------------ |
| id        | String   |                          |
| tenantId  | String   |                          |
| name      | String   | Nombre visible           |
| slug      | String   | Único por tenant         |
| color     | String?  | Color UI (hex)           |
| isActive  | Boolean  |                          |
| sortOrder | Int      |                          |
| createdAt | DateTime |                          |
| updatedAt | DateTime |                          |

### Campos propuestos — LeadTagAssignment

| Campo     | Tipo     | Descripción |
| --------- | -------- | ----------- |
| id        | String   |             |
| tenantId  | String   |             |
| leadId    | String   |             |
| tagId     | String   | → LeadTag   |
| createdAt | DateTime |             |

### Restricciones propuestas

* `LeadTag`: `@@unique([tenantId, slug])`
* `LeadTagAssignment`: `@@unique([leadId, tagId])`
* Índices: `[tenantId]`, `[leadId]`, `[tagId]`

---

## Conversión futura a Client

El dominio `Client` no está implementado. `Lead` se prepara para la transición:

| Campo / entidad   | Propósito                                      |
| ----------------- | ---------------------------------------------- |
| `Lead.clientId`   | FK futura a `Client`                           |
| `Lead.convertedAt`| Timestamp de conversión                          |
| `LeadStatus.CONVERTED` | Estado terminal de éxito                 |
| `LeadActivity.CONVERSION` | Registro auditable de la conversión   |

Reglas futuras:

* Un lead `CONVERTED` no puede revertirse sin flujo explícito de administrador.
* Los datos de contacto migran o vinculan al `Client`.
* El historial `LeadActivity` se preserva.
* Varios leads del mismo contacto podrán vincularse a un único `Client` (relación N:1).
* La propiedad de cierre podría diferir de `Lead.propertyId` (dominio `Deal` futuro).

---

## Multi-tenant

### Entidades con `tenantId`

```txt
Lead
LeadSource
LeadAssignment
LeadActivity
LeadTag
LeadTagAssignment
```

### Catálogos globales (enums)

```txt
LeadStatus
LeadSourceChannel
LeadActivityType
```

### Reglas obligatorias

| Regla | Responsable |
| ----- | ----------- |
| Toda query filtra por `tenantId` | Aplicación |
| `Lead.propertyId` mismo tenant | Aplicación |
| `Lead.assignedToId` mismo tenant | Aplicación |
| `LeadSource` solo del tenant del lead | Aplicación |
| Web pública solo crea leads (no lee) | API pública |
| Aislamiento total entre tenants | DB + aplicación |

---

## Reglas de negocio

| Regla | Responsable |
| ----- | ----------- |
| Una asignación activa por lead | Aplicación |
| Cambio de estado → `LeadActivity` | Aplicación |
| Reasignación → cierra asignación anterior | Aplicación |
| `CONVERTED` requiere `clientId` (futuro) | Aplicación |
| Solo `LeadTag.isActive = true` asignables | Aplicación |
| Email o teléfono obligatorio al crear | Aplicación |
| Formulario web: `createdById = null` | Aplicación |
| Anti-spam / rate limit en web | API pública |

---

## Índices previstos — resumen

| Entidad              | Índices clave                                              |
| -------------------- | ---------------------------------------------------------- |
| Lead                 | `tenantId`, `status`, `assignedToId`, `propertyId`, `email`  |
| LeadSource           | `[tenantId, slug]`, `[tenantId, channel]`                  |
| LeadAssignment       | `leadId`, `assignedToId`                                   |
| LeadActivity         | `[leadId, createdAt]`                                      |
| LeadTag              | `[tenantId, slug]`                                         |
| LeadTagAssignment    | `[leadId, tagId]`                                          |

---

## Relación con Property

| Escenario | Comportamiento |
| --------- | -------------- |
| Consulta desde ficha pública | `propertyId` poblado, `source` = WEB_PROPERTY |
| Contacto general | `propertyId = null`, `source` = WEB_GENERAL |
| Lead manual con propiedad | `propertyId` opcional, `source` = MANUAL |
| Asignación automática | Sugerir `Property.createdById` como agente |

La web pública no expone datos del agente; la asignación ocurre en backend.

---

## Limitaciones conocidas de Lead v1

| Limitación | Descripción |
| ---------- | ----------- |
| **Inquiry-centric** | `Lead` modela una consulta, no un contacto único. |
| **Contactos duplicados** | El mismo email/teléfono puede aparecer en varios leads sin restricción en base de datos. |
| **Una propiedad por lead** | `propertyId` admite solo una propiedad por consulta. Interés en múltiples propiedades genera múltiples leads. |
| **Pipeline global por consulta** | `LeadStatus` aplica al lead completo; no hay estado independiente por propiedad de interés. |
| **Sin vista unificada de contacto** | No existe entidad que agrupe automáticamente las consultas de una misma persona. |
| **Conversión parcial** | `Lead.clientId` vincula un lead convertido; la consolidación de leads hermanos requiere `Client` y/o merge manual. |

### Evolución prevista

La consolidación de contactos se abordará en versiones futuras mediante:

* **`Client`**: entidad contact-centric; varios leads podrán referenciar un mismo cliente (N:1).
* **`LeadInterest`** (opcional): entidad puente Lead ↔ Property para intereses múltiples dentro de un mismo contacto.

Estas extensiones no forman parte de Lead v1 y no requieren cambios en el schema actual hasta su diseño formal.

---

## Estado

Dominio v1 congelado (inquiry-centric). Pendiente:

1. Actualización de `current-schema.md`.
2. Migración Prisma.
3. Roadmap API (similar a Property).
