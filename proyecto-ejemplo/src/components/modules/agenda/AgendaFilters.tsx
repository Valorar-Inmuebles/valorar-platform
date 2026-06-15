"use client";

import { useEffect, useState } from "react";

import {
  SearchableSelect,
  Select,
  type SelectOption,
} from "@/components/ui/select";
import {
  AGENDA_ENTIDAD_PADRE_FILTER_TIPOS,
  type AgendaEntidadPadreFilterTipo,
} from "@/lib/types/agenda";
import { fetchUsuariosMencionCached } from "@/components/modules/comentarios/usuarios-mencion-cache";

import { fetchAgendaEntidadesPadreCached } from "./agenda-entidades-padre-cache";
import { fetchAgendaTiposCached } from "./agenda-tipos-cache";

export type AgendaFiltersState = {
  tipo_id?: string;
  participante_id?: string;
  entidad_tipo?: AgendaEntidadPadreFilterTipo;
  entidad_id?: string;
};

type Props = {
  value: AgendaFiltersState;
  onChange: (value: AgendaFiltersState) => void;
};

const ALL_VALUE = "";

const ENTIDAD_TIPO_LABELS: Record<AgendaEntidadPadreFilterTipo, string> = {
  expediente: "Expediente",
  caso: "Caso",
  cliente: "Cliente",
  legajo: "Legajo",
};

export function AgendaFilters({ value, onChange }: Props) {
  const [tipoOptions, setTipoOptions] = useState<SelectOption[]>([]);
  const [usuarioOptions, setUsuarioOptions] = useState<SelectOption[]>([]);
  const [entidadOptions, setEntidadOptions] = useState<SelectOption[]>([]);
  const [entidadesLoading, setEntidadesLoading] = useState(false);

  useEffect(() => {
    void fetchAgendaTiposCached().then((tipos) => {
      setTipoOptions([
        { value: ALL_VALUE, label: "Todos los tipos" },
        ...tipos.map((t) => ({ value: t.id, label: t.nombre })),
      ]);
    });
  }, []);

  useEffect(() => {
    void fetchUsuariosMencionCached("").then((usuarios) => {
      const opts = usuarios.map((u) => ({
        value: u.id,
        label: u.nombre,
      }));
      setUsuarioOptions([
        { value: ALL_VALUE, label: "Todos" },
        ...opts,
      ]);
    });
  }, []);

  useEffect(() => {
    if (!value.entidad_tipo) {
      setEntidadOptions([]);
      return;
    }

    let cancelled = false;
    setEntidadesLoading(true);
    void fetchAgendaEntidadesPadreCached(value.entidad_tipo)
      .then((rows) => {
        if (cancelled) return;
        setEntidadOptions([
          { value: ALL_VALUE, label: "Todas las entidades" },
          ...rows.map((r) => ({ value: r.id, label: r.label })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setEntidadOptions([]);
      })
      .finally(() => {
        if (!cancelled) setEntidadesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [value.entidad_tipo]);

  function patch(partial: Partial<AgendaFiltersState>) {
    onChange({ ...value, ...partial });
  }

  const entidadTipoOptions: SelectOption[] = [
    { value: ALL_VALUE, label: "Todas las entidades" },
    ...AGENDA_ENTIDAD_PADRE_FILTER_TIPOS.map((t) => ({
      value: t,
      label: ENTIDAD_TIPO_LABELS[t],
    })),
  ];

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-300 bg-zinc-50/50 p-3">
      <div className="w-44 min-w-[10rem]">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Tipo de evento
        </p>
        <Select
          options={tipoOptions}
          value={value.tipo_id ?? ALL_VALUE}
          onChange={(v) =>
            patch({ tipo_id: v === ALL_VALUE ? undefined : v })
          }
          placeholder="Todos los tipos"
        />
      </div>

      <div className="w-70 min-w-[11rem]">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Participantes
        </p>
        <SearchableSelect
          className="w-full"
          options={usuarioOptions}
          value={value.participante_id ?? ALL_VALUE}
          onChange={(v) =>
            patch({ participante_id: v === ALL_VALUE ? undefined : v })
          }
          placeholder="Buscar participante o autor…"
        />
      </div>

      <div className="w-50 min-w-[9rem]">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Tipo de entidad
        </p>
        <Select
          options={entidadTipoOptions}
          value={value.entidad_tipo ?? ALL_VALUE}
          onChange={(v) => {
            if (v === ALL_VALUE) {
              onChange({
                ...value,
                entidad_tipo: undefined,
                entidad_id: undefined,
              });
              return;
            }
            onChange({
              ...value,
              entidad_tipo: v as AgendaEntidadPadreFilterTipo,
              entidad_id: undefined,
            });
          }}
          placeholder="Todas"
        />
      </div>

      {value.entidad_tipo && (
        <div className="min-w-[11rem] flex-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Entidad
          </p>
            <SearchableSelect
              className="w-full"
              options={entidadOptions}
              value={value.entidad_id ?? ALL_VALUE}
              onChange={(v) =>
                patch({ entidad_id: v === ALL_VALUE ? undefined : v })
              }
              placeholder={
                entidadesLoading ? "Cargando…" : "Buscar por número o nombre…"
              }
              disabled={entidadesLoading}
            />
        </div>
      )}
    </div>
  );
}
