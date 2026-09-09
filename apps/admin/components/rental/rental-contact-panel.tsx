"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { useToast } from "@repo/ui/toast";
import {
  addRentalContactPointAction,
  createRentalContactAction,
  markRentalContactPointDefaultAction,
  updateRentalContactAction,
  updateRentalContactPointAction,
} from "@/lib/api/rental-actions";
import type {
  ContactPointType,
  RentalContact,
  RentalContactPoint,
} from "@/lib/api/types/rental";

type RentalContactPanelProps = {
  open: boolean;
  contact: RentalContact | null;
  onClose: () => void;
  onSaved: (contact: RentalContact) => void;
};

export function RentalContactPanel({
  open,
  contact,
  onClose,
  onSaved,
}: RentalContactPanelProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState<RentalContact | null>(contact);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(false);
  const [phoneSms, setPhoneSms] = useState(false);
  const [newPointType, setNewPointType] = useState<ContactPointType>("PHONE");
  const [newPointValue, setNewPointValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrent(contact);
    setName(contact?.name ?? "");
    setNotes(contact?.notes ?? "");
    setEmail("");
    setPhone("");
    setNewPointValue("");
    setError(null);
  }, [contact, open]);

  const publish = (next: RentalContact) => {
    setCurrent(next);
    onSaved(next);
  };

  const saveContact = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ingresá el nombre del contacto.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (!current) {
        const contactPoints = [
          ...(email.trim()
            ? [{ type: "EMAIL" as const, value: email.trim(), isDefault: true }]
            : []),
          ...(phone.trim()
            ? [
                {
                  type: "PHONE" as const,
                  value: phone.trim(),
                  isDefault: true,
                  canReceiveWhatsapp: phoneWhatsapp,
                  canReceiveSms: phoneSms,
                },
              ]
            : []),
        ];
        const result = await createRentalContactAction({
          name: name.trim(),
          notes: notes.trim() || undefined,
          contactPoints,
        });
        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        publish(result.value);
        toast.success("Contacto creado correctamente.");
        return;
      }

      const result = await updateRentalContactAction(current.id, {
        name: name.trim(),
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      publish(result.value);
      toast.success("Contacto actualizado.");
    });
  };

  const addPoint = () => {
    if (!current || !newPointValue.trim()) return;
    startTransition(async () => {
      const result = await addRentalContactPointAction(current.id, {
        type: newPointType,
        value: newPointValue.trim(),
        isDefault: !current.contactPoints.some(
          (point) =>
            point.type === newPointType && point.isDefault && point.isActive,
        ),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      publish({
        ...current,
        contactPoints: [...current.contactPoints, result.value],
      });
      setNewPointValue("");
      toast.success("Medio de contacto agregado.");
    });
  };

  const replacePoint = (point: RentalContactPoint) => {
    if (!current) return;
    publish({
      ...current,
      contactPoints: current.contactPoints.map((existing) =>
        existing.id === point.id
          ? point
          : point.isDefault && existing.type === point.type
            ? { ...existing, isDefault: false }
            : existing,
      ),
    });
  };

  const togglePoint = (point: RentalContactPoint) => {
    if (!current) return;
    startTransition(async () => {
      const result = await updateRentalContactPointAction(
        current.id,
        point.id,
        {
          isActive: !point.isActive,
        },
      );
      if (result.ok) replacePoint(result.value);
      else toast.error(result.error);
    });
  };

  const makeDefault = (point: RentalContactPoint) => {
    if (!current) return;
    startTransition(async () => {
      const result = await markRentalContactPointDefaultAction(
        current.id,
        point.id,
      );
      if (result.ok) replacePoint(result.value);
      else toast.error(result.error);
    });
  };

  return (
    <SidePanel open={open} onClose={onClose} width="lg">
      <SidePanelHeader>
        <SidePanelTitle>
          {current ? "Gestionar contacto" : "Nuevo contacto"}
        </SidePanelTitle>
        <SidePanelDescription>
          Los contactos son propios del tenant y no son usuarios de la
          plataforma.
        </SidePanelDescription>
      </SidePanelHeader>
      <SidePanelContent>
        <form className="space-y-4" onSubmit={saveContact}>
          <FormField>
            <Label required>Nombre</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField>
            <Label>Notas internas</Label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
            />
          </FormField>

          {!current ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FormField>
              <FormField>
                <Label>Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
                <label className="flex gap-3 text-xs text-muted">
                  <span>
                    <input
                      type="checkbox"
                      checked={phoneWhatsapp}
                      onChange={(event) =>
                        setPhoneWhatsapp(event.target.checked)
                      }
                    />{" "}
                    WhatsApp
                  </span>
                  <span>
                    <input
                      type="checkbox"
                      checked={phoneSms}
                      onChange={(event) => setPhoneSms(event.target.checked)}
                    />{" "}
                    SMS
                  </span>
                </label>
              </FormField>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>
              {current ? "Guardar contacto" : "Crear contacto"}
            </Button>
          </div>
        </form>

        {current ? (
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-semibold">Emails y teléfonos</h3>
              <p className="text-xs text-muted">
                El default se mantiene por tipo.
              </p>
            </div>
            {current.contactPoints.map((point) => (
              <div
                key={point.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{point.value}</p>
                  <p className="text-xs text-muted">
                    {point.type === "EMAIL" ? "Email" : "Teléfono"}
                    {point.isDefault ? " · Principal" : ""}
                    {!point.isActive ? " · Inactivo" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {point.isActive && !point.isDefault ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => makeDefault(point)}
                      disabled={isPending}
                    >
                      Marcar principal
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePoint(point)}
                    disabled={isPending}
                  >
                    {point.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <select
                value={newPointType}
                onChange={(event) =>
                  setNewPointType(event.target.value as ContactPointType)
                }
                className="h-8 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="PHONE">Teléfono</option>
                <option value="EMAIL">Email</option>
              </select>
              <Input
                value={newPointValue}
                onChange={(event) => setNewPointValue(event.target.value)}
                placeholder="Nuevo medio de contacto"
              />
              <Button
                variant="secondary"
                onClick={addPoint}
                disabled={isPending || !newPointValue.trim()}
              >
                Agregar
              </Button>
            </div>
          </div>
        ) : null}
      </SidePanelContent>
    </SidePanel>
  );
}
