import type { ReactNode } from "react";
import { buildThemeCssVars, getTenantTheme } from "@/branding/theme";

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Single injection point for tenant theme CSS variables.
 * Resolves brand colors from env; static surfaces/text/border from branding/tokens.ts.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = getTenantTheme();
  const style = buildThemeCssVars(theme);

  return (
    <div className="flex min-h-full flex-1 flex-col" style={style}>
      {children}
    </div>
  );
}
