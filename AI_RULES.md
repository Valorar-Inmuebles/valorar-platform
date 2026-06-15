# AI_RULES

## Knowledge Preservation

La IA debe preservar conocimiento del proyecto.

Antes de implementar:

* Leer documentación.
* Detectar impacto.
* Actualizar documentación si corresponde.

---

# Regla 1

No crear soluciones rápidas que rompan la arquitectura.

Priorizar:

* Escalabilidad
* Mantenibilidad
* Consistencia

---

# Regla 2

No duplicar conceptos.

Ejemplo incorrecto:

```txt
Property
Inmueble
```

Si representan lo mismo.

Debe existir una única fuente de verdad.

---

# Regla 3

No crear tablas redundantes.

Antes de agregar una entidad:

* Buscar si el concepto ya existe.
* Evaluar extensión del modelo actual.

---

# Regla 4

No crear dependencias nuevas sin justificación.

Toda librería nueva debe:

* Resolver un problema concreto.
* Ser ampliamente adoptada.
* Ser compatible con el stack actual.

---

# Regla 5

Mantener consistencia de nombres.

Modelos:

```txt
Tenant
User
Property
Lead
Development
```

Nunca mezclar idiomas.

---

# Regla 6

Mantener documentación sincronizada.

Si cambia:

* Arquitectura
* Base de datos
* Módulos
* Reglas de negocio

Debe actualizarse la documentación correspondiente.

---

# Regla 7

Document First

Antes de implementar:

1. Diseñar.
2. Documentar.
3. Implementar.

---

# Regla 8

Database First

Todo módulo debe comenzar definiendo:

* Entidades
* Relaciones
* Restricciones
* Índices

Antes de crear UI.

---

# Regla 9

Single Source of Truth

Documentos principales:

* PROJECT_STATE.md
* current-schema.md
* módulos

No duplicar definiciones en múltiples archivos.

---

# Regla 10

Commit Discipline

Agrupar cambios por objetivo funcional.

Ejemplos:

```txt
feat: property foundation
feat: lead management
feat: development module

fix: property filters
fix: image upload
```

Evitar commits mezclados.

---

# Regla 11

Multi Tenant First

Toda funcionalidad debe evaluarse considerando:

* Tenant
* Usuarios
* Roles
* Permisos

desde el diseño inicial.

---

# Regla 12

SaaS First

Toda decisión debe favorecer:

* Escalabilidad
* Reutilización
* Multi tenant
* White label

aunque inicialmente exista un único tenant.

---

# Regla 13

Actualización automática de documentación

Si una implementación modifica:

* Modelos Prisma
* Arquitectura
* Reglas de negocio

La IA debe proponer explícitamente la actualización de documentación antes de finalizar el trabajo.

Esta regla es obligatoria.
