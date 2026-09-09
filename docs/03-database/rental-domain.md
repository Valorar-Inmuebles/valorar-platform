# Rental Management — Diseño de datos

Versión: V1 — Migraciones A y B implementadas

Estado: **Migraciones A y B implementadas en Prisma, API y admin; Migración C permanece documentada y no implementada**.

Reglas funcionales canónicas: `docs/04-modules/rental-management-v1.md`.

---

## Propósito

Definir el modelo de datos mínimo para que una inmobiliaria pueda registrar un contrato de alquiler, materializar sus obligaciones por período, avisarlas y marcar su cumplimiento sin convertir Valorar en un sistema contable.

El flujo central es:

```txt
RentalContract
  → RentalObligation
    → RentalObligationOccurrence
      → RentalFulfillment
      → RentalReminderDispatchOccurrence
        → RentalReminderDispatch
          → RentalReminderDelivery
```

`Contact` y `ContactPoint` representan a las personas destinatarias. `RentalConcept` clasifica las obligaciones y `RentalReminderRule` define cuándo y por qué canales deben avisarse.

---

## Límites con dominios existentes

- `Property` representa el inmueble físico. Un contrato puede referenciar una sola `Property` del mismo tenant.
- `PropertyListing` y `PropertyPrice` describen la comercialización pública; nunca son la referencia contractual ni la fuente del importe de alquiler.
- El contrato conserva además un snapshot textual obligatorio del inmueble para preservar contexto histórico aun si la `Property` cambia o se archiva.
- `User` representa una identidad autenticada de la plataforma. Un inquilino o propietario se modela como `Contact`, aunque por evolución futura una misma persona pudiera tener también un `User`.
- `Lead` sigue siendo inquiry-centric. La consolidación futura con `Contact` requerirá un diseño específico y no forma parte de esta fase.
- `PropertyImage` no se reutiliza para contratos ni comprobantes.

---

## Entidades propuestas

Todas las entidades funcionales de este documento llevan `tenantId`, incluso las tablas puente y los registros de auditoría operativa.

### Contact

Persona o contraparte del tenant reutilizable por alquileres y por futuros dominios de clientes.

| Campo       | Tipo conceptual | Regla                                                               |
| ----------- | --------------- | ------------------------------------------------------------------- |
| `id`        | String          | `cuid`                                                              |
| `tenantId`  | String          | Obligatorio                                                         |
| `name`      | String          | Nombre visible obligatorio                                          |
| `notes`     | String?         | Notas internas                                                      |
| `isActive`  | Boolean         | Default `true`; se desactiva en lugar de eliminar si tiene historia |
| `createdAt` | DateTime        | Auditoría                                                           |
| `updatedAt` | DateTime        | Auditoría                                                           |

Restricciones e índices propuestos:

- Índices `[tenantId, name]` y `[tenantId, isActive]`.
- No imponer unicidad por nombre, email o teléfono: los duplicados se gestionarán con una política de consolidación futura.
- Un contacto referenciado históricamente no se elimina físicamente.

### ContactPoint

Medio de contacto perteneciente a un `Contact`.

| Campo                | Tipo conceptual    | Regla                                                   |
| -------------------- | ------------------ | ------------------------------------------------------- |
| `id`                 | String             | `cuid`                                                  |
| `tenantId`           | String             | Debe coincidir con el contacto                          |
| `contactId`          | String             | FK a `Contact`                                          |
| `type`               | `ContactPointType` | `EMAIL` o `PHONE`                                       |
| `value`              | String             | Valor ingresado para visualización                      |
| `normalizedValue`    | String             | Valor normalizado para comparación y envío              |
| `label`              | String?            | Ej.: personal, trabajo                                  |
| `isDefault`          | Boolean            | Default `false`; principal del tipo dentro del contacto |
| `isActive`           | Boolean            | Default `true`; habilitación operativa                  |
| `canReceiveSms`      | Boolean            | Default `false`; sólo válido para `PHONE`               |
| `canReceiveWhatsapp` | Boolean            | Default `false`; sólo válido para `PHONE`               |
| `createdAt`          | DateTime           | Auditoría                                               |
| `updatedAt`          | DateTime           | Auditoría                                               |

Reglas:

