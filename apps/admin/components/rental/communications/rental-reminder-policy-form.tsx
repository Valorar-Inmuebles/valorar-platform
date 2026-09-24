"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Switch } from "@repo/ui/switch";
import { useToast } from "@repo/ui/toast";
import { updateRentalReminderPolicyAction } from "@/lib/api/rental-reminder-policy-actions";
import {
  minutesToTime,
  parseReminderOffset,
  timeToMinutes,
} from "@/lib/rental/rental-reminder-policy";
import type { RentalReminderPolicy } from "@repo/shared-types";

export function RentalReminderPolicyForm({
  policy,
  canManage,
}: {
  policy: RentalReminderPolicy;
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [preDueEnabled, setPreDueEnabled] = useState(policy.preDueEnabled);
  const [preDueDays, setPreDueDays] = useState(String(policy.preDueDays));
  const [dueEnabled, setDueEnabled] = useState(policy.dueEnabled);
  const [postDueEnabled, setPostDueEnabled] = useState(policy.postDueEnabled);
  const [postDueDays, setPostDueDays] = useState(String(policy.postDueDays));
  const [sendTime, setSendTime] = useState(
    minutesToTime(policy.sendTimeMinutes),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    const parsedPreDueDays = parseReminderOffset(preDueDays);
    const parsedPostDueDays = parseReminderOffset(postDueDays);
    const sendTimeMinutes = timeToMinutes(sendTime);

    if (parsedPreDueDays === null || parsedPostDueDays === null) {
      toast.error("Los días deben ser números enteros entre 1 y 30.");
      return;
    }
    if (sendTimeMinutes === null) {
      toast.error("Ingresá un horario válido entre 00:00 y 23:59.");
      return;
    }

    startTransition(async () => {
      const result = await updateRentalReminderPolicyAction({
        preDueEnabled,
        preDueDays: parsedPreDueDays,
        dueEnabled,
        postDueEnabled,
        postDueDays: parsedPostDueDays,
        sendTimeMinutes,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setPreDueEnabled(result.value.preDueEnabled);
      setPreDueDays(String(result.value.preDueDays));
      setDueEnabled(result.value.dueEnabled);
      setPostDueEnabled(result.value.postDueEnabled);
      setPostDueDays(String(result.value.postDueDays));
      setSendTime(minutesToTime(result.value.sendTimeMinutes));
      toast.success("Configuración de avisos guardada.");
    });
  }

  const disabled = !canManage || isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recordatorio previo</CardTitle>
          <p className="text-sm text-muted">Avisar antes del vencimiento</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end">
          <Switch
            checked={preDueEnabled}
            disabled={disabled}
            label={preDueEnabled ? "Activado" : "Desactivado"}
            onChange={setPreDueEnabled}
          />
          <FormField>
            <Label htmlFor="preDueDays">Días antes</Label>
            <Input
              id="preDueDays"
              type="number"
              min={1}
              max={30}
              step={1}
              value={preDueDays}
              disabled={disabled}
              onChange={(event) => setPreDueDays(event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Día del vencimiento</CardTitle>
          <p className="text-sm text-muted">Avisar el día del vencimiento</p>
        </CardHeader>
        <CardContent>
          <Switch
            checked={dueEnabled}
            disabled={disabled}
            label={dueEnabled ? "Activado" : "Desactivado"}
            onChange={setDueEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recordatorio vencido</CardTitle>
          <p className="text-sm text-muted">Avisar después del vencimiento</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end">
          <Switch
            checked={postDueEnabled}
            disabled={disabled}
            label={postDueEnabled ? "Activado" : "Desactivado"}
            onChange={setPostDueEnabled}
          />
          <FormField>
            <Label htmlFor="postDueDays">Días después</Label>
            <Input
              id="postDueDays"
              type="number"
              min={1}
              max={30}
              step={1}
              value={postDueDays}
              disabled={disabled}
              onChange={(event) => setPostDueDays(event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario de envío</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label htmlFor="sendTime">Horario</Label>
            <Input
              id="sendTime"
              type="time"
              value={sendTime}
              disabled={disabled}
              onChange={(event) => setSendTime(event.target.value)}
            />
            <HelperText>Se permiten horarios entre 00:00 y 23:59.</HelperText>
          </FormField>
          <FormField>
            <Label htmlFor="timeZone">Zona horaria</Label>
            <Input id="timeZone" value={policy.timeZone} disabled readOnly />
            <HelperText>
              La zona horaria se toma de la configuración de la organización y
              se utiliza para calcular el horario local de envío.
            </HelperText>
          </FormField>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-surface-alt p-4 text-sm text-muted">
        <p>
          Estos valores definen las reglas generales de planificación para la
          inmobiliaria. Los destinatarios, canales y conceptos incluidos se
          configuran por contrato.
        </p>
        <p className="mt-2">
          Los cambios aplican a las próximas ejecuciones de planificación. Los
          avisos que ya fueron planificados pueden conservarse según su estado
          operativo.
        </p>
        <p className="mt-2">
          Guardar la configuración no envía ningún mensaje.
        </p>
      </div>

      {canManage ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => router.push("/alquileres/comunicaciones")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            Guardar cambios
          </Button>
        </div>
      ) : null}
    </form>
  );
}
