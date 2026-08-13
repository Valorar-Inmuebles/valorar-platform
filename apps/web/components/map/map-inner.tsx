"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/cn";
import { VALORAR_MAP_MARKER } from "./map-marker-config";
import {
  CARTO_POSITRON_ATTRIBUTION,
  CARTO_POSITRON_URL,
  DEFAULT_MAP_ZOOM,
  type MapMarker,
  type MapProps,
} from "./map-types";

let cachedIcon: L.DivIcon | null = null;

function getValorarMapMarkerIcon(): L.DivIcon {
  if (cachedIcon) {
    return cachedIcon;
  }

  const { color, className, pinClassName, iconSize, iconAnchor, popupAnchor } =
    VALORAR_MAP_MARKER;

  cachedIcon = L.divIcon({
    className,
    html: `<span class="${pinClassName}" style="background-color:${color}" aria-hidden="true"></span>`,
    iconSize,
    iconAnchor,
    popupAnchor,
  });

  return cachedIcon;
}

function normalizeMarkers(marker: MapProps["marker"]): MapMarker[] {
  if (!marker) {
    return [];
  }

  return Array.isArray(marker) ? marker : [marker];
}

/**
 * Client-only Leaflet canvas. Loaded exclusively via dynamic(..., { ssr: false }).
 * Never import this module from Server Components or the public map barrel.
 */
export function MapInner({
  center,
  zoom = DEFAULT_MAP_ZOOM,
  marker = null,
  className = "h-64 w-full md:h-72",
  framed = true,
  scrollWheelZoom = false,
  zoomControl = false,
  ariaLabel = "Mapa",
}: MapProps) {
  const markers = normalizeMarkers(marker);
  const icon = useMemo(() => getValorarMapMarkerIcon(), []);

  return (
    <div
      className={cn(
        "overflow-hidden bg-surface-card",
        framed && "rounded-2xl border border-border-default",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        zoomControl={zoomControl}
        attributionControl
        className="z-0 h-full w-full [&_.leaflet-control-attribution]:bg-white/90 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:leading-tight [&_.leaflet-control-attribution]:text-text-secondary"
        style={{ height: "100%", width: "100%", minHeight: "100%" }}
      >
        <TileLayer
          url={CARTO_POSITRON_URL}
          attribution={CARTO_POSITRON_ATTRIBUTION}
          subdomains="abcd"
          maxZoom={20}
        />
        {markers.map((item, index) => (
          <Marker
            key={`${item.position[0]}-${item.position[1]}-${index}`}
            position={item.position}
            icon={icon}
          >
            {item.title ? <Popup>{item.title}</Popup> : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