- Como máximo un punto activo default por contacto y tipo. Se garantiza en Service mediante una transacción, siguiendo el patrón existente de precio principal e imagen de portada; V1 no requiere un índice único parcial manual.
- `EMAIL` no admite capacidades SMS o WhatsApp.
- WhatsApp y SMS son capacidades de un teléfono, no tipos de teléfono duplicados.
- Índices `[tenantId, contactId]`, `[tenantId, type, normalizedValue]` y `[contactId, type, isDefault]`.
- Las preferencias o restricciones legales por canal podrán extender este modelo; no se define un centro de consentimiento en V1.

### RentalConcept

Catálogo configurable por tenant para clasificar obligaciones.

| Campo        | Tipo conceptual            | Regla                            |
| ------------ | -------------------------- | -------------------------------- |
| `id`         | String                     | `cuid`                           |
| `tenantId`   | String                     | Obligatorio                      |
| `systemCode` | `RentalConceptSystemCode`? | Presente sólo en conceptos base  |
| `name`       | String                     | Nombre visible                   |
| `slug`       | String                     | Identificador estable por tenant |
| `isActive`   | Boolean                    | Desactivación lógica             |
| `sortOrder`  | Int                        | Orden de UI                      |
| `createdAt`  | DateTime                   | Auditoría                        |
| `updatedAt`  | DateTime                   | Auditoría                        |

Códigos base estables:

```txt
RENT
EXPENSES
ELECTRICITY
GAS
ABL
AYSA
INSURANCE
```

Restricciones:

- `@@unique([tenantId, slug])`.
- `@@unique([tenantId, systemCode])`; PostgreSQL permite múltiples valores `null`.
- `systemCode != null` identifica un concepto base; `systemCode == null` identifica uno personalizado. No se persiste un booleano `isSystem` redundante.
- Los conceptos base conservan código y nombre en V1; el tenant puede activarlos o desactivarlos.
- Un concepto ya utilizado se desactiva, no se elimina.
- Los conceptos personalizados no usan `systemCode`.

Los conceptos base se crean mediante upsert idempotente por `[tenantId, systemCode]`: un backfill explícito cubre tenants existentes y el flujo transaccional de alta de tenant crea los siete defaults para tenants nuevos. No se utiliza catálogo global ni trigger PostgreSQL.

### RentalContract

Acuerdo operativo de alquiler. No reemplaza un documento legal ni representa una publicación.

| Campo                      | Tipo conceptual              | Regla                                                  |
| -------------------------- | ---------------------------- | ------------------------------------------------------ |
| `id`                       | String                       | `cuid`                                                 |
| `tenantId`                 | String                       | Obligatorio                                            |
| `propertyId`               | String?                      | Una `Property` opcional del mismo tenant               |
| `renterContactId`          | String?                      | Puede faltar en `DRAFT`; obligatorio para activar      |
| `landlordContactId`        | String?                      | Propietario informativo                                |
| `propertyAddressSnapshot`  | String                       | Referencia textual obligatoria                         |
| `propertyLocalitySnapshot` | String?                      | Localidad o barrio histórico                           |
| `propertyUnitSnapshot`     | String?                      | Piso, unidad o departamento                            |
| `propertyNotesSnapshot`    | String?                      | Aclaraciones de identificación                         |
| `startsOn`                 | `DateTime @db.Date`          | Inicio contractual                                     |
| `endsOn`                   | `DateTime? @db.Date`         | Fin contractual                                        |
| `status`                   | `RentalContractStatus`       | Default `DRAFT`; luego `ACTIVE`, `ENDED` o `CANCELLED` |
| `reminderGroupingMode`     | `RentalReminderGroupingMode` | `INDIVIDUAL` o `GROUPED`; se incorpora en Migración C  |
| `notes`                    | String?                      | Notas internas                                         |
| `createdById`              | String?                      | Usuario responsable, si aplica                         |
| `createdAt`                | DateTime                     | Auditoría                                              |
| `updatedAt`                | DateTime                     | Auditoría                                              |

Reglas:

- Un contrato referencia como máximo una `Property`; contratos multi-property quedan fuera de V1.
- La referencia textual siempre existe, incluso cuando hay `propertyId`.
- `propertyAddressSnapshot` y `startsOn` son obligatorios incluso en `DRAFT`; `renterContactId` es la única nulabilidad transitoria necesaria para completar el contrato antes de activarlo.
- El snapshot no se sincroniza automáticamente con cambios posteriores de `Property`.
- `ACTIVE` requiere inquilino activo, fechas válidas y una obligación activa con concepto `RENT` correctamente configurada. La fundación A difirió esta última validación y B ya la aplica.
- El propietario no participa en liquidaciones ni reglas financieras en V1.
- Índices `[tenantId, status]`, `[tenantId, renterContactId]`, `[tenantId, propertyId]` y `[tenantId, endsOn]`.

### RentalObligation

Regla contractual que genera uno o más vencimientos.

| Campo              | Tipo conceptual        | Regla                                                                                   |
| ------------------ | ---------------------- | --------------------------------------------------------------------------------------- |
| `id`               | String                 | `cuid`                                                                                  |
| `tenantId`         | String                 | Obligatorio                                                                             |
| `contractId`       | String                 | FK a `RentalContract`                                                                   |
| `conceptId`        | String                 | FK a `RentalConcept`                                                                    |
| `kind`             | `RentalObligationKind` | `RECURRING` o `ONE_TIME`                                                                |
| `recurrenceMonths` | Int?                   | Intervalo mensual simple para recurrentes                                               |
| `dueDay`           | Int?                   | Día 1–31 para recurrentes                                                               |
| `amountMode`       | `RentalAmountMode`     | `FIXED` o `VARIABLE`                                                                    |
| `defaultAmount`    | Decimal?               | `Decimal(14,2)`; obligatorio para importe fijo y nullable para variable aún desconocido |
| `currency`         | `Currency`             | `ARS` o `USD`; obligatoria en toda obligación V1                                        |
| `startsOn`         | `DateTime @db.Date`    | Inicio de vigencia                                                                      |
| `endsOn`           | `DateTime? @db.Date`   | Fin de vigencia opcional                                                                |
| `isActive`         | Boolean                | Habilitación de generación                                                              |
| `createdAt`        | DateTime               | Auditoría                                                                               |
| `updatedAt`        | DateTime               | Auditoría                                                                               |

Reglas:

- `RECURRING` requiere `recurrenceMonths >= 1` y `dueDay` entre 1 y 31.
- `ONE_TIME` no utiliza recurrencia; su fecha e importe efectivo viven en la ocurrencia materializada.
- `FIXED` requiere `defaultAmount > 0`. `VARIABLE` puede materializar una ocurrencia inicialmente sin importe, que debe completarse antes de notificar si el mensaje lo requiere. La moneda siempre está definida porque V1 sólo modela obligaciones monetarias.
- La obligación de alquiler usa el concepto base `RENT`; no se duplican importe ni recurrencia en `RentalContract`.
- Desactivar una obligación detiene nuevas ocurrencias y avisos, sin alterar las ya materializadas.
- Índices `[tenantId, contractId, isActive]` y `[tenantId, conceptId]`.

### RentalObligationOccurrence

Vencimiento materializado para un período determinado. Es la unidad operativa que se avisa y se cumple.

| Campo                | Tipo conceptual          | Regla                                                        |
| -------------------- | ------------------------ | ------------------------------------------------------------ |
| `id`                 | String                   | `cuid`                                                       |
| `tenantId`           | String                   | Obligatorio                                                  |
| `obligationId`       | String                   | FK a `RentalObligation`                                      |
| `periodKey`          | String                   | `YYYY-MM` para recurrentes; `ONE_TIME` para obligación única |
| `periodStartsOn`     | `DateTime? @db.Date`     | Inicio del período, si corresponde                           |
| `periodEndsOn`       | `DateTime? @db.Date`     | Fin del período, si corresponde                              |
| `dueDate`            | `DateTime @db.Date`      | Vencimiento según zona horaria del tenant                    |
| `amount`             | Decimal?                 | Snapshot `Decimal(14,2)`                                     |
| `currency`           | `Currency`               | Snapshot obligatorio de moneda                               |
| `status`             | `RentalOccurrenceStatus` | `PENDING`, `FULFILLED`, `CANCELLED`                          |
| `cancelledAt`        | DateTime?                | Auditoría de cancelación                                     |
| `cancelledById`      | String?                  | Usuario que canceló                                          |
| `cancellationReason` | String?                  | Motivo obligatorio al cancelar                               |
| `createdAt`          | DateTime                 | Auditoría                                                    |
| `updatedAt`          | DateTime                 | Auditoría                                                    |

