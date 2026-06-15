# Leads Module

Versión: v1 (congelada — inquiry-centric)

## Objetivo

Gestionar **consultas capturadas** (leads) dentro de un tenant.

Cada lead representa una consulta individual, no un contacto único. Soporta captación desde la web pública, carga manual en admin y seguimiento por agentes.

### Modelo semántico

* **Lead = consulta capturada** (inquiry-centric).
* **No Lead = contacto único.**
* Un mismo email o teléfono puede generar varios leads.
* Cada lead puede asociarse a una propiedad o ser una consulta general.

---

## Modelo de datos

```txt
Lead
│
├── Property? (opcional)
├── LeadSource
├── User? (assignedTo)
├── User? (createdBy)
├── Client? (futuro)
│
├── LeadAssignment[]
├── LeadActivity[] (notas, estados, contactos)
└── LeadTagAssignment → LeadTag
```

Documentación técnica: `docs/03-database/lead-domain.md`

---

## Orígenes de captación

| Origen UI              | LeadSource (channel) | propertyId |
| ---------------------- | -------------------- | ---------- |
| Formulario en propiedad| WEB_PROPERTY         | Sí         |
| Formulario de contacto | WEB_GENERAL          | No         |
| Carga manual admin     | MANUAL               | Opcional   |
| WhatsApp               | WHATSAPP             | Opcional   |
| Teléfono               | PHONE                | Opcional   |
| Email                  | EMAIL                | Opcional   |
| Referido               | REFERRAL             | Opcional   |
| Redes / Portal         | SOCIAL_MEDIA / PORTAL| Opcional   |

Cada tenant configura su catálogo `LeadSource`. Fuentes sistema se siembran al crear el tenant.

---

## Pipeline comercial

### Estados (LeadStatus)

| UI               | status          |
| ---------------- | --------------- |
| Nuevo            | NEW             |
| Contactado       | CONTACTED       |
| Calificado       | QUALIFIED       |
| Visita agendada  | VISIT_SCHEDULED |
| En negociación   | NEGOTIATING     |
| Convertido       | CONVERTED       |
| Perdido          | LOST            |
| Archivado        | ARCHIVED        |

### Flujo visual

```txt
Nuevo → Contactado → Calificado → Visita → Negociación → Convertido
                                                      ↘ Perdido
```

---

## Información del lead (Lead)

| Campo UI            | Campo DB           |
| ------------------- | ------------------ |
| Nombre              | name               |
| Email               | email              |
| Teléfono            | phone              |
| Mensaje             | message            |
| Preferencia contacto| preferredContact   |
| Propiedad consultada| propertyId         |
| Origen              | sourceId           |
| Estado              | status             |
| Agente asignado     | assignedToId       |
| Etiquetas           | LeadTagAssignment  |
| Último contacto     | lastContactedAt    |

Al menos email o teléfono es obligatorio.

---

## Asignación de agentes

### Agente actual

`Lead.assignedToId` indica el responsable activo.

### Historial

`LeadAssignment` registra cada asignación y reasignación con fecha, autor y motivo.

### Reglas de asignación

| Método              | Quién                    | Cuándo                          |
| ------------------- | ------------------------ | ------------------------------- |
| Automática (prop.)  | Sistema                  | Lead web con `propertyId`       |
| Manual              | TENANT_ADMIN             | Asignación o reasignación       |
| Auto-asignación     | TENANT_ADMIN (config)    | Round robin — fase futura       |

---

## Actividades y notas

Toda interacción se registra en `LeadActivity`.

| Tipo UI        | LeadActivityType |
| -------------- | ---------------- |
| Nota interna   | NOTE             |
| Cambio estado  | STATUS_CHANGE    |
| Asignación     | ASSIGNMENT       |
| Llamada        | CALL             |
| Email          | EMAIL            |
| WhatsApp       | WHATSAPP         |
| Visita         | VISIT            |
| Conversión     | CONVERSION       |

