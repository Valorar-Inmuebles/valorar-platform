# Rental Management V1.1 — Diseño de datos

Versión: V1.1

Estado: **implementación parcial**. A, B, B.1, Rental V1.1 Fases 1–3 y Communications V1 C1–C3B están implementados. C4 permanece pendiente.

Reglas funcionales canónicas: `docs/04-modules/rental-management-v1.md`.

## 1. Convención de estado

- **IMPLEMENTADO**: presente en el schema y migraciones actuales.
- **APROBADO / PENDIENTE**: diseño objetivo cerrado, todavía sin schema ni migración.
- **DEFER**: fuera de las próximas fases.

Este documento describe tanto el baseline como el objetivo. `docs/03-database/current-schema.md` es la única descripción del schema efectivamente migrado y no debe anticipar modelos futuros.

## 2. Baseline implementado

### Migración A

**IMPLEMENTADO**:

- `Contact`;
- `ContactPoint`;
- `RentalConcept`;
- `RentalContract`;
- `TenantSetting.timeZone`;
- conceptos base tenant-scoped.

### Migración B

**IMPLEMENTADO**:

- `RentalObligation`;
- `RentalObligationOccurrence`;
- `RentalFulfillment`;
- materialización idempotente;
- cumplimiento y reversión transaccionales;
- `OVERDUE` derivado.

### Refinamiento B.1

**IMPLEMENTADO**:

- dirección contractual estructurada con referencias geo opcionales y snapshots;
- `RentalContractParty` con múltiples roles `RENTER` y `LANDLORD`;
- `RentalContractNotificationRoute` por parte, canal y punto de contacto;
- `Contact.documentType` y `Contact.documentNumber` opcionales;
- backfill de las partes singulares previas;
- retiro del modelo singular de partes.

B.1 persiste configuración de rutas, pero no envía comunicaciones.

### Rental V1.1 — Fase 1

**IMPLEMENTADO**:

- `RentalContractSequence` y `RentalContract.internalNumber`;
- autorrelación de renovación mediante `previousContractId`;
- `RentalContractParty.isPrimary`;
- `ContactDocumentType` canónico;
- activación con fin obligatorio, mes calendario mínimo y renter primary;
- diff/upsert estable de partes y rutas;
- renovación transaccional y sucesor único.

## 3. Modelo objetivo V1.1

```txt
Tenant
├── Contact
│   └── ContactPoint
├── RentalConcept
├── RentalContractSequence
├── RentalContract
│   ├── Property? + dirección contractual histórica
│   ├── RentalContractParty[] ── Contact
│   │   └── RentalContractNotificationRoute[] ── ContactPoint
│   ├── RentalObligation[] ── RentalConcept
│   │   ├── RentalRentValueRevision[]
│   │   └── RentalObligationOccurrence[]
│   │       └── RentalFulfillment[]
│   ├── RentalContractEvent[]
│   └── previousContract? / renewedContract?
└── Notification[] ── User recipient
```

`RentalContractSequence`, `previousContractId` e `isPrimary` están **IMPLEMENTADOS en Fase 1**. `RentalRentValueRevision`, reglas de obligations y vencimientos manuales están **IMPLEMENTADOS en Fase 2**. `RentalContractEvent` y los read models operativos están **IMPLEMENTADOS en Fase 3**. Communications C1–C3B están implementadas; `Notification` y C4 siguen **APROBADOS / PENDIENTES**.

## 4. Contact

Identidad de una persona externa dentro del tenant. No representa a un usuario del sistema.

### Baseline

**IMPLEMENTADO**:

| Campo            | Regla                          |
| ---------------- | ------------------------------ |
| `tenantId`       | Obligatorio                    |
| `name`           | Obligatorio                    |
| `documentType`   | `ContactDocumentType` opcional |
| `documentNumber` | Texto opcional                 |
| `notes`          | Opcional                       |
| `isActive`       | Baja lógica                    |

No existe unicidad global de documento.

### Tipos canónicos

**IMPLEMENTADO en Fase 1**: `documentType` utiliza valores canónicos:

```txt
DNI
CUIT
CUIL
PASSPORT
```