Restricciones:

- `@@unique([obligationId, periodKey])` garantiza materialización idempotente.
- Para recurrentes, `periodKey` se obtiene del mes local del vencimiento; una obligación `ONE_TIME` materializa como máximo una ocurrencia.
- Índices `[tenantId, status, dueDate]`, `[tenantId, obligationId, dueDate]`.
- Una obligación `FIXED` materializa importe y moneda definidos; una `VARIABLE` materializa siempre la moneda y puede dejar `amount = null` hasta conocerlo.
- El importe y la moneda son snapshots: modificar la obligación no reescribe ocurrencias existentes.
- `OVERDUE` no se persiste. Se deriva cuando `status = PENDING` y `dueDate` es anterior a la fecha local actual del tenant.
- Una ocurrencia cancelada o cumplida no es elegible para nuevos avisos.

### RentalFulfillment

Registro auditable de que una ocurrencia fue cumplida y, si corresponde, de su reversión.

| Campo            | Tipo conceptual           | Regla                                    |
| ---------------- | ------------------------- | ---------------------------------------- |
| `id`             | String                    | `cuid`                                   |
| `tenantId`       | String                    | Obligatorio                              |
| `occurrenceId`   | String                    | FK a la ocurrencia                       |
| `status`         | `RentalFulfillmentStatus` | `RECORDED` o `REVERSED`                  |
| `fulfilledOn`    | `DateTime @db.Date`       | Fecha informada de cumplimiento          |
| `amount`         | Decimal?                  | Importe informado, sin parcialidad en V1 |
| `notes`          | String?                   | Observación                              |
| `origin`         | `RentalFulfillmentOrigin` | V1: `ADMIN`                              |
| `recordedById`   | String?                   | Usuario responsable                      |
| `reversedAt`     | DateTime?                 | Momento de reversión                     |
| `reversedById`   | String?                   | Usuario responsable de revertir          |
| `reversalReason` | String?                   | Obligatorio al revertir                  |
| `createdAt`      | DateTime                  | Auditoría                                |
| `updatedAt`      | DateTime                  | Auditoría                                |

Reglas:

- V1 no admite pagos parciales: una ocurrencia tiene como máximo un cumplimiento vigente, aunque puede conservar varios registros históricos revertidos.
- Registrar el cumplimiento y mover la ocurrencia a `FULFILLED` ocurre en una transacción que bloquea o revalida la ocurrencia `PENDING`; no se necesita unique parcial ni entidad separada de reversión.
- Revertir no elimina el registro: cambia a `REVERSED`, devuelve la ocurrencia a `PENDING` y exige motivo.
- La reversión vuelve a habilitar avisos sólo si la regla sigue activa y la ejecución correspondiente aún es válida; nunca reenvía automáticamente una entrega histórica.
- Índices `[tenantId, occurrenceId, status]` y `[tenantId, fulfilledOn]`.

### RentalReminderRule

Configuración que programa avisos antes, el día o después del vencimiento.

| Campo          | Tipo conceptual         | Regla                                                    |
| -------------- | ----------------------- | -------------------------------------------------------- |
| `id`           | String                  | `cuid`                                                   |
| `tenantId`     | String                  | Obligatorio                                              |
| `obligationId` | String                  | FK a `RentalObligation`                                  |
| `dayOffset`    | Int                     | Negativo antes, cero el día, positivo después            |
| `channels`     | `NotificationChannel[]` | Uno o más de `EMAIL`, `WHATSAPP`, `SMS`                  |
| `sendTime`     | `DateTime? @db.Time(0)` | Override opcional; si falta usa configuración del tenant |
| `isActive`     | Boolean                 | Habilitación operativa                                   |
| `createdAt`    | DateTime                | Auditoría                                                |
| `updatedAt`    | DateTime                | Auditoría                                                |

Reglas:

- Canal y proveedor son conceptos distintos.
- No existen valores combinados como `EMAIL_AND_WHATSAPP`.
- El array no puede quedar vacío ni contener duplicados; Service valida ambas reglas. No se crea una tabla puente de canales en V1.
- La combinación obligación, offset y hora no debe duplicarse dentro del tenant. Se valida en Service porque `sendTime = null` representa el default del tenant y un unique nullable no expresa correctamente la regla.
- Índices `[tenantId, obligationId, isActive]`.

### RentalReminderDispatch

Ejecución planificada e idempotente de uno o varios avisos compatibles.

| Campo             | Tipo conceptual                | Regla                                                                             |
| ----------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `id`              | String                         | `cuid`                                                                            |
| `tenantId`        | String                         | Obligatorio                                                                       |
| `contractId`      | String                         | Contrato del grupo                                                                |
| `renterContactId` | String                         | Destinatario lógico                                                               |
| `scheduledFor`    | DateTime                       | Instante UTC calculado desde la zona del tenant                                   |
| `groupingMode`    | `RentalReminderGroupingMode`   | `INDIVIDUAL` o `GROUPED`                                                          |
| `idempotencyKey`  | String                         | Clave determinística                                                              |
| `status`          | `RentalReminderDispatchStatus` | `PLANNED`, `PROCESSING`, `COMPLETED`, `PARTIALLY_FAILED`, `FAILED` o `SUPPRESSED` |
| `claimedAt`       | DateTime?                      | Claim transaccional de worker                                                     |
| `completedAt`     | DateTime?                      | Finalización                                                                      |
| `createdAt`       | DateTime                       | Auditoría                                                                         |
| `updatedAt`       | DateTime                       | Auditoría                                                                         |

Restricciones:

- `@@unique([tenantId, idempotencyKey])`.
- En modo `GROUPED`, la clave lógica se basa en tenant, destinatario, contrato y fecha/hora compatible; el conjunto de ocurrencias puede reducirse durante la revalidación sin cambiar la identidad del dispatch.
- En modo `INDIVIDUAL`, la clave incorpora además ocurrencia y regla efectiva.
- El agrupamiento nunca cruza contratos ni tenants.
- El claim `PLANNED → PROCESSING` es transaccional. `claimedAt` permite recuperar ejecuciones abandonadas mediante un timeout operativo sin agregar leases o tablas de workers.
- Índices `[tenantId, status, scheduledFor]` y `[tenantId, contractId]`.

### RentalReminderDispatchOccurrence

Tabla puente necesaria para saber qué ocurrencias integró una ejecución agrupada.

| Campo          | Tipo conceptual | Regla                                    |
| -------------- | --------------- | ---------------------------------------- |
| `id`           | String          | `cuid`                                   |
| `tenantId`     | String          | Debe coincidir con dispatch y ocurrencia |
| `dispatchId`   | String          | FK a `RentalReminderDispatch`            |
| `occurrenceId` | String          | FK a `RentalObligationOccurrence`        |
| `createdAt`    | DateTime        | Auditoría                                |

Restricciones: `@@unique([dispatchId, occurrenceId])`; índices `[tenantId, occurrenceId]` y `[tenantId, dispatchId]`.

### RentalReminderDelivery

Intento de entrega por canal. Conserva el destino histórico y los datos mínimos del proveedor.

| Campo                 | Tipo conceptual                | Regla                                                 |
| --------------------- | ------------------------------ | ----------------------------------------------------- |
| `id`                  | String                         | `cuid`                                                |
| `tenantId`            | String                         | Obligatorio                                           |
| `dispatchId`          | String                         | FK a `RentalReminderDispatch`                         |
| `channel`             | `NotificationChannel`          | Canal único de esta entrega                           |
| `contactPointId`      | String?                        | Punto utilizado, si aún existe                        |
| `destinationSnapshot` | String                         | Email o teléfono normalizado usado                    |
| `subjectSnapshot`     | String?                        | Asunto final renderizado, cuando el canal lo utiliza  |
| `bodySnapshot`        | String `@db.Text`              | Contenido final renderizado utilizado para el intento |
| `deliveryKey`         | String                         | Idempotencia por entrega                              |
| `attemptNumber`       | Int                            | Número de intento                                     |
| `status`              | `RentalReminderDeliveryStatus` | Estado del intento                                    |
| `providerCode`        | String?                        | Adaptador usado, sin acoplar el dominio               |
| `providerMessageId`   | String?                        | Identificador externo opcional                        |
| `attemptedAt`         | DateTime?                      | Inicio del intento                                    |
| `sentAt`              | DateTime?                      | Confirmación de envío                                 |
| `failedAt`            | DateTime?                      | Fallo                                                 |
| `errorCode`           | String?                        | Código sanitizado                                     |
| `errorMessage`        | String?                        | Mensaje técnico sin secretos                          |
| `createdAt`           | DateTime                       | Auditoría                                             |
| `updatedAt`           | DateTime                       | Auditoría                                             |

