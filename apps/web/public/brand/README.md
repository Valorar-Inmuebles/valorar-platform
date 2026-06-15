# Brand assets (tenant placeholders)

Colocá los archivos de marca del tenant en esta carpeta. **No commitear assets reales de clientes** salvo acuerdo explícito.

## Archivos esperados

| Archivo | Uso | Referencia en código |
| ------- | --- | -------------------- |
| `logo.svg` | Header y Footer | `components/layout/header-logo.tsx` — reemplazar texto por `<Image src="/brand/logo.svg" />` |
| `favicon.ico` | Icono del sitio | Copiar a `apps/web/app/favicon.ico` o `apps/web/public/favicon.ico` |
| `og-image.jpg` | Open Graph / redes (1200×630) | `config/site.ts` → `openGraph.images` |

## Notas

* Formatos alternativos para logo: `logo.png` (actualizar rutas en componentes).
* `og-image.jpg` debe existir antes de producción para previews correctas en WhatsApp/Facebook.
* Los colores de marca se configuran vía variables de entorno (`PUBLIC_PRIMARY_COLOR`, `PUBLIC_SECONDARY_COLOR`) hasta existir Public Tenant API.