La UX traduce `PASSPORT` como “Pasaporte”. La normalización no debe inferir que dos contactos con igual documento son la misma persona entre tenants.

## 5. ContactPoint

**IMPLEMENTADO**:

| Campo                | Regla                           |
| -------------------- | ------------------------------- |
| `tenantId`           | Obligatorio                     |
| `contactId`          | Contacto propietario            |
| `type`               | `EMAIL` o `PHONE`               |
| `value`              | Valor visible                   |
| `normalizedValue`    | Valor normalizado para búsqueda |
| `label`              | Opcional                        |
| `isDefault`          | Sugerencia por tipo             |
| `isActive`           | Estado operativo                |
| `canReceiveWhatsapp` | Capacidad del teléfono          |
| `canReceiveSms`      | Capacidad del teléfono          |

El default pertenece al contacto y al tipo. No representa la selección contractual de avisos.

## 6. RentalConcept

**IMPLEMENTADO**: catálogo tenant-scoped para `RENT`, expensas, servicios y conceptos personalizados.

`systemCode != null` identifica conceptos base. La obligación `RENT` es la única fuente de verdad técnica del alquiler.

## 7. RentalContract

### 7.1 Baseline

**IMPLEMENTADO**:

- pertenencia obligatoria a tenant;
- referencia opcional a `Property`;
- referencias geo opcionales;
- snapshots de país, provincia, localidad, barrio, calle, número, piso, unidad, código postal y notas;
- resumen `propertyAddressSnapshot`;
- fechas contractuales;
- estados `DRAFT`, `ACTIVE`, `ENDED`, `CANCELLED`;
- creador opcional y timestamps;
- múltiples partes y obligaciones.

La dirección contractual es independiente de `Property` y constituye la fuente histórica.

### 7.2 Identidad correlativa

**IMPLEMENTADO en Fase 1**:

| Campo            | Tipo conceptual | Regla                                      |
| ---------------- | --------------- | ------------------------------------------ |
| `internalNumber` | String          | Formato `ALQ-000001`, inmutable y buscable |

Constraints mínimos:

- `UNIQUE (tenantId, internalNumber)`;
- formato DB `ALQ-` + seis dígitos;
- trigger DB que impide modificarlo;
- el valor no se reutiliza después de cancelaciones o borrados administrativos.

### 7.3 Renovación

**IMPLEMENTADO en Fase 1** mediante autorrelación opcional:

| Campo                | Regla                              |
| -------------------- | ---------------------------------- |
| `previousContractId` | Contrato anterior del mismo tenant |

`previousContractId` es único por tenant para impedir más de un sucesor directo. La creación del sucesor y el reclamo de esa relación se realizan en una única transacción concurrent-safe.

La renovación sólo parte de `ACTIVE` o `ENDED`; el sucesor siempre nace `DRAFT`, obtiene un nuevo número, comienza el día siguiente al fin del contrato anterior y deja `endsOn` incompleto para edición.

### 7.4 Activación objetivo

**IMPLEMENTADO en Fase 1**: la transición a `ACTIVE` valida:

- `startsOn` y `endsOn` presentes;
- `endsOn > startsOn`;
- `endsOn >= startsOn + 1 mes calendario`, con clamp al último día del mes;
- al menos una parte `RENTER` activa;
- exactamente una parte `RENTER` primaria;
- una obligación `RENT` válida.

El estado `DRAFT` puede permanecer incompleto.

## 8. RentalContractSequence

**IMPLEMENTADO en Fase 1**: secuencia tenant-scoped para numeración contractual.

| Campo       | Tipo conceptual | Regla                        |
| ----------- | --------------- | ---------------------------- |
| `tenantId`  | String          | PK/FK a tenant               |
| `lastValue` | Int             | Último correlativo reservado |
| `updatedAt` | DateTime        | Auditoría técnica            |

Algoritmo concurrent-safe:

1. iniciar la transacción de creación;
2. crear la fila del tenant si todavía no existe mediante upsert seguro;
3. ejecutar un incremento atómico de `lastValue` y obtener el valor resultante;
4. derivar `internalNumber` con padding de seis dígitos;
5. insertar el contrato protegido por la constraint única tenant-scoped;
6. confirmar la transacción.

