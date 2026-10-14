"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { ErrorMessage, FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import {
  confirmCoordinates,
  coordinatesEqual,
  positionToCoordinates,
  readMapPosition,
  type CoordinateValues,
} from "@/lib/property/location-map";
import { PropertyLocationMap } from "./property-location-map";
import { searchPropertyLocationAction } from "@/lib/api/property-location-search-actions";
import type {
  PropertyLocationCandidate,
  PropertyLocationSearchPayload,
} from "@/lib/api/types/property-location-search";

type Props = CoordinateValues & {
  disabled?: boolean;
  propertyId?: string;
  address?: PropertyLocationSearchPayload;
  onConfirm: (values: CoordinateValues) => void;
};

const GRANULARITY: Record<PropertyLocationCandidate["granularity"], string> = {
  ADDRESS: "Dirección",
  STREET: "Calle aproximada",
  NEIGHBORHOOD: "Barrio aproximado",
  LOCALITY: "Localidad aproximada",
};

export function PropertyLocationEditor({
  latitude,
  longitude,
  disabled,
  propertyId,
  address,
  onConfirm,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState({ latitude, longitude });
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "empty" | "results" | "error"
  >("idle");
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<PropertyLocationCandidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const searchSerial = useRef(0);
  const loadingRef = useRef(false);
  const addressSignature = JSON.stringify(address);
  const currentSignature = useRef(addressSignature);
  // Updating during render invalidates an in-flight response even before effects run.
  if (currentSignature.current !== addressSignature) {
    currentSignature.current = addressSignature;
    searchSerial.current++;
  }
  useEffect(() => {
    if (selected !== null) setDraft({ latitude, longitude });
    loadingRef.current = false;
    setCandidates([]);
    setSelected(null);
    setSearchState("idle");
    setSearchError("");
    // Address invalidates suggestions, but manual drafts remain independent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressSignature]);
  useEffect(() => {
    setDraft({ latitude, longitude });
  }, [latitude, longitude]);
  const changed = !coordinatesEqual(draft, { latitude, longitude });
  const position = readMapPosition(draft);

  const search = async () => {
    if (disabled || loadingRef.current || !address) return;
    const signature = currentSignature.current;
    const serial = ++searchSerial.current;
    loadingRef.current = true;
    setSearchState("loading");
    setSearchError("");
    setCandidates([]);
    setSelected(null);
    try {
      const result = await searchPropertyLocationAction(address, propertyId);
      if (
        serial !== searchSerial.current ||
        signature !== currentSignature.current
      )
        return;
      if (!result.ok) {
        setSearchState("error");
        setSearchError(
          result.retryAfterSeconds
            ? `${result.error} Esperá ${result.retryAfterSeconds} segundos.`
            : result.error,
        );
      } else {
        setCandidates(result.result.candidates);
        setSearchState(result.result.candidates.length ? "results" : "empty");
      }
    } catch {
      if (
        serial === searchSerial.current &&
        signature === currentSignature.current
      ) {
        setSearchState("error");
        setSearchError("No se pudo buscar la ubicación. Intentá de nuevo.");
      }
    } finally {
      if (serial === searchSerial.current) loadingRef.current = false;
    }
  };

  return (
    <section
      className="min-w-0 space-y-3 md:col-span-2"
      aria-labelledby={`${id}-title`}
    >
      <h3 id={`${id}-title`} className="text-sm font-semibold">
        Ubicación en el mapa
      </h3>
      <p id={`${id}-help`} className="text-xs text-muted">
        Seleccioná un punto en el mapa, arrastrá el marcador o ingresá las
        coordenadas. Confirmar aplica el punto al formulario; sólo Guardar
        cambios o Crear propiedad lo persiste. La dirección postal no se
        modifica.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || searchState === "loading" || !address}
          onClick={() => void search()}
        >
          {searchState === "loading"
            ? "Buscando ubicación…"
            : "Buscar ubicación"}
        </Button>
        <span className="text-xs text-muted">
          La búsqueda usa la dirección ingresada y no modifica el punto
          confirmado.
        </span>
      </div>
      {searchState === "loading" && (
        <p role="status" className="text-sm text-muted">
          Buscando direcciones…
        </p>
      )}
      {searchState === "empty" && (
        <p role="status" className="text-sm text-muted">
          No encontramos una ubicación para esta dirección. Revisá los datos o
          seleccioná el punto manualmente.
        </p>
      )}
      {searchState === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {searchError}
        </p>
      )}
      {searchState === "results" && (
        <div className="space-y-2" aria-label="Ubicaciones sugeridas">
          <p className="text-sm font-medium">Elegí una ubicación sugerida</p>
          <ul className="space-y-2">
            {candidates.map((candidate, index) => (
              <li key={`${candidate.latitude}:${candidate.longitude}:${index}`}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full whitespace-normal text-left"
                  disabled={disabled}
                  aria-pressed={selected === index}
                  onClick={() => {
                    setSelected(index);
                    setDraft(
                      positionToCoordinates([
                        candidate.latitude,
                        candidate.longitude,
                      ]),
                    );
                    setError(false);
                    setMessage(
                      "Punto sugerido en borrador. Ajustalo o confirmá la ubicación.",
                    );
                  }}
                >
                  <span className="block">
                    <span className="block font-medium">{candidate.label}</span>
                    <span className="block text-xs">
                      {GRANULARITY[candidate.granularity]}
                      {candidate.warnings.length
                        ? ` · ${candidate.warnings.join(" ")}`
                        : ""}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Resultados de{" "}
            <a
              className="underline"
              href="https://www.geoapify.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Geoapify
            </a>{" "}
            y colaboradores de OpenStreetMap.
          </p>
        </div>
      )}
      <PropertyLocationMap
        position={position}
        disabled={disabled}
        onSelect={(point) => {
          setDraft(positionToCoordinates(point));
          setError(false);
          setMessage("");
          setSelected(null);
        }}
      />
      {!position && (
        <p className="text-sm text-muted">
          Sin coordenadas completas: seleccioná un punto o ingresá latitud y
          longitud. La vista inicial muestra Argentina como referencia.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["latitude", "longitude"] as const).map((field) => (
          <FormField key={field} state={error ? "error" : "default"}>
            <Label>{field === "latitude" ? "Latitud" : "Longitud"}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={draft[field]}
              disabled={disabled}
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  [field]: event.target.value,
                }));
                setError(false);
                setMessage("");
                setSelected(null);
              }}
            />
          </FormField>
        ))}
      </div>
      {error && (
        <ErrorMessage id={`${id}-error`}>
          Ingresá ambas coordenadas válidas: latitud entre -90 y 90, longitud
          entre -180 y 180. Para quitar la ubicación, vaciá ambos campos y
          confirmá.
        </ErrorMessage>
      )}
      <p role="status" aria-live="polite" className="text-xs text-muted">
        {changed
          ? "Ubicación en borrador, pendiente de confirmar. Si guardás ahora, este borrador no se aplica."
          : message ||
            (position
              ? "Ubicación actual del formulario."
              : "La propiedad no tiene ubicación en el mapa.")}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || (!changed && !error)}
          onClick={() => {
            setDraft({ latitude, longitude });
            setError(false);
            setMessage("Ajuste descartado.");
            setSelected(null);
          }}
        >
          Cancelar ajuste
        </Button>
        <Button
          type="button"
          disabled={disabled || !changed}
          onClick={() => {
            const next = confirmCoordinates(draft);
            if (!next) {
              setError(true);
              return;
            }
            setDraft(next);
            setError(false);
            onConfirm(next);
            setMessage("Ubicación confirmada en el formulario.");
          }}
        >
          Confirmar ubicación
        </Button>
      </div>
    </section>
  );
}
