# Rental Communications V1

Estado: **C1–C3B implementados y validados en UAT real; C4A.1 (read models/API de comunicaciones) implementado; C4C.1, C4C.2 y C4C.3 CLOSED y validados en UAT; métricas/alertas y señales Notification pendientes**.

Esta especificación define Communications V1 y registra su avance por fases. C1 ya implementa tablas y endpoints de lectura/policy; no implica que existan planner, procesos de ejecución, proveedores ni envíos. El schema vigente continúa documentado exclusivamente en `docs/03-database/current-schema.md`.

## 1. Alcance y decisiones reemplazadas

Las decisiones previas que siguen vigentes son:

- `RentalContractParty`, `RentalContractNotificationRoute` y `ContactPoint` definen destinatario, canal y destino;
- `RentalObligation.includeInNotice` y `showAmount` definen el contenido permitido;
- `RentalObligationOccurrence` es la unidad operativa que puede recordarse;
- `TenantSetting.timeZone` es la zona horaria canónica;
- planner, dispatch, delivery, callbacks, idempotencia y retries pertenecen a Migración C;
- un envío conserva snapshots auditables y no reemplaza el historial contractual ni `Notification`.

C0 reemplaza la indefinición anterior de anticipación, horario, agrupación, estados, reintentos, snapshots, proveedores y webhooks por las reglas de este documento.

Communications V1 opera únicamente por:

- `EMAIL` mediante MailerSend;
- `WHATSAPP` mediante Meta WhatsApp Cloud API directa.

`SMS` queda **DEFER**. El enum y las capacidades existentes pueden conservarse para evolución futura, pero el planner no crea deliveries SMS y Admin no lo presenta como canal operativo V1.

Quedan fuera de C0 y de la implementación inicial:

- overrides de política por contrato;
- CMS de templates;
- campañas o comunicaciones libres;
- proveedores alternativos;
- notificaciones internas globales;
- implementación de providers, schema, API o Admin.

## 2. Arquitectura canónica

```txt
RentalReminderPolicy (tenant-wide)
        ↓
Planner
        ↓
RentalReminderDispatch (recordatorio lógico agrupado)
        ↕ N:M
RentalObligationOccurrence
        ↓
RentalReminderDelivery (un canal/destino)
        ↓ 1:N
RentalReminderDeliveryAttempt
        ↓
ReminderProviderAdapter
        ├── MailerSendAdapter
        └── MetaWhatsAppAdapter
```

Responsabilidades:

- **Policy**: define cuándo recordar; no decide destinatarios, contenido ni provider.
- **Planner**: encuentra eventos temporales, valida elegibilidad, agrupa y crea/upserta dispatches y deliveries de forma idempotente.
- **Dispatch**: representa un recordatorio lógico para un tenant, contrato, destinatario, vencimiento y evento.
- **Delivery**: representa la ejecución independiente de un canal. Un fallo de email nunca reenvía WhatsApp.
- **Attempt**: audita cada llamada al provider y su resultado normalizado.
- **Adapter**: traduce un delivery provider-agnostic al contrato externo y normaliza respuesta/webhooks.
- **Planning issue**: representa datos/configuración que impiden planificar; nunca se registra como fallo de provider.

Planning y delivery processing son procesos separados. PostgreSQL funciona como cola durable mediante estados, `nextAttemptAt` y leases; no se asume una tecnología de colas ni un cron concreto.

## 3. Política tenant-wide

Se propone `RentalReminderPolicy`, una fila por tenant:

| Campo                    | Regla                                  |
| ------------------------ | -------------------------------------- |
| `tenantId`               | único y obligatorio                    |
| `preDueEnabled`          | default `true`                         |
| `preDueDays`             | default `3`, rango `1..30`             |
| `dueEnabled`             | default `true`                         |
| `postDueEnabled`         | default `true`                         |
| `postDueDays`            | default `3`, rango `1..30`             |
| `sendTimeMinutes`        | default `600` (10:00), rango `0..1439` |
| `createdAt`, `updatedAt` | auditoría básica                       |

`sendTimeMinutes` expresa minutos desde medianoche local y evita almacenar una fecha ficticia. La zona horaria no se duplica: se lee de `TenantSetting.timeZone` y debe ser un identificador IANA válido.

Los defaults se persisten al crear/backfillear la política y son editables. No se hardcodean como comportamiento permanente del planner. Los valores de días se conservan dentro de `1..30` incluso con el evento deshabilitado, para que reactivarlo sea determinístico.

El override por contrato queda **DEFER**.

## 4. Elegibilidad y bloqueos de planificación

Una occurrence sólo es elegible cuando, al mismo tiempo:

1. tenant, contrato, obligación, occurrence, parte, ruta y ContactPoint pertenecen al mismo tenant;
2. el contrato está `ACTIVE`, la parte tiene rol `RENTER` y la obligación está activa;
3. la occurrence está `PENDING`; `FULFILLED` y `CANCELLED` nunca se envían;
4. `includeInNotice = true`;
5. el evento temporal corresponde a su `dueDate` y a la política vigente;
6. existe una ruta activa V1 para el renter y el ContactPoint activo soporta el canal;
7. existe `dueDate` cuando el evento depende del vencimiento;
8. si `showAmount = true`, existe `amount`; con `showAmount = false` puede incluirse aunque el importe sea desconocido.

`OVERDUE` continúa derivado; no se persiste ni reemplaza `PENDING`.

Se propone `RentalReminderPlanningIssue` para bloqueos previos al provider:

| Campo                                                                         | Propósito                         |
| ----------------------------------------------------------------------------- | --------------------------------- |
| `tenantId`, `contractId?`, `occurrenceId?`, `recipientContactId?`, `channel?` | scope tenant/contrato/occurrence  |
| `type`                                                                        | causa normalizada                 |
| `deduplicationKey`                                                            | identidad estable del problema    |
| `status`                                                                      | `OPEN` o `RESOLVED`               |
| `firstDetectedAt`, `lastDetectedAt`, `resolvedAt?`                            | ciclo de vida                     |
| `metadata`                                                                    | IDs y contexto no sensible mínimo |

Tipos iniciales:

- `DUE_DATE_MISSING`;
- `DISPLAY_AMOUNT_MISSING`;
- `NO_ENABLED_ROUTE`;
- `CONTACT_POINT_INELIGIBLE`;
- `TENANT_TIME_ZONE_MISSING_OR_INVALID`;
- `PROVIDER_CONFIGURATION_INVALID`;
- `PROVIDER_TEMPLATE_INVALID`;
- `PLANNING_WINDOW_EXPIRED`.

La clave es `sha256(rental-planning-issue:v1|tenantId|contractId|occurrenceId-or-none|recipient-or-none|channel-or-none|type)`, única por tenant. Una nueva detección actualiza `lastDetectedAt`; al corregirse la causa se marca `RESOLVED`. No se crea `Delivery` ni `Attempt` por estos casos.

Estas issues podrán emitir en el futuro señales idempotentes a `Notification`, sin que Communications dependa de que ese modelo ya exista.

## 5. Eventos y agrupación

El enum técnico propuesto es `RentalReminderEventType`:

```txt
PRE_DUE
DUE
POST_DUE
```

La fecha objetivo del evento se calcula en la zona del tenant:

- `PRE_DUE`: `dueDate - preDueDays`;
- `DUE`: `dueDate`;
- `POST_DUE`: `dueDate + postDueDays`.

Se agrupan occurrences con igual:

- tenant;
- contrato;
- destinatario renter (`Contact`);
- `eventType`;
- `dueDate`.

La clave canónica de grupo es:

```txt
sha256(
  rental-reminder-dispatch:v1 |
  tenantId |
  contractId |
  recipientContactId |
  eventType |
  dueDate:YYYY-MM-DD
)
```

`scheduledFor` no integra la identidad: un cambio editable de hora/política antes del envío reprograma el mismo evento, no crea otro. Tampoco se incluyen los IDs de occurrences en la clave: el conjunto puede cambiar antes del primer intento y debe converger sobre el mismo dispatch. Un `occurrenceSetHash` separado, calculado sobre IDs ordenados, detecta cambios y audita el conjunto finalmente congelado.

Así, Alquiler y Expensas con vencimiento 10/10 comparten un dispatch `PRE_DUE`; Luz con vencimiento 15/10 pertenece a otro.

## 6. Persistencia propuesta

### 6.1 `RentalReminderDispatch`

Campos mínimos:

- `id`, `tenantId`, `contractId`;
- `recipientContactId` nullable como referencia operativa y `recipientIdentityKey` inmutable para conservar identidad si cambia la asociación;
- `eventType`, `dueDate @db.Date`, `scheduledFor` UTC;
- `groupKey`, `occurrenceSetHash`;
- `status`, `skipReason?`;
- `policySnapshot`, `recipientSnapshot`, `contentSnapshot`;
- `frozenAt?`, `firstAttemptAt?`, `completedAt?`, timestamps.

