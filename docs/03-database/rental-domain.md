# Rental Management V1.1 — Diseño de datos

Versión: V1.1

Estado: **diseño objetivo aprobado**. A, B y B.1 están implementados. Los cambios V1.1 posteriores a B.1 están pendientes. Migración C no fue iniciada.

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

Los nodos `RentalContractSequence`, `RentalRentValueRevision`, `RentalContractEvent`, `Notification` y las nuevas columnas V1.1 están **APROBADOS / PENDIENTES**.

## 4. Contact

Identidad de una persona externa dentro del tenant. No representa a un usuario del sistema.

### Baseline

**IMPLEMENTADO**:

| Campo            | Regla          |
| ---------------- | -------------- |
| `tenantId`       | Obligatorio    |
| `name`           | Obligatorio    |
| `documentType`   | Texto opcional |
| `documentNumber` | Texto opcional |
| `notes`          | Opcional       |
| `isActive`       | Baja lógica    |

No existe unicidad global de documento.

### Objetivo V1.1

**APROBADO / PENDIENTE**: `documentType` utilizará valores canónicos:

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

**APROBADO / PENDIENTE** agregar:

| Campo            | Tipo conceptual | Regla                                      |
| ---------------- | --------------- | ------------------------------------------ |
| `sequenceNumber` | Int             | Correlativo inmutable por tenant           |
| `contractNumber` | String          | Formato `ALQ-000001`, inmutable y buscable |

Constraints mínimos:

- `UNIQUE (tenantId, sequenceNumber)`;
- `UNIQUE (tenantId, contractNumber)`;
- `sequenceNumber > 0`;
- el valor no se reutiliza después de cancelaciones o borrados administrativos.

### 7.3 Renovación

**APROBADO / PENDIENTE** agregar una autorrelación opcional:

| Campo                | Regla                              |
| -------------------- | ---------------------------------- |
| `previousContractId` | Contrato anterior del mismo tenant |

`previousContractId` será único para impedir más de un sucesor directo. La creación del sucesor y el reclamo de esa relación se realizan en una única transacción concurrent-safe.

La renovación sólo parte de `ACTIVE` o `ENDED`; el sucesor siempre nace `DRAFT` y obtiene un nuevo número.

### 7.4 Activación objetivo

**APROBADO / PENDIENTE**: la transición a `ACTIVE` valida atómicamente:

- `startsOn` y `endsOn` presentes;
- `endsOn > startsOn`;
- `endsOn >= startsOn + 1 mes calendario`, con clamp al último día del mes;
- al menos una parte `RENTER` activa;
- exactamente una parte `RENTER` primaria;
- una obligación `RENT` válida.

El estado `DRAFT` puede permanecer incompleto.

## 8. RentalContractSequence

**APROBADO / PENDIENTE**: secuencia tenant-scoped para numeración contractual.

| Campo       | Tipo conceptual | Regla                        |
| ----------- | --------------- | ---------------------------- |
| `tenantId`  | String          | PK/FK a tenant               |
| `lastValue` | Int             | Último correlativo reservado |
| `updatedAt` | DateTime        | Auditoría técnica            |

Algoritmo concurrent-safe:

1. iniciar la transacción de creación;
2. crear la fila del tenant si todavía no existe mediante upsert seguro;
3. ejecutar un incremento atómico de `lastValue` y obtener el valor resultante;
4. derivar `contractNumber` con padding de seis dígitos;
5. insertar el contrato con ambas constraints únicas;
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

### Objetivo V1.1

**APROBADO / PENDIENTE** agregar:

| Campo       | Tipo conceptual | Regla                                   |
| ----------- | --------------- | --------------------------------------- |
| `isPrimary` | Boolean         | Sólo aplica a `RENTER`; default `false` |

Constraints:

- una parte `LANDLORD` no puede ser primaria;
- como máximo una parte `RENTER` primaria por contrato, reforzada con índice único parcial o mecanismo equivalente;
- `ACTIVE` exige exactamente una parte `RENTER` primaria.

