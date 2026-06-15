# AGENTS

## Propósito

Este proyecto utiliza documentación como fuente de verdad.

Antes de realizar cualquier cambio, toda IA debe comprender el estado actual del proyecto mediante los documentos oficiales.

---

# Orden de lectura obligatorio

Al iniciar una nueva sesión:

1. PROJECT_STATE.md
2. docs/01-business/vision.md
3. docs/02-architecture/monorepo.md
4. docs/03-database/*
5. docs/04-modules/*

---

# Regla principal

La documentación es la fuente de verdad.

Si existe contradicción entre:

* Código
* Comentarios
* Conversación
* Documentación

Debe prevalecer la documentación más reciente.

---

# Arquitectura

Stack oficial:

Frontend:

* Next.js
* TypeScript
* TailwindCSS

Backend:

* NestJS
* Prisma

Base de datos:

* PostgreSQL

Infraestructura:

* GitHub
* Vercel
* Railway
* Neon

---

# Monorepo

```txt
apps/
├── admin
├── api
└── web

packages/
├── ui
├── shared-types
├── eslint-config
└── typescript-config
```

---

# Convenciones

Base de datos:

* Inglés

Código:

* Inglés

UI:

* Español

Documentación:

* Español

---

# Antes de crear una tabla

Debe existir documentación previa en:

docs/03-database

o

docs/04-modules

---

# Antes de crear un módulo

Debe existir documentación funcional.

---

# Antes de modificar una entidad

Revisar:

* current-schema.md
* módulo correspondiente

---

# Migraciones

Toda modificación estructural requiere:

1. Cambio Prisma
2. Migración Prisma
3. Actualización documentación

Nunca realizar uno sin los otros.

---

# Permisos

Nunca asumir permisos.

Siempre revisar:

* Tenant
* User
* UserRole

---

# Multi Tenant

Todo dato de negocio debe pertenecer a un Tenant.

Ninguna entidad funcional debe quedar sin tenantId salvo justificación explícita.

---

# Storage

El sistema debe permanecer compatible con:

* Cloudflare R2
* AWS S3
* Supabase Storage

Nunca acoplar el dominio a un proveedor específico.

---

# Objetivo

Mantener una plataforma SaaS inmobiliaria escalable y consistente a largo plazo.
