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

export const OPENSTREETMAP_STANDARD_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OPENSTREETMAP_STANDARD_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const DEFAULT_MAP_ZOOM = 15;