`isPrimary` identifica al referente administrativo, no al único destinatario de avisos.

La edición se implementará por diff/upsert:

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

### Objetivo V1.1

**APROBADO / PENDIENTE** reemplazar la recreación masiva durante edición por diff/upsert para preservar IDs estables y auditoría futura.

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

### 11.2 Recurrencia y vigencia objetivo

**APROBADO / PENDIENTE**: `recurrenceMonths` aceptará 1–12. La UX ofrece presets 1, 2, 3, 4, 6 y 12, más un valor personalizado.

La vigencia admite fecha final específica o “hasta fin del contrato”. La representación elegida deberá diferenciar esa intención sin duplicar fechas silenciosamente.

### 11.3 Política de vencimiento objetivo

**APROBADO / PENDIENTE** agregar una política equivalente a:

```txt
FIXED_DAY
MANUAL_PER_PERIOD
```

- `FIXED_DAY` requiere `dueDay` entre 1 y 31.
- `MANUAL_PER_PERIOD` no fabrica fecha; cada occurrence puede quedar con `dueDate = null` hasta ser completada.

### 11.4 Configuración previa a avisos

**APROBADO / PENDIENTE** agregar:

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

**APROBADO / PENDIENTE**: la obligación `RENT` tiene pago mensual y agrega un intervalo de actualización de 1–12 meses. La UX ofrece 3, 4, 6 y “Otro”.

La moneda queda fijada para el flujo ordinario de revisiones. Un cambio de moneda requiere una modificación contractual excepcional separada.

## 12. RentalRentValueRevision

**APROBADO / PENDIENTE**: historial append-only de valores de la obligación `RENT`.

| Campo                    | Tipo conceptual     | Regla                                   |
| ------------------------ | ------------------- | --------------------------------------- |
| `id`                     | String              | `cuid`                                  |
| `tenantId`               | String              | Obligatorio                             |
| `obligationId`           | String              | Debe apuntar a la obligación `RENT`     |
| `effectiveFrom`          | `DateTime @db.Date` | Primer período/fecha efectiva           |
| `amount`                 | Decimal(14,2)       | Mayor que cero                          |
| `currency`               | Currency            | Igual a la moneda contractual ordinaria |
| `actorId`                | String?             | Usuario que registró el cambio          |
| `reason`                 | String?             | Motivo opcional                         |
| `createdAt`, `updatedAt` | DateTime            | Auditoría                               |

Constraints mínimos:

- único por `(obligationId, effectiveFrom)`;
- pertenencia tenant validada en backend y transacción;
- no se edita destructivamente una revisión efectiva; las correcciones deben conservar trazabilidad.

Operación específica y transaccional:

1. validar obligación `RENT`, moneda y fecha efectiva;
2. insertar la revisión;
3. actualizar el importe snapshot de occurrences con período no anterior a `effectiveFrom` y estado `PENDING`;
4. no tocar occurrences cumplidas, canceladas ni períodos anteriores;
5. registrar el evento contractual correspondiente;
6. confirmar todo o revertir todo.

La próxima actualización se deriva de la última revisión efectiva más el intervalo de actualización; no necesita una fecha duplicada mutable.

## 13. RentalObligationOccurrence

### Baseline

**IMPLEMENTADO**:

- pertenencia a obligación y tenant;
- `periodKey` idempotente;
- `dueDate` persistida;
- snapshots de importe y moneda;
- estados `PENDING`, `FULFILLED`, `CANCELLED`;
- `OVERDUE` derivado, nunca persistido.

### Objetivo V1.1

**APROBADO / PENDIENTE**: `dueDate` será nullable o se usará un mecanismo semánticamente equivalente para `MANUAL_PER_PERIOD`.

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

**APROBADO / PENDIENTE**: eventos contractuales append-only.

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

Eventos iniciales candidatos: activación, finalización, cancelación, cambio de partes, revisión de alquiler y renovación. La lista final se cerrará con la implementación, sin duplicar fulfillment/reversal.

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

