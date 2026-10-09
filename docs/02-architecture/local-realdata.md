# RealData local — configuración aislada

Estado: mecanismo preparado y versionado localmente; sin push/deployment.
La preparación y el cierre Git no conectaron ni iniciaron API en la nueva branch.

## Contrato

- Perfil separado: `apps/api/.env.realdata.local` (gitignored).
- Único endpoint permitido: `ep-orange-resonance-acqkorp6.sa-east-1.aws.neon.tech`,
  conexión directa a `neondb`. Producción y rental-management-dev se rechazan.
- Se requieren project ID y branch ID reales, copiados del panel Neon para
  `valorar-db / dev-valorar-realdata`. El nombre de branch no reemplaza su ID.
- `check` valida offline; `inspect` usa PostgreSQL READ ONLY y verifica identidad;
  `api` verifica identidad antes de iniciar y cada reinicio vuelve a comprobarla.
- API en `127.0.0.1:3202`, Admin en `127.0.0.1:3201`, con artefactos Next separados.
- El perfil visual bloquea mutaciones HTTP y usa conexiones PostgreSQL read-only.
  Login conserva validación de contraseña, JWT y tenant; omite únicamente la
  actualización `lastLoginAt` en este perfil. No permite editar datos/usuarios.
- El launcher no hereda credenciales de storage, MailerSend, WhatsApp o SMS.
  No ofrece seeds, migraciones, fixtures ni workers.
- No se modifica `.env.development.local` ni `db-development.ts`.

## Auditoría del wrapper existente

`db-development.ts` carga `.env.development.local`, valida un denylist de
producción y mezcla `process.env`. Acepta seeds, migraciones, fixtures y workers.
Su inspector no fija explícitamente transacciones READ ONLY. Además `main.ts`
carga `dotenv/config`: las variables ausentes pueden completarse desde `.env`,
incluidas credenciales productivas de storage/mensajería. No se reutiliza ese
launcher para RealData y no se altera su comportamiento para Rental.

`db-realdata.ts` usa una allowlist del host completo, base y cuatro claves de
configuración. No admite conexiones pooler, host alternativo ni parámetros de
conexión que cambien el destino. Sólo hereda variables de sistema necesarias
para ejecutar Node. Fuerza `sslmode=verify-full` y
`options=-c default_transaction_read_only=on` en la conexión. El archivo dotenv
del hijo API queda fijado al archivo RealData ya validado, sin override.

En Admin se neutralizan las claves de sus `.env*`, se fuerza la API local y se
retiran URL de DB y secret JWT. El storage no queda configurado; los adaptadores
MailerSend y WhatsApp fallan por falta de credenciales antes de hacer requests.
SMS no tiene canal operativo en el código actual. No se lanzan workers. El
middleware HTTP también rechaza mutaciones y webhooks en RealData.

## Configuración exacta (PowerShell desde la raíz)

Ya existe `.env.realdata.local` con una URL del endpoint indicado y las claves
`NODE_ENV`/`VALORAR_DATABASE_ENV` heredadas del perfil Development. No se ha
sobrescrito. Para nuevas instalaciones, copiar el ejemplo sólo si no existe:

```powershell
if (!(Test-Path apps/api/.env.realdata.local)) {
  Copy-Item apps/api/.env.realdata.local.example apps/api/.env.realdata.local
}
notepad apps/api/.env.realdata.local
```

En Neon seleccionar **valorar-db → dev-valorar-realdata → Connect → neondb →
Direct connection**. Copiar localmente la URL. No cambiar el `DATABASE_URL` de
`.env`, `.env.development.local`, Railway o Vercel, ni exportarlo globalmente.

El archivo debe contener **únicamente** estas cuatro claves:

```dotenv
DATABASE_URL=postgresql://<usuario>:<password>@ep-orange-resonance-acqkorp6.sa-east-1.aws.neon.tech/neondb?sslmode=require
REALDATA_NEON_PROJECT_ID=<id-del-proyecto-valorar-db>
REALDATA_NEON_BRANCH_ID=<br-id-de-dev-valorar-realdata>
JWT_SECRET=<secret-exclusivo-local-de-al-menos-32-caracteres>
```

