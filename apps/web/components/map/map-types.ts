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

export {
  OPENSTREETMAP_STANDARD_URL,
  OPENSTREETMAP_STANDARD_ATTRIBUTION,
  DEFAULT_MAP_ZOOM,
} from "@repo/shared-types";