`policySnapshot` conserva los valores efectivos, timezone y versión de reglas. `recipientSnapshot` conserva identificación mínima del destinatario. `contentSnapshot` conserva el conjunto lógico final, conceptos, fechas e importes que podían mostrarse; queda inmutable desde el primer intento de cualquier delivery.

### 6.2 `RentalReminderDispatchOccurrence`

Relación N:M explícita:

- `tenantId`, `dispatchId`, `occurrenceId`;
- `status`: `INCLUDED` o `EXCLUDED_BEFORE_SEND`;
- `exclusionReason?`, `evaluatedAt`.

Las relaciones no se borran durante revalidación: el estado explica por qué una occurrence inicialmente considerada no fue enviada.

### 6.3 `RentalReminderDelivery`

Campos mínimos:

- `id`, `tenantId`, `dispatchId`;
- `channel`, `contactPointId?` y `routeId?` como referencias operativas;
- `deliveryKey`, `status`, `statusSource`;
- `destinationSnapshot`, `contentSnapshot`, `subjectSnapshot?`;
- `templateKey`, `templateVersion`, `providerKey`, `providerAccountKey`, `providerTemplateRef?`;
- `attemptCount`, `nextAttemptAt?`;
- `processingToken?`, `lockedUntil?` para claim concurrent-safe;
- `providerMessageId?`;
- `sentAt?`, `deliveredAt?`, `readAt?`, `failedAt?`, `skippedAt?`;
- error final sanitizado: `errorCategory?`, `errorCode?`, `errorMessage?`;
- timestamps.

Cada delivery conserva el destino y el render exactos usados por ese canal. La dirección completa no se escribe en logs; su acceso se restringe como PII. En V1 se crea como máximo un delivery por canal porque hoy existe una única ruta seleccionada por contrato/persona/canal.

### 6.4 `RentalReminderDeliveryAttempt`

Campos mínimos:

- `id`, `tenantId`, `deliveryId`, `attemptNumber`, `attemptKey`;
- `status`, `startedAt`, `finishedAt?`, `latencyMs?`;
- `providerMessageId?`;
- `errorCategory?`, `errorCode?`, `errorMessage?` sanitizados;
- timestamps.

No duplica destinatario, body ni payload del provider: éstos pertenecen al snapshot del delivery. No se persisten request/response crudos de MailerSend o Meta.

### 6.5 `RentalReminderWebhookReceipt`

Registro técnico mínimo para idempotencia de callbacks:

- `id`, `tenantId`, `providerKey`, `providerAccountKey`, `providerEventKey`;
- `providerMessageId?`, `deliveryId?`, `attemptId?`;
- `eventType`, `providerOccurredAt?`, `receivedAt`, `processedAt?`;
- `status`: `RECEIVED`, `APPLIED` o `IGNORED`;
- `payloadDigest` y error sanitizado opcional.

El body crudo sólo existe en memoria durante verificación/normalización y no se almacena.

## 7. Estados y transiciones

### Dispatch

```txt
PLANNED → READY → PROCESSING → COMPLETED
                         ├──→ PARTIALLY_COMPLETED
                         ├──→ FAILED
                         └──→ SKIPPED
```

- `PLANNED`: conjunto aún revalidable.
- `READY`: deliveries creados y programados.
- `PROCESSING`: al menos un delivery fue reclamado.
- `COMPLETED`: todos los deliveries fueron enviados o avanzaron a `DELIVERED/READ`.
- `PARTIALLY_COMPLETED`: existe éxito en algún canal y fallo/omisión terminal en otro.
- `FAILED`: no hubo éxito y existe fallo técnico definitivo.
- `SKIPPED`: no quedó contenido elegible; no es fallo de provider.

El agregado se actualiza transaccionalmente desde sus deliveries; no dispara reenvíos cruzados.

### Delivery

```txt
PENDING → PROCESSING → SENT → DELIVERED → READ
              ├──→ PENDING (retry programado)
              ├──→ FAILED
              └──→ SKIPPED
FAILED ──→ PENDING (reset manual)
```

`PENDING`, `PROCESSING` y `SKIPPED` son internos. `SENT` puede originarse en la aceptación síncrona o en webhook; `DELIVERED` y `READ` provienen del provider cuando existen. `FAILED` puede ser respuesta permanente, agotamiento de retries o webhook terminal. `statusSource` distingue `INTERNAL`, `PROVIDER_RESPONSE` y `PROVIDER_WEBHOOK`.

Un delivery en callejón sin salida puede reabrirse manualmente a `PENDING` cuando la causa externa fue corregida (p. ej. credenciales). Estados elegibles: `FAILED`, o `PROCESSING` con lease vencido y sin attempt en vuelo (claim colgado sin fila de Attempt). La operación es tenant-scoped y transaccional, con compare-and-set (rechaza resets concurrentes y no roba un attempt activo: `IN_FLIGHT`), y reabre el agregado completo: si el Dispatch quedó terminal (`completedAt` seteado), vuelve a `READY` con `completedAt=null` para que el próximo claim lo lleve a `PROCESSING` (requisito del check constraint). No borra ni reutiliza Attempts (el histórico de error queda intacto en su fila y el próximo envío crea un attempt nuevo sobre el mismo Delivery) y respeta el tope canónico de 4 attempts. `SENT/DELIVERED/READ` nunca son reseteables.

Para Email, `SENT` significa que el provider aceptó el mensaje y `DELIVERED`
que confirmó su entrega. `READ`, cuando existe, deriva de tracking best-effort
de apertura (`activity.opened`/`activity.opened_unique` en MailerSend): es
evidencia técnica de apertura y no prueba inequívoca de lectura humana. La
ausencia de esos eventos no constituye por sí sola un fallo de integración.

Los webhooks sólo avanzan el estado según una precedencia definida; un evento tardío no degrada `READ` a `DELIVERED` ni `DELIVERED` a `SENT`. Un fallo terminal tardío se conserva como evento normalizado y sólo cambia estado si la matriz del provider lo considera compatible.

### Attempt

```txt
PROCESSING → ACCEPTED
           └→ FAILED
```

Un lease vencido deja un intento `FAILED` con categoría técnica sanitizada antes de habilitar el siguiente. Los estados de entrega posteriores no crean nuevos attempts.

Enums/conjuntos cerrados propuestos:

