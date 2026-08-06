import { THEME_TOKENS } from "@/branding/tokens";

/**
 * Single Valorar map marker config — shared by every Map instance.
 * No Leaflet imports (safe for Server Components / barrel re-exports).
 */
export const VALORAR_MAP_MARKER = {
  /** Institutional brand green (Manual de Marca / tokens). */
  color: THEME_TOKENS.brand.green,
  className: "valorar-map-marker",
  pinClassName: "valorar-map-marker__pin",
  /** Leaflet icon box [width, height] (~25% over the first pin). */
  iconSize: [35, 45] as [number, number],
  iconAnchor: [17, 45] as [number, number],
  popupAnchor: [0, -40] as [number, number],
  /** Visible pin diameter in px. */
  pinSizePx: 23,
} as const;
