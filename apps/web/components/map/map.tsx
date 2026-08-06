"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./map-types";

/**
 * Leaflet + react-leaflet live only inside MapInner, loaded with ssr:false.
 * This wrapper is the sole public client entry for interactive maps.
 */
const MapInner = dynamic(
  () => import("./map-inner").then((mod) => mod.MapInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 w-full animate-pulse rounded-2xl border border-border-default bg-surface-alt md:h-72"
        aria-hidden
      />
    ),
  },
);

/**
 * Reusable interactive map (Leaflet + React Leaflet + Carto Positron).
 * Safe for App Router Server Components that import this client boundary.
 *
 * @example
 * <Map center={[-34.62, -58.44]} zoom={16} marker={{ position: [-34.62, -58.44], title: "Casa Central" }} />
 */
export function Map(props: MapProps) {
  return <MapInner {...props} />;
}