| Concepto                                 | Valores                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `RentalReminderDispatchStatus`           | `PLANNED`, `READY`, `PROCESSING`, `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`, `SKIPPED` |
| `RentalReminderDeliveryStatus`           | `PENDING`, `PROCESSING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `SKIPPED`                 |
| `RentalReminderAttemptStatus`            | `PROCESSING`, `ACCEPTED`, `FAILED`                                                        |
| `RentalReminderStatusSource`             | `INTERNAL`, `PROVIDER_RESPONSE`, `PROVIDER_WEBHOOK`                                       |
| `RentalReminderPlanningIssueStatus`      | `OPEN`, `RESOLVED`                                                                        |
| `RentalReminderDispatchOccurrenceStatus` | `INCLUDED`, `EXCLUDED_BEFORE_SEND`                                                        |
| `RentalReminderWebhookReceiptStatus`     | `RECEIVED`, `APPLIED`, `IGNORED`                                                          |

`providerKey` es una clave técnica validada contra el registry de adapters, no
un enum de dominio ni una decisión del contrato. Agregar un provider no exige
alterar el modelo Rental.

## 8. Idempotencia y concurrencia

Las protecciones de Service se complementan con constraints de base:

| Riesgo                         | Protección propuesta                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| planner repetido/restart       | `UNIQUE (tenantId, groupKey)`                                                                        |
| relación repetida              | `UNIQUE (dispatchId, occurrenceId)`                                                                  |
| dos deliveries del mismo canal | `UNIQUE (dispatchId, channel)`                                                                       |
| delivery recreado              | `UNIQUE (tenantId, deliveryKey)` donde `deliveryKey = sha256(canonicalTuple(v1, groupKey, channel))` |
| attempt concurrente repetido   | `UNIQUE (deliveryId, attemptNumber)` y `UNIQUE (tenantId, attemptKey)`                               |
| webhook duplicado              | `UNIQUE (providerKey, providerAccountKey, providerEventKey)`                                         |
| mensaje externo ambiguo        | índice único parcial `(providerKey, providerAccountKey, providerMessageId)` cuando no es null        |

El worker reclama un delivery mediante actualización condicional atómica de `PENDING` a `PROCESSING`, asignando `processingToken` y `lockedUntil`. Sólo el dueño del lease puede crear el siguiente `attemptNumber`, dentro de la misma transacción. Esto evita que dos workers generen intentos distintos simultáneos; los unique constraints son la última defensa.

`attemptKey = sha256(rental-reminder-attempt:v1|deliveryKey|attemptNumber)`. La clave lógica enviada al provider permanece estable por delivery cuando el provider admita idempotency key; no se sustituye por la del attempt, porque un retry sigue siendo el mismo mensaje lógico.

## 9. Revalidación y snapshots

Inmediatamente antes del primer Attempt del dispatch se releen, bajo tenant scope, occurrence, estado, obligación, flags, parte, ruta y ContactPoint para todos sus canales.

- Si ninguna occurrence sigue elegible, el delivery termina `SKIPPED` con causa `NO_LONGER_ELIGIBLE`; si ningún canal puede enviar, el dispatch termina `SKIPPED`.
- Si sólo algunas dejaron de ser elegibles y aún no existe ningún Attempt del dispatch, se marcan excluidas, se recalculan `occurrenceSetHash`/contenido y se renderizan las restantes.
- En la misma transacción que crea el primer Attempt se congela el snapshot lógico del dispatch.
- Cada delivery vuelve a revalidar antes de su propio primer Attempt. Puede renderizar un subconjunto aún elegible sin modificar el dispatch ni otro canal; su snapshot registra exactamente los IDs incluidos y queda inmutable al crear ese Attempt.
- Antes de cada retry se revalida que todo el contenido congelado del delivery continúe requiriendo atención. Si cambió parcial o totalmente, se omite el retry completo para no enviar contenido obsoleto; el snapshot histórico no se reescribe.
- Un email fallido no modifica ni reenvía un WhatsApp aceptado.

Propiedad de snapshots:

| Nivel    | Snapshot                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Dispatch | política/timezone, identidad del destinatario, evento, vencimiento, conjunto lógico y conceptos/importes permitidos                          |
| Delivery | canal, ContactPoint/destino efectivo, occurrences efectivamente renderizadas, body, subject nullable, template/version y referencia provider |
| Attempt  | ordinal, providerKey, timestamps, resultado, providerMessageId y error sanitizado                                                            |

## 10. Planner y ventana temporal

No hay scheduler, queue ni worker productivo versionado actualmente. C2 cierra la
forma de invocar el core mediante un application service explícito
`ReminderPlannerService.run(now, { dryRun })`, independiente de infraestructura y
del reloj del sistema. El workflow development lo expone sólo detrás del guard de
`rental-management-dev`; el scheduler desplegado continúa **OPEN**. El contrato
del planner es:

1. ejecución recomendada cada 5 minutos;
2. por tenant, convertir `sendTimeMinutes` usando `TenantSetting.timeZone`;
3. evaluar una ventana solapada `[now - 7 días, now + 5 minutos]`;
4. generar las fechas objetivo PRE/DUE/POST y upsert por `groupKey`;
5. aplicar vigencia semántica al catch-up: PRE sólo antes de `dueDate`, DUE sólo en la fecha local de vencimiento y POST después de `dueDate`;
6. un evento vencido que ya no puede enviarse sin ser engañoso se registra como `PLANNING_WINDOW_EXPIRED`, no se envía retrospectivamente;
7. deduplicación y métricas registran ejecuciones repetidas sin crear nuevas filas lógicas.

La ventana de siete días tolera reinicios y downtimes ordinarios sin depender de un segundo exacto. Una interrupción superior requiere reconciliación operativa explícita; nunca dispara silenciosamente una ráfaga histórica.

El planner consulta occurrences `PENDING` por `tenantId/status/dueDate`, índice ya existente, y carga obligaciones/contratos/partes/rutas en queries acotadas. Los deliveries pendientes se procesan por separado mediante `status`, `nextAttemptAt` y lease.

Recomendación para implementación: proceso background dedicado en Railway o job autenticado de infraestructura que invoque un application command. La elección depende del soporte real de deployment y permanece **OPEN**; no se expondrá un endpoint Admin público para ejecutar el planner.

## 11. Retries

Política técnica V1, versionada en código y no editable por tenant:

| Attempt | Momento                             |
| ------- | ----------------------------------- |
| 1       | inicial                             |
| 2       | +5 minutos                          |
| 3       | +30 minutos desde el fallo anterior |
| 4       | +2 horas desde el fallo anterior    |

Después del cuarto fallo retryable, el delivery queda `FAILED`. Un error permanente falla sin agotar esperas. Rate limits y respuestas transitorias respetan `Retry-After` cuando sea mayor que el delay técnico y esté dentro de un límite seguro.

Categorías normalizadas iniciales:

- `AUTHENTICATION`;
- `CONFIGURATION`;
- `VALIDATION`;
- `RATE_LIMIT`;
- `PROVIDER_UNAVAILABLE`;
- `NETWORK`;
- `RECIPIENT_REJECTED`;
- `UNKNOWN`.

Se guardan código, categoría y mensaje sanitizado; nunca headers, tokens ni payloads crudos.

## 12. Templates y adapters

El dominio depende de puertos, no de SDKs:

```txt
ReminderProviderAdapter
  send(deliverySnapshot, idempotencyKey) → normalized result
  normalizeWebhook(verifiedEvent) → normalized event

ProviderWebhookVerifier
  verify(headers, rawBody) → verified provider event
