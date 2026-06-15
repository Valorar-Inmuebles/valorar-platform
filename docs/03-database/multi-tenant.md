# Multi Tenant Model

## Objetivo

Valorar Platform es una plataforma SaaS multi-tenant.

Cada inmobiliaria opera de forma independiente y aislada.

---

# Conceptos

## Tenant

Representa una inmobiliaria.

Ejemplos:

```txt
Valorar Inmuebles
Remax Centro
Lavven
```

Toda la información funcional pertenece a un Tenant.

---

## User

Representa una persona que utiliza el sistema.

Ejemplos:

```txt
Administrador
Corredor
Agente
```

Un usuario pertenece a un único Tenant.

---

# Jerarquía

```txt
Platform
│
├── Tenant A
│      ├── User
│      ├── Property
│      ├── Development
│      └── Lead
│
├── Tenant B
│      ├── User
│      ├── Property
│      ├── Development
│      └── Lead
│
└── Tenant C
       ├── User
       ├── Property
       ├── Development
       └── Lead
```

---

# Roles

## SUPER_ADMIN

Administrador global de la plataforma.

Responsabilidades:

* Gestionar tenants.
* Gestionar usuarios globales.
* Acceder a todos los datos.
* Soporte técnico.

No pertenece a ningún Tenant.

---

## TENANT_ADMIN

Administrador de una inmobiliaria.

Responsabilidades:

* Gestionar agentes.
* Gestionar propiedades.
* Gestionar emprendimientos.
* Gestionar leads.
* Configurar branding.
* Gestionar dominio.

Puede visualizar toda la información del Tenant.

---

## AGENT

Agente inmobiliario.

Responsabilidades:

* Crear propiedades.
* Gestionar propiedades asignadas.
* Gestionar leads asociados.

Su acceso está limitado.

---

# Ownership

Toda propiedad tiene un creador.

Ejemplo:

```txt
Property
└── createdById
```

---

## Ejemplo

```txt
Tenant
└── Valorar

Agent
└── Juan

Property
└── Casa Palermo
```

Juan es el propietario funcional de la propiedad.

---

# Compartición de Propiedades

Una propiedad puede ser compartida entre agentes.

Ejemplo:

```txt
Casa Palermo

Creada por:
Juan

Compartida con:
María
Pedro
```

---

# Property Access

Modelo futuro:

```txt
PropertyAgentAccess
```

Permite definir:

```txt
canView
canEdit
```

por agente.

---

# Web Pública

La web pública no depende del agente.

La web publica información a nivel Tenant.

Ejemplo:

```txt
valorarinmuebles.com.ar
```

Visualiza:

```txt
Todas las propiedades publicadas del Tenant
```

independientemente del agente creador.

---

# Aislamiento

Un Tenant nunca puede acceder a:

* Usuarios de otro Tenant.
* Propiedades de otro Tenant.
* Leads de otro Tenant.
* Configuración de otro Tenant.

---

# Reglas Obligatorias

## Regla 1

Toda entidad funcional debe tener tenantId.

Ejemplos:

```txt
Property
Development
Lead
```

---

## Regla 2

Las consultas siempre deben filtrar por tenantId.

---

## Regla 3

No utilizar datos globales salvo que sean catálogos del sistema.

Ejemplos:

```txt
PropertyType
Currency
PropertyStatus
```

---

## Regla 4

Los SUPER_ADMIN pueden omitir tenantId.

Los usuarios normales no.

---

# White Label

Cada Tenant puede personalizar:

* Dominio.
* Logo.
* Colores.
* Redes sociales.
* Información de contacto.

Ejemplo:

```txt
Tenant A
→ valorarinmuebles.com.ar

Tenant B
→ lavven.com.ar

Tenant C
→ remax-centro.com.ar
```

Todos utilizan la misma plataforma.

---

# Escalabilidad

El diseño debe permitir:

```txt
1 Tenant
10 Tenants
100 Tenants
1000 Tenants
```

sin cambios estructurales significativos.

---

# Principio Fundamental

El Tenant es la frontera de seguridad del sistema.

Toda decisión de arquitectura debe respetar este principio.
