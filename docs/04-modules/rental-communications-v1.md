# Rental Communications V1

Estado: **C3A — MailerSend Email implementado; C3B–C4 pendientes**.

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
```

`PENDING`, `PROCESSING` y `SKIPPED` son internos. `SENT` puede originarse en la aceptación síncrona o en webhook; `DELIVERED` y `READ` provienen del provider cuando existen. `FAILED` puede ser respuesta permanente, agotamiento de retries o webhook terminal. `statusSource` distingue `INTERNAL`, `PROVIDER_RESPONSE` y `PROVIDER_WEBHOOK`.

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

| Operación                                      | Permiso                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| ver resumen contractual de comunicaciones      | `rental.read`                                            |
| ver destino completo, errores y operación      | `rental.reminder.manage`                                 |
| editar política tenant-wide                    | `rental.reminder.manage`                                 |
| retry manual de un delivery `FAILED` retryable | `rental.reminder.manage`                                 |
| configurar providers platform-wide             | futuro `platform.communication.manage`, sólo Super Admin |

`rental.reminder.manage` está implementado para `SUPER_ADMIN`, `TENANT_ADMIN` y `MANAGER`. El retry manual continúa pendiente; cuando se implemente deberá crear un nuevo Attempt sobre el mismo Delivery y respetar el máximo/política auditada.

API C1 implementada:

- `GET/PUT /rental-reminder-policy` para leer/actualizar transaccionalmente la policy del tenant;
- `GET /rental-reminder-communications/planning-issues`;
- `GET /rental-reminder-communications/dispatches`;
- `GET /rental-reminder-communications/deliveries`;
- `GET /rental-reminder-communications/deliveries/:id/attempts`.

Todas las lecturas operativas son tenant-scoped, paginadas y requieren
`rental.reminder.manage`. El resumen contextual, retry manual y endpoints de
webhook permanecen pendientes.

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

El comando es
`npm run db:dev:reminder-email -- --tenant-id=<tenant> --delivery-id=<delivery>`;
sin flags mutantes sólo muestra la preview. El único envío posible exige agregar
simultáneamente `--apply --send`.

C3A no agrega schema/migración, scheduler productivo, consumo masivo, endpoint
tenant “enviar ahora”, Admin ni Meta. La activación externa del webhook requiere
configurar su signing secret en el runtime development.

### C3B — Meta WhatsApp (pendiente)

- Meta adapter y template aprobado;
- procesamiento y webhook verificado de WhatsApp;
- pruebas contractuales con sandbox/mocks, sin production.

### C4 — Admin y operación

- policy tenant-wide;
- historial contractual de comunicaciones y operación de fallos;
- retry manual con RBAC;
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
- templates versionados en código, sin CMS ni template en contrato.
- payloads crudos de provider no se persisten.
- ventana planner solapada de siete días y lookahead de cinco minutos.
- credenciales MailerSend/Meta platform-wide en environment/secret store, nunca en PostgreSQL ni Admin tenant;
- snapshots limitados a destino/canal, subject nullable, render efectivo, occurrences/conceptos/importes/fechas y referencias no secretas;
- no se persisten payloads crudos de provider;
- C1 conserva historial sin purga automática.

### OPEN

- scheduler/mecanismo de ejecución desplegado: worker background Railway o job autenticado equivalente; el runner core y el comando development quedaron cerrados en C2;
- nombres, idioma y aprobación final del template Meta;
- activación externa del webhook MailerSend y prueba real controlada en cada
  runtime, condicionadas a secret/allowlist de development;

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
