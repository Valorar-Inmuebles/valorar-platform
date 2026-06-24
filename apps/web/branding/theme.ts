import type { CSSProperties } from "react";
import { DEFAULT_TENANT_THEME } from "./tenant-theme";
import { THEME_TOKENS } from "./tokens";
import type { TenantTheme } from "./theme.types";

function resolveBrandGreen(): string {
  return process.env.PUBLIC_PRIMARY_COLOR ?? THEME_TOKENS.brand.green;
}

function resolveBrandOrange(): string {
  return process.env.PUBLIC_SECONDARY_COLOR ?? THEME_TOKENS.brand.orange;
}

export function getTenantTheme(): TenantTheme {
  const green = resolveBrandGreen();
  const orange = resolveBrandOrange();

  return {
    ...DEFAULT_TENANT_THEME,
    companyName:
      process.env.PUBLIC_COMPANY_NAME ?? DEFAULT_TENANT_THEME.companyName,
    colors: {
      ...DEFAULT_TENANT_THEME.colors,
      brand: { green, orange },
      action: {
        primary: green,
        accent: orange,
      },
    },
  };
}

export function buildThemeCssVars(theme: TenantTheme): CSSProperties {
  const { brand, action, surface, text, border } = theme.colors;

  return {
    "--surface-base": surface.base,
    "--surface-alt": surface.alt,
    "--surface-card": surface.card,
    "--surface-elevated": surface.elevated,
    "--brand-green": brand.green,
    "--brand-orange": brand.orange,
    "--action-primary": action.primary,
    "--action-accent": action.accent,
    "--border-default": border.default,
    "--text-primary": text.primary,
    "--text-secondary": text.secondary,
    // Legacy aliases — remove when components migrate to semantic tokens
    "--background": surface.base,
    "--foreground": text.primary,
    "--muted": text.secondary,
    "--border": border.default,
    "--color-primary": brand.green,
    "--color-secondary": brand.orange,
    "--color-brand-green": brand.green,
    "--color-brand-orange": brand.orange,
    "--color-action-primary": action.primary,
    "--color-action-accent": action.accent,
    "--color-action-secondary": action.accent,
  } as CSSProperties;
}

export function getThemeBrandingAssets(theme: TenantTheme = getTenantTheme()) {
  return theme.branding;
}
