"use client";

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import {
  TableReorderColumnCell,
  TABLE_REORDER_HEADER_CLASS,
} from "@/components/ui/table-order-cell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CreateWorkflowCampoDinamicoSchemaInput } from "@/lib/validation/schemas/workflow.schema";

type FormValues = CreateWorkflowCampoDinamicoSchemaInput;

type Props = {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  getValues: UseFormGetValues<FormValues>;
  disabled?: boolean;
};

export function WorkflowCampoDinamicoOpcionesEditor({
  control,
  register,
  errors,
  setValue,
  getValues,
  disabled = false,
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
    opciones.forEach((_, index) => {
      setValue(`opciones.${index}.orden`, index, {
        shouldDirty: true,
        shouldValidate: false,
      });
    });
  }

  function handleMoveUp(index: number) {
    if (index <= 0 || disabled) return;
    move(index, index - 1);
    syncOrdenIndices();
  }

  function handleMoveDown(index: number) {
    if (index >= fields.length - 1 || disabled) return;
    move(index, index + 1);
    syncOrdenIndices();
  }

  return (
    <div className="space-y-3">
      {opcionesError ? (
        <p className="text-xs text-red-600">{opcionesError}</p>
      ) : null}

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-sm text-zinc-400">
          Sin opciones. Agregá al menos una.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader>Etiqueta</TableCell>
                <TableCell isHeader>Valor</TableCell>
                <TableCell isHeader align="right" className="w-10 pr-3">
                  {" "}
                </TableCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {fields.map((field, index) => {
                const rowErrors = errors.opciones?.[index];

                return (
                  <TableRow key={field.id}>
                    <TableReorderColumnCell
                      controls={{
                        canMoveUp: index > 0,
                        canMoveDown: index < fields.length - 1,
                        disabled,
                        onMoveUp: () => handleMoveUp(index),
                        onMoveDown: () => handleMoveDown(index),
                        upLabel: "Subir opción",
                        downLabel: "Bajar opción",
                      }}
                    />
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        disabled={disabled}
                        {...register(`opciones.${index}.etiqueta` as const)}
                        placeholder="Etiqueta visible"
                      />
                      {rowErrors?.etiqueta ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {rowErrors.etiqueta.message}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 font-mono text-sm"
                        disabled={disabled}
                        {...register(`opciones.${index}.valor` as const)}
                        placeholder="valor_interno"
                      />
                      {rowErrors?.valor ? (
                        <p className="mt-0.5 text-xs text-red-600">
                          {rowErrors.valor.message}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" className="pr-3">
                      <ActionIconButton
                        type="button"
                        variant="destructive"
                        disabled={disabled}
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
        disabled={disabled}
        onClick={() =>
          append({
            etiqueta: "",
            valor: "",
            orden: fields.length,
          })
        }
      >
        Agregar opción
      </Button>
    </div>
  );
}
