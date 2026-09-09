"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import { RentalContactPanel } from "@/components/rental/rental-contact-panel";
import {
  createRentalContractAction,
  transitionRentalContractAction,
  updateRentalContractAction,
} from "@/lib/api/rental-actions";
import type { RentalContact, RentalContract } from "@/lib/api/types/rental";
import type { AdminProperty } from "@/lib/api/types/property";

type ContactRole = "renter" | "landlord";

type Props = {
  mode: "create" | "edit";
  contract?: RentalContract;
  properties: AdminProperty[];
  initialContacts: RentalContact[];
  canUpdate?: boolean;
  canEnd?: boolean;
};

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function RentalContractForm({
  mode,
  contract,
  properties,
  initialContacts,
  canUpdate = true,
  canEnd = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [contacts, setContacts] = useState(initialContacts);
  const [contactSearch, setContactSearch] = useState("");
  const [panelRole, setPanelRole] = useState<ContactRole | null>(null);
  const [panelContact, setPanelContact] = useState<RentalContact | null>(null);
  const [values, setValues] = useState({
    propertyId: contract?.propertyId ?? "",
    renterContactId: contract?.renterContactId ?? "",
    landlordContactId: contract?.landlordContactId ?? "",
    propertyAddressSnapshot: contract?.propertyAddressSnapshot ?? "",
    propertyLocalitySnapshot: contract?.propertyLocalitySnapshot ?? "",
    propertyUnitSnapshot: contract?.propertyUnitSnapshot ?? "",
    propertyNotesSnapshot: contract?.propertyNotesSnapshot ?? "",
    startsOn: dateOnly(contract?.startsOn),
    endsOn: dateOnly(contract?.endsOn),
    notes: contract?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const contactOptions = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    const selectedIds = [values.renterContactId, values.landlordContactId];
    return [
      { value: "", label: "Sin seleccionar" },
      ...contacts
        .filter(
          (item) =>
            selectedIds.includes(item.id) ||
            !query ||
            item.name.toLowerCase().includes(query) ||
            item.contactPoints.some((point) =>
              point.value.toLowerCase().includes(query),
            ),
        )
        .map((item) => ({
          value: item.id,
          label: item.isActive ? item.name : `${item.name} (inactivo)`,
          disabled: !item.isActive && !selectedIds.includes(item.id),
        })),
    ];
  }, [
    contactSearch,
    contacts,
    values.landlordContactId,
    values.renterContactId,
  ]);
  const propertyOptions = [
    { value: "", label: "Referencia manual (sin Property)" },
    ...properties.map((property) => ({
      value: property.id,
      label: property.title,
    })),
  ];

  const setField = (field: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item.id === propertyId);
    setValues((current) => ({
      ...current,
      propertyId,
      ...(property
        ? {
            propertyAddressSnapshot:
              [property.street, property.streetNumber]
                .filter(Boolean)
                .join(" ") || property.title,
            propertyLocalitySnapshot: [property.neighborhood, property.city]
              .filter(Boolean)
              .join(", "),
            propertyUnitSnapshot: [
              property.floor ? `Piso ${property.floor}` : "",
              property.apartment ? `Unidad ${property.apartment}` : "",
            ]
              .filter(Boolean)
              .join(" · "),
          }
        : {}),
    }));
  };

  const openNewContact = (role: ContactRole) => {
    setPanelRole(role);
    setPanelContact(null);
  };

  const openSelectedContact = (role: ContactRole) => {
    const id =
      role === "renter" ? values.renterContactId : values.landlordContactId;
    const selected = contacts.find((item) => item.id === id);
    if (!selected) return;
    setPanelRole(role);
    setPanelContact(selected);
  };

  const savePanelContact = (saved: RentalContact) => {
    setContacts((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
    });
    if (panelRole) {
      setField(
        panelRole === "renter" ? "renterContactId" : "landlordContactId",
        saved.id,
      );
    }
    setPanelContact(saved);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.propertyAddressSnapshot.trim() || !values.startsOn) {
      setError(
        "La dirección de referencia y la fecha de inicio son obligatorias.",
      );
      return;
    }
    setError(null);
    const payload = {
      propertyId: values.propertyId || null,
      renterContactId: values.renterContactId || null,
      landlordContactId: values.landlordContactId || null,
      propertyAddressSnapshot: values.propertyAddressSnapshot.trim(),
      propertyLocalitySnapshot: values.propertyLocalitySnapshot.trim() || null,
      propertyUnitSnapshot: values.propertyUnitSnapshot.trim() || null,
      propertyNotesSnapshot: values.propertyNotesSnapshot.trim() || null,
      startsOn: values.startsOn,
      endsOn: values.endsOn || null,
      notes: values.notes.trim() || null,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRentalContractAction(payload)
          : await updateRentalContractAction(contract!.id, payload);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        mode === "create"
          ? "Contrato creado como borrador."
          : "Contrato actualizado.",
      );
      router.push(`/alquileres/${result.value.id}`);
      router.refresh();
    });
  };

  const transition = (target: "activate" | "end" | "cancel") => {
    if (!contract) return;
    startTransition(async () => {
      const result = await transitionRentalContractAction(contract.id, target);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        target === "activate"
          ? "Contrato activado."
          : target === "end"
            ? "Contrato finalizado."
            : "Contrato cancelado.",
      );
      router.refresh();
    });
  };

  const editable =
    mode === "create" ||
    (canUpdate && ["DRAFT", "ACTIVE"].includes(contract?.status ?? ""));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Inmueble y vigencia</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField className="md:col-span-2">
              <Label>Property existente</Label>
              <Select
                options={propertyOptions}
                value={values.propertyId}
                onChange={selectProperty}
                disabled={!editable}
              />
              <HelperText>
                La referencia textual queda congelada aunque la Property cambie
                o se elimine.
              </HelperText>
            </FormField>
            <FormField className="md:col-span-2">
              <Label required>Dirección de referencia</Label>
              <Input
                value={values.propertyAddressSnapshot}
                onChange={(event) =>
                  setField("propertyAddressSnapshot", event.target.value)
                }
                disabled={!editable}
              />
            </FormField>
            <FormField>
              <Label>Localidad o barrio</Label>
              <Input
                value={values.propertyLocalitySnapshot}
                onChange={(event) =>
                  setField("propertyLocalitySnapshot", event.target.value)
                }
                disabled={!editable}
              />
            </FormField>
            <FormField>
              <Label>Unidad</Label>
              <Input
                value={values.propertyUnitSnapshot}
                onChange={(event) =>
                  setField("propertyUnitSnapshot", event.target.value)
                }
                disabled={!editable}
              />
            </FormField>
            <FormField>
              <Label required>Inicio</Label>
              <Input
                type="date"
                value={values.startsOn}
                onChange={(event) => setField("startsOn", event.target.value)}
                disabled={!editable}
              />
            </FormField>
            <FormField>
              <Label>Fin</Label>
              <Input
                type="date"
                value={values.endsOn}
                onChange={(event) => setField("endsOn", event.target.value)}
                disabled={!editable}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField className="md:col-span-2">
              <Label>Buscar contactos</Label>
              <Input
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Nombre, email o teléfono"
                disabled={!editable}
              />
            </FormField>
            {(["renter", "landlord"] as const).map((role) => {
              const field =
                role === "renter" ? "renterContactId" : "landlordContactId";
              return (
                <FormField key={role}>
                  <Label>
                    {role === "renter" ? "Inquilino" : "Propietario opcional"}
                  </Label>
                  <Select
                    options={contactOptions}
                    value={values[field]}
                    onChange={(value) => setField(field, value)}
                    disabled={!editable}
                  />
                  {editable ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openNewContact(role)}
                      >
                        Crear contacto
                      </Button>
                      {values[field] ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSelectedContact(role)}
                        >
                          Gestionar datos
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </FormField>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField>
              <Label>Aclaraciones del inmueble</Label>
              <textarea
                value={values.propertyNotesSnapshot}
                onChange={(event) =>
                  setField("propertyNotesSnapshot", event.target.value)
                }
                disabled={!editable}
                className="min-h-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </FormField>
            <FormField>
              <Label>Notas internas</Label>
              <textarea
                value={values.notes}
                onChange={(event) => setField("notes", event.target.value)}
                disabled={!editable}
                className="min-h-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              />
            </FormField>
          </CardContent>
          <CardFooter className="flex-wrap justify-between">
            <div className="flex gap-2">
              {contract?.status === "DRAFT" && canUpdate ? (
                <Button
                  variant="outline-primary"
                  onClick={() => transition("activate")}
                  loading={isPending}
                >
                  Activar
                </Button>
              ) : null}
              {contract &&
              ["DRAFT", "ACTIVE"].includes(contract.status) &&
              canEnd ? (
                <Button
                  variant="ghost"
                  onClick={() => transition("cancel")}
                  disabled={isPending}
                >
                  Cancelar contrato
                </Button>
              ) : null}
              {contract?.status === "ACTIVE" && canEnd ? (
                <Button
                  variant="secondary"
                  onClick={() => transition("end")}
                  disabled={isPending}
                >
                  Finalizar
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Link href="/alquileres">
                <Button variant="secondary">Volver</Button>
              </Link>
              {editable ? (
                <Button type="submit" loading={isPending}>
                  {mode === "create" ? "Crear borrador" : "Guardar cambios"}
                </Button>
              ) : null}
            </div>
          </CardFooter>
        </Card>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <RentalContactPanel
        open={panelRole !== null}
        contact={panelContact}
        onClose={() => {
          setPanelRole(null);
          setPanelContact(null);
        }}
        onSaved={savePanelContact}
      />
    </>
  );
}
