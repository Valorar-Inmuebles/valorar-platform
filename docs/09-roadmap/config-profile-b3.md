# Configuración UX B3 — Perfil y contraseña segura

## Implementación local

- `/configuracion/perfil`: grid de una columna y dos desde `lg`; información
  personal primero y Seguridad después. Cards y campos del UI Kit existente.
- `ProfileSettings`: composición común para tenant, Super Admin y error de carga
  personal. Super Admin conserva edición limitada, con contraseña disponible.
- `ProfileForm`: datos personales, validaciones/Toast existentes, envío independiente
  y sin password. Email informativo como antes.
- `PasswordChangeForm`: tres campos con autocomplete, controles mostrar/ocultar,
  validación por campo, protección de doble envío y limpieza después de éxito.
- `PasswordStrengthMeter`: Muy débil / Débil / Aceptable / Fuerte, semántica meter
  y texto accesible. Heurística local de longitud/diversidad/patrones comunes, sin
  estimación de entropía ni garantía de seguridad. No determina la aceptación.
- Cliente HTTP y Server Action separados, allowlist de payload, 204, errores
  sanitizados por código y retryAfterSeconds para 429. Sin cambios de cookies/JWT.
- RealData mantiene el bloqueo de mutaciones en API; se presenta el error original
  de sólo lectura, sin alterar infraestructura/protecciones ni acceder a esa DB.

## Alcance preservado

Backend B2, schema/migraciones, P1.3, Rental, RealData y overlays sin cambios en
este gate. Sin dependencias nuevas ni escrituras DB fuera de los fixtures B2
aislados/autolimpiables; sin push ni deployment.

## Validación y UAT

Tests: helpers de política/medidor/errores, DOM React con componentes reales y
Server Actions con fetch/cookies simulados. La prueba de RealData usa su predicado
existente para rechazar ambos PATCH; no es una prueba conectada al entorno.

Las verificaciones responsive DOM a 390/1440 son estructurales (orden y clases),
no mediciones del layout CSS. No hubo navegador conectado: UAT visual real,
autofill/password managers y lector de pantalla quedan pendientes.

### Recorrido de UAT

1. Desktop y mobile: dos cards sin overflow, jerarquía, orden y teclado.
2. Guardar datos personales mientras Seguridad tiene un borrador; comprobar
   independencia, Toast y persistencia del perfil.
3. Actual incorrecta, política inválida, confirmación distinta y reutilización.
4. Medidor, mostrar/ocultar y validación de emoji/acentos/espacios sin transformación.
5. Éxito: campos vacíos/ocultos, sesión actual conservada; otras sesiones continúan.
6. 429: texto y espera, reenvío bloqueado, habilitación al vencer; API autoritativa.
7. Super Admin sin tenant, fallo de información personal y error de red.
8. RealData: rechazo de ambos formularios sin mutaciones.

No afirmar revocación de otras sesiones. Ajustes visuales de alta/reset de otros
usuarios y revocación JWT pertenecen a gates distintos.

## Gates técnicos

- Suite Admin completa: 22 archivos, 165/165 tests aprobados.
- Tests B3: 37/37 (17 helpers, 5 integración HTTP/Server Action simulada,
  15 DOM de formularios).
- Typecheck Admin y build Next.js: aprobados.
- ESLint focalizado con cero warnings, Prettier TS/TSX B3 y reporte: aprobados.
- `git diff --check`: aprobado.
- Build informa la advertencia preexistente de convención middleware → proxy.
- Release candidate: `release/release2-password-profile-20261014`, base
  `origin/main` `b366d2c5d290cb07492f29970d89c6a0ed87a4ac`; commit B3
  `2603a53`. Sin push ni deployment.

**GO para UAT** de Perfil y cambio seguro. La fidelidad visual, interacción real
con gestores de contraseñas y accesibilidad con lector requieren navegador;
este gate no presenta las pruebas jsdom como sustituto de esa revisión.

La publicación depende del procedimiento coordinado B2: mantenimiento del
Admin, migración aditiva, API B2, Admin B3, smoke y reapertura. No publicar B3
antes de B2 ni exponer el formulario legacy contra API B2.