Restricciones:

- `@@unique([tenantId, deliveryKey])`.
- `@@unique([dispatchId, channel, destinationSnapshot, attemptNumber])`.
- El snapshot de destino nunca se recalcula para una entrega histórica.
- Cada fila representa un intento. Reejecutar el mismo intento conserva su `deliveryKey`; un retry intencional crea otra fila con `attemptNumber` incremental, sin agregar una entidad `RentalReminderDeliveryAttempt`.
- `subjectSnapshot` y `bodySnapshot` conservan exactamente el contenido intentado aunque cambien las plantillas. No se persisten payloads crudos, secretos, credenciales ni datos innecesarios del proveedor.
- Antes de reintentar se verifica que no exista una entrega `SENT` para la misma combinación lógica de dispatch, canal y destino.
- Índices `[tenantId, dispatchId, status]` y `[tenantId, status, createdAt]`.

---

## Enums conceptuales

```txt
ContactPointType
  EMAIL
  PHONE

RentalConceptSystemCode
  RENT
  EXPENSES
  ELECTRICITY
  GAS
  ABL
  AYSA
  INSURANCE

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

RentalOccurrenceStatus
  PENDING
  FULFILLED
  CANCELLED

RentalFulfillmentStatus
  RECORDED
  REVERSED

RentalFulfillmentOrigin
  ADMIN

NotificationChannel
  EMAIL
  WHATSAPP
  SMS

RentalReminderGroupingMode
  INDIVIDUAL
  GROUPED

RentalReminderDispatchStatus
  PLANNED
  PROCESSING
  COMPLETED
  PARTIALLY_FAILED
  FAILED
  SUPPRESSED

RentalReminderDeliveryStatus
  PENDING
  PROCESSING
  SENT
  FAILED
  SUPPRESSED
```

Estos son los nombres canónicos para las migraciones V1. Los valores de orígenes, canales o estados futuros se agregarán sólo cuando exista un requerimiento implementable.

---

## Relaciones

```txt
Tenant
├── Contact
│   └── ContactPoint
├── RentalConcept
└── RentalContract
    ├── Property? (referencia opcional; snapshot siempre presente)
    ├── Contact? (renter; obligatorio al activar)
    ├── Contact? (landlord)
    └── RentalObligation
        ├── RentalConcept
        ├── RentalReminderRule
        └── RentalObligationOccurrence
            ├── RentalFulfillment
            └── RentalReminderDispatchOccurrence
                └── RentalReminderDispatch
                    └── RentalReminderDelivery
```

Las relaciones hacia `User` son de auditoría (`createdBy`, `recordedBy`, `reversedBy`, `cancelledBy`) y no convierten a usuarios en contactos.

---

## Fechas, recurrencia y zona horaria

- Fechas contractuales, períodos, vencimientos y `fulfilledOn` usan Prisma `DateTime` con tipo nativo PostgreSQL `@db.Date`.
- Planificación, claims y entregas usan `DateTime` y se tratan como instantes UTC, en línea con los timestamps existentes del repositorio.
- Migración A agrega `TenantSetting.timeZone String @default("America/Argentina/Buenos_Aires")`.
- Migración C agrega `TenantSetting.rentalReminderSendTime DateTime? @db.Time(0)`; `null` usa el default operativo del sistema, cuyo valor concreto permanece diferido.
- Si `dueDay` es 29, 30 o 31 y el mes no contiene ese día, se usa el último día calendario del mes.
- Fines de semana no desplazan el vencimiento.
- V1 no contempla feriados.
- B materializa el mes local actual y los dos meses siguientes (`RENTAL_OCCURRENCE_HORIZON_MONTHS = 3`). La operación puede invocarse al crear/editar una obligación o mediante endpoint manual y repetirse sin duplicar debido a `@@unique([obligationId, periodKey])`.
- Los intervalos de más de un mes se anclan al mes calendario de `RentalObligation.startsOn`. Sólo se crea una ocurrencia si su `dueDate` cae dentro de la intersección de vigencias de contrato y obligación.