```

Adapters iniciales:

- `MailerSendAdapter` para email;
- `MetaWhatsAppAdapter` para WhatsApp Cloud API directa.

No se adopta Neon SDK, Neon Auth, Functions ni Storage para comunicaciones. Prisma 7 + PostgreSQL Neon continúan como persistencia; los providers son integraciones externas del API/worker.

V1 usa un catálogo mínimo versionado en código con `templateKey` y `templateVersion`:

- WhatsApp: template aprobado por Meta, variables controladas, nombre/idioma resueltos por adapter. La categoría Utility/transaccional depende de la configuración y aprobación real; rechazo o reclasificación exige una nueva versión/configuración, no texto libre improvisado.
- Email: template transaccional Valorar sencillo, con subject y HTML/texto renderizados por el adapter.

El contrato no almacena template. No se crea CMS. Dispatch/Delivery guardan la versión y el render efectivo necesarios para auditoría.

## 13. Webhooks

Endpoints conceptuales, sin implementación HTTP en C1:

- verificación y recepción Meta en `/webhooks/communications/meta-whatsapp`;
- recepción MailerSend en `/webhooks/communications/mailersend`.

Reglas:

1. verificar challenge/firma/autenticidad con el mecanismo oficial de cada provider sobre bytes crudos;
2. rechazar antes de parsear funcionalmente cuando la autenticidad falla;
3. normalizar el evento y calcular/leer `providerEventKey`;
4. localizar sólo el delivery/attempt por `providerKey + providerAccountKey + providerMessageId`;
5. derivar `tenantId` desde el delivery, nunca desde un dato confiado del callback;
6. insertar `RentalReminderWebhookReceipt`; conflicto único significa duplicado ignorado;
7. aplicar la matriz monotónica de estados y timestamps dentro de una transacción;
8. tolerar eventos fuera de orden y conservar `providerOccurredAt`;
9. no persistir el payload crudo.

Los endpoints de provider no usan sesión Admin. La verificación criptográfica es obligatoria y sus secretos no se exponen a DTOs ni logs. Un callback inválido o sin mapping incrementa métricas y registra sólo contexto técnico sanitizado; no crea una fila Rental sin tenant. Una vez mapeado, `tenantId` se deriva del delivery y es obligatorio. `READ` y `DELIVERED` pueden superar evidencia previa de fallo para el mismo mensaje; `FAILED` nunca degrada un estado exitoso posterior.

## 14. Multi-tenancy y RBAC

Toda tabla funcional propuesta lleva `tenantId`. Relaciones a contrato, occurrence, Contact, ContactPoint, ruta y dispatch deben validar el mismo tenant en Service y, cuando Prisma/PostgreSQL lo permitan, mediante claves compuestas `(tenantId, id)`.

Política RBAC propuesta:

| Operación                                 | Permiso                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| ver resumen contractual de comunicaciones | `rental.read`                                            |
| ver destino completo, errores y operación | `rental.reminder.manage`                                 |
| editar política tenant-wide               | `rental.reminder.manage`                                 |
| retry manual de un delivery `FAILED`      | `rental.reminder.manage`                                 |
| marcar/atender inbound (read/acknowledge) | `rental.reminder.manage`                                 |
| configurar providers platform-wide        | futuro `platform.communication.manage`, sólo Super Admin |

`rental.reminder.manage` está implementado para `SUPER_ADMIN`, `TENANT_ADMIN` y `MANAGER`. El retry manual existe como operación de dominio en el runner development (`reminder-reset`) y como endpoint Admin desde C4A.1 con la misma semántica: crea un nuevo Attempt sobre el mismo Delivery, conserva el histórico (incluido un fallo anterior) y respeta el máximo/política auditada. Los read models de comunicaciones usan `rental.read`.

API implementada:

- C1: `GET/PUT /rental-reminder-policy` para leer/actualizar transaccionalmente la policy del tenant;
- C1: `GET /rental-reminder-communications/planning-issues`;
- C1: `GET /rental-reminder-communications/dispatches`;
- C1: `GET /rental-reminder-communications/deliveries`;
- C1: `GET /rental-reminder-communications/deliveries/:id/attempts`;
- C4A.1 (read models, requieren `rental.read`):
  - `GET /rental-reminder-communications/contracts/:contractId/history`;
  - `GET /rental-reminder-communications/inbound`;
  - `GET /rental-reminder-communications/summary`;
- C4A.1 (operación, `rental.reminder.manage`):
  - `POST /rental-reminder-communications/deliveries/:id/retry` → `200 OK` con
    `{ok, attemptCount, nextAttemptNumber, dispatchReopened}`; `404` cuando el
    delivery no existe o no pertenece al tenant; `409` con la razón canónica
    (`NOT_FAILED`/`IN_FLIGHT`/`MAX_ATTEMPTS`/`CONCURRENT`).
- C4B (operación, `rental.reminder.manage`):
  - `POST /rental-reminder-communications/inbound/:id/read` → `200 OK` con
    `{ok, messageId, readAt, acknowledgedAt, acknowledgedBy}`; `404` con
    `{ok: false, reason: 'NOT_FOUND'}` cuando el mensaje no existe o no
    pertenece al tenant. Idempotente: conserva el primer `readAt`.
  - `POST /rental-reminder-communications/inbound/:id/acknowledge` → `200 OK`
    con el mismo payload más `alreadyAcknowledged`; si ya estaba atendido,
    devuelve el estado existente sin sobrescribir el actor/timestamp original
    (no `409`). `404` tenant-negative.

Todas las lecturas operativas son tenant-scoped y paginadas. Las ventanas
temporales son `[from, to)` y se validan en Service (`from < to`). Los
endpoints de webhook permanecen sin exposición Admin.

#### C4A.1 — Read models de comunicaciones

Alcance (sin schema, migración ni índices nuevos):

- **Historial por contrato**: dispatches del contrato con sus occurrences
  (concepto y `dueDate`) y deliveries con attempts embebidos; el snapshot del
  destinatario se proyecta sólo a `contactId`/`name`. Filtros `eventType`,
  `dispatchStatus` y `channel`. El canal tiene semántica doble: sólo dispatches
  con al menos un delivery del canal (`deliveries: { some: { channel } }`) y,
  dentro de cada item, sólo los deliveries de ese canal. Orden
  `scheduledFor desc, id desc`; attempts por `attemptNumber asc`.
- **Inbound**: mensajes entrantes WhatsApp tenant-scoped con filtros
  `contractId`, `contactId` y ventana `receivedAt [from, to)`. Cada item expone
  `sender.address` enmascarado, `deliveryCorrelated`, contacto/contrato
  resueltos y `externalReplyLink`; desde C4B también `readAt`,
  `acknowledgedAt`, `acknowledgedBy {id, name}` y los filtros
  `unread`/`unacknowledged`.
- **Summary**: conteos del día local del tenant — dispatches programados,
  deliveries `sent`/`delivered`/`failed` y planning issues `OPEN` — sobre la
  ventana `[inicio del día local en `TenantSetting.timeZone`, +24h)` con
  default `America/Argentina/Buenos_Aires`.

Enmascaramiento y privacidad (mismo patrón del runner):

- teléfono: `slice(0,3) + '*' * max(4, len-7) + slice(-4)` (p. ej.
  `+54*******6941`);
- email: primer carácter + `***` + dominio (`r***@example.com`);
- errores: sólo categoría/código/mensaje sanitizado;
- nunca se expone el payload del provider, metadata inbound,
  `providerMessageId`, tokens/secretos ni snapshots internos.

Excepción de PII funcional: `externalReplyLink` devuelve
`https://wa.me/<dígitos>` con el número completo del remitente como PII
**funcional** para soportar "Responder por WhatsApp". No se expone ningún otro
número (ni contact points, ni snapshots, ni metadata del provider);
`sender.address` permanece enmascarado; y este valor no se loguea.

Detalles de operación:

- El retry es `POST` con respuesta `200 OK` (no `201`) y reutiliza la operación
  de dominio `manualResetFailedDelivery`; no envía sincrónicamente.
- No hay cambios de schema, migraciones, índices ni permisos nuevos (se
  reutilizan las superficies existentes `rental.read`/`rental.reminder.manage`).
- Fuera de alcance de C4A.1: UI Admin, C4B (implementado por separado),
  métricas/alertas y scheduler/productivo.

#### C4B — Inbound Attention State

Alcance (migración `202609220001_rental_communications_c4b_inbound_attention`):

- **Semántica de estados**: `RECEIVED → READ → ACKNOWLEDGED` son estados de
  _atención en Admin_ derivados de timestamps sobre `CommunicationInboundMessage`;
  no son estados del provider y no modifican el `RentalReminderDelivery`.
  Leer no implica atender; atender sí implica leer
  (`acknowledgedAt != null → readAt != null`). No existe deshacer un
  acknowledge en V1. `readAt` se setea una única vez mediante compare-and-set
  (`readAt IS NULL`), por lo que el primer timestamp se conserva incluso bajo
  concurrencia.
- **Persistencia**: `readAt DateTime?`, `acknowledgedAt DateTime?` y
  `acknowledgedById String?` con FK a `User(id)` `ON DELETE SET NULL`
  (relación `RentalInboundAcknowledger`); índice `(tenantId, acknowledgedAt)`
  para la cola de pendientes y el summary. Sin backfill: el inbound histórico
  queda `readAt = null, acknowledgedAt = null`.
- **Actor**: `acknowledgedById = user.id` del operador; `null` para
  `SUPER_ADMIN` (convención del repo). El acknowledge es first-wins: un intento
  concurrente o repetido nunca sobrescribe el actor/timestamp original y
  devuelve el estado existente con `alreadyAcknowledged: true` (sin `409`).
- **Acciones** (`rental.reminder.manage`): `POST inbound/:id/read` y
  `POST inbound/:id/acknowledge`, ambas tenant-scoped, `200 OK` y `404` con
  `{ok: false, reason: 'NOT_FOUND'}` para mensajes inexistentes o cross-tenant.
- **Lectura**: `GET /inbound` expone `readAt`, `acknowledgedAt` y
  `acknowledgedBy {id, name}` y soporta `unread=true`/`unacknowledged=true`
  (strings booleanas transformadas con la semántica lenient de otros query
  DTOs: `'true'`→`true`, `'false'`→`false`, inválido→ausente). El summary
  agrega `inboundUnacknowledged` (`acknowledgedAt IS NULL`); no se agrega
  `inboundUnread` por redundante.
- **Fuera de alcance**: UI Admin (pendiente), push/notificaciones, responder
  WhatsApp, Fulfillment, audit log paralelo, metadata provider y mutación de
  contract/delivery/dispatch/fulfillment. Sin permisos nuevos.

Planner y worker son application commands internos. Si la infraestructura exige
un trigger HTTP, será un endpoint interno con autenticación de servicio, nunca
una ruta Admin ni una operación basada sólo en `tenantId` del request.

## 15. Credenciales y configuración segura

Decisión C1 **CLOSED**: las credenciales V1 son **platform-wide** y administradas por infraestructura/runtime. API keys, access tokens, app secrets y verify tokens viven exclusivamente en environment/secret store; nunca en PostgreSQL ni en respuestas al Admin tenant. La arquitectura conserva `providerKey`/`providerAccountKey` como referencias no secretas para permitir una evolución tenant-specific posterior sin implementarla ahora.

Configuración esperada del runtime, sin valores en documentación:

- MailerSend: API token (secreto), sender/domain/from y nombre visible;
- Meta: access token y app secret (secretos), webhook verify token (secreto), phone number ID, WABA ID cuando corresponda, template name y language.

Estrategia:

- secretos en el secret store/env cifrado del runtime desplegado —Railway para el API/worker actual—;
- sólo referencias/identificadores no sensibles en configuración validada al boot;
- rotación sin migración de datos;
- logs con nombres de provider, IDs internos y últimos caracteres enmascarados, nunca secretos/destinos completos;
- Admin normal sólo ve `configurado/no configurado` y salud operativa autorizada.

## 16. Observabilidad

Métricas mínimas, siempre por tenant y canal cuando corresponda:

