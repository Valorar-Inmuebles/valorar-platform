/**
 * Public map API — safe for Server Components.
 * Does NOT re-export modules that import Leaflet (those load only via Map → dynamic ssr:false).
 */
export { Map } from "./map";
export type { LatLngTuple, MapMarker, MapProps } from "./map-types";
export {
  CARTO_POSITRON_ATTRIBUTION,
  CARTO_POSITRON_URL,
  DEFAULT_MAP_ZOOM,
} from "./map-types";
export { VALORAR_MAP_MARKER } from "./map-marker-config";