Los campos de fechas, recurrencia y timezone correspondientes a A+B ya existen en `schema.prisma`; los campos exclusivos de planificación y entregas permanecen reservados para C.

---

## Idempotencia y concurrencia

La automatización se divide conceptualmente en dos tareas:

1. Un planificador materializa ocurrencias y dispatches mediante claves determinísticas.
2. Un dispatcher reclama ejecuciones pendientes, revalida elegibilidad y delega cada canal a un puerto `MessageSender`.

Garantías obligatorias:

- creación por upsert o transacción contra claves únicas;
- claim transaccional para evitar que dos instancias procesen la misma ejecución;
- recuperación de dispatches `PROCESSING` abandonados mediante `claimedAt` y un timeout operativo;
- relectura inmediata de cada ocurrencia antes de enviar;
- exclusión de `FULFILLED` y `CANCELLED`;
- si un grupo pierde una ocurrencia cumplida, se envían sólo las restantes; si no queda ninguna, el dispatch se marca `SUPPRESSED`;
- una entrega `SENT` nunca vuelve a enviarse por un retry de la misma clave;
- los intentos y fallos permanecen auditables.

No se prescribe Bull, una queue distribuida ni un proveedor de cron en V1. Railway Cron o un worker externo pueden invocar el proceso idempotente.

---

## Aislamiento multi-tenant

No alcanza con almacenar `tenantId`. Service y Repository deben validar que todas las referencias comparten el tenant resuelto por `TenantGuard`:

- contrato ↔ propiedad;
- contrato ↔ inquilino/propietario;
- obligación ↔ contrato/concepto;
- ocurrencia ↔ obligación;
- fulfillment ↔ ocurrencia/usuarios responsables;
- regla ↔ obligación;
- dispatch ↔ contrato/contacto/ocurrencias;
- delivery ↔ dispatch/contact point.

Nunca se acepta un `tenantId` del cliente como autoridad. Las escrituras deben usar filtros compuestos o equivalentes que incluyan el tenant. Los procesos automáticos también se ejecutan con contexto explícito de tenant.

---

## Eliminación y conservación histórica

- Contratos finalizados o cancelados conservan obligaciones, ocurrencias y comunicaciones.
- En B, finalizar o cancelar desactiva todas las obligaciones del contrato y cancela sólo occurrences `PENDING` con `dueDate` posterior a la fecha local de cierre. Los vencimientos del día o anteriores y todos los cumplidos/cancelados se conservan sin alteración para resolución e historia operativa.
- Conceptos, contactos y puntos usados se desactivan en lugar de eliminarse.
- Fulfillments y deliveries nunca se borran para representar una corrección; se revierten o conservan con estado.
- Una `Property` archivada sigue siendo referenciable históricamente; si la relación física se elimina en una evolución autorizada, el snapshot contractual continúa siendo suficiente.
- Los actores `User` pueden quedar nulos en la relación si se eliminan, pero sus eventos conservan timestamps y contexto disponible.

Políticas `onDelete` canónicas:

| Relación                                   | Política                                          |
| ------------------------------------------ | ------------------------------------------------- |
| `Tenant` → entidades tenant-scoped         | `Cascade`, consistente con el esquema actual      |
| Aggregate root → hijos propios             | `Cascade`; la API no expone hard delete histórico |
| `Contact` → `ContactPoint`                 | `Cascade`                                         |
| `Contact` → contratos como renter/landlord | `Restrict`                                        |
| `RentalConcept` → obligaciones             | `Restrict`                                        |
| `Property` → contratos                     | `SetNull`; el snapshot permanece                  |
| `User` → campos de auditoría opcionales    | `SetNull`                                         |
| `ContactPoint` → deliveries                | `SetNull`; los snapshots permanecen               |