- dispatches creados, deduplicados, completados, parcialmente completados, fallidos y omitidos;
- deliveries `PENDING/SENT/DELIVERED/READ/FAILED/SKIPPED`;
- attempts y retries;
- latencia del provider;
- issues por `DUE_DATE_MISSING`, `DISPLAY_AMOUNT_MISSING`, ruta/destino y ventana vencida;
- webhooks recibidos, duplicados, rechazados, fuera de orden y sin mapping;
- leases expirados y backlog por antigüedad.

Logs estructurados incluyen IDs internos, `groupKey`/`deliveryKey` abreviados, canal, provider, estado, categoría y duración. Excluyen nombres, emails, teléfonos, body, subject, tokens y payloads. Los detalles auditables viven en tablas con RBAC, no en logs.

Señales futuras hacia `Notification`:

| Señal                            | Fuente y deduplicación                                                  |
| -------------------------------- | ----------------------------------------------------------------------- |
| fecha requerida                  | planning issue `DUE_DATE_MISSING` y su `deduplicationKey`               |
| importe requerido                | planning issue `DISPLAY_AMOUNT_MISSING` y su `deduplicationKey`         |
| delivery definitivamente fallido | `sha256(rental-delivery-failed:v1, tenantId, deliveryId, attemptCount)` |
| provider/config inválida         | planning issue de configuración/template y su `deduplicationKey`        |

Communications emitirá el evento interno; el futuro sistema global decidirá usuarios destinatarios, persistencia y presentación. C1 no implementa `Notification`.

## 17. Admin futuro

Sin implementación Admin en C1:

### Configuración → Gestión de alquileres → Avisos

- previo ON/OFF y días `1..30`;
- día de vencimiento ON/OFF;
- posterior ON/OFF y días `1..30`;
- hora local;
- timezone visible proveniente de `TenantSetting`;
- estado de disponibilidad de Email/WhatsApp, sin secretos.

### Contrato → Avisos

Se conserva la UI existente para renters, Email/WhatsApp, ContactPoint, obligaciones incluidas y `showAmount`. SMS se oculta/deshabilita como canal operativo V1.

### Historial y operación

- resumen de comunicaciones en el detalle del contrato, integrado con su contexto;
- vista operativa acotada desde Configuración/Avisos para fallos y retry manual;
- no se crea un módulo paralelo complejo ni se mezclan deliveries con `RentalContractEvent`;
- `Notification` global podrá enlazar a contrato/delivery para importe/fecha faltante, fallo definitivo o provider/config inválida.

## 18. Migración C1 implementada

La migración `202609210001_rental_communications_c1`, posterior a todas las
anteriores, incorporó de forma atómica:

1. enums de eventos, estados, issues y causas; `providerKey` permanece extensible;
2. `RentalReminderPolicy`;
3. `RentalReminderPlanningIssue`;
4. `RentalReminderDispatch` y `RentalReminderDispatchOccurrence`;
5. `RentalReminderDelivery` y `RentalReminderDeliveryAttempt`;
6. `RentalReminderWebhookReceipt`;
7. relaciones tenant-scoped compuestas para contrato, occurrence, dispatch, delivery y attempt; referencias operativas opcionales a Contact/ContactPoint/ruta se preservan como IDs y snapshots;
8. uniques, checks e índices de este documento;
9. backfill determinístico de una policy por tenant con defaults 3/ON/3/10:00;
10. ningún backfill de dispatches, deliveries, attempts ni historia inventada.

Checks SQL mínimos:

- días `BETWEEN 1 AND 30`;
- `sendTimeMinutes BETWEEN 0 AND 1439`;
- `attemptNumber BETWEEN 1 AND 4`;
- timestamps coherentes con el estado;
- claves determinísticas no vacías.

Índices de queries reales:

- dispatch `(tenantId, status, scheduledFor)` y `(tenantId, contractId, createdAt DESC)`;
- issue `(tenantId, status, lastDetectedAt DESC)`;
- delivery `(tenantId, status, nextAttemptAt)` y `(tenantId, dispatchId)`;
- attempt `(tenantId, deliveryId, startedAt DESC)`;
- webhook `(providerKey, providerAccountKey, providerMessageId)` además de su unique event key.

El índice actual `RentalObligationOccurrence(tenantId, status, dueDate)` se reutiliza; no se agregó otro especulativo. La migración fue precedida por preflight, Prisma format/validate/generate y review SQL, y se aplicó únicamente sobre `rental-management-dev` mediante el workflow seguro.

## 19. Fases de implementación y gates

### C1 — Persistencia y policy ✅

- schema/migración completa de persistencia;
- backfill de policies;
- puertos provider-agnostic y contrato de catálogo de templates, sin providers ni templates reales;
- API/RBAC de policy y lectura operativa mínima;
- tests de constraints, tenant-negative y defaults;
- gate Prisma + migración development segura + API.

C1 no puede enviar mensajes: no existe planner ejecutable, scheduler, worker,
adapter concreto, provider SDK, callback HTTP ni endpoint “enviar ahora”.

### C2 — Planner e idempotencia ✅

- planner determinístico invocable con `now`, ventana/lookback, timezone,
  PRE/DUE/POST, agrupación por destinatario/evento/vencimiento e
  `occurrenceSetHash`;
- elegibilidad tenant-scoped de occurrences, renters, rutas y ContactPoints;
- planning issues deduplicadas y autorresolubles para fecha/importe/ruta/destino,
  sin convertir bloqueos de datos en fallos de provider;
- dispatches N:M y deliveries independientes EMAIL/WHATSAPP en `PENDING`, con
  snapshots lógicos `PENDING_C3`; no existe render final, adapter ni envío;
- revalidación previa al primer intento, exclusión parcial auditable e
  inmutabilidad posterior al primer attempt;
- claim compare-and-set mediante leases, release controlado y persistencia del
  schedule técnico inicial/+5m/+30m/+2h, sin crear éxitos ni llamar providers;
- runner development protegido: dry-run por defecto, escritura sólo con
  `--apply`; el claim también exige `--apply` y libera el lease por defecto;
- pruebas de repetición/restart, concurrencia, timezone, toggles, agrupación,
  múltiples renters, EMAIL/WhatsApp, SMS ignorado, issues, fulfillments,
  revalidación parcial, reversal, leases, retries y tenant isolation.

C2 no agrega schema ni migración. La migración C1 contiene todos los campos e
índices requeridos.

### C3A — MailerSend Email ✅

- adapter HTTP concreto, sin SDK adicional, detrás del puerto Email;
- renderer transaccional versionado con HTML/text, subject determinístico y
  `showAmount` respetado;
- flujo `claim → revalidate → render → snapshot → attempt → provider` y retries
  sobre snapshot inmutable;
- aceptación MailerSend normalizada a `SENT` con `providerMessageId`, nunca a
  `DELIVERED`;
- webhook sobre raw body con HMAC SHA-256, deduplicación DB y estados
  monotónicos;
- errores de configuración, autenticación, rate limit, validación, red y fallo
  temporal normalizados sin persistir respuestas crudas;
- variables runtime platform-wide:
  `MAILERSEND_API_TOKEN`, `MAILERSEND_FROM_EMAIL`,
  `MAILERSEND_FROM_NAME`, `MAILERSEND_WEBHOOK_SIGNING_SECRET`;
- runner development limitado a un delivery, preview enmascarada y envío sólo
  con `--apply --send` y `MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT` exacto.

El cierre operacional en `rental-management-dev` validó un outbound real
MailerSend `202`, recepción correcta del email y callbacks reales
`activity.sent` y `activity.delivered`, ambos verificados por HMAC y aplicados
sin duplicados ni errores. El delivery avanzó de `SENT` a `DELIVERED` con dos
`WebhookReceipt`. Gmail no produjo `activity.opened` ni
`activity.opened_unique` durante la ventana observada; esto no invalida el
circuito porque el tracking de apertura es best-effort.

El comando es
`npm run db:dev:reminder-email -- --tenant-id=<tenant> --delivery-id=<delivery>`;
sin flags mutantes sólo muestra la preview. El único envío posible exige agregar
simultáneamente `--apply --send`.

C3A no agrega schema/migración, scheduler productivo, consumo masivo, endpoint
tenant “enviar ahora”, Admin ni Meta. La activación externa del webhook requiere
configurar su signing secret en el runtime development.

### C3B — Meta WhatsApp + Inbound V1 ✅

- Meta adapter y template aprobado;
- procesamiento y webhook verificado de WhatsApp;
- pruebas contractuales con sandbox/mocks primero y **validación UAT real posterior** (ver "Evidencia UAT real del cierre" abajo).

Implementado además:

- migración `202609210002_rental_communications_c3b`, sin backfill;
- adapter HTTP oficial y renderer WhatsApp versionado;
- selección explícita de template, idioma y parámetros; `hello_world/en_US`
  queda disponible únicamente como template de prueba sin parámetros y no como
  regla Rental;
