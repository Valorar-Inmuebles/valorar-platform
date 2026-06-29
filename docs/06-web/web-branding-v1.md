# Web Branding V1

Versión: v1  
Estado: Implementado  
Alcance: `apps/web` — UX/UI y branding multi-tenant (sin persistencia Admin).

---

## Objetivo

Infraestructura de theme por tenant y aplicación visual para **Valorar Siempre Inmuebles** en Home, Header, Hero, Cards compartidas y Footer.

---

## Estructura

```txt
apps/web/branding/
├── theme.types.ts    # TenantTheme, ThemeColors, ThemeTypography, ThemeBranding
├── theme.ts          # getTenantTheme(), buildThemeCssVars()
└── tenant-theme.ts   # DEFAULT_TENANT_THEME

apps/web/components/branding/
└── theme-provider.tsx

apps/web/components/icons/
└── Icon base + iconos lineales SVG
```

---

## Tokens semánticos

| Token CSS | Tailwind | Valor default | Uso |
| --------- | -------- | ------------- | --- |
| `--color-brand-green` | `brand-green` | `#15351d` | Marca, nav activo, links |
| `--color-brand-orange` | `brand-orange` | `#ee680f` | Acento marca |
| `--color-action-primary` | `action-primary` | `#ee680f` | CTA principal (Buscar) |
| `--color-action-secondary` | `action-secondary` | `#15351d` | CTA secundario (Ver propiedades) |

**No** usar `primary` / `secondary` como conceptos de marca en componentes nuevos. Los aliases legacy (`--color-primary`, `--color-secondary`) existen solo para páginas no migradas (listado, detalle).

---

## Override por entorno

```env
PUBLIC_PRIMARY_COLOR=#15351d    # → brand.green
PUBLIC_SECONDARY_COLOR=#ee680f  # → brand.orange
PUBLIC_COMPANY_NAME=Valorar Siempre Inmuebles
```

`action.primary` y `action.secondary` se derivan automáticamente de orange y green.

---

## Tipografías

| Rol | Fuente | Variable |
| --- | ------ | -------- |
| Headings | Cormorant Garamond | `--font-cormorant` |
| Body | Inter | `--font-inter` |

---

## Futuro (Admin)

`getTenantTheme()` está preparado para recibir branding desde API pública por `tenantId`. Hoy retorna `DEFAULT_TENANT_THEME` con overrides env opcionales.

---

## Referencias

* `docs/06-web/public-web-ui.md`
* `docs/06-web/public-web-architecture.md`
