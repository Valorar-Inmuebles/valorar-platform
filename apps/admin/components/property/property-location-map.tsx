"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { MapPosition } from "@/lib/property/location-map";

export type LocationMapProps = {
  position: MapPosition | null;
  disabled?: boolean;
  onSelect: (position: MapPosition) => void;
};

function MapUnavailable() {
  return (
    <p role="alert" className="p-4 text-sm text-destructive">
      No se pudo cargar el mapa. Podés ingresar y confirmar las coordenadas
      manualmente.
    </p>
  );
}

const MapCanvas = dynamic(
  () =>
    import("./property-location-map-canvas").then(
      (module) => module.PropertyLocationMapCanvas,
    ),
  {
    ssr: false,
    loading: ({ error }) =>
      error ? (
        <MapUnavailable />
      ) : (
        <div
          role="status"
          className="flex h-72 items-center justify-center bg-surface-alt text-sm text-muted sm:h-80"
        >
          Cargando mapa…
        </div>
      ),
  },
);

export class LocationMapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <MapUnavailable /> : this.props.children;
  }
}

export function PropertyLocationMap(props: LocationMapProps) {
  return (
    <div
      className="relative z-0 min-w-0 overflow-hidden rounded-lg border border-border"
      role="region"
      aria-label="Mapa de ubicación de la propiedad"
    >
      <LocationMapBoundary>
        <MapCanvas {...props} />
      </LocationMapBoundary>
    </div>
  );
}
