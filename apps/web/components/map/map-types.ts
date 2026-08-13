export type LatLngTuple = [number, number];

export type MapMarker = {
  position: LatLngTuple;
  title?: string;
};

export type MapProps = {
  center: LatLngTuple;
  zoom?: number;
  marker?: MapMarker | MapMarker[] | null;
  className?: string;
  /** When false, omit card chrome so the map can sit flush inside a parent card. */
  framed?: boolean;
  scrollWheelZoom?: boolean;
  zoomControl?: boolean;
  ariaLabel?: string;
};

export const CARTO_POSITRON_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export const CARTO_POSITRON_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const DEFAULT_MAP_ZOOM = 15;