No se usa `COUNT(*) + 1`, `MAX(...) + 1` sin bloqueo ni cálculo en memoria. Un valor reservado no se reasigna; se priorizan unicidad y no reutilización sobre una secuencia sin huecos.

## 9. RentalContractParty

### Baseline

**IMPLEMENTADO**:

| Campo        | Regla                                       |
| ------------ | ------------------------------------------- |
| `tenantId`   | Obligatorio                                 |
| `contractId` | Contrato                                    |
| `contactId`  | Contacto activo del mismo tenant al asociar |
| `role`       | `RENTER` o `LANDLORD`                       |

La combinación `(contractId, contactId, role)` es única. Puede haber múltiples contactos por rol. Los propietarios son opcionales.

### Referente administrativo

**IMPLEMENTADO en Fase 1**:

| Campo       | Tipo conceptual | Regla                                   |
| ----------- | --------------- | --------------------------------------- |
| `isPrimary` | Boolean         | Sólo aplica a `RENTER`; default `false` |

Constraints:

- una parte `LANDLORD` no puede ser primaria;
- como máximo una parte `RENTER` primaria por contrato, reforzada con índice único parcial o mecanismo equivalente;
- `ACTIVE` exige exactamente una parte `RENTER` primaria.

`isPrimary` identifica al referente administrativo, no al único destinatario de avisos.

La edición se implementa por diff/upsert:

- conservar filas e IDs sin cambios;
- actualizar sólo atributos modificados;
- crear sólo partes nuevas;
- eliminar sólo asociaciones retiradas;
- validar en la misma transacción el referente principal y sus rutas.

## 10. RentalContractNotificationRoute

### Baseline

**IMPLEMENTADO**:

| Campo             | Regla                                 |
| ----------------- | ------------------------------------- |
| `tenantId`        | Obligatorio                           |
| `contractPartyId` | Parte contractual                     |
| `channel`         | `EMAIL`, `WHATSAPP` o `SMS`           |
| `contactPointId`  | Punto activo del contacto de la parte |
| `isEnabled`       | Habilitación de la ruta               |

La combinación `(contractPartyId, channel)` es única. El punto seleccionado debe soportar el canal.

La ruta expresa `Contrato + Persona + Canal`; nunca una preferencia global de `Contact`.

### Edición estable

**IMPLEMENTADO en Fase 1**: la edición usa diff/upsert para preservar IDs estables y rutas sin cambios.

Varias rutas pueden estar habilitadas simultáneamente. Ser parte primaria no modifica automáticamente las rutas.

## 11. RentalObligation

### 11.1 Baseline

**IMPLEMENTADO**:

| Campo                | Regla                                 |
| -------------------- | ------------------------------------- |
| `kind`               | `RECURRING` o `ONE_TIME`              |
| `recurrenceMonths`   | Intervalo mensual para recurrentes    |
| `dueDay`             | Día fijo 1–31                         |
| `amountMode`         | `FIXED` o `VARIABLE`                  |
| `defaultAmount`      | Importe base opcional según modalidad |
| `currency`           | Obligatoria                           |
| `startsOn`, `endsOn` | Vigencia                              |
| `isActive`           | Estado operativo                      |

La occurrence aplica clamp al último día calendario cuando el mes no contiene `dueDay`.

### 11.2 Recurrencia y vigencia

**IMPLEMENTADO en Fase 2**: `recurrenceMonths` acepta 1–12. La UX ofrece presets y el backend acepta cualquier entero del rango.

La vigencia admite fecha final específica o “hasta fin del contrato”. La representación elegida deberá diferenciar esa intención sin duplicar fechas silenciosamente.

### 11.3 Política de vencimiento

**IMPLEMENTADO en Fase 2**:

```txt
FIXED_DAY
MANUAL_PER_PERIOD
```

- `FIXED_DAY` requiere `dueDay` entre 1 y 31.
- `MANUAL_PER_PERIOD` no fabrica fecha; cada occurrence puede quedar con `dueDate = null` hasta ser completada.

### 11.4 Configuración previa a avisos

**IMPLEMENTADO en Fase 2**:

| Campo             | Tipo conceptual | Regla                                   |
| ----------------- | --------------- | --------------------------------------- |
| `includeInNotice` | Boolean         | Incluye la obligación en futuros avisos |
| `showAmount`      | Boolean         | Muestra el importe en futuros avisos    |

Constraint:

```txt
showAmount = false OR includeInNotice = true
```

Al deshabilitar `includeInNotice`, el servicio fuerza `showAmount = false` en la misma operación.

Defaults para contratos nuevos:

- `RENT`: `true / true`;
- adicionales: elección explícita durante configuración, sin asumir inclusión.

Backfill:

- `RENT`: `true / true`;
- cualquier otra obligación: `false / false`.

### 11.5 Configuración específica de RENT

**IMPLEMENTADO en Fase 2**: la obligación `RENT` tiene pago mensual y un intervalo nullable de actualización. Nuevas activaciones exigen 1–12; `null` sólo representa configuración pendiente en DRAFT o ACTIVE legacy migrado.

La moneda queda fijada para el flujo ordinario de revisiones. Un cambio de moneda requiere una modificación contractual excepcional separada.

## 12. RentalRentValueRevision

**IMPLEMENTADO en Fase 2**: historial append-only de valores de la obligación `RENT`.

| Campo           | Tipo conceptual     | Regla                                   |
| --------------- | ------------------- | --------------------------------------- |
| `id`            | String              | `cuid`                                  |
| `tenantId`      | String              | Obligatorio                             |
| `obligationId`  | String              | Debe apuntar a la obligación `RENT`     |
| `effectiveFrom` | `DateTime @db.Date` | Primer período/fecha efectiva           |
| `amount`        | Decimal(14,2)       | Mayor que cero                          |
| `currency`      | Currency            | Igual a la moneda contractual ordinaria |
| `recordedById`  | String?             | Usuario que registró el cambio          |
| `reason`        | String?             | Motivo opcional                         |
| `createdAt`     | DateTime            | Auditoría                               |

Constraints mínimos:

- único por `(obligationId, effectiveFrom)`;
- pertenencia tenant validada en backend y transacción;
- no se edita destructivamente una revisión efectiva; las correcciones deben conservar trazabilidad.

Operación específica y transaccional:

1. validar obligación `RENT`, moneda y fecha efectiva;
2. insertar la revisión;
3. actualizar el importe snapshot de occurrences con período no anterior a `effectiveFrom` y estado `PENDING`;
4. no tocar occurrences cumplidas, canceladas ni períodos anteriores;
5. dejar disponible el punto de integración con `RentalContractEvent`, todavía pendiente;
6. confirmar todo o revertir todo.

La próxima actualización se deriva de la última revisión efectiva más el intervalo de actualización; no necesita una fecha duplicada mutable.

Si existen varias revisiones futuras, cada occurrence usa la revisión más reciente cuyo `effectiveFrom` sea menor o igual al inicio de su período. Registrar una revisión intermedia recalcula ese rango sin pisar el rango de una revisión posterior. `defaultAmount` se mantiene como valor base de compatibilidad de la revisión cronológicamente más reciente; los snapshots operativos siempre se resuelven por vigencia.

## 13. RentalObligationOccurrence

### Baseline

**IMPLEMENTADO**:

- pertenencia a obligación y tenant;
- `periodKey` idempotente;
- `dueDate` persistida;
- snapshots de importe y moneda;
- estados `PENDING`, `FULFILLED`, `CANCELLED`;
- `OVERDUE` derivado, nunca persistido.

### Vencimiento manual V1.1

**IMPLEMENTADO en Fase 2**: `dueDate` es nullable para `MANUAL_PER_PERIOD`.

Una occurrence sin fecha definitiva:

- permanece operativa como “Fecha pendiente”;
- no se considera vencida;
- puede recibir fecha mediante una operación explícita;
- no usa fecha provisional.

Los importes variables también pueden permanecer pendientes hasta completarse.

## 14. RentalFulfillment

**IMPLEMENTADO**: evidencia auditable de cumplimiento total, con reversión y un único fulfillment vigente garantizado transaccionalmente.

