# Gestión de Alquileres V1

Versión: V1

Estado: **implementación parcial — Migraciones A y B implementadas; Migración C pendiente**.

Diseño de datos propuesto: `docs/03-database/rental-domain.md`.

Este documento es la fuente canónica de reglas funcionales del módulo. La fundación A y el motor B ya existen en Prisma, API y admin; los avisos, comunicaciones y automatizaciones de C todavía no están implementados.

---

## 1. Objetivo

Permitir que cada inmobiliaria conozca qué debe cumplir cada inquilino, cuándo vence, qué avisos deben enviarse y cuándo dejar de avisar porque el vencimiento ya fue cumplido.

El flujo principal es:

```txt
Contrato → Obligaciones → Vencimientos → Avisos → Cumplimiento
```

V1 es una herramienta de operación de vencimientos. No es un ERP, un sistema contable ni una plataforma jurídica integral de contratos.

---

## 2. Principios

- Document First y Database First antes de UI.
- Una única fuente de verdad para cada concepto.
- Multi-tenant y permisos desde el primer endpoint.
- Historial auditable: corregir mediante estados o reversión, no borrando hechos.
- Automatización idempotente y segura ante reintentos o múltiples instancias.
- Canales separados de proveedores para evitar acoplamiento.
- Modelo V1 pequeño, con extensiones futuras explícitas pero sin implementarlas antes de necesitarlas.
- Interfaz simple, mobile first y orientada a la operación diaria.

---

## 3. Alcance V1

V1 comprende:

- alta y administración de contratos de alquiler;
- referencia opcional a una `Property` y snapshot textual obligatorio del inmueble;
- inquilino obligatorio para activar y propietario opcional informativo;
- contactos con múltiples emails y teléfonos;
- conceptos base y personalizados por tenant;
- obligaciones recurrentes y de única vez;
- materialización de vencimientos con importe fijo o variable;
- registro y reversión de cumplimiento total;
- reglas de aviso antes, el día y después del vencimiento;
- canales email, WhatsApp y SMS como opciones independientes;
- avisos individuales o agrupados por inquilino y contrato;
- historial de planificaciones, entregas, fallos, destinos y contenido final utilizado;
- dashboard operativo conceptual, contratos, vencimientos y avisos;
- aislamiento por tenant y RBAC para todas las operaciones.

---

## 4. Fuera de alcance

Quedan expresamente fuera de V1:

- portal del inquilino;
- OCR o IA para comprobantes;
- carga de imágenes o PDF de comprobantes;
- pagos parciales;
- obligaciones no monetarias;
- contabilidad, caja y cuentas corrientes;
- liquidaciones a propietarios;
- comisiones inmobiliarias y facturación;
- conciliación e integraciones bancarias;
- indexación automática por IPC o ICL;
- firma digital;
- contratos asociados a múltiples propiedades;
- administración avanzada de propietarios;
- roles personalizados;
- queue distribuida avanzada;
- calendario de feriados;
- automatizaciones financieras complejas;
- selección o implementación de proveedores reales de mensajería en esta fase documental.

---

## 5. Terminología

| Término de UI      | Nombre de dominio                         | Significado                                                    |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| Inmobiliaria       | `Tenant`                                  | Organización aislada dentro de la plataforma                   |
| Usuario            | `User`                                    | Persona autenticada que opera el sistema                       |
| Contacto           | `Contact`                                 | Persona externa o contraparte; no inicia sesión en V1          |
| Inquilino          | `Contact` con rol contractual de renter   | Destinatario principal de los avisos                           |
| Propietario        | `Contact` con rol contractual de landlord | Referencia informativa opcional                                |
| Contrato           | `RentalContract`                          | Acuerdo operativo administrado                                 |
| Concepto           | `RentalConcept`                           | Tipo configurable de obligación                                |
| Obligación         | `RentalObligation`                        | Regla que origina vencimientos                                 |
| Vencimiento        | `RentalObligationOccurrence`              | Instancia materializada para una fecha/período                 |
| Cumplimiento       | `RentalFulfillment`                       | Registro auditable que satisface un vencimiento                |
| Regla de aviso     | `RentalReminderRule`                      | Configuración temporal y de canales                            |
| Ejecución de aviso | `RentalReminderDispatch`                  | Planificación de uno o varios vencimientos compatibles         |
| Entrega            | `RentalReminderDelivery`                  | Intento por un canal, con destino y contenido final históricos |