- runner `npm run db:dev:reminder-whatsapp -- --tenant-id=<tenant>
--delivery-id=<delivery> --template-name=<name>
--template-language=<language> --template-parameters=none|rental-v1`, con
  preview enmascarada por defecto y envío sólo bajo `--apply --send` más
  allowlist E.164 exacta;
- reset manual de un delivery en dead-end (tras corregir la causa externa) vía
  `npm run db:dev:reminder-reset -- --tenant-id=<tenant>
--delivery-id=<delivery> --apply`: elegibles `FAILED` o `PROCESSING` con
  lease vencido y sin attempt activo; transición atómica tenant-scoped a
  `PENDING` (`nextAttemptAt=now`, `statusSource=INTERNAL`), compare-and-set
  (impide resets concurrentes y no roba attempts en vuelo — `IN_FLIGHT`),
  rechazo de `SENT/DELIVERED/READ/PENDING/...` y tope canónico de 4 attempts;
  reabre además el agregado: un Dispatch terminal vuelve a `READY` con
  `completedAt=null`; no toca rows de Attempt, de modo que el histórico de
  error (p. ej. `META_190`) queda intacto y el próximo envío crea un attempt
  nuevo (`attemptNumber = attemptCount + 1`) sobre el mismo Delivery sin
  reutilizar el anterior; sin `--apply` sólo valida y aborta;
- `GET /webhooks/communications/meta-whatsapp` para challenge y
  `POST /webhooks/communications/meta-whatsapp` con `X-Hub-Signature-256` sobre
  raw body, validación de WABA/Phone Number ID y fail-closed;
- estados `sent`, `delivered`, `read`, `failed` normalizados sobre receipts
  deduplicados, timestamps independientes y precedencia monotónica;
- read model interno paginado de inbound para C4, sin endpoint ni UI Admin.

Diseño inbound aprobado para C3B:

- `CommunicationInboundMessage` es una comunicación de plataforma tenant-scoped,
  no una entidad Rental ni un `WebhookReceipt`;
- deduplica por provider, cuenta y `providerMessageId`, guarda el remitente
  normalizado, tipo, texto nullable, metadata mínima, `receivedAt` y asociaciones
  opcionales a `ContactPoint`, `Contact`, `RentalContract` y
  `RentalReminderDelivery`;
- no persiste el payload Meta, no descarga media y no crea conversaciones,
  respuestas, fulfillments ni cambios contractuales;
- la correlación prioriza el `context.id` de una respuesta y luego un único
  delivery WhatsApp reciente al mismo destino. Sin esa evidencia, busca puntos
  PHONE activos/capaces por el número normalizado;
- sólo se asigna tenant cuando todas las evidencias inequívocas convergen en uno.
  Dentro de ese tenant, Contact, Contract y Delivery se completan únicamente si
  cada asociación es única; la ambigüedad deja la FK correspondiente en `null`;
- si el tenant no puede determinarse de forma inequívoca, el evento se acepta e
  informa como no mapeado, sin fabricar una fila cross-tenant;
- el modelo conserva mensajes individuales y puede evolucionar posteriormente
  hacia `Conversation → Messages` sin reescribir el historial.

#### Transformación del destinatario en la frontera Meta/WhatsApp

E.164 sigue siendo la representación canónica del dominio (ContactPoint, planner,
snapshots históricos y allowlist development se comparan siempre en E.164
canónico; no se adapta ningún dato persistido a Meta). La única excepción vive
en la frontera del provider (`MetaWhatsAppAdapter` → helper
`meta-whatsapp-recipient`), que deriva la forma que Meta espera usando
`libphonenumber-js` (sólo en `apps/api`) sin reglas posicionales propias.

- **Outbound AR**: `+54 9 11 3171-6941` → `54111531716941`. Se toma el formato
  nacional de libphonenumber (`011 15-3171-6941`), se quitan no-dígitos y el
  prefijo de troncal `0`, y se antepone el código de país `54`. Funciona con
  códigos de área AR variables (Buenos Aires 2 dígitos, Mendoza/Córdoba/La
  Plata 3 dígitos, Patagonia 4 dígitos) y fijos (Buenos Aires fijo
  `011 3171-6941` → `541131716941`). Si un número AR no puede
  parsearse/validarse con certeza, el envío **falla cerrado**
  (`VALIDATION`/`META_WHATSAPP_RECIPIENT_INVALID`, no retryable); nunca cae al
  fallback previo.
- **Outbound no-AR**: se conserva el comportamiento anterior (E.164 sin `+`);
  no se introducen reglas nuevas para BR/MX ni otros países.
- **Inbound**: el `from`/`wa_id` de Meta se normaliza de vuelta a E.164 canónico
  antes de `sameAddress`, la búsqueda de ContactPoint y la correlación con
  `destinationSnapshot`. La forma Meta argentina `54111531716941` correlaciona
  con el snapshot canónico `+5491131716941` sin modificar el historial.

`META_131030` no tiene semántica oficial confirmada en la tabla de errores de
Meta. Se normaliza como rechazo genérico del request: en el adapter a
`VALIDATION` y en webhook a `PROVIDER_UNAVAILABLE`, siempre con mensaje
sanitizado, sin atribuirle significado adicional (p. ej. "ventana de sesión").

#### Evidencia UAT real del cierre (C3B)

Gate cerrado operativamente con validación end-to-end real contra Meta Cloud API
(environment `development`, phone/WABA de prueba, token System User sin
caducidad `expires_at=0`, allowlist exacta del destinatario):

