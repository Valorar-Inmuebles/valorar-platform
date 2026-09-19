"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { Switch } from "@repo/ui/switch";
import { useToast } from "@repo/ui/toast";
import { createRentalContactAction } from "@/lib/api/rental-actions";
import type {
  NotificationChannel,
  RentalContact,
  RentalContractParty,
  RentalContractPartyRole,
} from "@/lib/api/types/rental";

type RouteDraft = Partial<Record<NotificationChannel, string>>;

function suggestedRoutes(contact: RentalContact): RouteDraft {
  const active = contact.contactPoints.filter((point) => point.isActive);
  const pick = (channel: NotificationChannel) => {
    const compatible = active.filter((point) =>
      channel === "EMAIL"
        ? point.type === "EMAIL"
        : point.type === "PHONE" &&
          (channel === "WHATSAPP"
            ? point.canReceiveWhatsapp
            : point.canReceiveSms),
    );
    return compatible.find((point) => point.isDefault)?.id ?? compatible[0]?.id;
  };
  return { EMAIL: pick("EMAIL"), WHATSAPP: pick("WHATSAPP"), SMS: pick("SMS") };
}

export function RentalContactPanel({
  open,
  role,
  contacts,
  party,
  onClose,
  onContactCreated,
  onSaved,
}: {
  open: boolean;
  role: RentalContractPartyRole;
  contacts: RentalContact[];
  party: RentalContractParty | null;
  onClose: () => void;
  onContactCreated: (contact: RentalContact) => void;
  onSaved: (party: RentalContractParty) => void;
}) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [emails, setEmails] = useState([""]);
  const [phones, setPhones] = useState([
    { value: "", whatsapp: true, sms: false },
  ]);
  const [routes, setRoutes] = useState<RouteDraft>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedId(party?.contactId ?? "");
    setSearch("");
    setCreating(false);
    const stored = party
      ? Object.fromEntries(
          party.notificationRoutes
            .filter((item) => item.isEnabled)
            .map((item) => [item.channel, item.contactPointId]),
        )
      : {};
    setRoutes(
      party && role === "RENTER" && party.notificationRoutes.length === 0
        ? suggestedRoutes(party.contact)
        : stored,
    );
  }, [open, party, role]);

  const selected =
    contacts.find((contact) => contact.id === selectedId) ??
    party?.contact ??
    null;
  const filtered = useMemo(
    () =>
      contacts.filter((contact) => {
        const query = search.trim().toLowerCase();
        return (
          !query ||
          contact.name.toLowerCase().includes(query) ||
          contact.documentNumber?.includes(query) ||
          contact.contactPoints.some((point) =>
            point.value.toLowerCase().includes(query),
          )
        );
      }),
    [contacts, search],
  );

  const choose = (contact: RentalContact) => {
    setSelectedId(contact.id);
    setRoutes(
      party?.contactId === contact.id ? routes : suggestedRoutes(contact),
    );
  };

  const createPerson = () =>
    startTransition(async () => {
      if (!name.trim()) return toast.error("Ingresá el nombre de la persona.");
      const contactPoints = [
        ...emails
          .filter((value) => value.trim())
          .map((value, index) => ({
            type: "EMAIL" as const,
            value: value.trim(),
            isDefault: index === 0,
          })),
        ...phones
          .filter((item) => item.value.trim())
          .map((item, index) => ({
            type: "PHONE" as const,
            value: item.value.trim(),
            isDefault: index === 0,
            canReceiveWhatsapp: item.whatsapp,
            canReceiveSms: item.sms,
          })),
      ];
      const result = await createRentalContactAction({
        name: name.trim(),
        documentType: documentType.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        contactPoints,
      });
      if (!result.ok) return toast.error(result.error);
      onContactCreated(result.value);
      choose(result.value);
      setCreating(false);
      toast.success("Persona creada.");
    });

  const save = () => {
    if (!selected) return toast.error("Seleccioná o creá una persona.");
    const notificationRoutes = (
      Object.entries(routes) as Array<[NotificationChannel, string]>
    )
      .filter(([, pointId]) => Boolean(pointId))
      .map(([channel, contactPointId]) => ({
        channel,
        contactPointId,
        isEnabled: true,
      }));
    onSaved({
      id: party?.id,
      contactId: selected.id,
      role,
      contact: selected,
      notificationRoutes,
    });
    onClose();
  };

  const channelOptions = (channel: NotificationChannel) =>
    selected?.contactPoints
      .filter(
        (point) =>
          point.isActive &&
          (channel === "EMAIL"
            ? point.type === "EMAIL"
            : point.type === "PHONE" &&
              (channel === "WHATSAPP"
                ? point.canReceiveWhatsapp
                : point.canReceiveSms)),
      )
      .map((point) => ({
        value: point.id,
        label: `${point.value}${point.isDefault ? " · principal" : ""}`,
      })) ?? [];

  return (
    <SidePanel open={open} onClose={onClose} width="lg">
      <SidePanelHeader>
        <SidePanelTitle>
          {party ? "Editar" : "Agregar"}{" "}
          {role === "RENTER" ? "inquilino" : "propietario"}
        </SidePanelTitle>
        <SidePanelDescription>
          Buscá una persona existente o creala sin salir del contrato.
        </SidePanelDescription>
      </SidePanelHeader>
      <SidePanelContent className="space-y-6">
        {!selected ? (
          <>
            <FormField>
              <Label>Buscar persona existente</Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, documento, email o teléfono"
              />
            </FormField>
            <div className="space-y-2">
              {filtered.slice(0, 8).map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => choose(contact)}
                  className="w-full rounded-xl border border-zinc-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="font-medium">{contact.name}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {contact.documentNumber
                      ? `${contact.documentType ?? "Documento"} ${contact.documentNumber} · `
                      : ""}
                    {contact.contactPoints
                      .map((point) => point.value)
                      .join(" · ") || "Sin medios cargados"}
                  </span>
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              Crear nueva persona
            </Button>
          </>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <p className="font-semibold">{selected.name}</p>
            <p className="text-xs text-zinc-500">
              {selected.documentNumber
                ? `${selected.documentType ?? "Documento"} ${selected.documentNumber}`
                : "Sin documento informado"}
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedId("");
                setRoutes({});
              }}
            >
              Cambiar persona
            </Button>
          </div>
        )}

        {creating && !selected ? (
          <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
            <h3 className="font-semibold">Nueva persona</h3>
            <FormField>
              <Label required>Nombre completo</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField>
                <Label>Tipo de documento</Label>
                <Input
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  placeholder="DNI, CUIT, Pasaporte…"
                />
              </FormField>
              <FormField>
                <Label>Número de documento</Label>
                <Input
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <Label>Emails</Label>
              {emails.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={value}
                    onChange={(event) =>
                      setEmails((items) =>
                        items.map((item, i) =>
                          i === index ? event.target.value : item,
                        ),
                      )
                    }
                    placeholder="persona@email.com"
                  />
                  {emails.length > 1 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEmails((items) =>
                          items.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEmails((items) => [...items, ""])}
              >
                + Otro email
              </Button>
            </div>
            <div className="space-y-3">
              <Label>Teléfonos</Label>
              {phones.map((phone, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <div className="flex gap-2">
                    <Input
                      value={phone.value}
                      onChange={(event) =>
                        setPhones((items) =>
                          items.map((item, i) =>
                            i === index
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder="+54 9 11…"
                    />
                    {phones.length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPhones((items) =>
                            items.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex gap-4">
                    <Switch
                      label="WhatsApp"
                      checked={phone.whatsapp}
                      onChange={(checked) =>
                        setPhones((items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, whatsapp: checked } : item,
                          ),
                        )
                      }
                    />
                    <Switch
                      label="SMS"
                      checked={phone.sms}
                      onChange={(checked) =>
                        setPhones((items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, sms: checked } : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPhones((items) => [
                    ...items,
                    { value: "", whatsapp: true, sms: false },
                  ])
                }
              >
                + Otro teléfono
              </Button>
            </div>
            <Button onClick={createPerson} loading={pending}>
              Guardar persona
            </Button>
          </div>
        ) : null}

        {selected && role === "RENTER" ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Recibir avisos por</h3>
              <HelperText>
                La selección queda vinculada a este contrato. Todavía no se
                enviarán mensajes.
              </HelperText>
            </div>
            {(["WHATSAPP", "EMAIL", "SMS"] as NotificationChannel[]).map(
              (channel) => {
                const options = channelOptions(channel);
                const enabled = Boolean(routes[channel]);
                return (
                  <div
                    key={channel}
                    className="rounded-xl border border-zinc-200 p-3"
                  >
                    <Switch
                      label={
                        channel === "WHATSAPP"
                          ? "WhatsApp"
                          : channel === "EMAIL"
                            ? "Email"
                            : "SMS"
                      }
                      checked={enabled}
                      disabled={!options.length}
                      onChange={(checked) =>
                        setRoutes((current) => ({
                          ...current,
                          [channel]: checked
                            ? (suggestedRoutes(selected)[channel] ??
                              options[0]?.value)
                            : undefined,
                        }))
                      }
                    />
                    {enabled ? (
                      <div className="mt-3">
                        <Select
                          value={routes[channel]}
                          options={options}
                          onChange={(value) =>
                            setRoutes((current) => ({
                              ...current,
                              [channel]: value,
                            }))
                          }
                        />
                      </div>
                    ) : null}
                    {!options.length ? (
                      <HelperText>
                        No hay un medio compatible activo.
                      </HelperText>
                    ) : null}
                  </div>
                );
              },
            )}
          </div>
        ) : null}
        {selected && role === "LANDLORD" ? (
          <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
            La asociación del propietario es administrativa. Los avisos no se
            habilitan automáticamente en V1.
          </p>
        ) : null}
      </SidePanelContent>
      <SidePanelFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={!selected}>
          Guardar asociación
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
