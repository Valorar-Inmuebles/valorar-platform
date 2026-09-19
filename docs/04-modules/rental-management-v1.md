# Gestión de Alquileres V1.1

Versión: V1.1

Estado: **implementación parcial**. A, B, B.1 y Rental V1.1 Fase 1 están implementados. Fase 2 y Migración C no fueron iniciadas.

Diseño de datos canónico: `docs/03-database/rental-domain.md`.

## 1. Convención de estado

Este documento separa estrictamente:

- **IMPLEMENTADO**: existe en el schema migrado, API y/o Admin según se indica.
- **APROBADO / PENDIENTE**: diseño cerrado para las próximas fases; todavía no existe en el producto.
- **DEFER**: decisión deliberadamente fuera de las próximas fases.

`docs/03-database/current-schema.md` describe únicamente lo realmente migrado. Ninguna definición objetivo de este documento debe interpretarse como schema actual.

## 2. Baseline implementado: A + B + B.1 + Fase 1

**IMPLEMENTADO**:

- contactos tenant-scoped con múltiples emails y teléfonos;
- conceptos de alquiler tenant-scoped;
- contratos con ciclo `DRAFT → ACTIVE → ENDED / CANCELLED`;
- dirección contractual estructurada e independiente de la propiedad;
- múltiples partes `RENTER` y `LANDLORD` mediante `RentalContractParty`;
- selección de un punto de contacto por contrato, persona y canal mediante `RentalContractNotificationRoute`;
- obligaciones recurrentes o puntuales, occurrences, cumplimiento y reversión;
- `OVERDUE` derivado, no persistido;
- activación condicionada a una obligación `RENT` activa;
- aislamiento tenant, permisos Rental existentes y pantallas operativas actuales.
- número interno `ALQ-000001` tenant-scoped, inmutable y buscable;
- tipos canónicos de documento;
- renter referente mediante `isPrimary` y edición diff/upsert de partes/rutas;
- vigencia mínima de un mes calendario para activar;
- renovación explícita con sucesor único y copia selectiva.

Permanecen pendientes las revisiones de valor, el historial contractual unificado, la inclusión selectiva en avisos, las fechas manuales y las notificaciones globales.

## 3. Objetivo V1.1

Gestión de Alquileres debe permitir administrar el ciclo completo de un contrato residencial con:

- identidad operativa clara;
- partes y datos de contacto preservados;
- alquiler mensual con revisiones auditables;
- obligaciones adicionales y vencimientos operativos;
- configuración explícita de contenidos y destinatarios de futuros avisos;
- historial contractual y renovación sin perder trazabilidad;
- una agenda mensual útil para la operación inmobiliaria.

El dominio sigue siendo multi-tenant. `Tenant` representa la inmobiliaria u organización usuaria; nunca representa al inquilino.

## 4. Ciclo de vida contractual

### 4.1 Estados

Se mantiene el ciclo:

```txt
DRAFT → ACTIVE → ENDED
   └────────────→ CANCELLED
ACTIVE ─────────→ CANCELLED
```

- `DRAFT`: puede estar incompleto y editarse.
- `ACTIVE`: contrato operativo que satisface todas las invariantes de activación.
- `ENDED`: contrato finalizado con historia preservada.
- `CANCELLED`: contrato descartado o interrumpido con historia preservada.

No se reabre un estado terminal.

### 4.2 Requisitos de activación

**IMPLEMENTADO en Fase 1**. Para pasar de `DRAFT` a `ACTIVE` se requiere:

1. fecha de inicio;
2. fecha final;
3. fecha final posterior a la fecha de inicio;
4. duración mínima de un mes calendario;
5. al menos una parte `RENTER` activa;
6. exactamente una parte `RENTER` con `isPrimary = true`;
7. obligación `RENT` correctamente configurada.

La duración mínima se define como:

```txt
endsOn >= startsOn + 1 mes calendario
```

Si el día equivalente no existe en el mes destino, se utiliza el último día calendario de ese mes. Ejemplo: un inicio el 31 de enero alcanza un mes calendario el último día de febrero.

Alquileres temporarios inferiores a un mes: **DEFER**.

## 5. Identidad del contrato

**IMPLEMENTADO en Fase 1**: todo contrato tiene un identificador visible con formato:

```txt
ALQ-000001
```

Reglas:

- prefijo fijo `ALQ-`;
- seis dígitos con ceros a la izquierda;
- correlativo independiente por tenant;
- generación automática y concurrent-safe;
- único dentro del tenant;
- no reutilizable aunque el contrato sea cancelado;
- buscable y visible en listados, detalle, edición, renovación e historial.

