# Troubleshooting — Admin

Incidencias conocidas y cómo resolverlas en desarrollo o despliegue.

---

## `/propiedades` muestra "Database request failed" (post Fase 5)

**Síntoma:** Al ingresar a `/propiedades`, la pantalla muestra *Database request failed*. El Dashboard y otros módulos pueden seguir funcionando.

**Causa:** Tras Fase 5, `PropertyAccessService` lee `TenantSetting.propertyVisibilityPolicy` y `TenantSetting.propertyEditPolicy`. Si la migración no está aplicada, Prisma falla al consultar esas columnas y la API responde `400 Bad Request` con *Database request failed*.

**Migración requerida:** `202607020003_tenant_property_policies`

**Solución:**

```bash
cd apps/api
npx prisma migrate deploy
npx prisma migrate status
```

`migrate status` debe indicar que el schema está al día. Reiniciar la API si corresponde.

**Notas:**

## `/propiedades/[id]` muestra "Propiedad no encontrada" (404)

**Síntoma:** El listado en `/propiedades` funciona y muestra la propiedad, pero al abrir el detalle aparece la pantalla 404.

**Causa:** Tras Fase 5, el listado (`GET /properties`) aplica `PropertyAccessService.buildListWhere()`, mientras el detalle (`GET /properties/:id`) consultaba con `findById` y validaba acceso aparte con `assertCanViewProperty()`. Si esas rutas divergían, una propiedad visible en el listado podía responder 404 o 403 en detalle.

**Corrección:** `PropertyService.findOne()` usa el mismo `buildListWhere()` que el listado antes de resolver la propiedad.

**Verificación:**

```bash
# Con sesión autenticada y tenant activo
curl -b cookies.txt -H "X-Tenant-Id: <tenantId>" \
  http://localhost:3002/properties/<propertyId>
```

Debe devolver `200` para cualquier propiedad que aparezca en `GET /properties`.