---

## Índices y restricciones mínimas

| Objetivo                  | Restricción o índice                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| Concepto único por tenant | `[tenantId, slug]`; `systemCode` no nulo único por tenant                    |
| Ocurrencia idempotente    | `[obligationId, periodKey]` único                                            |
| Agenda operativa          | `[tenantId, status, dueDate]`                                                |
| Dispatch idempotente      | `[tenantId, idempotencyKey]` único                                           |
| Pertenencia al dispatch   | `[dispatchId, occurrenceId]` único                                           |
| Delivery idempotente      | `[tenantId, deliveryKey]` único                                              |
| Búsqueda de pendientes    | `[tenantId, status, scheduledFor]`                                           |
| Intento de delivery       | `[dispatchId, channel, destinationSnapshot, attemptNumber]` único            |
| Default de contacto       | `[contactId, type, isDefault]`; unicidad activa reforzada transaccionalmente |

Las FKs no sustituyen la validación de pertenencia al tenant cuando la clave relacionada no incorpora `tenantId`.

---

## Separación de migraciones

### Migración fundacional A

Estado: **implementada en `schema.prisma` y en `202609090001_rental_foundation_a`; no aplicada a producción durante este desarrollo**.

Entidades:

- `Contact`.
- `ContactPoint`.
- `RentalConcept`.
- `RentalContract`.

Incluye `TenantSetting.timeZone`, relaciones inversas y enums `ContactPointType`, `RentalConceptSystemCode` y `RentalContractStatus`. El backfill idempotente de conceptos base acompaña el despliegue.

No incluye todavía `reminderGroupingMode` ni configuración de hora de avisos.

### Migración B — Motor de vencimientos

Estado: **implementada en schema, migración, API y admin; no aplicada a producción durante este desarrollo**.

Entidades:

- `RentalObligation`.
- `RentalObligationOccurrence`.
- `RentalFulfillment`.

Incluye sus enums, fechas `@db.Date`, `periodKey`, snapshots monetarios, estados y reversión auditable.

La materialización usa un horizonte fijo de tres meses (actual + dos siguientes), `createMany(skipDuplicates)` sobre la clave única y un endpoint manual. El cumplimiento reclama atómicamente una occurrence `PENDING` dentro de la misma transacción que crea el registro; la reversión conserva la fila y reabre la occurrence. `AGENT` puede registrar; `MANAGER`, `TENANT_ADMIN` y `SUPER_ADMIN` pueden revertir.

### Migración C — Avisos/comunicaciones

Estado: **pendiente**.

Entidades:

- `RentalReminderRule`.
- `RentalReminderDispatch`.
- `RentalReminderDispatchOccurrence`.
- `RentalReminderDelivery`.

Incluye `RentalContract.reminderGroupingMode`, `TenantSetting.rentalReminderSendTime`, enums de canal/agrupación/estados, canales múltiples, agrupación, snapshots e idempotencia.

---

## Extensiones deliberadamente preparadas

Sin implementarlas en V1, el modelo permite:

- override de destino por contrato y canal;
- preferencias/capacidades de contacto más detalladas;
- portal del inquilino mediante una identidad vinculada a `Contact`;
- evidencia privada asociada a un fulfillment u ocurrencia;
- extracción OCR/IA que proponga una imputación, manteniendo decisión y confianza auditables;
- adaptadores de email, WhatsApp o SMS intercambiables;
- relación futura entre `Contact`, `Lead` y un dominio de cliente consolidado.

Los archivos privados requerirán un futuro `StoredFile` agnóstico de proveedor, metadata y descarga autorizada. No se reutiliza `PropertyImage` ni el storage público actual.

---

## Aspectos operativos diferidos

No bloquean las migraciones A, B o C:

- valor concreto de la hora default del sistema;
- política de edición de snapshots contractuales después de activar;
- algoritmo concreto de normalización de email y teléfonos argentinos/internacionales;
- timeout de recuperación de claims abandonados;
- retención y sanitización de errores devueltos por proveedores.

Las decisiones estructurales necesarias para las tres migraciones quedaron cerradas en este documento. Los aspectos anteriores se resolverán en la fase de Service/operación correspondiente sin ampliar el schema inicial.