La auditoría de fulfillment y reversal no se duplica dentro de `RentalContractEvent`; el historial de API puede proyectar ambas fuentes.

## 15. RentalContractEvent

**IMPLEMENTADO en Fase 3**: eventos contractuales append-only.

| Campo        | Tipo conceptual | Regla                                 |
| ------------ | --------------- | ------------------------------------- |
| `id`         | String          | `cuid`                                |
| `tenantId`   | String          | Obligatorio                           |
| `contractId` | String          | Contrato                              |
| `type`       | Enum            | Tipo de evento contractual            |
| `actorId`    | String?         | Usuario responsable                   |
| `occurredAt` | DateTime        | Instante del evento                   |
| `metadata`   | Json?           | Snapshot mínimo específico del evento |
| `createdAt`  | DateTime        | Auditoría técnica                     |

Tipos implementados: activación, finalización, cancelación, cambio efectivo de partes, revisión de alquiler y renovación. No existe backfill: el historial comienza con las operaciones ejecutadas desde Fase 3 y no inventa actores ni eventos históricos.

No se actualizan ni eliminan eventos mediante endpoints funcionales.

## 16. Notification global

**APROBADO / PENDIENTE**: entidad global del Admin, no exclusiva de Rental.

| Campo              | Tipo conceptual | Regla                         |
| ------------------ | --------------- | ----------------------------- |
| `id`               | String          | `cuid`                        |
| `tenantId`         | String          | Obligatorio                   |
| `recipientUserId`  | String          | Destinatario individual       |
| `type`             | String/enum     | Clasificación del evento      |
| `title`            | String          | Título visible                |
| `body`             | String          | Contenido visible             |
| `resourceType`     | String          | Tipo de recurso relacionado   |
| `resourceId`       | String          | ID del recurso relacionado    |
| `actionUrl`        | String?         | Navegación contextual         |
| `deduplicationKey` | String          | Idempotencia por destinatario |
| `readAt`           | DateTime?       | Estado leído/no leído         |
| `createdAt`        | DateTime        | Creación                      |

Constraints mínimos:

- único por `(tenantId, recipientUserId, deduplicationKey)`;
- destinatario perteneciente al tenant;
- persistencia por usuario, no por rol, para admitir preferencias futuras.

`Notification` no reemplaza toast ni historial contractual.

## 17. Communications V1 / Migración C

**C1 — PERSISTENCE FOUNDATION IMPLEMENTADA**.

La especificación canónica implementable vive en
`docs/04-modules/rental-communications-v1.md`. Define:

- policy tenant-wide con timezone existente;
- elegibilidad, bloqueos de planificación y agrupación;
- planner separado del procesamiento de deliveries;
- dispatch N:M occurrences, delivery independiente por canal y attempts auditados;
- claves determinísticas, constraints, leases y revalidación pre-envío;
- snapshots, retries, adapters MailerSend/Meta y webhooks;
- seguridad, RBAC, secretos, observabilidad y fases C1–C4.

C1 agregó policy, planning issues, dispatches, relación N:M con occurrences, deliveries, attempts y webhook receipts. Email y WhatsApp son los únicos canales operativos persistibles; SMS y el override por contrato quedan diferidos. Las partes, rutas, ContactPoint y flags existentes continúan siendo la fuente de verdad.

**C2 — PLANNER Y ORQUESTACIÓN NO ENVIABLE IMPLEMENTADOS**.

C2 incorpora el planner determinístico con timezone/ventana solapada,
agrupación e idempotencia; crea dispatches y deliveries `PENDING`, mantiene
planning issues, revalida el conjunto antes del primer attempt y permite
claim/release concurrency-safe mediante leases. Los snapshots lógicos permanecen
mutables sólo antes del primer attempt. No hay providers, templates finales,
attempts reales, webhooks HTTP, scheduler productivo ni envío.

**C3A — EMAIL/MAILERSEND IMPLEMENTADO**.

