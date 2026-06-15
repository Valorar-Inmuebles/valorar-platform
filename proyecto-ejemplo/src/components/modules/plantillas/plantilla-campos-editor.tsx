"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchCamposDinamicos } from "@/lib/api/campos-dinamicos";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";

const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 300;

export type PlantillaCampoLink = {
  campo_dinamico_id: string;
  etiqueta: string;
  tipo: string;
  orden: number;
  requerido: boolean;
};

type Props = {
  contexto: string;
  campos: PlantillaCampoLink[];
  onChange: (campos: PlantillaCampoLink[]) => void;
  error?: string | null;
  disabled?: boolean;
};

export function PlantillaCamposEditor({
  contexto,
  campos,
  onChange,
  error,
  disabled = false,
}: Props) {
  const [campoSearch, setCampoSearch] = useState("");
  const [campoResults, setCampoResults] = useState<
    Array<{ id: string; etiqueta: string; tipo: string; clave: string }>
  >([]);
  const [campoSearching, setCampoSearching] = useState(false);
  const [showCampoDropdown, setShowCampoDropdown] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayError = error ?? localError;

  const runCampoSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < MIN_QUERY) {
        setCampoResults([]);
        setShowCampoDropdown(false);
        return;
      }
      setCampoSearching(true);
      try {
        const rows = await searchCamposDinamicos(contexto, q);
        setCampoResults(rows);
        setShowCampoDropdown(true);
      } catch {
        setCampoResults([]);
      } finally {
        setCampoSearching(false);
      }
    },
    [contexto],
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (campoSearch.trim().length < MIN_QUERY) {
      setCampoResults([]);
      setShowCampoDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void runCampoSearch(campoSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [campoSearch, runCampoSearch]);

  function handleAddCampo(campo: {
    id: string;
    etiqueta: string;
    tipo: string;
  }) {
    if (campos.some((c) => c.campo_dinamico_id === campo.id)) {
      setLocalError("Este campo ya está en la plantilla.");
      return;
    }
    setLocalError(null);
    const nextOrden =
      campos.length === 0
        ? 10
        : Math.max(...campos.map((c) => c.orden)) + 10;

    onChange([
      ...campos,
      {
        campo_dinamico_id: campo.id,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        orden: nextOrden,
        requerido: false,
      },
    ]);
    setCampoSearch("");
    setShowCampoDropdown(false);
    setCampoResults([]);
  }

  function handleRemoveCampo(campoId: string) {
    onChange(campos.filter((c) => c.campo_dinamico_id !== campoId));
    setLocalError(null);
  }

  function updateCampoLink(
    campoId: string,
    patch: Partial<Pick<PlantillaCampoLink, "orden" | "requerido">>,
  ) {
    onChange(
      campos.map((c) =>
        c.campo_dinamico_id === campoId ? { ...c, ...patch } : c,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <FormField id="campo-search">
        <Label>Agregar campo del catálogo</Label>
        <div className="relative">
          <Input
            leftIcon={<Icon.Search className="size-3.5" />}
            loading={campoSearching}
            value={campoSearch}
            onChange={(e) => setCampoSearch(e.target.value)}
            onFocus={() => {
              if (campoResults.length > 0) setShowCampoDropdown(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowCampoDropdown(false), 150);
            }}
            placeholder={`Buscar por nombre o clave (mín. ${MIN_QUERY} caracteres)…`}
            autoComplete="off"
            disabled={disabled}
            className="!pl-7"
          />
          {showCampoDropdown && campoResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">
              {campoResults.map((campo) => (
                <div
                  key={campo.id}
                  role="option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddCampo(campo);
                  }}
                  className="mx-1 cursor-pointer select-none rounded-lg px-3 py-2 text-sm transition-colors duration-100 hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">
                    {campo.etiqueta}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">
                    {campo.tipo} · {campo.clave}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <HelperText>
          Solo campos activos del contexto {contexto === "caso" ? "caso" : "expediente"}.
        </HelperText>
      </FormField>

      {displayError && (
        <p className="text-xs text-red-600">{displayError}</p>
      )}

      {campos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-sm text-zinc-400">
          Sin campos agregados
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full border-collapse text-sm">
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="pl-3">
                  Campo
                </TableCell>
                <TableCell isHeader className="w-20">
                  Orden
                </TableCell>
                <TableCell isHeader align="center" className="w-24">
                  Req.
                </TableCell>
                <TableCell isHeader align="right" className="w-12 pr-3">
                  {" "}
                </TableCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {[...campos]
                .sort((a, b) => a.orden - b.orden)
                .map((campo) => (
                  <TableRow key={campo.campo_dinamico_id}>
                    <TableCell className="pl-3">
                      <span className="font-medium text-zinc-900">
                        {campo.etiqueta}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-400">
                        {campo.tipo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 px-2 text-xs"
                        value={campo.orden}
                        disabled={disabled}
                        onChange={(e) =>
                          updateCampoLink(campo.campo_dinamico_id, {
                            orden: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="sm"
                        checked={campo.requerido}
                        disabled={disabled}
                        onChange={(e) =>
                          updateCampoLink(campo.campo_dinamico_id, {
                            requerido: e.target.checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="right" className="pr-3">
                      <ActionIconButton
                        type="button"
                        variant="destructive"
                        disabled={disabled}
                        onClick={() =>
                          handleRemoveCampo(campo.campo_dinamico_id)
                        }
                      >
                        <Icon.Trash className="size-3.5" />
                      </ActionIconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