Eliminar del archivo RealData las dos claves `NODE_ENV` y
`VALORAR_DATABASE_ENV`: las fija el launcher (`development` y `realdata`). No
agregar `STORAGE_*`, MailerSend, WhatsApp, SMS, `PG*` ni otras variables.
Los IDs se obtienen del panel Neon; no confundir branch name con branch ID ni
reutilizar los IDs de producción/Rental. No se infiere el ID a partir del nombre.

Generar un JWT nuevo en la terminal local y pegarlo sólo en este archivo:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
git check-ignore apps/api/.env.realdata.local
npm run db:realdata:check -w api
```

`check` no abre conexiones: valida configuración y muestra sólo endpoint/base.
El archivo actual se rechaza offline hasta completar el formato. No compartir
la URL, la contraseña ni el secret en el chat o en logs.

## Inspección y arranque (para ejecutar después de completar el archivo)

```powershell
# PostgreSQL read-only; no levanta la API, no lista usuarios ni datos personales.
npm run db:realdata:inspect -w api

# Terminal 1: inspección de identidad antes de arrancar; sin seeds/migraciones.
npm run start:realdata -w api

# Terminal 2: Admin independiente apuntando exclusivamente a la API 3202.
npm run admin:realdata -w api
```

Abrir `http://127.0.0.1:3201`. API sólo escucha en `127.0.0.1:3202`.
No usar `npm run dev`, `start:dev:database` ni comandos `db:dev:*` para RealData.
Detener con Ctrl+C. No se ejecutaron estos comandos de inspección/arranque en
esta preparación; sólo se ejecutó `check` offline con rechazo esperado.

El inspector verifica project, branch, endpoint, database y read-only en una
transacción `REPEATABLE READ READ ONLY`, cuenta Property/PropertyImage y
Development/DevelopmentImage/DevelopmentTypology y cierra con ROLLBACK. La API
repite el guard antes de aceptar tráfico, incluso después de reiniciar el watcher.
Los errores de conexión del preflight se reducen a mensajes sin credenciales.

## Límites y riesgos residuales

- El perfil es **visual/read-only**: no permite probar publicar, archivar,
  editar, subir/eliminar imágenes ni comunicaciones. POST login/logout están
  permitidos; la contraseña, usuario activo, tenant y RBAC siguen siendo los
  existentes. El login no actualiza `lastLoginAt` en RealData.
- Las URLs públicas absolutas de imágenes se leen directamente; no hace falta
  habilitar storage ni copiar objetos. Links Web/revalidación quedan deshabilitados
  en el launcher para no contactar el sitio productivo.
- Se requiere conocer las credenciales de un usuario ya presente en la copia;
  no se crean usuarios ni se resetean contraseñas.
- La branch copia datos reales. Evitar exportaciones, capturas con información
  personal y operaciones fuera del launcher. El guard protege estos comandos;
  no es un sustituto de permisos PostgreSQL de sólo lectura frente a SQL manual.
- Usar una sesión de navegador separada si otro Admin usa `127.0.0.1`: las cookies
  no se aíslan por puerto. El secret independiente impide aceptar JWTs de otro
  entorno. `.next-realdata` evita el lock/artefactos del Admin normal.
- Las credenciales válidas, identidad remota y login real aún no se verificaron.
  Una inspección fallida no autoriza cambiar el endpoint ni debilitar el guard.

## Verificación de la preparación

- 39 pruebas API aprobadas en cuatro suites: guard RealData, arranque Prisma con
  transporte simulado, login RealData y regresiones del guard Development.
- Prueba de carga `dotenv/config` en proceso hijo con credenciales ficticias:
  conserva la URL read-only y no incorpora credenciales externas.
- Typecheck API/Admin y compilación Nest: PASS.
- ESLint y Prettier focalizados; `git diff --check`: PASS.
- `db:realdata:check` contra el archivo local existente: rechazo esperado por
  formato incompleto, antes de crear un cliente PostgreSQL.
- Ninguna conexión a la nueva branch, login, escritura DB, seed, migración,
  fixture, envío, modificación de storage, commit, push ni deployment.

La lista anterior registra el gate original de preparación. En el cierre Git
posterior se versionó el mecanismo en un commit separado y se repitieron los
gates offline sobre el árbol stageado aislado, sin archivos de entorno locales.
No se verificó en ese cierre la identidad remota ni el estado actual de la
configuración privada; los conteos de RealData informados por el usuario no
constituyen evidencia de conexión ejecutada por estos gates.