`Tenant` nunca significa inquilino. En código se utiliza `renter` para evitar esa ambigüedad.

---

## 6. Modelo conceptual

```txt
Tenant
├── Contact ── ContactPoint
├── RentalConcept
└── RentalContract ── Property? + snapshot textual
    ├── renter: Contact
    ├── landlord: Contact?
    └── RentalObligation
        ├── RentalReminderRule
        └── RentalObligationOccurrence
            ├── RentalFulfillment
            └── RentalReminderDispatchOccurrence
                └── RentalReminderDispatch
                    └── RentalReminderDelivery
```

La unidad operativa es la ocurrencia materializada. Ni el contrato ni la obligación sustituyen el vencimiento concreto.

---

## 7. Entidades y responsabilidades

- `Contact`: identidad de una persona externa dentro del tenant.
- `ContactPoint`: emails y teléfonos, con default por tipo, estado activo y capacidad de SMS/WhatsApp.
- `RentalConcept`: catálogo tenant-scoped; `systemCode` identifica conceptos base y `null` los personalizados, sin booleano `isSystem` redundante.
- `RentalContract`: contexto contractual, partes, fechas y referencia histórica del inmueble.
- `RentalObligation`: recurrencia, regla de vencimiento, modalidad de importe, moneda y vigencia.
- `RentalObligationOccurrence`: período, fecha de vencimiento, snapshot del importe/moneda y estado operativo.
- `RentalFulfillment`: evidencia operativa de cumplimiento y su eventual reversión.
- `RentalReminderRule`: offsets temporales, hora efectiva y conjunto de canales.
- `RentalReminderDispatch`: ejecución planificada e idempotente, individual o agrupada.
- `RentalReminderDispatchOccurrence`: pertenencia explícita de vencimientos a una ejecución agrupada.
- `RentalReminderDelivery`: intento por canal, destino y contenido renderizado históricos, y resultado técnico.

Los campos y restricciones propuestos viven exclusivamente en `docs/03-database/rental-domain.md` para no duplicar la definición estructural.

---

## 8. Relaciones

- Un contrato `ACTIVE` tiene exactamente un inquilino principal; un `DRAFT` puede quedar temporalmente sin inquilino.
- Un contrato puede tener un propietario informativo.
- Un contrato puede referenciar cero o una `Property`, pero siempre conserva referencia textual.
- Un contrato contiene una o más obligaciones; para activarse necesita una obligación `RENT` válida.
- Una obligación pertenece a un concepto y materializa muchas ocurrencias.
- Una obligación puede tener varias reglas de aviso.
- Una ocurrencia puede tener registros históricos de fulfillment, con un único fulfillment vigente.
- Un dispatch contiene una o varias ocurrencias compatibles y genera una entrega por canal/destino efectivo.
- Todas las relaciones funcionales deben compartir `tenantId`.

No existe relación contractual con `PropertyListing` ni con `PropertyPrice`.

En el schema, `renterContactId` es nullable para soportar el `DRAFT`; `propertyAddressSnapshot` y `startsOn` siguen siendo obligatorios desde la creación. La relación opcional a `Property` usa `SetNull` y nunca elimina el snapshot textual.

---

## 9. Invariantes

