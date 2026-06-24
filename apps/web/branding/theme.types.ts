export type ThemeBranding = {
  logo: string;
  logo48: string;
  logo180: string;
  logo192: string;
  logo512: string;
  favicon: string;
  favicon16: string;
  favicon32: string;
  hero: string;
};

export type ThemeSurfaceColors = {
  base: string;
  alt: string;
  card: string;
  elevated: string;
};

export type ThemeTextColors = {
  primary: string;
  secondary: string;
};

export type ThemeBorderColors = {
  default: string;
};

export type ThemeColors = {
  brand: {
    green: string;
    orange: string;
  };
  action: {
    primary: string;
    accent: string;
  };
  surface: ThemeSurfaceColors;
  text: ThemeTextColors;
  border: ThemeBorderColors;
};

export type ThemeTypography = {
  headingFont: string;
  bodyFont: string;
};

export type TenantTheme = {
  tenantId?: string;
  companyName: string;
  branding: ThemeBranding;
  colors: ThemeColors;
  typography: ThemeTypography;
};