La generación utilizará una secuencia persistida tenant-scoped con incremento atómico dentro de la transacción de creación. Queda prohibido calcular el siguiente valor con `COUNT(*) + 1` o con una lectura no bloqueante seguida de escritura.

## 6. Propiedad y dirección contractual

### 6.1 Referencia opcional

`Property` continúa siendo una referencia opcional. Un contrato puede existir sin vincularse a una propiedad del catálogo.

Seleccionar una propiedad:

- precarga su información de ubicación;
- deja todos los campos contractuales editables;
- no crea sincronización permanente.

Modificar el contrato nunca modifica `Property`. Los cambios posteriores en `Property` nunca alteran el contrato.

### 6.2 Fuente histórica

La dirección administrativa/contractual es la fuente histórica del contrato e incluye:

- calle;
- número;
- piso;
- departamento;
- provincia;
- localidad;
- barrio;
- código postal.

Argentina es implícita y default en V1. Las referencias geográficas pueden facilitar selección y búsqueda, pero los snapshots contractuales preservan lo acordado.

Esta estructura base está **IMPLEMENTADA en B.1**. La UX V1.1 mantendrá el mismo principio.

## 7. Personas y partes contractuales

### 7.1 Persona

Una persona externa se representa mediante `Contact`, separada de `User`.

Datos funcionales:

- nombre;
- tipo de documento;
- número de documento;
- múltiples emails;
- múltiples teléfonos.

**IMPLEMENTADO en Fase 1** con los tipos canónicos de documento:

- `DNI`;
- `CUIT`;
- `CUIL`;
- `PASSPORT` — la UX muestra “Pasaporte”.

`ContactPoint` mantiene:

- tipo `EMAIL` o `PHONE`;
- default por tipo;
- estado activo;
- capacidades WhatsApp y SMS para teléfonos.

### 7.2 Modelo N:M

**IMPLEMENTADO en B.1**: un contrato puede tener múltiples partes `RENTER` y múltiples partes `LANDLORD`. Los propietarios son opcionales.

**IMPLEMENTADO en Fase 1**:

- una parte `RENTER` puede marcarse `isPrimary`;
- un contrato activo tiene exactamente un `RENTER` principal;
- `isPrimary` significa referente administrativo;
- ser principal no implica ser el único destinatario de avisos.

La edición de partes y rutas preserva IDs estables mediante diff/upsert transaccional. No se borran y recrean relaciones o rutas que no cambiaron.

## 8. Alquiler

### 8.1 Fuente de verdad

El alquiler sigue siendo técnicamente la obligación cuyo concepto base es `RENT`. No se duplican importe, moneda o vencimiento en `RentalContract`.

**APROBADO / PENDIENTE**: en producto y UX, `RENT` tendrá una experiencia propia dentro del wizard y del detalle; no se presentará como una obligación genérica.

### 8.2 Configuración V1

El alquiler V1 tiene:

- frecuencia de pago mensual fija;
- valor inicial;
- moneda;
- día máximo de pago entre 1 y 31;
- frecuencia de actualización del valor.

Si un mes no contiene el día máximo elegido, vence el último día calendario. La UX no pregunta frecuencia de pago porque es mensual en V1.

Debe distinguirse siempre:

- **frecuencia de pago**: mensual;
- **frecuencia de actualización del valor**: cada 3, 4, 6 u otro intervalo entre 1 y 12 meses.

La actualización es inicialmente manual. IPC e ICL: **DEFER**.

### 8.3 Revisiones de valor

**APROBADO / PENDIENTE**: las variaciones se registrarán con una operación específica sobre `RentalRentValueRevision`; no mediante un `PATCH` genérico de `defaultAmount`.

Cada revisión registra al menos:

- obligación `RENT`;
- `effectiveFrom`;
- importe;
- moneda;
- actor opcional;
- motivo opcional;
- timestamps.

La primera revisión representa el valor inicial. La próxima actualización se deriva de la última revisión efectiva y del intervalo configurado.

Una revisión ordinaria no puede cambiar la moneda. Un cambio de moneda es una modificación contractual excepcional y queda fuera del flujo de actualización.

Al registrar una revisión:

- se actualizan en la misma transacción las occurrences futuras afectadas que sigan `PENDING`;
- nunca se modifican occurrences cumplidas;
- nunca se modifican occurrences canceladas;
- nunca se modifican períodos anteriores a `effectiveFrom`;
- se conserva auditoría del cambio.

## 9. Obligaciones adicionales

### 9.1 Tipos y presentación

