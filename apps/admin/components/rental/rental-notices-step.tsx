"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Tabs } from "@repo/ui/tabs";
import { useToast } from "@repo/ui/toast";
import type {
  NotificationChannel,
  RentalObligation,
} from "@/lib/api/types/rental";
import type { RentalPartyDraft } from "./rental-contact-panel";

type Props = {
  parties: RentalPartyDraft[];
  obligations: RentalObligation[];
  currentRentAmount?: number | null;
  disabled?: boolean;
  onPartiesChange: (parties: RentalPartyDraft[]) => void;
  onObligationsChange: (obligations: RentalObligation[]) => void;
};

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];

function compatible(
  point: RentalPartyDraft["contact"]["contactPoints"][number],
  channel: NotificationChannel,
) {
  if ("isActive" in point && !point.isActive) return false;
  if (channel === "EMAIL") return point.type === "EMAIL";
  if (point.type !== "PHONE") return false;
  return channel === "WHATSAPP"
    ? point.canReceiveWhatsapp
    : point.canReceiveSms;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function RentalNoticesStep({
  parties,
  obligations,
  currentRentAmount = null,
  disabled = false,
  onPartiesChange,
  onObligationsChange,
}: Props) {
  const { toast } = useToast();
  const renters = parties.filter((party) => party.role === "RENTER");
  const availableTabs = CHANNELS.filter(({ value }) =>
    renters.some((party) =>
      party.notificationRoutes.some(
        (route) => route.channel === value && route.isEnabled,
      ),
    ),
  );
  const [preview, setPreview] = useState<NotificationChannel>(
    availableTabs[0]?.value ?? "WHATSAPP",
  );

  const updateParty = (
    partyId: string | undefined,
    updater: (party: RentalPartyDraft) => RentalPartyDraft,
  ) =>
    onPartiesChange(
      parties.map((party) => (party.id === partyId ? updater(party) : party)),
    );
  const setRoute = (
    party: RentalPartyDraft,
    channel: NotificationChannel,
    enabled: boolean,
    contactPointId?: string,
  ) => {
    const options = party.contact.contactPoints.filter((point) =>
      compatible(point, channel),
    );
    const current = party.notificationRoutes.find(
      (route) => route.channel === channel,
    );
    const selected =
      contactPointId ??
      (current && options.some((point) => point.id === current.contactPointId)
        ? current.contactPointId
        : (options.find((point) => point.isDefault)?.id ?? options[0]?.id));
    if (enabled && !selected)
      return toast.error(
        `La persona no tiene un contacto compatible con ${CHANNELS.find((item) => item.value === channel)?.label}.`,
      );
    updateParty(party.id, (item) => ({
      ...item,
      notificationRoutes: current
        ? item.notificationRoutes.map((route) =>
            route.channel === channel
              ? {
                  ...route,
                  contactPointId: selected ?? route.contactPointId,
                  isEnabled: enabled,
                }
              : route,
          )
        : enabled && selected
          ? [
              ...item.notificationRoutes,
              { channel, contactPointId: selected, isEnabled: true },
            ]
          : item.notificationRoutes,
    }));
  };

  const included = useMemo(
    () => obligations.filter((item) => item.isActive && item.includeInNotice),
    [obligations],
  );
  const recipients = renters.filter((party) =>
    party.notificationRoutes.some(
      (route) => route.channel === preview && route.isEnabled,
    ),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Destinatarios y canales</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Seleccioná qué inquilinos recibirán avisos y qué ContactPoint
                utilizará cada canal en este contrato.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {renters.map((party) => (
              <article
                key={party.id ?? party.contactId}
                className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[220px_1fr]"
              >
                <div className="flex gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {initials(party.contact.name)}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      {party.contact.name}
                    </p>
                    {party.isPrimary ? (
                      <Badge variant="success">Inquilino principal</Badge>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      {party.contact.documentNumber ?? "Sin documento"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {CHANNELS.map(({ value, label }) => {
                    const route = party.notificationRoutes.find(
                      (item) => item.channel === value,
                    );
                    const options = party.contact.contactPoints.filter(
                      (point) => compatible(point, value),
                    );
                    return (
                      <div
                        key={value}
                        className="grid items-center gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[150px_1fr]"
                      >
                        <Switch
                          checked={Boolean(route?.isEnabled)}
                          disabled={disabled || !options.length}
                          label={label}
                          onChange={(checked) =>
                            setRoute(party, value, checked)
                          }
                        />
                        <Select
                          value={route?.contactPointId ?? ""}
                          disabled={
                            disabled || !route?.isEnabled || !options.length
                          }
                          placeholder={
                            options.length
                              ? "Seleccionar contacto"
                              : "Sin contacto compatible"
                          }
                          onChange={(pointId) =>
                            setRoute(party, value, true, pointId)
                          }
                          options={options.map((point) => ({
                            value: point.id,
                            label: `${point.value}${point.isDefault ? " (Principal)" : ""}`,
                          }))}
                        />
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
            {!renters.length ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
                <p className="font-medium text-foreground">
                  No hay inquilinos configurados
                </p>
                <p className="mt-1 text-sm text-muted">
                  Volvé al paso Partes para agregar al menos uno.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contenido del recordatorio</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Elegí qué obligaciones se incluirán y si se mostrará el importe.
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2">Concepto</th>
                  <th>Tipo</th>
                  <th>Incluir en aviso</th>
                  <th>Mostrar importe</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 font-medium text-foreground">
                      {item.concept.name}
                    </td>
                    <td>
                      {item.kind === "RECURRING" ? "Recurrente" : "Puntual"}
                    </td>
                    <td>
                      <Switch
                        checked={item.includeInNotice}
                        disabled={disabled || !item.isActive}
                        label={item.includeInNotice ? "Sí" : "No"}
                        onChange={(checked) =>
                          onObligationsChange(
                            obligations.map((current) =>
                              current.id === item.id
                                ? {
                                    ...current,
                                    includeInNotice: checked,
                                    showAmount: checked
                                      ? current.showAmount
                                      : false,
                                  }
                                : current,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <Switch
                        checked={item.showAmount}
                        disabled={
                          disabled || !item.isActive || !item.includeInNotice
                        }
                        label={item.showAmount ? "Sí" : "No"}
                        onChange={(checked) =>
                          onObligationsChange(
                            obligations.map((current) =>
                              current.id === item.id
                                ? { ...current, showAmount: checked }
                                : current,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vista previa del aviso</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Ejemplo orientativo derivado de esta configuración; no es un
                envío ni se guarda como mensaje.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              ariaLabel="Canal de vista previa"
              value={preview}
              onChange={(value) => setPreview(value as NotificationChannel)}
              items={CHANNELS.map((item) => ({
                ...item,
                disabled: !availableTabs.some(
                  (available) => available.value === item.value,
                ),
              }))}
            />
            <div className="mt-4 rounded-xl bg-surface-alt p-4 text-sm">
              <p>
                Hola{" "}
                {recipients
                  .map((party) => party.contact.name.split(" ")[0])
                  .join(" y ") || ""}
                ,
              </p>
              <p className="mt-2">
                Este es un ejemplo de las obligaciones configuradas:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {included.map((item) => (
                  <li key={item.id}>
                    <strong>{item.concept.name}:</strong>{" "}
                    {item.showAmount &&
                    (item.concept.systemCode === "RENT"
                      ? currentRentAmount
                      : item.defaultAmount) != null
                      ? formatPrice(
                          item.concept.systemCode === "RENT"
                            ? currentRentAmount!
                            : item.defaultAmount!,
                          item.currency,
                        )
                      : "incluida"}
                  </li>
                ))}
              </ul>
              {!included.length ? (
                <p className="mt-2 text-muted">No hay conceptos incluidos.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recordatorios automáticos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              En esta etapa sólo se guarda la configuración del contrato. La
              programación y el envío de comunicaciones se incorporarán cuando
              exista la infraestructura correspondiente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
