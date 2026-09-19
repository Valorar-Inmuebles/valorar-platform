# Seguridad de base de datos

Lee esta referencia antes de cambiar Prisma, crear/aplicar migraciones, ejecutar seeds/backfills o escribir datos.

## Preflight

- Confirma el alcance autorizado y si la operación debe ser read-only o puede escribir.
- Usa la skill oficial de Prisma para trabajo Prisma y la skill oficial de Neon para operaciones Neon; conserva además estas reglas del repositorio.
- Verifica la versión instalada, `apps/api/prisma/schema.prisma`, migraciones existentes y documentación del dominio.
- Para Neon identifica explícitamente project, branch, endpoint, host y base. Nunca deduzcas que un destino es development por su nombre solamente.
- Usa `.env.development.local` y los comandos `npm run db:dev:* -w api`. El guard debe confirmar `VALORAR_DATABASE_ENV=development`, `NODE_ENV=development`, un endpoint distinto del baseline y ausencia del endpoint productivo protegido.
- Nunca muestres connection strings, passwords, tokens o contenido de archivos `.env`.

## Cambios estructurales

- No edites una migración ya aplicada. Un cambio estructural nuevo requiere schema, migración nueva y documentación sincronizada.
- Ejecuta un preflight read-only sobre datos existentes antes de diseñar constraints o backfills.
- Los backfills deben ser determinísticos, preservar IDs e historial y no inventar valores faltantes. Si un caso no puede resolverse sin suposición funcional, detente.
- Toda entidad funcional es tenant-scoped salvo excepción canónica explícita. Refuerza relaciones del mismo tenant en Service y, cuando sea viable, con constraints/FKs de base.
- Usa transacciones y protecciones concurrent-safe para operaciones multi-entidad que deban ser atómicas. Agrega idempotencia cuando pueda existir retry o ejecución repetida.
- Justifica índices con queries reales; evita índices especulativos.

## Aplicación y cierre

1. Ejecuta Prisma format, validate y generate después de cambios relevantes.
2. Aplica únicamente mediante el workflow development seguro y sólo si el gate lo autoriza.
3. Ejecuta postflight de invariantes, migration status y checksum del SQL aplicado.
4. Informa exactamente qué datos fueron modificados.

Producción no se modifica durante desarrollo sin autorización explícita e inequívoca. Si el wrapper seguro falla antes de conectar, no lo eludas silenciosamente: conserva sus verificaciones y reporta cualquier fallback necesario.