Se mantienen los tipos técnicos:

- `RECURRING`;
- `ONE_TIME`.

La UX muestra:

- Recurrente;
- Puntual.

### 9.2 Recurrencia

**APROBADO / PENDIENTE** ofrecer presets:

- mensual;
- bimestral;
- trimestral;
- cuatrimestral;
- semestral;
- anual;
- personalizada entre 1 y 12 meses.

La vigencia permite:

- fecha `Desde`;
- hasta fin del contrato;
- o fecha final específica.

El importe puede ser fijo o variable.

### 9.3 Política de vencimiento

**APROBADO / PENDIENTE** distinguir:

- día fijo;
- fecha definida manualmente en cada período.

Para `MANUAL_PER_PERIOD`, la occurrence puede existir sin fecha definitiva. La UX muestra **“Fecha pendiente”** hasta que el administrador la complete. No se inventa una fecha provisional.

La implementación deberá hacer `dueDate` nullable o adoptar un mecanismo equivalente que preserve esta semántica.

## 10. Avisos: configuración previa a Migración C

Los canales aprobados son:

- WhatsApp;
- Email;
- SMS.

Los `ContactPoint` pertenecen a la persona. La selección efectiva pertenece a:

```txt
Contrato + Persona + Canal
```

Reglas:

- un único `ContactPoint` por canal/persona/contrato;
- varios canales pueden estar habilitados simultáneamente;
- el punto seleccionado debe estar activo, pertenecer a la persona y soportar el canal;
- la selección nunca se guarda como preferencia global del contacto;
- las rutas deben conservar IDs estables al editar.

Por obligación se incorporarán:

- `includeInNotice`;
- `showAmount`.

Constraint funcional:

```txt
showAmount = true requiere includeInNotice = true
```

Si `includeInNotice` pasa a `false`, `showAmount` debe quedar en `false` en la misma operación.

Defaults para contratos nuevos:

| Obligación |    includeInNotice |                                 showAmount |
| ---------- | -----------------: | -----------------------------------------: |
| `RENT`     |             `true` |                                     `true` |
| Adicional  | Elección explícita | Elección explícita, condicionada a include |

Backfill conservador:

| Obligación existente | includeInNotice | showAmount |
| -------------------- | --------------: | ---------: |
| `RENT`               |          `true` |     `true` |
| Cualquier otra       |         `false` |    `false` |

Antes de Migración C sólo se consolidarán partes, rutas, canales, punto seleccionado, obligaciones incluidas y visibilidad del importe.

**DEFER a Migración C**:

- anticipación;
- horario;
- repetición;
- templates;
- planner;
- dispatch;
- delivery;
- proveedores;
- callbacks.

La persistencia de rutas de B.1 está **IMPLEMENTADA**; los flags por obligación y la preservación de IDs están **APROBADOS / PENDIENTES**. No existe todavía envío de mensajes.

## 11. Operación mensual

Occurrences, cumplimiento, reversión y estado `OVERDUE` derivado permanecen como base operativa.

La pantalla mensual tendrá categorías:

- Todos;
- Alquileres;
- Otras obligaciones;
- Vencidos.

`OVERDUE` no se persiste. Se deriva de la fecha de vencimiento, el estado y la zona horaria del tenant.

Importes variables y fechas manuales pueden quedar pendientes. La UX debe mostrar claramente cada dato pendiente y permitir completarlo sin fabricar valores.

## 12. Historial contractual

**APROBADO / PENDIENTE**: `RentalContractEvent` será append-only y registrará eventos contractuales relevantes, por ejemplo activación, finalización, cancelación, cambios de partes, revisiones de alquiler y renovación.

No se duplicará auditoría detallada ya existente en fulfillment/reversal. La API de historial podrá unificar eventos contractuales y otras fuentes auditables en una cronología común.

UX aprobada: tabla o lista filtrable, ordenable y paginada.

## 13. Renovación

**IMPLEMENTADO en Fase 1**: renovar crea un contrato nuevo relacionado. Nunca modifica ni reutiliza el anterior.

Reglas:

- relación `previousContractId` o equivalente;
- un contrato puede tener como máximo un sucesor directo válido;
- la prevención de doble renovación debe ser concurrent-safe;
- se permite renovar desde `ACTIVE` o `ENDED`;
- no se permite desde `DRAFT` ni `CANCELLED`;
- el nuevo contrato siempre comienza `DRAFT` y recibe un nuevo número;
- su inicio se precarga al día siguiente del fin del contrato anterior y su fecha final queda incompleta para edición.

Se precarga como sugerencia:

- propiedad;
- dirección contractual;
- partes;
- último alquiler;
- moneda;
- día de pago;
- frecuencia de actualización;
- obligaciones recurrentes activas;
- configuración de avisos compatible.

No se copian:

- occurrences;
- fulfillments;
- historia monetaria de occurrences;
- obligaciones puntuales antiguas.

## 14. Notificaciones internas globales

**APROBADO / PENDIENTE** y no exclusivo de Rental: el Admin tendrá un modelo global `Notification` con:

- tenant;
- usuario destinatario;
- tipo;
- título;
- cuerpo;
- `resourceType` y `resourceId`;
- `actionUrl`;
- `deduplicationKey`;
- `readAt`;
- `createdAt`.

La campanita incluirá badge de no leídas, dropdown, leído/no leído, acceso directo y página “Ver todas”.

Los generadores Rental iniciales podrán dirigir notificaciones a usuarios del tenant con permisos Rental relevantes. Los destinatarios se persistirán individualmente para permitir preferencias futuras.

No confundir:

- `Toast`: feedback inmediato de una acción propia;
- `Notification`: evento que requiere atención;
- historial: auditoría o cronología del recurso.

## 15. Multi-tenancy y permisos

Toda entidad funcional pertenece a un tenant. Toda referencia funcional se valida contra el mismo tenant en backend.

Se mantiene el comportamiento actual: `AGENT` opera dentro del tenant según sus permisos Rental. No se introduce todavía asignación o scoping de contratos por agente.

Permiso **IMPLEMENTADO en Fase 1**:

- `rental.contract.renew` para `SUPER_ADMIN`, `TENANT_ADMIN` y `MANAGER`.

Permisos **APROBADOS / PENDIENTES**:

- `rental.fulfillment.reverse`;
- `rental.reminder.manage`;
- evaluar `rental.concept.manage`.

## 16. Arquitectura de pantallas aprobada

**APROBADO / PENDIENTE**:

- Resumen Rental.
- Listado de contratos con número visible y búsqueda.
- Wizard Nuevo/Editar:
  1. Información básica.
  2. Partes.
  3. Alquiler.
  4. Obligaciones.
  5. Avisos.
- Detalle:
  - General.
  - Historial.
- Vencimientos mensual.
- Renovación.
- Campanita global del Admin.

Los mockups visuales existen externamente y se proporcionarán durante los gates UI. No forman parte de esta especificación documental ni deben recrearse aquí.

## 17. Frontera de implementación

### 17.1 Implementado actualmente

- Migración A: contactos, puntos de contacto, conceptos, contrato y timezone.
- Migración B: obligaciones, occurrences, fulfillment y reversión.
- Refinamiento B.1: dirección estructurada, partes múltiples, rutas por persona/canal y documento libre opcional.
- Rental V1.1 Fase 1: identidad contractual, documentos canónicos, renter principal, diff/upsert estable, vigencia reforzada y renovación.

### 17.2 Aprobado pero pendiente después de Fase 1

- experiencia específica de alquiler y revisiones de valor;
- presets de recurrencia y vencimiento manual por período;
- flags de inclusión y visualización de importe;
- historial contractual;
- notificaciones internas globales;
- arquitectura de pantallas V1.1;
- permisos pendientes.

### 17.3 Migración C

**NO INICIADA**. Contendrá el sistema de ejecución de avisos y comunicaciones sólo después de consolidar el refactor aprobado anterior.

## 18. Criterios de aceptación documental V1.1

La especificación queda consistente cuando:

1. no presenta modelos futuros como implementados;
2. partes y rutas usan el modelo N:M por contrato/persona/canal;
3. `RENT` sigue siendo la única fuente de verdad del alquiler, con UX propia;
4. activación, numeración y referente principal tienen reglas inequívocas;
5. revisiones monetarias preservan historia y occurrences cerradas;
6. fechas manuales nunca reciben una fecha ficticia;
7. configuración previa a C se separa del envío de comunicaciones;
8. renovación crea un contrato nuevo y evita sucesores duplicados;
9. `Notification`, historial y toast permanecen conceptualmente separados;
10. Migración C continúa explícitamente no iniciada.

## 19. Decisiones diferidas

- alquileres temporarios inferiores a un mes;
- actualización automática por IPC o ICL;
- cambio ordinario de moneda;
- asignación de contratos por agente;
- anticipación, horarios, repetición y templates de avisos;
- planner, dispatch, delivery, proveedores y callbacks;
- preferencias personales de notificación;
- portal de inquilinos o propietarios;
- firma digital y almacenamiento de documentos legales.
