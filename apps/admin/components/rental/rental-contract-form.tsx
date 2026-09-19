"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { DatePicker } from "@repo/ui/date-picker";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { useToast } from "@repo/ui/toast";
import {
  PropertyLocationFields,
  type PropertyLocationValue,
} from "@/components/property/property-location-fields";
import { RentalContactPanel } from "@/components/rental/rental-contact-panel";
import {
  createRentalContractAction,
  transitionRentalContractAction,
  updateRentalContractAction,
} from "@/lib/api/rental-actions";
import type {
  RentalContact,
  RentalContract,
  RentalContractParty,
  RentalContractPartyRole,
} from "@/lib/api/types/rental";
import type { AdminProperty } from "@/lib/api/types/property";
import { getPropertyTypeLabel } from "@/lib/format/property-labels";

const STATUS_LABEL = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  ENDED: "Finalizado",
  CANCELLED: "Cancelado",
} as const;
const dateOnly = (value?: string | null) => value?.slice(0, 10) ?? "";

export function RentalContractForm({
  mode,
  contract,
  properties,
  initialContacts,
  canUpdate = true,
  canEnd = false,
}: {
  mode: "create" | "edit";
  contract?: RentalContract;
  properties: AdminProperty[];
  initialContacts: RentalContact[];
  canUpdate?: boolean;
  canEnd?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [contacts, setContacts] = useState(initialContacts);
  const [parties, setParties] = useState<RentalContractParty[]>(
    contract?.parties ?? [],
  );
  const [panel, setPanel] = useState<{
    role: RentalContractPartyRole;
    party: RentalContractParty | null;
  } | null>(null);
  const [propertyQuery, setPropertyQuery] = useState(
    contract?.property?.title ?? "",
  );
  const [propertyOpen, setPropertyOpen] = useState(false);
  const propertyBox = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState({
    propertyId: contract?.propertyId ?? "",
    propertyCountryId: contract?.propertyCountryId ?? "",
    propertyCountrySnapshot: contract?.propertyCountrySnapshot ?? "Argentina",
    propertyStreetSnapshot:
      contract?.propertyStreetSnapshot ??
      contract?.propertyAddressSnapshot ??
      "",
    propertyStreetNumberSnapshot: contract?.propertyStreetNumberSnapshot ?? "",
    propertyFloorSnapshot: contract?.propertyFloorSnapshot ?? "",
    propertyUnitSnapshot: contract?.propertyUnitSnapshot ?? "",
    propertyPostalCodeSnapshot: contract?.propertyPostalCodeSnapshot ?? "",
    propertyNotesSnapshot: contract?.propertyNotesSnapshot ?? "",
    startsOn: dateOnly(contract?.startsOn),
    endsOn: dateOnly(contract?.endsOn),
    notes: contract?.notes ?? "",
  });
  const [location, setLocation] = useState<PropertyLocationValue>({
    provinceId: contract?.propertyProvinceId ?? "",
    provinceName: contract?.propertyProvinceSnapshot ?? "",
    localityId: contract?.propertyLocalityId ?? "",
    localityName: contract?.propertyLocalitySnapshot ?? "",
    neighborhoodId: contract?.propertyNeighborhoodId ?? "",
    neighborhoodName: contract?.propertyNeighborhoodSnapshot ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable =
    mode === "create" ||
    (canUpdate && ["DRAFT", "ACTIVE"].includes(contract?.status ?? ""));

  const filteredProperties = useMemo(() => {
    const query = propertyQuery.trim().toLowerCase();
    return properties
      .filter(
        (property) =>
          !query ||
          [
            property.title,
            property.internalCode,
            property.street,
            property.streetNumber,
            property.city,
            property.neighborhoodName,
          ].some((part) => part?.toLowerCase().includes(query)),
      )
      .slice(0, 10);
  }, [properties, propertyQuery]);
  const setField = (field: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const selectProperty = (property: AdminProperty | null) => {
    setValues((current) =>
      property
        ? {
            ...current,
            propertyId: property.id,
            propertyCountryId: property.countryId ?? "",
            propertyCountrySnapshot:
              property.country === "AR" ? "Argentina" : property.country,
            propertyStreetSnapshot: property.street || property.title,
            propertyStreetNumberSnapshot: property.streetNumber ?? "",
            propertyFloorSnapshot: property.floor ?? "",
            propertyUnitSnapshot: property.apartment ?? "",
            propertyPostalCodeSnapshot: property.postalCode ?? "",
          }
        : { ...current, propertyId: "" },
    );
    if (property)
      setLocation({
        provinceId: property.provinceId ?? "",
        provinceName: property.provinceName ?? property.province ?? "",
        localityId: property.localityId ?? "",
        localityName: property.localityName ?? property.city ?? "",
        neighborhoodId: property.neighborhoodId ?? "",
        neighborhoodName:
          property.neighborhoodName ?? property.neighborhood ?? "",
      });
    setPropertyQuery(
      property?.title ??
        "Cargar inmueble manualmente / Sin inmueble registrado",
    );
    setPropertyOpen(false);
  };

  const saveParty = (party: RentalContractParty) =>
    setParties((current) =>
      party.id
        ? current.map((item) => (item.id === party.id ? party : item))
        : [...current, { ...party, id: `draft-${crypto.randomUUID()}` }],
    );
  const removeParty = (id?: string) =>
    setParties((current) => current.filter((item) => item.id !== id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.propertyStreetSnapshot.trim() || !values.startsOn) {
      setError("La calle y la fecha de inicio son obligatorias.");
      return;
    }
    const payload = {
      propertyId: values.propertyId || null,
      propertyCountryId: values.propertyCountryId || null,
      propertyProvinceId: location.provinceId || null,
      propertyLocalityId: location.localityId || null,
      propertyNeighborhoodId: location.neighborhoodId || null,
      propertyCountrySnapshot: values.propertyCountrySnapshot || null,
      propertyProvinceSnapshot: location.provinceName || null,
      propertyLocalitySnapshot: location.localityName || null,
      propertyNeighborhoodSnapshot: location.neighborhoodName || null,
      propertyStreetSnapshot: values.propertyStreetSnapshot.trim(),
      propertyStreetNumberSnapshot:
        values.propertyStreetNumberSnapshot.trim() || null,
      propertyFloorSnapshot: values.propertyFloorSnapshot.trim() || null,
      propertyUnitSnapshot: values.propertyUnitSnapshot.trim() || null,
      propertyPostalCodeSnapshot:
        values.propertyPostalCodeSnapshot.trim() || null,
      propertyNotesSnapshot: values.propertyNotesSnapshot.trim() || null,
      startsOn: values.startsOn,
      endsOn: values.endsOn || null,
      notes: values.notes.trim() || null,
      parties: parties.map((party) => ({
        contactId: party.contactId,
        role: party.role,
        notificationRoutes: party.notificationRoutes.map(
          ({ channel, contactPointId, isEnabled }) => ({
            channel,
            contactPointId,
            isEnabled,
          }),
        ),
      })),
    };
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRentalContractAction(payload)
          : await updateRentalContractAction(contract!.id, payload);
      if (!result.ok) {
        setError(result.error);
        return toast.error(result.error);
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

  const transition = (target: "activate" | "end" | "cancel") =>
    contract &&
    startTransition(async () => {
      const result = await transitionRentalContractAction(contract.id, target);
      if (!result.ok) return toast.error(result.error);
      toast.success(
        target === "activate"
          ? "Contrato activado."
          : target === "end"
            ? "Contrato finalizado."
            : "Contrato cancelado.",
      );
      router.refresh();
    });
  const renderParties = (role: RentalContractPartyRole) => {
    const items = parties.filter((party) => party.role === role);
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            {role === "RENTER" ? "Inquilinos" : "Propietarios"}
          </h3>
          {editable ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPanel({ role, party: null })}
            >
              + Agregar {role === "RENTER" ? "inquilino" : "propietario"}
            </Button>
          ) : null}
        </div>
        {items.length ? (
          <div className="space-y-2">
            {items.map((party) => (
              <div
                key={party.id}
                className="rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{party.contact.name}</p>
                    <p className="text-xs text-zinc-500">
                      {party.contact.documentNumber
                        ? `${party.contact.documentType ?? "Documento"} ${party.contact.documentNumber}`
                        : "Sin documento informado"}
                    </p>
                    {role === "RENTER" ? (
                      <p className="mt-2 text-xs text-indigo-700">
                        {party.notificationRoutes.length
                          ? `Avisos preparados: ${party.notificationRoutes.map((route) => (route.channel === "EMAIL" ? "Email" : route.channel === "WHATSAPP" ? "WhatsApp" : "SMS")).join(", ")}`
                          : "Sin medios de aviso seleccionados"}
                      </p>
                    ) : null}
                  </div>
                  {editable ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPanel({ role, party })}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeParty(party.id)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No hay personas asociadas.</p>
        )}
      </div>
    );
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Inmueble y vigencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField>
              <Label>Inmueble de referencia</Label>
              <div ref={propertyBox} className="relative">
                <Input
                  value={propertyQuery}
                  disabled={!editable}
                  placeholder="Escribí dirección, título o código interno"
                  onFocus={() => setPropertyOpen(true)}
                  onChange={(event) => {
                    setPropertyQuery(event.target.value);
                    setPropertyOpen(true);
                  }}
                />
                {propertyOpen && editable ? (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectProperty(null)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Cargar inmueble manualmente / Sin inmueble registrado
                    </button>
                    {filteredProperties.map((property) => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => selectProperty(property)}
                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-50"
                      >
                        <span className="block text-sm font-medium">
                          {[
                            property.street,
                            property.streetNumber,
                            property.floor && `Piso ${property.floor}`,
                            property.apartment &&
                              `Unidad ${property.apartment}`,
                          ]
                            .filter(Boolean)
                            .join(" ") || property.title}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {property.title} ·{" "}
                          {getPropertyTypeLabel(property.propertyType)} ·{" "}
                          {property.isActive ? "Activa" : "Archivada"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <HelperText>
                Precarga la dirección contractual. Podés corregirla sin
                modificar la propiedad.
              </HelperText>
            </FormField>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <h3 className="mb-4 font-semibold">Dirección contractual</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField>
                  <Label>País</Label>
                  <Input
                    value={values.propertyCountrySnapshot}
                    disabled={!editable}
                    onChange={(event) => {
                      setField("propertyCountrySnapshot", event.target.value);
                      setField("propertyCountryId", "");
                    }}
                  />
                </FormField>
                <FormField>
                  <Label required>Calle</Label>
                  <Input
                    value={values.propertyStreetSnapshot}
                    disabled={!editable}
                    onChange={(event) =>
                      setField("propertyStreetSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Label>Número</Label>
                  <Input
                    value={values.propertyStreetNumberSnapshot}
                    disabled={!editable}
                    onChange={(event) =>
                      setField(
                        "propertyStreetNumberSnapshot",
                        event.target.value,
                      )
                    }
                  />
                </FormField>
                <FormField>
                  <Label>Código postal</Label>
                  <Input
                    value={values.propertyPostalCodeSnapshot}
                    disabled={!editable}
                    onChange={(event) =>
                      setField("propertyPostalCodeSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <PropertyLocationFields
                  value={location}
                  disabled={!editable}
                  onChange={setLocation}
                />
                <FormField>
                  <Label>Piso</Label>
                  <Input
                    value={values.propertyFloorSnapshot}
                    disabled={!editable}
                    onChange={(event) =>
                      setField("propertyFloorSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Label>Departamento / unidad</Label>
                  <Input
                    value={values.propertyUnitSnapshot}
                    disabled={!editable}
                    onChange={(event) =>
                      setField("propertyUnitSnapshot", event.target.value)
                    }
                  />
                </FormField>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField>
                <Label required>Inicio</Label>
                <DatePicker
                  value={values.startsOn}
                  disabled={!editable}
                  onChange={(value) => setField("startsOn", value)}
                />
              </FormField>
              <FormField>
                <Label>Fin</Label>
                <DatePicker
                  value={values.endsOn}
                  disabled={!editable}
                  onChange={(value) => setField("endsOn", value)}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partes del contrato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            {renderParties("RENTER")}
            {renderParties("LANDLORD")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField>
              <Label>Aclaraciones del inmueble</Label>
              <Textarea
                value={values.propertyNotesSnapshot}
                disabled={!editable}
                onChange={(event) =>
                  setField("propertyNotesSnapshot", event.target.value)
                }
              />
            </FormField>
            <FormField>
              <Label>Notas internas</Label>
              <Textarea
                value={values.notes}
                disabled={!editable}
                onChange={(event) => setField("notes", event.target.value)}
              />
            </FormField>
          </CardContent>
          <CardFooter className="flex-wrap justify-between">
            <div className="flex gap-2">
              {contract?.status === "DRAFT" && canUpdate ? (
                <Button
                  variant="outline-primary"
                  onClick={() => transition("activate")}
                  loading={pending}
                >
                  Activar
                </Button>
              ) : null}
              {contract &&
              ["DRAFT", "ACTIVE"].includes(contract.status) &&
              canEnd ? (
                <Button variant="ghost" onClick={() => transition("cancel")}>
                  Cancelar contrato
                </Button>
              ) : null}
              {contract?.status === "ACTIVE" && canEnd ? (
                <Button variant="secondary" onClick={() => transition("end")}>
                  Finalizar
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Link href="/alquileres">
                <Button variant="secondary">Volver</Button>
              </Link>
              {editable ? (
                <Button type="submit" loading={pending}>
                  {mode === "create" ? "Crear borrador" : "Guardar cambios"}
                </Button>
              ) : null}
            </div>
          </CardFooter>
        </Card>
        {contract ? (
          <p className="text-xs text-zinc-500">
            Estado: {STATUS_LABEL[contract.status]}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
      {panel ? (
        <RentalContactPanel
          open
          role={panel.role}
          party={panel.party}
          contacts={contacts.filter((contact) => contact.isActive)}
          onClose={() => setPanel(null)}
          onContactCreated={(contact) =>
            setContacts((current) => [...current, contact])
          }
          onSaved={saveParty}
        />
      ) : null}
    </>
  );
}
