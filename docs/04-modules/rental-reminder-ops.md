# Runner operacional de Rental Reminders

Esta herramienta permite ejecutar pruebas controladas desde el runtime operativo
del API. No es el scheduler C5, no es una campaña y no reemplaza el worker
futuro.

El artefacto productivo incluye:

```text
dist/src/ops/rental-reminder-ops.js
```

Se ejecuta desde el directorio de `apps/api` dentro del runtime:

```bash
node dist/src/ops/rental-reminder-ops.js --help
```

También queda disponible el script:

```bash
npm run rental-reminder:ops -- --help
```

## Operación segura

- `tenantId` es obligatorio en todos los comandos.
- El planner nunca puede ejecutarse globalmente.
- El planner es dry-run por defecto.
- `--apply` es obligatorio para materializar.
- Los providers requieren `--apply --send`.
- Email y WhatsApp requieren `deliveryId`.
- Una delivery de otro tenant es rechazada.
- No se permiten seed, reset ni fixtures.
- La herramienta usa las variables del runtime y no modifica archivos `.env`.
- No debe usarse para procesamiento masivo.

## Comandos

Dry-run tenant-scoped:

```bash
node dist/src/ops/rental-reminder-ops.js planner --tenant-id=<TENANT_ID>
```

Materialización tenant-scoped:

```bash
node dist/src/ops/rental-reminder-ops.js planner --tenant-id=<TENANT_ID> --apply
```

Email específico:

```bash
node dist/src/ops/rental-reminder-ops.js email \
  --tenant-id=<TENANT_ID> \
  --delivery-id=<DELIVERY_ID> \
  --apply --send
```

WhatsApp específico:

```bash
node dist/src/ops/rental-reminder-ops.js whatsapp \
  --tenant-id=<TENANT_ID> \
  --delivery-id=<DELIVERY_ID> \
  --template-name=<TEMPLATE_NAME> \
  --template-language=<LANGUAGE_CODE> \
  --template-parameters=<none|rental-v1> \
  --apply --send
```

## Allowlists

Antes de invocar un processor/provider, el runner exige:

- `MAILERSEND_DEVELOPMENT_ALLOWED_RECIPIENT` para Email, comparado de forma
  case-insensitive.
- `META_WHATSAPP_DEVELOPMENT_ALLOWED_RECIPIENT` para WhatsApp, normalizado a
  E.164.

Una allowlist ausente o un destinatario distinto detiene la operación antes de
crear Attempt y antes de llamar al provider. Nunca se redirige el destinatario.

Las variables se toman exclusivamente del runtime operativo. No copiar secretos
al repositorio, al chat ni a `.env.development.local`.

## Flujo recomendado

1. Ejecutar planner dry-run.
2. Revisar candidatos, eventos, horarios y canales.
3. Ejecutar planner con `--apply` sólo para el tenant aprobado.
4. Identificar la delivery específica.
5. Ejecutar el comando del canal con allowlist y flags explícitos.

El runner reutiliza la lógica existente de timezone, ventanas, snapshots,
deduplicación, claims, leases, retries y processors.