Las **notas internas** son visibles solo para usuarios con acceso al lead. No se publican en la web.

---

## Etiquetas (LeadTag)

Catálogo configurable por tenant.

Ejemplos:

* Urgente
* Inversor
* Primera vivienda
* Alquiler temporario
* Permuta

`TENANT_ADMIN` gestiona el catálogo. Agentes asignan etiquetas a sus leads.

---

## Web pública

### Formulario en propiedad

Ruta: `/propiedades/{slug}` → formulario de consulta.

Envía:

* `name`, `email`, `phone`, `message`
* `propertyId` (resuelto por slug)
* `sourceId` → seed `web-property`

### Formulario de contacto general

Ruta: `/contacto` (o equivalente).

Envía:

* `name`, `email`, `phone`, `message`
* `propertyId = null`
* `sourceId` → seed `web-general`

### Restricciones públicas

* Solo `POST` (crear lead). Sin lectura.
* Rate limiting y validación anti-spam.
* `createdById = null`.
* `LeadActivity` tipo `SYSTEM` con metadata de origen (IP, referrer).
* Tenant resuelto por dominio o `X-Tenant-Slug`.

---

## Conversión a Cliente

Estado futuro. No implementado en v1.

| Paso | Acción |
| ---- | ------ |
| 1 | Agente o admin marca lead como `CONVERTED` |
| 2 | Se crea o vincula registro `Client` |
| 3 | `Lead.clientId` y `Lead.convertedAt` se populan |
| 4 | `LeadActivity` tipo `CONVERSION` registra el evento |

El historial del lead se preserva tras la conversión.

---

## Permisos

### AGENT

* Ver leads asignados (`assignedToId = self`).
* Ver leads sin asignar si el tenant lo permite (config futura).
* Crear leads manualmente.
* Actualizar estado, agregar notas y actividades.
* No reasignar leads de otros agentes.
* No gestionar catálogo `LeadSource` ni `LeadTag`.

### TENANT_ADMIN

* Ver todos los leads del tenant.
* Crear, editar y archivar leads.
* Asignar y reasignar agentes.
* Gestionar `LeadSource` y `LeadTag`.
* Acceder a reportes y métricas del pipeline.

### SUPER_ADMIN

* Acceso global.
* Soporte y auditoría cross-tenant.

---

## Filtros admin previstos

* `status`
* `assignedToId`
* `sourceId` / `channel`
* `propertyId`
* `tagId`
* Rango de fechas (`createdAt`)
* Búsqueda por `name`, `email`, `phone`

---

## Integración con Property

| Evento | Integración |
| ------ | ----------- |
| Consulta web en propiedad | `propertyId` + asignación sugerida a `Property.createdById` |
| Lead sin propiedad | Sin vínculo; asignación manual o round robin |
| Propiedad archivada (`isActive = false`) | El lead conserva `propertyId` histórico |
| Misma persona, varias propiedades | Genera **un lead por consulta** (comportamiento esperado v1) |

---

## Limitaciones conocidas de Lead v1

* Un lead no agrupa automáticamente las consultas previas del mismo contacto.
* Consultar varias propiedades implica varios leads con datos de contacto repetidos.
* No hay merge ni deduplicación automática en v1.
* El pipeline comercial es por consulta, no por persona.
* La consolidación de contactos se resolverá con `Client` y/o `LeadInterest` en versiones futuras.

---

## MVP (alineado con vision.md)

Funcionalidad mínima del módulo:

1. Captura de leads desde web pública (propiedad + contacto general).
2. Listado y detalle en admin.
3. Asignación manual a agentes.
4. Cambio de estado y notas internas.
5. Timeline de actividades.

Fuera del MVP inicial:

* Conversión a `Client`.
* Round robin automático.
* Integraciones WhatsApp / email.
* Reportes avanzados.

---

## Estado

Dominio v1 congelado (inquiry-centric). Pendiente de migración Prisma e implementación API.