- **Outbound real validado**: el envío con la normalización AR provider-specific
  fue aceptado por Meta (Attempt #3 `ACCEPTED` con `providerMessageId` wamid y
  `latencyMs` medido), y el mensaje fue recibido físicamente por el destinatario
  autorizado. Evidencia previa inmediata de fallo por la forma E.164 sin
  transformar (Attempt #1 `META_190`, Attempt #2 `META_131030`) quedó corregida
  por el fix de frontera.
- **Requisito operativo descubierto**: además de la suscripción de la App
  (`callback_url` + campo `messages` activo, verificable vía
  `GET /{app-id}/subscriptions`), la App debe figurar en
  `/{WABA_ID}/subscribed_apps` de la WABA para que Meta entregue eventos. Este
  requisito quedó operado en development (alta idempotente de la App en la WABA,
  conservando la app DevX existente) y la App quedó suscripta con `messages`
  activo; no es una condición de código.
- **Inbound real validado end-to-end**: un mensaje manual real ("Prueba inbound
  Valorar 001") enviado desde el destinatario autorizado llegó por webhook y fue
  persistido. El `POST /webhooks/communications/meta-whatsapp` se recibió con
  firma **HMAC real válida** (app secret), WABA y Phone Number ID correctos, y
  el `from` normalizado de forma Meta → E.164 canónico. El mensaje se
  correlacionó con **ContactPoint**, **Contact** y **Contract** (ALQ-000001).
- **Delivery/Dispatch permanecen `null` ante ambigüedad, por diseño**: el
  inbound correlaciona Delivery sólo si existe exactamente un delivery reciente
  al mismo destino; con dos candidatos (delivery UAT `SENT` y delivery natural
  `PENDING`, mismo `destinationSnapshot`) la FK queda `null`, conservador e
  intencional.
- **El inbound no genera Fulfillment ni respuesta automática**: se confirmó con
  conteo real (0 fulfillments nuevos); el pipeline inbound sólo persiste y
  correlaciona.
- **`DELIVERED`/`READ` reales del Attempt #3 no fueron observados** porque el
  outbound ocurrió antes de corregir la suscripción WABA (`subscribed_apps`);
  los statuses del mensaje original no quedaron observados en la ventana de
  validación. **No es un fallo conocido del sistema**: el pipeline de receipts
  se validó por contrato y quedó listo para recibirlos una vez suscripta la App.
- **Observación técnica a alinear posteriormente, no blocker**: el campo
  `messages` quedó suscripto en la App en versión `v26.0` mientras la API
  outbound opera con `v25.0`. No impide la recepción de webhooks; se alineará en
  un sprint posterior.

### C4A.1 — Read Models/API de comunicaciones ✅

- read models Admin: historial por contrato (occurrences + deliveries +
  attempts, filtros `eventType`/`dispatchStatus`/`channel`), inbound
  (filtros `contractId`/`contactId` + ventana `[from, to)`) y summary del día
  local del tenant;
- API: `GET /rental-reminder-communications/contracts/:contractId/history`,
  `GET /rental-reminder-communications/inbound` y
  `GET /rental-reminder-communications/summary` bajo `rental.read`;
  `POST /rental-reminder-communications/deliveries/:id/retry` bajo
  `rental.reminder.manage` (200/404/409 con razón canónica);
- enmascaramiento de destinos y errores sanitizados; proyección de snapshots;
  excepción de PII funcional documentada para `externalReplyLink` (− no se
  loguea, `sender.address` sigue enmascarado);
- ventanas `[from, to)` validadas en Service y ventana diaria por
  `TenantSetting.timeZone` (default `America/Argentina/Buenos_Aires`);
- retry reutiliza la operación de dominio `manualResetFailedDelivery`; sin
  envíos sincrónicos;
- sin schema/migración/índices, sin permisos nuevos, sin UI Admin, sin C4B;
  gates verdes (tests focalizados, typecheck API, lint/prettier, `git diff
--check`).

### C4C — Fixture canónico de comunicaciones (tooling UAT visual) ✅

**Qué es**: fixture reproducible, idempotente y aislado para validar visualmente
los read models/API de C4A.1 y los flujos inbound de C4B desde
`/alquileres/comunicaciones` (UAT C4C.1). No es evidencia provider:
es un dataset sintético de UAT visual sobre la base de desarrollo aislada.

**Cómo se ejecuta** (siempre contra la DB dev, nunca la baseline):

```bash
npm run db:dev:rental-fixtures -w api          # dry-run: reporte JSON sin escribir
npm run db:dev:rental-fixtures -w api -- --apply  # aplica el dataset (idempotente)
npm run db:dev:rental-fixtures -w api -- --now 2026-09-23T14:30:00.000Z  # fecha explícita (opcional)
```

- Registrado en `db-development.ts` (comando `rental-fixtures`, mismo preflight
  `validateDevelopmentDatabaseTarget`); **no** integrado con `db:dev:seed`.
- El runner y el service revalidan el guard (exige `VALORAR_DATABASE_ENV=development`,
  rechaza el endpoint protegido `ep-mute-sun-ac6nva0v` y baseline/production).
- Dry-run por defecto (reporte JSON con counts + ids determinísticos); aplicar
  requiere `--apply` explícito.

**Alcance del dataset** (`--apply`):

- Sólo tenant demo (`cmudkzfa30000ewusey4pg6ov` / slug `demo`, resuelto por
  `DEMO_TENANT_SLUG`) y admin demo (`admin@demo.valorar.dev`, TENANT_ADMIN,
  resuelto por email + tenantId). Si falta el seed, falla con mensaje claro.
- Upserts (nunca se borran): `RentalReminderPolicy` por `tenantId`
  (3/ON/ON/3, `sendTimeMinutes` 600), `TenantSetting.timeZone` =
  `America/Argentina/Buenos_Aires`, `RentalContractSequence` =
  `max(existente, 1)`.
- Contrato `ALQ-000001` ACTIVE con término válido y referencias al catálogo Geo
  canónico (`Capital Federal` → `Palermo`), parties (renter primary + co-renter), rutas
  EMAIL+WHATSAPP (sólo renter), obligaciones RENT (due hoy) y EXPENSES (due
  hoy+3, `showAmount true`), occurrences, dispatches, deliveries y attempts con
  ids `fx-c4c-*`, más 1 planning issue OPEN (`NO_ENABLED_ROUTE` co-renter, sin
  rutas) y 3 inbound WhatsApp sintéticos (`fx-wamid-0001/0002/0003`).
- Comunicaciones: PRE_DUE → EMAIL DELIVERED + WHATSAPP DELIVERED (dispatch
  COMPLETED); DUE → EMAIL SENT + WHATSAPP FAILED (dispatch
  PARTIALLY_COMPLETED). La delivery FAILED es retry-eligible (1 attempt < 4,
  attempt FAILED sanitizado `FIXTURE_SIMULATED`, sin attempts PROCESSING).
- Inbound: msg1 sin leer/sin ack; msg2 leído + ack por el admin demo
  (`acknowledgedById`); msg3 sin leer/sin ack **correlacionado por
  `deliveryId`** con la delivery WHATSAPP PRE_DUE (valida que el historial sólo
  cuenta respuestas ligadas por deliveryId, nunca correlación inventada).
  `deliveryId` null por diseño C3B en msg1/msg2; `statusSource` `INTERNAL` en
  todas las deliveries (sin evidencia provider, sin WebhookReceipt,
  `providerMessageId` null en deliveries/attempts).
- Timestamps relativos a la ejecución dentro del día local del tenant
  (10:00 `scheduledFor`, envíos/entregas/fail entre 10:00:45 y 10:03:30,
  inbound a las 08:45/09:10/10:45), coherentes con el summary 2/3/2/1/1/2 de
  `countCommunicationsSummary` (2 unacknowledged).
- Plan puro `buildRentalCommunicationsFixturePlan` con snapshots espejo del
  planner (`contentSnapshot` v1 `renderState:'PENDING_C3'`, `policySnapshot`,
  `recipientSnapshot`, keys de dominio via helpers compartidos).
- Idempotente: re-ejecución sobrescribe el mismo escenario; el cleanup borra
  sólo filas `fx-c4c-*` scoped `tenantId` (nunca datos ajenos).

**Abstención**: no ejecutar contra la baseline (`ep-mute-sun-ac6nva0v` — el
guard lo bloquea), no usar en producción, no imitar los ids/evidencia de los
fixtures provider efímeros C1–C3B (tenant de fixtures reales). El fixture no
genera Fulfillments ni respuestas automáticas inbound.

**Nota de fidelidad del planning**: el fixture persiste 1 solo planning issue
OPEN (curado por `occurrenceId` = occ-rent para la co-renter). Un planner real
detectaría 2 issues `NO_ENABLED_ROUTE` (uno por occurrence con obligación
RENT y otro por EXPENSES); se documenta la diferencia para no confundir UAT
visual con la salida del planner real.

**Cero evidencia provider**: `statusSource` `INTERNAL`, `providerMessageId`
null en deliveries/attempts, sintético `fx-wamid-*` en inbound; nada de llamadas
a Email/WhatsApp/webhooks externos.

### C4C.1 — Centro de comunicaciones Admin (historial + respuestas + atención) ✅ CLOSED

**Qué es**: conversión de `/alquileres/comunicaciones` (Admin) en centro
operativo con 3 tabs: **Historial de avisos** (default), **Respuestas recibidas**
y **Requieren atención**. El Historial es global por dispatch con filtros, sort
y paginación **server-side en la URL**; la fila abre un SidePanel con snapshots
congelados read-only.

**Read model nuevo (API)**:

- `GET /rental-reminder-communications/history` (global o filtrado por
  `contractId`, bajo `rental.read`): read-model puro; **no** reemplaza el
  endpoint per-contrato legacy `contracts/:contractId/history` (intacto). Fila =
  1 `RentalReminderDispatch` con canales agrupados
  (`deliveries`/`channels`/`responsesCount`).
- Sin payloads provider/metadata/secrets/enums crudos: destinos enmascarados,
  errores sanitizados, snapshots proyectados (`contentSnapshot`,
  `policySnapshot`, `recipientSnapshot`, refs de plantilla).
- `status` global del dispatch + detalles por delivery; estados multicanal vía
  el ÚNICO mapper `buildDispatchStatusSummary` (labels + badge mixto
  "1 entregado · 1 fallido") compartido entre tabla y panel.
- Respuestas: se correlacionan **sólo** por
  `CommunicationInboundMessage.deliveryId`; label "—" o 💬 conteo + pendientes.
- Retry elegible = delivery `FAILED` con `attemptCount < 4` **y** permiso
  `rental.reminder.manage` (botón "Reintentar" sólo para fallidos elegibles; la
  endpoint reprograma para el próximo ciclo, no envía).
- Query validada en Service: `search` (OR `internalNumber` + nombre del
  destinatario vía pre-query de Contact), ventanas `scheduledFrom/To` +
  `sentFrom/To` + `deliveredFrom/To` + `failedFrom/To` (bounds `*To`
  exclusivos), `eventType`/`status`/`channel`/`sortBy`/`sortOrder` en allowlist,
  `page`/`pageSize` (20/50/100, default 20). Sort default
  `scheduledFor desc` + tie-break `id desc`.

**Admin (`apps/admin`)**:

- `page.tsx`: la URL es la fuente de estado; tab default `history`; fetch por
  tab activo (summary siempre; history → `listRentalHistory`, inbound →
  `listRentalInbound`, attention → cola `retry-eligible` + issues **sólo** si
  `canManage`). `buildHistoryQuery(value)` traduce params crudos
  (`scheduledTo` día → ISO exclusivo vía `toExclusiveDayBound`; ISO ya
  exclusivo del KPI se reenvía).
- `communications-view.tsx`: tabs fijos `history(0)/inbound(1)/attention(2)` con
  URL estable; KPIs 3×2 con `href=buildHistoryQuickFilter(...)` (las 4 métricas
  de ventana → Historial con la ventana **real** del día local; planning →
  atención; sin atender → Respuestas con `unacknowledged=true`) + hint con la
  fecha/hora de la ventana. Panel inbound elevado al view; panel history
  autónomo.
- `communications-history.tsx`: FilterBar (búsqueda "Buscar por contrato o
  destinatario..." con debounce 350ms, DatePicker Desde/Hasta, selects
  Estado/Canal/Evento, pageSize), columnas ▾ persistidas en localStorage
  (`valar:rental-communications:history:columns`, aplicadas post-mount para
  SSR-safe; **Fecha/hora, Estado y Acciones inmutables**; responsive
  `hidden sm/md/lg:table-cell`), sort server-side con allowlist
  `scheduledFor|internalNumber|status|eventType`, paginación 20/50/100,
  chips de filtros activos (label del día inclusive para bounds `*To`), ⋯
  (Ver detalle / Ver contrato / Reintentar si elegible) y **row-click abre el
  SidePanel** con `stopPropagation` en links/buttons (a11y: `tr onClick`).
- `communications-history-panel.tsx`: SidePanel read-only con snapshots
  congelados (destinatarios completos, conceptos con fecha/importe, política
  formateada, entregas por canal con timestamps/intentos/error, contenido y
  plantilla de la momnto de planeo, respuestas del delivery). Reintento
  delegado con ConfirmModal + toasts.
- Reintento espeja C4B (attention): `retryDeliveryAction` +
  `retryDeliveryFeedback` + `router.refresh()`.
- Tab **Respuestas recibidas**: lista inbound de C4B (mark read / acknowledge
  por mensaje); tab **Requieren atención**: cola manage-only (retry de
  deliveries fallidas + planning issues).

**Gates**: tests focalizados (API 66 → 703 totales repo API con fixture,
Admin 30 lib + 9 UI), typecheck API/Admin/shared-types/ui/icons, lint y
prettier, build Admin, `git diff --check`. **UAT funcional y visual aprobado**:
escenarios de Historial, Respuestas recibidas y Requieren atención.

### C4C.2 — Comunicaciones dentro del contrato ✅ CLOSED

- El detalle de `/alquileres/:id` incorpora el tab **Comunicaciones** mediante
  `?tab=communications`. `?tab=history` conserva exclusivamente el historial de
  eventos y cambios del contrato.
- La UI contractual consume el read model global:
  `GET /rental-reminder-communications/history?contractId=:contractId`.
  `contractId` se combina siempre con `tenantId` en el repositorio; el endpoint
  contractual legacy `contracts/:contractId/history` permanece intacto.
- Se reutilizan `RentalDispatchHistoryItem`, `CommunicationsHistory`,
  `CommunicationsHistoryPanel`, snapshots, respuestas correlacionadas, retry y
  las acciones RBAC existentes. En scope contractual se ocultan contrato,
  búsqueda global, ventanas de delivery y acciones de atención global.
- Filtros contractuales: estado, canal, evento y ventana `scheduledFrom` /
  `scheduledTo`; sorting y paginación continúan siendo server-side y gobernados
  por URL, con default `scheduledFor DESC` y páginas 20/50/100.
- El selector de columnas usa una preferencia localStorage separada para evitar
  que la configuración global exponga la columna Contrato en esta vista. El
  SidePanel omite el link contractual redundante, pero conserva el
  `internalNumber` en su encabezado.
- Empty state contractual: “Todavía no hay comunicaciones registradas para este
  contrato.” No se agregaron schema, migraciones, fixtures, providers, scheduler,
  policy UI ni permisos nuevos.
- UAT funcional y visual aprobado: navegación entre tabs, filtros y URL state,
  sorting, paginación, columnas, empty/error states, SidePanel, snapshots,
  respuestas, retry y permisos `rental.read` / `rental.reminder.manage`.

### C4C.3 — Configuración administrativa de avisos ✅ CLOSED

- La policy tenant-wide se administra desde
  `/alquileres/comunicaciones/configuracion`, accesible mediante la acción
  **Configurar avisos** del Centro de Comunicaciones, sin agregar un quinto tab
  al `RentalModuleNav`.
- `GET /rental-reminder-policy` requiere `rental.read` y
  `PUT /rental-reminder-policy` requiere `rental.reminder.manage`. El `PUT`
  conserva reemplazo completo, `404` cuando no existe policy y aislamiento por
  tenant; no se agregó `PATCH` ni lazy-create.
- La UI configura exclusivamente `PRE_DUE`, `DUE` y `POST_DUE`, conserva los
  offsets al deshabilitar eventos y convierte `HH:mm` exactamente a
  `sendTimeMinutes`. La zona efectiva de `TenantSetting` se muestra como
  informativa y no se modifica desde esta pantalla.
- El guardado no envía mensajes ni cancela dispatches materializados. La UI
  comunica que los cambios aplican a próximas ejecuciones de planificación y que
  los avisos ya planificados pueden conservarse según su estado operativo.
- No se agregaron schema, migraciones, actor/versionado/auditoría, Stepper,
  providers ni scheduler. El copy contractual de “Avisos configurados” ahora
  remite las reglas de cuándo avisar a Comunicaciones.
- UAT funcional y visual aprobado: navegación, lectura y modo read-only,
  switches, offsets, horarios `00:00`/`23:59`, timezone informativa,
  persistencia, toast, errores localizados y ausencia de envíos al guardar.

### C4 — Admin y operación

- policy tenant-wide;
- historial contractual de comunicaciones: **read models/API implementados en C4A.1**; falta la UI/Admin;
- retry manual con RBAC: **endpoint implementado en C4A.1** (opera sobre la misma operación de dominio);
- métricas/alertas;
- señales hacia `Notification` sólo si ese sistema ya existe o en su fase propia.

Cada fase mantiene Email y WhatsApp independientes, SMS oculto y providers fuera del dominio. Ninguna fase posterior se inicia automáticamente.

## 20. Registro de decisiones

### CLOSED

- Email + WhatsApp son canales V1; SMS no opera.
- MailerSend y Meta Cloud API son adapters iniciales.
- policy única por tenant, editable, con defaults 3 días antes / día ON / 3 después / 10:00.
- timezone existente de `TenantSetting`.
- rutas, ContactPoint y flags existentes siguen siendo fuente de verdad.
- agrupación por tenant + contrato + destinatario + evento + `dueDate`.
- dispatch lógico y delivery independiente por canal.
- idempotencia protegida por claves/constraints DB y leases.
- revalidación previa, snapshots inmutables y bloqueos separados de fallos provider.
- retries inicial, +5m, +30m y +2h.
- el reset manual de un delivery `FAILED` reabre el mismo Delivery a `PENDING`
  creando un attempt nuevo y conservando el histórico de Attempts;
- templates versionados en código, sin CMS ni template en contrato.
- payloads crudos de provider no se persisten.
- ventana planner solapada de siete días y lookahead de cinco minutos.
- credenciales MailerSend/Meta platform-wide en environment/secret store, nunca en PostgreSQL ni Admin tenant;
- snapshots limitados a destino/canal, subject nullable, render efectivo, occurrences/conceptos/importes/fechas y referencias no secretas;
- no se persisten payloads crudos de provider;
- C1 conserva historial sin purga automática.
- webhook Meta validado en UAT real: firma HMAC real, WABA/Phone correctos,
  inbound `text` persistido y correlacionado con ContactPoint/Contact/Contract.
- requisito operativo de `/{WABA_ID}/subscribed_apps` documentado y operado en
  development (la App debe figurar suscripta para recibir eventos);
- `DELIVERED`/`READ` reales del mensaje UAT no observados por precedencia de la
  suscripción WABA (no es fallo del sistema); campo `messages` suscripto en la
  App en `v26.0` vs API outbound `v25.0` queda como alineación técnica futura.
- C4A.1 (read models/API de comunicaciones): historial por contrato con
  channel filter (dispatches y sus deliveries restringidos al canal), inbound
  enmascarado con `externalReplyLink` como PII funcional documentada (no se
  loguea; nada más del remitente se expone), summary del día local del tenant
  y retry `POST` 200/404/409 reutilizando la operación de dominio. Sin schema,
  migración, índices, permisos nuevos ni UI Admin en este alcance.

### OPEN

- scheduler/mecanismo de ejecución desplegado: worker background Railway o job autenticado equivalente; el runner core y el comando development quedaron cerrados en C2;
- nombre, idioma y aprobación del template Meta productivo (el test WABA sólo
  ofrece templates de prueba; la selección permanece configurable);
- activación externa y prueba controlada de MailerSend en runtimes distintos
  del development local ya validado, condicionadas a su configuración segura;

### DEFER

- SMS;
- override por contrato;
- CMS/editor de templates;
- proveedores alternativos y fallback automático entre providers;
- preferencias personales de notificación;
- campañas/manual free-form;
- implementación del sistema global `Notification`.
- política avanzada de retención/purga;
- cifrado application-level de snapshots; no se diseñará criptografía propia.
