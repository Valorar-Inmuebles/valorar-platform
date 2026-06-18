import type { CSSProperties } from "react";
import { DEFAULT_TENANT_THEME } from "./tenant-theme";
import type { TenantTheme } from "./theme.types";

function resolveBrandGreen(): string {
  return process.env.PUBLIC_PRIMARY_COLOR ?? DEFAULT_TENANT_THEME.colors.brand.green;
}

function resolveBrandOrange(): string {
  return process.env.PUBLIC_SECONDARY_COLOR ?? DEFAULT_TENANT_THEME.colors.brand.orange;
}

export function getTenantTheme(): TenantTheme {
  const green = resolveBrandGreen();
  const orange = resolveBrandOrange();

  return {
    ...DEFAULT_TENANT_THEME,
    companyName:
      process.env.PUBLIC_COMPANY_NAME ?? DEFAULT_TENANT_THEME.companyName,
    colors: {
      brand: { green, orange },
      action: {
        primary: orange,
        secondary: green,
      },
    },
  };
}

export function buildThemeCssVars(theme: TenantTheme): CSSProperties {
  const { brand, action } = theme.colors;

  return {
    "--color-brand-green": brand.green,
    "--color-brand-orange": brand.orange,
    "--color-action-primary": action.primary,
    "--color-action-secondary": action.secondary,
    // Legacy aliases for pages not yet migrated to semantic tokens
    "--color-primary": brand.green,
    "--color-secondary": brand.orange,
  } as CSSProperties;
}

export function getThemeBrandingAssets(theme: TenantTheme = getTenantTheme()) {
  return theme.branding;
}