1. Ninguna entidad funcional queda sin `tenantId`.
2. El tenant de cada referencia se valida en backend; nunca se confía en IDs del cliente.
3. Un contrato activo tiene inquilino activo, fechas consistentes y una obligación `RENT` activa y válida.
4. Un contrato referencia como máximo una propiedad.
5. El snapshot textual del inmueble es obligatorio aun con `propertyId`.
6. Alquiler, expensas y servicios usan el mismo motor de concepto → obligación → ocurrencia.
7. Una API podrá aceptar datos de alquiler como conveniencia al crear el contrato, pero deberá crear la obligación `RENT` en la misma transacción; nunca guardará una segunda fuente de verdad en `RentalContract`.
8. Una obligación/período materializa como máximo una ocurrencia.
9. Toda obligación V1 es monetaria y tiene moneda obligatoria; su importe puede ser nullable sólo mientras un valor variable todavía no se conozca.
10. Importe y moneda de una ocurrencia son snapshots históricos y no cambian por editar la obligación.
11. No existen pagos parciales en V1: una ocurrencia admite un solo cumplimiento vigente.
12. Sólo ocurrencias `PENDING` son elegibles para aviso.
13. Cumplir o cancelar elimina la ocurrencia de futuros avisos, sin borrar entregas ya realizadas.
14. Revertir un cumplimiento conserva auditoría y no repite automáticamente mensajes históricos.
15. Un retry no puede duplicar una entrega confirmada.
16. Un agrupamiento nunca cruza tenant ni contrato.
17. Canal, destino y proveedor son conceptos separados.
18. Cada delivery conserva el destino y el contenido final renderizado utilizado para ese intento.
19. Un concepto base se identifica exclusivamente por `systemCode`; no existe `isSystem`.
20. Los conceptos base se crean por tenant mediante upsert idempotente para tenants existentes y nuevos.

---

## 10. Estados

### Contrato

```txt
DRAFT → ACTIVE → ENDED
   └──────→ CANCELLED
ACTIVE ───→ CANCELLED
```

- `DRAFT`: puede estar incompleto y no genera automatizaciones.
- `ACTIVE`: habilita obligaciones, ocurrencias y avisos.
- `ENDED`: finalización normal; conserva historia y no genera nuevos vencimientos fuera de vigencia.
- `CANCELLED`: cierre excepcional; B desactiva obligaciones y cancela sólo ocurrencias futuras `PENDING`, preservando vencimientos del día/pasados y toda la historia.

No se define reactivación automática de contratos terminados o cancelados.

### Ocurrencia

```txt
PENDING → FULFILLED
   └────→ CANCELLED
FULFILLED --reversión válida→ PENDING
```

`OVERDUE` es una condición derivada para UI y consultas: `PENDING` con `dueDate` anterior a la fecha local actual del tenant. No se persiste como estado.

### Cumplimiento

```txt
RECORDED → REVERSED
```

### Avisos

Dispatch y delivery tienen estados técnicos separados:

```txt
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

---

## 11. Recurrencia/vencimientos

- V1 soporta obligaciones recurrentes en intervalos mensuales simples y obligaciones de única vez.
- Los casos mensuales, bimestrales, trimestrales, semestrales y anuales se expresan como cantidad de meses, sin un motor RRULE complejo.
- La ocurrencia se materializa en base de datos; no se calcula sólo al consultar.
- `periodKey` es estable por obligación: `YYYY-MM` para recurrentes según el mes local de vencimiento y `ONE_TIME` para una obligación única.
- El día de vencimiento recurrente puede ser 1–31.
- Si el mes no contiene el día 29, 30 o 31 configurado, vence el último día calendario de ese mes.
- Los fines de semana no desplazan la fecha y V1 no aplica feriados.
- Fechas de contrato, período, vencimiento y cumplimiento usan Prisma `DateTime` con tipo nativo PostgreSQL `@db.Date`.
- El instante de aviso se calcula con la zona IANA del tenant y se persiste en UTC.
- Zona inicial por defecto: `America/Argentina/Buenos_Aires`.
- Migración A incorpora `TenantSetting.timeZone`; Migración C incorpora `TenantSetting.rentalReminderSendTime` y el override `RentalReminderRule.sendTime` con `@db.Time(0)`.
- La hora habitual de envío será configurable por tenant con un default de sistema aún no definido.
- Ajustes de importe son manuales. No existe actualización automática por IPC/ICL.
- Cambiar un importe futuro de la obligación no altera ocurrencias materializadas.
- Todas las obligaciones son monetarias y siempre definen `Currency`; el importe puede ser nullable en obligaciones variables hasta conocerse.
- La implementación B usa un horizonte explícito de tres meses: mes local actual y dos meses siguientes. Se materializa al crear/editar una obligación y bajo demanda; no existe scheduler en B.
- La recurrencia se ancla al mes de inicio de la obligación; el vencimiento debe caer dentro de las vigencias del contrato y de la obligación.

---

## 12. Cumplimiento y reversión

Registrar cumplimiento debe ejecutarse en una transacción que:

1. revalida tenant, ocurrencia y estado `PENDING`;
2. crea `RentalFulfillment` con origen, fecha, notas, importe opcional y usuario responsable;
3. cambia la ocurrencia a `FULFILLED`;
4. invalida su participación en dispatches futuros aún no enviados.

V1 interpreta el cumplimiento como total aunque el importe informado difiera o no esté presente. No calcula saldos ni parcialidades.

Una corrección se realiza mediante reversión auditable:

1. exige motivo y usuario responsable;
2. cambia el fulfillment vigente a `REVERSED` sin eliminarlo;
3. devuelve la ocurrencia a `PENDING` si no está cancelada;
4. permite nuevas planificaciones que todavía correspondan según reglas vigentes.

La reversión nunca borra ni vuelve a enviar deliveries históricos.

En B, `AGENT` puede registrar un cumplimiento. La reversión queda restringida a `MANAGER`, `TENANT_ADMIN` y `SUPER_ADMIN` combinando el permiso `rental.fulfillment.manage` con el guard de rol existente.

---

## 13. Avisos

Una regla puede programar avisos:

- antes del vencimiento (`dayOffset < 0`);
- el día del vencimiento (`dayOffset = 0`);
- después del vencimiento (`dayOffset > 0`).

Cada regla selecciona uno o más canales independientes: `EMAIL`, `WHATSAPP`, `SMS`.

En PostgreSQL/Prisma se representa como `NotificationChannel[]`. Service rechaza arrays vacíos o duplicados; V1 no agrega una tabla puente de canales.

Elegibilidad mínima al planificar y nuevamente justo antes de enviar:

- contrato `ACTIVE`;
- obligación y regla activas;
- ocurrencia `PENDING`;
- contacto y punto de contacto activos y compatibles con el canal;
- fecha/hora efectiva alcanzada;
- ausencia de una entrega `SENT` para la misma clave idempotente.

El destino inicial es el `ContactPoint` default del tipo correspondiente. Cada delivery conserva:

- `destinationSnapshot`: destino normalizado utilizado;
- `subjectSnapshot`: asunto final nullable;
- `bodySnapshot`: cuerpo final obligatorio.

No se guardan payloads crudos de proveedores. El contenido persistido se limita a lo necesario para la comunicación, sin secretos, credenciales ni información innecesaria. Un override por contrato/canal queda preparado pero fuera de V1.

Los avisos enviados, fallidos o suprimidos permanecen visibles como historia operativa.

---

## 14. Agrupación

El contrato define modo `INDIVIDUAL` o `GROUPED`.

- `INDIVIDUAL`: cada ocurrencia genera su propio dispatch compatible.
- `GROUPED`: se agrupan ocurrencias del mismo inquilino, mismo contrato y misma fecha/hora efectiva de ejecución.

No se agrupa por tenant completo ni entre contratos distintos, aunque el destinatario coincida.

Antes de renderizar y enviar un grupo se revalida cada ocurrencia. Las cumplidas o canceladas se excluyen; las restantes continúan. Si el grupo queda vacío, el dispatch se marca suprimido.

`RentalReminderDispatchOccurrence` conserva qué vencimientos integraban la ejecución y permite explicar grupos parciales.

La relación N:M es parte necesaria del motor: se implementa mediante una entidad con `tenantId` y unique `[dispatchId, occurrenceId]`.

---

## 15. Idempotencia

La automatización se separa en:

- planificador: materializa ocurrencias y dispatches;
- dispatcher: reclama dispatches, revalida y envía mediante adaptadores.

Requisitos:

- claves únicas determinísticas para ocurrencia, dispatch y delivery;
- persistir el dispatch antes de invocar proveedores externos;
- claim transaccional para que sólo una instancia procese una ejecución;
- `claimedAt` para recuperar ejecuciones abandonadas mediante un timeout operativo, sin leases ni tabla de workers en V1;
- revalidación de `PENDING` inmediatamente antes de cada envío;
- estado e intentos auditables;
- retry sólo de entregas no confirmadas;
- callbacks futuros de proveedores correlacionados por identificador externo y tenant.

Cada `RentalReminderDelivery` representa un intento. Reejecutar el mismo intento reutiliza su clave idempotente; un retry intencional crea otra fila con `attemptNumber` incremental. No se crea una entidad adicional de intentos.

V1 no requiere Bull ni una queue distribuida. Un Railway Cron o worker puede invocar procesos idempotentes. La infraestructura concreta se decide en la fase de implementación.

---

## 16. Contactos

`Contact` es transversal y tenant-scoped. No se crean entidades duplicadas `RentalTenant` o `RentalLandlord`, y `User` no se reutiliza como contacto.

Cada contacto puede tener:

- múltiples emails;
- múltiples teléfonos;
- un default activo por tipo;
- etiquetas descriptivas;
- teléfonos con capacidad WhatsApp, SMS o ambas;
- puntos activos o inactivos sin perder historia.

`ContactPoint.type` sólo distingue `EMAIL` y `PHONE`. WhatsApp y SMS se representan como capacidades booleanas del teléfono, no como puntos duplicados. El único default activo por contacto y tipo se mantiene transaccionalmente en Service, sin índice único parcial en V1.

El contrato usa un contacto como inquilino obligatorio y otro como propietario opcional. En V1, el propietario es informativo y no recibe lógica financiera avanzada.

La UX inicial permite buscar o crear un contacto desde el flujo de contrato. No se crea “Contactos” como navegación principal. La consolidación con `Lead`/`Client`, deduplicación avanzada y gestión transversal completa quedan para una evolución documentada.

---

## 17. Multi-tenancy

Todas las operaciones autenticadas usan `JwtAuthGuard`, `TenantGuard` y contexto de tenant resuelto por backend.

Controller, Service y Repository deben respetar:

- el cliente no elige un `tenantId` autoritativo;
- toda consulta funcional filtra por tenant;
- toda escritura valida pertenencia de contrato, propiedad, contactos, concepto, obligación, ocurrencia, regla, dispatch y delivery;
- las escrituras sensibles incluyen el tenant en el predicado o usan una operación transaccional equivalente;
- un proceso automático recorre tenants de forma explícita y aislada;
- logs, claves idempotentes y callbacks externos incluyen correlación de tenant sin exponer datos entre organizaciones.

`SUPER_ADMIN` no habilita cruces implícitos: debe operar con el mecanismo explícito de selección de tenant ya definido por la plataforma.

Las relaciones con `Tenant` y los hijos propios de cada aggregate usan `onDelete: Cascade`; las referencias históricas opcionales a `Property`, `User` y `ContactPoint` usan `SetNull`; las referencias contractuales a `Contact` y las obligaciones hacia `RentalConcept` usan `Restrict`. La API conserva la historia mediante estados o `isActive` y no expone hard delete funcional.

---

## 18. RBAC

Permisos propuestos para incorporar a `packages/rbac` en la fase de implementación:

```txt
rental.read
rental.contract.create
rental.contract.update
rental.contract.end
rental.obligation.manage
rental.fulfillment.manage
rental.reminder.manage
rental.contact.manage
```

Matriz V1:

| Rol            | Acceso de alquileres                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `TENANT_ADMIN` | Todos los permisos                                                                                                                     |
| `MANAGER`      | Todos los permisos                                                                                                                     |
| `AGENT`        | Lectura y operación de contratos, obligaciones, vencimientos y cumplimientos; administración de contactos necesaria para esa operación |
| `COLLABORATOR` | Sin acceso en V1                                                                                                                       |

Para `AGENT`, la asignación inicial propuesta es `rental.read`, `rental.contract.create`, `rental.contract.update`, `rental.obligation.manage`, `rental.fulfillment.manage` y `rental.contact.manage`. Finalizar/cancelar contratos y administrar reglas automáticas quedan en `TENANT_ADMIN`/`MANAGER`.

Todo endpoint debe declarar `PermissionsGuard` y `@RequirePermissions(...)` desde su creación. Ocultar navegación en UI es una mejora de experiencia, no una barrera de seguridad.

---

## 19. Comunicación/proveedores

El dominio depende conceptualmente de un puerto `MessageSender`, no de SDKs concretos:

```txt
MessageSender.send({
  tenantId,
  channel,
  destination,
  idempotencyKey,
  message
})
```

Cada adaptador implementa un canal/proveedor y devuelve un resultado normalizado. `NotificationChannel` expresa email, WhatsApp o SMS; `providerCode` identifica la integración efectiva sólo en metadata de delivery.

No se elige proveedor en esta fase. La futura selección debe contemplar idempotencia disponible, callbacks, plantillas, costos, rate limits, secretos por entorno, observabilidad y requisitos legales.

No deben registrarse secretos ni contenido sensible completo en logs o errores.

---

## 20. Privacidad/storage futuro

Los documentos contractuales y comprobantes no forman parte del MVP inicial. El storage actual orientado a imágenes con URLs públicas no es apto para esos archivos.

Una evolución deberá diseñar:

- `StoredFile` privado y agnóstico de proveedor;
- metadata de archivo, propietario lógico y clasificación;
- autorización de descarga por tenant, permiso y relación contractual;
- documentos contractuales;
- comprobantes asociados a occurrence/fulfillment;
- políticas de retención, auditoría y borrado.

No se reutiliza `PropertyImage`. La solución deberá seguir compatible con Cloudflare R2, AWS S3 y Supabase Storage sin acoplar el dominio.

El diseño deja espacio para capacidad y preferencias por canal, pero V1 no construye un centro complejo de consentimiento. Las políticas finales se revisarán al seleccionar proveedor y antes de activar comunicaciones automáticas reales.

---

## 21. Evolución portal/IA

El modelo no debe impedir un futuro portal donde el inquilino pueda:

- iniciar sesión mediante una identidad vinculada a `Contact`;
- consultar obligaciones y vencimientos;
- cargar foto o PDF de un comprobante;
- asociar evidencia a una ocurrencia o fulfillment.

Una evolución OCR/IA podrá extraer importe, fecha, proveedor y concepto probable, y proponer la imputación contra vencimientos pendientes. Política conceptual futura:

- confianza alta: proponer o asociar según reglas explícitas;
- confianza media: solicitar confirmación;
- confianza baja: pedir al usuario que elija la obligación.

La IA no será fuente única de verdad: la evidencia, predicción, nivel de confianza y confirmación deberán ser auditables. No se diseña ni implementa ese motor en V1.

---

## 22. UX conceptual

El inicio de Gestión de Alquileres prioriza operación de vencimientos, no información jurídica.

Navegación inicial probable:

```txt
Gestión de Alquileres
├── Resumen
├── Contratos
├── Vencimientos
└── Avisos
```

“Contactos” no aparece inicialmente como sección principal. Los conceptos configurables pueden vivir en Configuración.

El resumen debe poder evolucionar hacia:

- avisos para hoy;
- próximos vencimientos;
- vencidos pendientes;
- cumplidos del mes;
- errores de envío.

La ficha del contrato será simple y operativa: identificación, partes, inmueble, vigencia, obligaciones, próximos vencimientos y acciones principales. Las listas priorizan estado, fecha, concepto, inquilino y acción de cumplimiento. El diseño final de pantallas corresponde a una fase posterior.

---

## 23. Fases de implementación

### Fase 1 — Documentación

- Documento funcional canónico.
- Diseño de datos propuesto.
- Sin Prisma, migraciones, endpoints ni UI.

### Fase 2 — Migraciones de datos y RBAC

#### Migración fundacional A

Estado: **implementada en schema, migración, RBAC, API y admin mínimo**. La migración no se aplicó contra producción como parte de este desarrollo.

- Entidades: `Contact`, `ContactPoint`, `RentalConcept`, `RentalContract`.
- Agrega `TenantSetting.timeZone`.
- Incluye relaciones inversas y enums de contacto, conceptos base y contrato.
- Backfill idempotente de conceptos base para tenants existentes y creación transaccional para tenants nuevos.
- No incluye todavía agrupación ni hora de avisos.
- A difirió la validación de `RENT`; B ya la incorporó al activar sin agregar campos temporales al contrato.

#### Migración B — Motor de vencimientos

Estado: **implementada en schema, migración, API y admin; no aplicada a producción durante este desarrollo**.

- Entidades: `RentalObligation`, `RentalObligationOccurrence`, `RentalFulfillment`.
- Incluye recurrencia simple, fechas `@db.Date`, `periodKey`, snapshots monetarios, estados y reversión.
- Materializa el mes local actual y dos meses siguientes de forma idempotente, permite ejecución manual y no incorpora scheduler.
- La ficha de contrato administra obligaciones y vencimientos; `/alquileres/vencimientos` prioriza vencidos y próximos pendientes.
- Al finalizar o cancelar, se desactivan obligaciones y se cancelan vencimientos futuros pendientes. Se conserva íntegramente la historia cumplida y revertida.

#### Migración C — Avisos/comunicaciones

Estado: **pendiente**.

- Entidades: `RentalReminderRule`, `RentalReminderDispatch`, `RentalReminderDispatchOccurrence`, `RentalReminderDelivery`.
- Agrega `RentalContract.reminderGroupingMode` y `TenantSetting.rentalReminderSendTime`.
- Incluye canales múltiples, agrupación N:M, snapshots de destino/contenido, retries e idempotencia.

Antes de completar la fase:

- incorporar permisos en `packages/rbac` y roles;
- actualizar `current-schema.md` y `PROJECT_STATE.md` junto con la implementación de cada migración.

### Fase 3 — API operacional

- Contactos necesarios para alquileres.
- Contratos, obligaciones y ocurrencias.
- Cumplimiento y reversión transaccionales.
- Arquitectura Controller → Service → Repository → Prisma.
- Guards de autenticación, tenant y permisos en todos los endpoints.

### Fase 4 — Admin UI

- Resumen operativo inicial.
- Contratos y carga contextual de contactos.
- Vencimientos, filtros y cumplimiento/reversión.
- Configuración de conceptos y reglas.

### Fase 5 — Automatización sin proveedor real

- Materializador, planner y dispatcher idempotentes.
- Adaptador de prueba/no-op.
- Pruebas de concurrencia, supresión y agrupación.

### Fase 6 — Primer canal real

- Selección documentada de proveedor.
- Revisión legal, de consentimiento y privacidad.
- Adaptador, secretos, callbacks, métricas y operación de fallos.
- Activación progresiva por tenant.

Cada fase requiere validaciones y actualización documental correspondiente. No se incorporan portal, archivos privados ni IA dentro de estas fases V1.

---

## 24. Criterios de aceptación V1

V1 se considera funcionalmente aceptada cuando:

1. Un usuario autorizado crea un contrato draft con inquilino, fechas y snapshot del inmueble, con o sin `Property`.
2. No se puede activar un contrato sin obligación `RENT` válida ni con referencias de otro tenant.
3. El tenant usa conceptos base y crea/desactiva conceptos personalizados sin borrar historia.
4. Obligaciones recurrentes y únicas materializan vencimientos una sola vez por período.
5. El día 29/30/31 cae en el último día de meses más cortos, sin corrimiento por fin de semana.
6. Modificar el importe futuro no altera ocurrencias ya materializadas.
7. La UI distingue pendientes, vencidos derivados, cumplidos y cancelados.
8. Registrar cumplimiento total detiene avisos futuros de esa ocurrencia y conserva los ya enviados.
9. Revertir exige motivo, deja auditoría y devuelve correctamente la ocurrencia a pendiente.
10. Repetir planner/dispatcher o ejecutarlos concurrentemente no duplica ocurrencias ni entregas confirmadas.
11. El agrupamiento combina sólo ocurrencias compatibles del mismo inquilino y contrato.
12. Una ocurrencia cumplida antes del envío se excluye; el resto del grupo continúa.
13. Cada delivery conserva canal, destino, asunto nullable, cuerpo final obligatorio, número de intento y resultado, sin payload crudo del proveedor.
14. Todas las rutas API aplican autenticación, tenant y permisos; pruebas negativas demuestran aislamiento entre tenants.
15. `COLLABORATOR` no accede y los demás roles respetan la matriz definida.
16. La API no depende de un proveedor concreto y puede probarse con un `MessageSender` controlado.
17. El módulo no introduce contabilidad, parcialidades, uploads, portal ni IA.

---

## 25. Decisiones cerradas

- Nombre funcional: Gestión de Alquileres V1; nombres de código en inglés bajo `Rental*`.
- Flujo central: contrato → obligación → ocurrencia → aviso → cumplimiento.
- `Property` es referencia opcional; `PropertyListing`/`PropertyPrice` no participan.
- Snapshot textual del inmueble siempre obligatorio.
- Un solo inmueble por contrato.
- `Contact` transversal, separado de `User`; sin entidades duplicadas por rol contractual.
- `ContactPoint` usa `EMAIL`/`PHONE`; SMS y WhatsApp son capacidades del teléfono y el default por tipo se garantiza transaccionalmente.
- Inquilino obligatorio para activar; propietario opcional e informativo.
- Conceptos tenant-scoped con base `RENT`, `EXPENSES`, `ELECTRICITY`, `GAS`, `ABL`, `AYSA`, `INSURANCE`.
- Concepto base identificado sólo por `systemCode`, sin `isSystem`; defaults creados por tenant mediante upsert idempotente.
- Conceptos base sin renombrado en V1; desactivación en lugar de borrado histórico.
- Alquiler usa el mismo motor de obligaciones que los demás conceptos.
- V1 modela exclusivamente obligaciones monetarias; moneda obligatoria e importe nullable sólo para variables aún desconocidos.
- Fechas de negocio en `@db.Date`; timestamps operativos en UTC; timezone en `TenantSetting`.
- Recurrencia mediante intervalo mensual simple y `periodKey` determinístico, sin RRULE.
- Ocurrencias materializadas e importes históricos inmutables.
- Estados persistidos de ocurrencia: `PENDING`, `FULFILLED`, `CANCELLED`; vencido es derivado.
- Sin parcialidades; fulfillment reversible y auditable.
- Canales multi-select `EMAIL`, `WHATSAPP`, `SMS`; canal separado de proveedor.
- Canales de una regla representados como `NotificationChannel[]`, sin tabla puente V1.
- Snapshot de destino, asunto nullable y cuerpo final obligatorio por delivery; sin payload crudo del proveedor.
- Separación entre rule, dispatch, dispatch-occurrence y delivery.
- Cada delivery representa un intento; retries posteriores incrementan `attemptNumber`.
- Agrupamiento sólo por inquilino + contrato + ejecución compatible.
- Zona horaria por tenant, default `America/Argentina/Buenos_Aires`.
- Último día del mes para vencimientos 29/30/31 inexistentes; sin ajustes por fin de semana o feriado.
- Planner/dispatcher idempotentes, con persistencia previa, claim transaccional y revalidación antes de enviar.
- Conservación histórica mediante estados/`isActive`, con `Cascade`, `SetNull` o `Restrict` según la relación documentada.
- Separación estructural definitiva en Migración fundacional A, Migración B y Migración C.
- RBAC basado en `packages/rbac` desde el primer endpoint.
- Sin documentos privados ni expansión del storage actual en V1.
- Dashboard orientado a vencimientos; contactos no son navegación primaria inicial.

---

## 26. Decisiones diferidas

- Hora default de envío del sistema y UX de configuración por tenant.
- Proveedor inicial de email, WhatsApp o SMS y orden de incorporación de canales.
- Política detallada de retries, backoff, rate limits y callbacks del proveedor elegido.
- Texto, plantillas, idioma y personalización de mensajes.
- Override de destino por contrato y canal.
- Reglas legales, consentimiento y opt-out aplicables a cada canal/proveedor.
- Normalización y deduplicación avanzada de contactos.
- Integración futura `Contact` ↔ `Lead`/`Client`.
- Edición o corrección del snapshot del inmueble luego de activar.
- Diseño de `StoredFile`, documentos privados y comprobantes.
- Portal del inquilino e identidad vinculada a `Contact`.
- OCR/IA, umbrales de confianza y flujo de confirmación.
- Roles personalizados, queue distribuida, feriados e indexación IPC/ICL.

Ninguna decisión diferida debe resolverse implícitamente durante la implementación. Si bloquea una fase, se documentará y aprobará antes de modificar Prisma o código.
