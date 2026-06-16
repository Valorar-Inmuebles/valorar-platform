"use client";

import {
  useFieldArray,
  Controller,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { CreateCampoDinamicoInput } from "@/lib/validation/schemas/campo-dinamico.schema";

type FormValues = CreateCampoDinamicoInput;

type Props = {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  getValues: UseFormGetValues<FormValues>;
};

export function CampoOpcionesEditor({
  control,
  register,
  errors,
  setValue,
  getValues,
}: Props) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "opciones",
  });

  const opcionesError =
    typeof errors.opciones === "object" &&
    errors.opciones !== null &&
    "message" in errors.opciones &&
    typeof (errors.opciones as { message?: string }).message === "string"
      ? (errors.opciones as { message: string }).message
      : null;

  function syncOrdenIndices() {
    const opciones = getValues("opciones") ?? [];
    opciones.forEach((_, i) => {
      setValue(`opciones.${i}.orden`, i, {
        shouldDirty: true,
        shouldValidate: false,
      });
    });
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    move(index, index - 1);
    syncOrdenIndices();
  }

  function handleMoveDown(index: number) {
    if (index >= fields.length - 1) return;
    move(index, index + 1);
    syncOrdenIndices();
  }

  return (
    <div className="space-y-3">
      {opcionesError && (
        <p className="text-xs text-red-600">{opcionesError}</p>
      )}

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-sm text-zinc-400">
          Sin opciones. Agregá al menos una.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="w-[7.5rem] pl-3">
                  Orden
                </TableCell>
                <TableCell isHeader>Etiqueta</TableCell>
                <TableCell isHeader>Valor</TableCell>
                <TableCell isHeader align="center" className="w-16">
                  Activo
                </TableCell>
                <TableCell isHeader align="right" className="w-10 pr-3">
                  {" "}
                </TableCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {fields.map((field, index) => {
                const rowErrors = errors.opciones?.[index];
                const isFirst = index === 0;
                const isLast = index === fields.length - 1;

                return (
                  <TableRow key={field.id}>
                    <TableCell className="pl-3">
                      <div className="flex items-center gap-1">
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <ActionIconButton
                            type="button"
                            size="sm"
                            disabled={isFirst}
                            onClick={() => handleMoveUp(index)}
                            aria-label="Subir opción"
                            className={isFirst ? "opacity-40" : ""}
                          >
                            <Icon.ChevronUp className="size-3.5" />
                          </ActionIconButton>
                          <ActionIconButton
                            type="button"
                            size="sm"
                            disabled={isLast}
                            onClick={() => handleMoveDown(index)}
                            aria-label="Bajar opción"
                            className={isLast ? "opacity-40" : ""}
                          >
                            <Icon.ChevronDown className="size-3.5" />
                          </ActionIconButton>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className="h-8 w-[3.25rem] min-w-[3.25rem] shrink-0 px-2 text-center text-sm font-medium tabular-nums text-zinc-900"
                          {...register(`opciones.${index}.orden` as const, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        {...register(`opciones.${index}.etiqueta` as const)}
                        placeholder="Etiqueta visible"
                      />
                      {rowErrors?.etiqueta && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {rowErrors.etiqueta.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 font-mono text-sm"
                        {...register(`opciones.${index}.valor` as const)}
                        placeholder="valor_interno"
                      />
                      {rowErrors?.valor && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {rowErrors.valor.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Controller
                        control={control}
                        name={`opciones.${index}.activo`}
                        render={({ field: activoField }) => (
                          <Switch
                            size="sm"
                            checked={activoField.value}
                            onChange={(e) =>
                              activoField.onChange(e.target.checked)
                            }
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell align="right" className="pr-3">
                      <ActionIconButton
                        type="button"
                        variant="destructive"
                        onClick={() => remove(index)}
                        aria-label="Eliminar opción"
                      >
                        <Icon.Trash className="size-3.5" />
                      </ActionIconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          append({
            etiqueta: "",
            valor: "",
            orden: fields.length,
            activo: true,
          })
        }
      >
        Agregar opción
      </Button>
    </div>
  );
}