C3A agrega el renderer Email versionado, el adapter MailerSend, creación y
finalización transaccional de attempts, retries sobre snapshots congelados y el
webhook MailerSend HMAC/idempotente/monotónico. La aceptación del provider
produce `SENT`; no se considera `DELIVERED` sin evidencia posterior. Secretos y
sender se resuelven desde runtime, no PostgreSQL. El runner development permite
como máximo el delivery indicado y exige preview, `--apply --send` y un
destinatario allowlisted. No se agregó scheduler productivo ni procesamiento
masivo.

**C3B — META WHATSAPP + INBOUND V1 IMPLEMENTADO**.

C3B reutiliza el mismo pipeline de Delivery/Attempt y agrega adapter Meta HTTP,
template configurable, webhook GET/POST verificado, estados reales y
`CommunicationInboundMessage`. La correlación inbound sólo persiste un tenant y
asociaciones cuando son determinísticos; ambigüedad de Contact, Contract o
Delivery conserva la FK en `null`. No descarga media, no guarda payload crudo y
no produce respuestas, fulfillments ni cambios de contrato.

La API C1 expone `GET/PUT /rental-reminder-policy` y lecturas paginadas de planning issues, dispatches, deliveries y attempts bajo `rental.reminder.manage`. No existen endpoints de envío, retry, planner ni callbacks HTTP.

Las credenciales de MailerSend y Meta son platform-wide y se resolverán exclusivamente desde environment/secret store. PostgreSQL conserva sólo referencias no secretas y snapshots funcionales mínimos; nunca API keys, access tokens o payloads crudos. No hay purga automática y el cifrado application-level de snapshots permanece diferido.

## 18. Enums

### Implementados

```txt
ContactPointType
  EMAIL
  PHONE

ContactDocumentType
  DNI
  CUIT
  CUIL
  PASSPORT

RentalContractPartyRole
  RENTER
  LANDLORD

NotificationChannel
  EMAIL
  WHATSAPP
  SMS

RentalContractStatus
  DRAFT
  ACTIVE
  ENDED
  CANCELLED

RentalObligationKind
  RECURRING
  ONE_TIME

RentalAmountMode
  FIXED
  VARIABLE

RentalDueMode
  FIXED_DAY
  MANUAL_PER_PERIOD

RentalOccurrenceStatus
  PENDING
  FULFILLED
  CANCELLED

RentalFulfillmentStatus
  RECORDED
  REVERSED

RentalContractEventType
  ACTIVATED
  ENDED
  CANCELLED
  PARTIES_CHANGED
  RENT_VALUE_REVISED
  RENEWED
```

### Implementados en Communications C1

```txt
RentalReminderEventType
RentalReminderDispatchStatus
RentalReminderDeliveryStatus
RentalReminderAttemptStatus
RentalReminderStatusSource
RentalReminderPlanningIssueType
RentalReminderPlanningIssueStatus
RentalReminderDispatchOccurrenceStatus
RentalReminderWebhookReceiptStatus
```

Los valores y transiciones canónicos están en
`docs/04-modules/rental-communications-v1.md`. `Notification` conserva su diseño
global aprobado/pendiente. C1 no implementa procesos que ejecuten esas transiciones.

## 19. Invariantes multi-tenant

1. Toda entidad funcional contiene `tenantId`.
2. Toda referencia funcional se valida contra el mismo tenant en backend.
3. IDs provenientes del cliente nunca prueban pertenencia por sí solos.
4. Las transacciones que crean o renuevan contratos validan propiedad, partes, contactos, puntos y obligaciones dentro del tenant.
5. Una ruta sólo puede usar un punto activo perteneciente al contacto de su parte.
6. Una revisión sólo puede modificar occurrences de su propia obligación y tenant.
7. Una notificación interna sólo puede dirigirse a un usuario del tenant.
8. Catálogos geográficos globales son la excepción documentada y no convierten datos de negocio en globales.

## 20. Concurrencia y transacciones

Operaciones que requieren transacción y constraints de base:

- asignación del número contractual;
- activación y validación del inquilino principal;
- diff/upsert de partes y rutas;
- revisión de valor y actualización de occurrences pendientes;
- cumplimiento y reversión;
- renovación y reserva del sucesor único;
- creación idempotente de notificaciones.

Las validaciones de Service mejoran mensajes, pero no reemplazan constraints que protegen concurrencia.

## 21. Índices y restricciones objetivo

