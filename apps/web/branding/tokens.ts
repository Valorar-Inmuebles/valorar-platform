/**
 * Canonical theme token values for apps/web.
 * Keep in sync with :root defaults in app/globals.css.
 */
export const THEME_TOKENS = {
  surface: {
    base: "#faf9f7",
    alt: "#f6f4ef",
    card: "#ffffff",
    elevated: "#ffffff",
  },
  brand: {
    green: "#15361e",
    orange: "#ee680f",
  },
  action: {
    primary: "#15361e",
    accent: "#ee680f",
  },
  border: {
    default: "#ece8df",
  },
  text: {
    primary: "#1f2937",
    secondary: "#6b7280",
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
