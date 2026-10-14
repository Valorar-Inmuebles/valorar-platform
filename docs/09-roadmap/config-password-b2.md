# Configuración UX B2 — seguridad backend de contraseña

## Alcance

Backend local, sin UI de Perfil, commit, push ni deployment. Contrato en
`docs/04-modules/auth.md`; estructura en `docs/03-database/current-schema.md`.

- Endpoint personal JWT para todos los roles y Super Admin sin tenant.
- Verificación bcrypt, política Unicode/UTF-8 y compare-and-set de credenciales.
- Consumo PostgreSQL independiente del cambio, antes de DTO y bcrypt.
- Ventana móvil estricta: cinco admisiones, no reinicia por éxito ni por 429.
- Sesiones actuales y de otros navegadores conservadas, sin cookie nueva.
- Perfil rechaza password; actualización administrativa rechaza cambio propio.
- Altas y resets autorizados de otros usuarios aplican la nueva política.

## Base de datos

Identidad validada por wrapper development y consulta read-only antes de migrar:

| Campo    | Valor                                             |
| -------- | ------------------------------------------------- |
| Proyecto | `square-lab-71259415`                             |
| Branch   | `br-hidden-mud-ach3itrr`                          |
| Endpoint | `ep-super-glade-ac3ywgv7`                         |
| Host     | `ep-super-glade-ac3ywgv7.sa-east-1.aws.neon.tech` |
| Base     | `neondb`                                          |

Migración aditiva `202610130001_password_change_rate_limit`, aplicada mediante
`npm run db:dev:migrate:deploy -w api`. Sin backfill. Historial 31/31 actualizado.
El test PostgreSQL verifica checksum SHA-256 de la migración aplicada.

SHA-256: `95914f2bf9b27b7a4d8a197a57abbac0ddbd9176f57b48ff27b8095bbead084c`.

Fixtures: dos tenants y usuarios sintéticos con prefijo aleatorio `b2-<uuid>`;
se eliminan al finalizar, junto con su rate limit por FK cascade. No se modifica
ninguna contraseña de usuarios preexistentes ni datos de Rental/P1.3/RealData.
Postflight: 1 Tenant, 5 User, 30 Property; conteos Rental iguales al preflight.

## Arquitectura y límites operativos

`PasswordChangeController → PasswordChangeService → PasswordChangeRepository`.
`JwtAuthGuard → PasswordChangeGuard → ValidationPipe → handler`.

El repositorio usa Prisma READ COMMITTED, inicialización concurrent-safe de fila,
SELECT FOR UPDATE y reloj PostgreSQL después del lock. La decisión y la poda se
persisten antes de salir del guard. No hay contador en memoria ni retry de commit
incierto. Timeouts locales: lock 1 s, statement 2 s, transacción 5 s y maxWait 2 s.
Las conexiones usan el PrismaService existente; no se añade servicio externo.

Sin scheduler/purga física automática: una fila por identidad, máximo cinco
timestamps, poda lógica al acceder y eliminación cascade. Índice expiresAt para
una futura purga acotada que respete locks. El cupo no depende de esa purga.

## Reproducción

Desde bash, después de verificar identidad y migración development:

```bash
npm test -w api -- --runInBand
PASSWORD_CHANGE_TEST_BRANCH_ID=br-hidden-mud-ach3itrr npm run test:password-change:postgres -w api
npm run check-types -w api
npm run build -w api
```

La suite PostgreSQL lee exclusivamente `.env.development.local`, aplica el guard
development y exige coincidencia de branch/endpoint/proyecto antes de escribir.
Jest necesita `--experimental-vm-modules` para el compilador WASM de Prisma 7;
el script lo incluye. El primer intento sin ese flag falló antes de crear fixtures.

## Compatibilidad y siguiente gate

Perfil Admin no se modifica en B2. Su solicitud legacy con password devuelve 400;
B3 debe separar formulario/payload y mapear códigos y retryAfterSeconds. Altas y
edición administrativa todavía deben adaptar sus indicaciones de política visual.
JWT previos no se revocan ni prolongan; login legacy permanece compatible.

El limiter cubre el endpoint autenticado de baja frecuencia; no sustituye un
limiter de login ni protección volumétrica. Fallos de DB impiden cambiar la
contraseña (503); un commit incierto puede consumir cupo conservadoramente.

## Validación y cierre

- Suite API: 106 suites, 901 tests aprobados, 1 omitido preexistente.
- Unitarios B2: 21/21 (incluidos en la suite API).
- PostgreSQL real: 26/26. Incluye todos los roles, bcrypt real, legacy de ocho
  caracteres y superior a 72 bytes, JWT distintos preexistentes, cinco cupos,
  ventana móvil, expiración, doce consumos concurrentes con dos clientes,
  recreación de cliente, lock timeout real, driver desconectado, rollback real
  de credenciales sin devolver cupo, CAS concurrente, bypass, RBAC/tenant,
  errores y comprobación de logs/respuestas sin credenciales.
- Prisma format/validate/generate, typecheck y build API: aprobados.
- ESLint B2 y Prettier TS/JSON B2: aprobados.
- ESLint global (sin --fix): 354 errores en 59 archivos preexistentes sin cambios
  en B2; ninguno en los archivos modificados o nuevos del gate. Principalmente
  formato y reglas TypeScript. No se corrigen fuera de alcance.
- `git diff --check`: aprobado.
- Branch `main`, HEAD `334870429402b1fead315cd24d69fb36868be10c`, siete commits
  locales previos preservados. Cambios B2 sin commit.

**GO técnico para B3**, con deuda preexistente de lint global registrada.
**No habilitar despliegue aislado B2** mientras Perfil siga enviando el campo
legacy. B3 no se inicia en este cierre.