Además de los índices implementados, el diseño objetivo requiere:

| Propósito                  | Restricción/índice                                            |
| -------------------------- | ------------------------------------------------------------- |
| Código visible             | `UNIQUE (tenantId, internalNumber)`                           |
| Un sucesor directo         | `UNIQUE (tenantId, previousContractId)` cuando no sea null    |
| Parte no duplicada         | `UNIQUE (contractId, contactId, role)`                        |
| Máximo un renter principal | único parcial por contrato para `role = RENTER AND isPrimary` |
| Ruta por canal             | `UNIQUE (contractPartyId, channel)`                           |
| Revisión efectiva          | `UNIQUE (obligationId, effectiveFrom)`                        |
| Occurrence por período     | `UNIQUE (obligationId, periodKey)`                            |
| Historial por contrato     | `(tenantId, contractId, occurredAt DESC)`                     |
| Historial por tipo         | `(tenantId, contractId, type, occurredAt DESC)`               |
| Notificación idempotente   | `UNIQUE (tenantId, recipientUserId, deduplicationKey)`        |

La regla “exactamente un renter principal” para contratos activos necesita además validación transaccional, porque un índice parcial sólo garantiza el máximo.

Los constraints de Communications —group key, relación dispatch/occurrence,
delivery por canal, delivery/attempt keys, attempt ordinal, provider message y
webhook event— están implementados por la migración C1.

## 22. Backfills

**IMPLEMENTADOS en Fase 1**:

- contratos numerados por tenant según `createdAt ASC, id ASC`;
- secuencia de cada tenant inicializada en el máximo asignado;
- renter más antiguo por `createdAt ASC, id ASC` marcado primary;
- tipos documentales compatibles convertidos al enum canónico;
- IDs existentes de partes y rutas preservados;
- occurrences cumplidas o canceladas sin modificaciones.

**IMPLEMENTADOS en Fase 2**:

- revisión inicial de cada `RENT` con importe conocido, desde `startsOn` y preservando moneda;
- `RENT` sin importe en DRAFT preservado sin revisión inicial;
- `RENT` con `includeInNotice = true` y `showAmount = true`;
- demás obligaciones con ambos flags en `false`;
- `adjustmentIntervalMonths = null` preservado como configuración legacy pendiente.

**IMPLEMENTADO en Communications C1**:

- una `RentalReminderPolicy` por tenant existente con defaults ON/3/ON/ON/3/600;
- IDs determinísticos y `ON CONFLICT (tenantId) DO NOTHING`;
- ningún dispatch, delivery, attempt, issue o webhook receipt histórico fabricado.

Cada backfill deberá ser determinístico, reejecutable cuando corresponda y validado con consultas pre/post migración.

## 23. Estado de implementación V1.1

El orden exacto se resolverá en planes de implementación separados, respetando estas dependencias:

1. **Fase 1 implementada**: invariantes contractuales, numeración, documento canónico, referente principal, edición estable y renovación;
2. **Fase 2 implementada**: experiencia `RENT`, revisiones, reglas de occurrences, obligaciones adicionales y flags de aviso;
3. **Fase 3 implementada**: historial contractual y APIs/read models operativos;
4. notificaciones internas globales;
5. **C0 documentado**: arquitectura canónica de Communications V1;
6. **C1 implementada**: persistencia, policy, RBAC y lectura operativa mínima;
7. **C2 implementada**: planner, elegibilidad, idempotencia, revalidación y leases sin capacidad de envío;
8. **C3A implementada**: provider Email/MailerSend, attempts, retries y webhook;
9. **C3B implementada**: Meta/WhatsApp, webhook e inbound mínimo;
10. **C4 pendiente**: Admin y operación.

Los puntos 4 y 6 no están implementados por la sola existencia de esta documentación.

## 24. Decisiones diferidas

- contratos temporarios inferiores a un mes;
- índices automáticos IPC/ICL;
- cambio ordinario de moneda;
- asignación/scoping de contratos por agente;
- preferencias personales de notificación;
- portal externo de partes;
- firma y storage de documentos;
- scheduler productivo y procesamiento masivo de providers;
- SMS y override de policy por contrato;
