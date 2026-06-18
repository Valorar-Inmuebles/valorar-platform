import type { ReactNode } from "react";
import { buildThemeCssVars, getTenantTheme } from "@/branding/theme";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = getTenantTheme();
  const style = buildThemeCssVars(theme);

  return <div style={style}>{children}</div>;
}
