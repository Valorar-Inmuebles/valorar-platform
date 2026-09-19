---
name: valorar-engineering
description: Guía implementación, refactor, debugging, migraciones, API, Admin, base de datos, tests y revisión técnica dentro de valorar-platform. Úsala sólo para trabajo de ingeniería en este repositorio; no para consultas funcionales, redacción general ni tareas ajenas al código.
---

# Valorar engineering

Trabaja por gates acotados y conserva la arquitectura existente. La documentación canónica del repositorio prevalece sobre código, comentarios o conversación desactualizados.

## Antes de actuar

1. Confirma alcance, rama, HEAD y estado del worktree. Trata cambios preexistentes como propiedad del usuario.
2. Lee `AGENTS.md`, `AI_RULES.md` y las fuentes canónicas relevantes. Empieza por `PROJECT_STATE.md`, arquitectura y documentos del dominio afectado; después inspecciona archivos, tests y patrones cercanos.
3. Usa descubrimiento progresivo: búsquedas dirigidas, `git diff` y archivos afectados. No releas todo el repositorio, repitas auditorías cerradas ni reabras decisiones aprobadas salvo incompatibilidad real.
4. Expón cualquier supuesto que pueda cambiar el resultado. No inventes requisitos ni datos legacy.

## Implementación

- Realiza el cambio mínimo coherente con el gate. Conserva compatibilidad salvo decisión explícita y evita refactors laterales.
- Investiga y reutiliza módulos, componentes, paquetes compartidos y utilidades antes de crear otros.
- Mantén la frontera Controller → Service → Repository → Prisma en API. Valida DTOs, invariantes y errores de dominio en backend.
- Trata `tenantId` como frontera de seguridad: filtra lecturas y escrituras, valida referencias cruzadas y cubre casos tenant-negative.
- Aplica RBAC en API, no sólo en UI. No amplíes roles o permisos sin decisión documentada.
- Para colecciones grandes usa búsqueda, filtros, sorting allowlisted y paginación server-side. Prefiere read models adecuados sobre endpoints chatty; revisa N+1, payloads, carga completa, queries y trabajo repetido antes de optimizar.
- El Admin consume la API HTTP y nunca Prisma. Reutiliza `@repo/ui`, tipos/utilidades compartidos y controles existentes; no expongas enums internos. La UI de producto es en español y contempla loading, error, empty, accesibilidad y responsive sin duplicar dominio del backend.
- Actualiza documentación sólo cuando cambien arquitectura, schema o reglas de negocio, sin duplicar especificaciones canónicas.

## Prisma y Neon

Cuando una tarea involucre Prisma, usa la skill oficial de Prisma instalada y respeta la versión real del proyecto. Revisa schema y migraciones existentes antes de generar cambios; no reproduzcas su documentación dentro de esta skill.

Cuando corresponda operar con Neon, usa la skill oficial de Neon instalada. Identifica project, branch y endpoint antes de cualquier escritura, prefiere branches aisladas y conserva las protecciones adicionales del repositorio.

Antes de tocar estructura o datos, lee [references/database-safety.md](references/database-safety.md).

## Calidad y cierre

- Implementa con tests focalizados, luego ejecuta la suite del módulo y amplía la regresión al cerrar el gate cuando el riesgo lo justifique.
- Prioriza pruebas de tenant isolation, RBAC, invariantes, concurrencia, idempotencia, límites/fechas y regresiones reales. Evita tests triviales que sólo repitan la implementación.
- Ejecuta sólo las validaciones aplicables y no repitas herramientas costosas sin cambios relevantes. Usa [references/quality-gates.md](references/quality-gates.md) para seleccionar controles y revisar performance.
- No hagas push ni avances al siguiente gate sin autorización. Mantén commits lógicos y acotados. No ejecutes reset, rebase, force-push, borrado de ramas u operaciones destructivas sin autorización explícita.
- Para el cierre usa [references/gate-report.md](references/gate-report.md) y resume resultados exitosos; muestra detalle sólo para errores o desviaciones relevantes.

## Detente y pide decisión

Detente antes de mutar cuando exista riesgo de producción, una migración aplicada parezca requerir edición, datos existentes exijan inventar información, documentación y schema se contradigan, falte una decisión funcional material, aparezcan cambios ajenos que no puedan preservarse o sea necesaria una operación destructiva.
