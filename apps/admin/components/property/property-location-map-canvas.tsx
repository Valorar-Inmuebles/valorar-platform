"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_ZOOM,
  OPENSTREETMAP_STANDARD_ATTRIBUTION,
  OPENSTREETMAP_STANDARD_URL,
} from "@repo/shared-types";
import { Button } from "@repo/ui/button";
import type { LocationMapProps } from "./property-location-map";
import type { MapPosition } from "@/lib/property/location-map";

const ARGENTINA_CENTER: MapPosition = [-38.4161, -63.6167];

function MapInteraction({ position, onSelect, disabled }: LocationMapProps) {
  const map = useMapEvents({
    click(event) {
      if (disabled) return;
      const point = event.latlng.wrap();
      onSelect([point.lat, point.lng]);
    },
  });
  const latitude = position?.[0];
  const longitude = position?.[1];
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      map.setView(
        [latitude, longitude],
        Math.max(map.getZoom(), DEFAULT_MAP_ZOOM),
        { animate: false },
      );
    }
  }, [latitude, longitude, map]);
  return null;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function PropertyLocationMapCanvas({
  position,
  onSelect,
  disabled,
}: LocationMapProps) {
  const marker = useRef<L.Marker>(null);
  const [tileError, setTileError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<span style="display:block;width:24px;height:24px;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--brand-green);box-shadow:0 1px 5px #0008"></span>',
        iconSize: [30, 36],
        iconAnchor: [12, 29],
      }),
    [],
  );
  return (
    <>
      <MapContainer
        center={position ?? ARGENTINA_CENTER}
        zoom={position ? DEFAULT_MAP_ZOOM : 4}
        scrollWheelZoom={false}
        className="z-0 h-72 w-full sm:h-80"
        attributionControl
        zoomControl={false}
      >
        <ZoomControl zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <TileLayer
          key={attempt}
          url={OPENSTREETMAP_STANDARD_URL}
          attribution={OPENSTREETMAP_STANDARD_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{
            loading: () => setLoading(true),
            load: () => setLoading(false),
            tileerror: () => {
              setTileError(true);
              setLoading(false);
            },
          }}
        />
        <MapInteraction
          position={position}
          onSelect={onSelect}
          disabled={disabled}
        />
        <ResizeMap />
        {position && (
          <Marker
            ref={marker}
            position={position}
            icon={icon}
            draggable={!disabled}
            keyboard
            title="Ubicación de la propiedad"
            alt="Marcador de ubicación; también podés ajustar las coordenadas con los campos del formulario"
            eventHandlers={{
              dragend: () => {
                const point = marker.current?.getLatLng().wrap();
                if (point && !disabled) onSelect([point.lat, point.lng]);
              },
            }}
          />
        )}
      </MapContainer>
      {loading && !tileError && (
        <p role="status" className="px-3 py-2 text-xs text-muted">
          Cargando cartografía…
        </p>
      )}
      {tileError && (
        <div className="flex flex-wrap items-center gap-2 p-3">
          <p role="alert" className="text-sm text-destructive">
            No se pudo cargar parte de la cartografía. Podés continuar con las
            coordenadas manuales.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              setTileError(false);
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar mapa
          </Button>
        </div>
      )}
    </>
  );
}
