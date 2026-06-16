"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  FormField,
  HelperText,
  Label,
} from "@/components/ui/form-field";
import { MultiSelect, type SelectOption } from "@/components/ui/select";
import type { AgendaEventoParticipanteDto } from "@/lib/types/agenda";

import { fetchAgendaUsuariosCached } from "./agenda-usuarios-cache";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  readOnlyParticipantes?: AgendaEventoParticipanteDto[];
};

export function AgendaEventoParticipantesField({
  value,
  onChange,
  disabled = false,
  readOnlyParticipantes,
}: Props) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void fetchAgendaUsuariosCached()
      .then((usuarios) => {
        if (cancelled) return;
        setOptions(
          usuarios.map((usuario) => ({
            value: usuario.id,
            label: usuario.nombre,
          })),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los usuarios",
        );
        setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (disabled && readOnlyParticipantes) {
    return (
      <FormField>
        <Label>Participantes</Label>
        {readOnlyParticipantes.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin participantes</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {readOnlyParticipantes.map((participante) => (
              <Badge key={participante.usuarioId} variant="neutral">
                {participante.nombre}
              </Badge>
            ))}
          </div>
        )}
      </FormField>
    );
  }

  return (
    <FormField state={loadError ? "error" : "default"}>
      <Label>Participantes</Label>
      <MultiSelect
        id="agenda-participantes"
        options={options}
        value={value}
        onChange={onChange}
        placeholder={loading ? "Cargando usuarios…" : "Seleccionar participantes…"}
        disabled={disabled || loading || loadError != null}
      />
      {loadError ? (
        <p className="mt-1 text-xs text-red-600">{loadError}</p>
      ) : (
        <HelperText>Usuarios que participan del evento</HelperText>
      )}
    </FormField>
  );
}
