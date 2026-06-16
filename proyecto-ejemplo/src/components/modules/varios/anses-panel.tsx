"use client";

import { useMemo, useState, useTransition } from "react";
import {
  triggerAnsesClientesSync,
  triggerAnsesSentenciasSync,
  triggerAnsesTodoSync,
} from "@/lib/api/anses.api";
import { buildLast12AnioMesOptions } from "@/lib/datetime/anses-anio-mes";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { FormField, Label } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

export function AnsesPanel() {
  const { toast } = useToast();
  const [isSentenciasPending, startSentenciasTransition] = useTransition();
  const [isClientesPending, startClientesTransition] = useTransition();
  const [isTodoPending, startTodoTransition] = useTransition();
  const monthOptions = useMemo(() => buildLast12AnioMesOptions(), []);
  const [anioMes, setAnioMes] = useState(monthOptions[0]?.value ?? "");

  function handleSentenciasSync() {
    if (!anioMes) {
      toast.error("Seleccioná un período");
      return;
    }

    startSentenciasTransition(async () => {
      try {
        await triggerAnsesSentenciasSync(anioMes);
        toast.success("Sincronización de sentencias iniciada");
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la sincronización de sentencias",
        );
      }
    });
  }

  function handleClientesSync() {
    startClientesTransition(async () => {
      try {
        await triggerAnsesClientesSync();
        toast.success("Sincronización de clientes iniciada");
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la sincronización de clientes",
        );
      }
    });
  }

  function handleTodoSync() {
    startTodoTransition(async () => {
      try {
        await triggerAnsesTodoSync();
        toast.success("Sincronización completa iniciada");
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la sincronización completa",
        );
      }
    });
  }

  return (
    <Card flat className="max-w-xl">
      <CardHeader className="py-2">
        <CardTitle>ANSES</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-3">
        <div className="flex flex-wrap items-end gap-2">
          <FormField id="anioMes" className="min-w-[9rem] flex-1">
            <Label required>Período sentencias</Label>
            <Select
              value={anioMes}
              onChange={setAnioMes}
              options={monthOptions}
              placeholder="Seleccioná un mes"
            />
          </FormField>
          <Button
            type="button"
            size="sm"
            loading={isSentenciasPending}
            onClick={handleSentenciasSync}
          >
            Sincronizar sentencias
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
          <Button
            type="button"
            size="sm"
            loading={isClientesPending}
            onClick={handleClientesSync}
          >
            Sincronizar clientes
          </Button>
          <Button
            type="button"
            size="sm"
            loading={isTodoPending}
            onClick={handleTodoSync}
          >
            Sincronizar todo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
