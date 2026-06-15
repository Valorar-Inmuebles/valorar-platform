"use client";

import { FormField, Label } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AGENDA_NOTIFICAR_ANTES_DEFAULT,
  AGENDA_NOTIFICAR_ANTES_UNIDAD_OPTIONS,
} from "@/lib/agenda/agenda-notificar-antes";
import type { AgendaEventoNotificarAntes } from "@/lib/types/agenda";

type Props = {
  value: AgendaEventoNotificarAntes | null;
  onChange: (value: AgendaEventoNotificarAntes | null) => void;
  disabled?: boolean;
};

export function AgendaEventoNotificarAntesField({
  value,
  onChange,
  disabled = false,
}: Props) {
  const activo = value != null;

  function handleToggle(checked: boolean) {
    if (!checked) {
      onChange(null);
      return;
    }
    onChange(value ?? AGENDA_NOTIFICAR_ANTES_DEFAULT);
  }

  function handleCantidadChange(raw: string) {
    if (!value) return;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    onChange({ ...value, cantidad: parsed });
  }

  return (
    <FormField>
      <div className="flex w-full items-center gap-2">
        <Switch
          id="agenda-notificar-antes"
          checked={activo}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={disabled}
        />
        <Label htmlFor="agenda-notificar-antes" className="mb-0 shrink-0">
          Avisarme antes del evento
        </Label>

        {activo && value && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="w-20 shrink-0">
              <Label htmlFor="agenda-notificar-cantidad" className="sr-only">
                Cantidad
              </Label>
              <Input
                id="agenda-notificar-cantidad"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={value.cantidad}
                onChange={(e) => handleCantidadChange(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="w-[7.5rem] shrink-0">
              <Label htmlFor="agenda-notificar-unidad" className="sr-only">
                Unidad
              </Label>
              <Select
                id="agenda-notificar-unidad"
                options={AGENDA_NOTIFICAR_ANTES_UNIDAD_OPTIONS}
                value={value.unidad}
                onChange={(unidad) =>
                  onChange({
                    ...value,
                    unidad: unidad as AgendaEventoNotificarAntes["unidad"],
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
