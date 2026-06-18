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

export type ThemeColors = {
  brand: {
    green: string;
    orange: string;
  };
  action: {
    primary: string;
    secondary: string;
  };
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