## 17. Migración C: ejecución de comunicaciones

**NO INICIADA / DEFER hasta completar el refactor posterior a B.1**.

Migración C cubrirá, en una especificación e implementación separadas:

- anticipación y horario;
- repetición;
- templates;
- planner;
- dispatch;
- delivery;
- proveedores;
- callbacks;
- idempotencia y retries de envío.

Antes de C sólo se implementarán las partes, rutas, canales, punto seleccionado y flags de contenido definidos en este documento. No se agregan ahora tablas de ejecución de comunicaciones al schema actual.

## 18. Enums

### Implementados

```txt
ContactPointType
  EMAIL
  PHONE

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

RentalOccurrenceStatus
  PENDING
  FULFILLED
  CANCELLED

RentalFulfillmentStatus
  RECORDED
  REVERSED
```

### Aprobados / pendientes

```txt
ContactDocumentType
  DNI
  CUIT
  CUIL
  PASSPORT

RentalDueMode
  FIXED_DAY
  MANUAL_PER_PERIOD

RentalContractEventType
  valores a cerrar con la implementación sin duplicar fulfillment/reversal
```

Los enums de planner, dispatch, delivery y proveedores pertenecen a Migración C y no forman parte del baseline ni del refactor previo.

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
| Número secuencial          | `UNIQUE (tenantId, sequenceNumber)`                           |
| Código visible             | `UNIQUE (tenantId, contractNumber)`                           |
| Un sucesor directo         | `UNIQUE (previousContractId)` cuando no sea null              |
| Parte no duplicada         | `UNIQUE (contractId, contactId, role)`                        |
| Máximo un renter principal | único parcial por contrato para `role = RENTER AND isPrimary` |
| Ruta por canal             | `UNIQUE (contractPartyId, channel)`                           |
| Revisión efectiva          | `UNIQUE (obligationId, effectiveFrom)`                        |
| Occurrence por período     | `UNIQUE (obligationId, periodKey)`                            |
| Notificación idempotente   | `UNIQUE (tenantId, recipientUserId, deduplicationKey)`        |

La regla “exactamente un renter principal” para contratos activos necesita además validación transaccional, porque un índice parcial sólo garantiza el máximo.

## 22. Backfills aprobados

Cuando se implemente el refactor V1.1:

- numerar contratos existentes por tenant con un orden determinístico documentado;
- inicializar la secuencia de cada tenant por encima del mayor valor asignado;
- elegir o requerir confirmación del referente principal sin inventar datos ambiguos;
- normalizar tipos de documento sólo cuando el valor existente sea inequívoco;
- crear la revisión inicial de `RENT` desde el valor vigente preservando moneda;
- configurar `RENT` con `includeInNotice = true` y `showAmount = true`;
- configurar las demás obligaciones con ambos flags en `false`;
- conservar IDs existentes de partes y rutas;
- no tocar occurrences cumplidas o canceladas.

Cada backfill deberá ser determinístico, reejecutable cuando corresponda y validado con consultas pre/post migración.

## 23. Orden de implementación posterior a B.1

El orden exacto se resolverá en planes de implementación separados, respetando estas dependencias:

1. invariantes contractuales, numeración, documento canónico y referente principal;
2. edición estable de partes y rutas;
3. experiencia `RENT`, revisiones y reglas de occurrences;
4. obligaciones adicionales y flags de aviso;
5. historial y renovación;
6. notificaciones internas globales;
7. Migración C de ejecución de comunicaciones.

Ninguno de estos puntos está implementado por la sola existencia de esta documentación.

## 24. Decisiones diferidas

- contratos temporarios inferiores a un mes;
- índices automáticos IPC/ICL;
- cambio ordinario de moneda;
- asignación/scoping de contratos por agente;
- preferencias personales de notificación;
- portal externo de partes;
- firma y storage de documentos;
- ejecución de comunicaciones hasta Migración C.
