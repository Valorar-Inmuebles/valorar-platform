"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { DatePicker } from "@repo/ui/date-picker";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@repo/ui/search-combobox";
import { Stepper } from "@repo/ui/stepper";
import { Textarea } from "@repo/ui/textarea";
import { useToast } from "@repo/ui/toast";
import {
  PropertyLocationFields,
  type PropertyLocationValue,
} from "@/components/property/property-location-fields";
import {
  RentalContactPanel,
  type RentalPartyDraft,
} from "@/components/rental/rental-contact-panel";
import {
  createRentalContractAction,
  searchRentalPropertiesAction,
  updateRentalContractAction,
} from "@/lib/api/rental-actions";
import type {
  RentalContact,
  RentalContract,
  RentalContractPartyRole,
  RentalPropertySearchItem,
} from "@/lib/api/types/rental";

const dateOnly = (value?: string | null) => value?.slice(0, 10) ?? "";

function minimumEnd(startsOn: string) {
  if (!startsOn) return "";
  const [year, month, day] = startsOn.split("-").map(Number);
  if (!year || !month || !day) return "";
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function durationLabel(startsOn: string, endsOn: string) {
  if (!startsOn || !endsOn || endsOn < minimumEnd(startsOn)) return null;
  const start = new Date(`${startsOn}T00:00:00Z`);
  const endExclusive = new Date(`${endsOn}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  let months =
    (endExclusive.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    endExclusive.getUTCMonth() -
    start.getUTCMonth();
  if (endExclusive.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(1, months);
  return months % 12 === 0
    ? `${months / 12} ${months === 12 ? "año" : "años"}`
    : `${months} meses`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function pointActive(
  point: RentalPartyDraft["contact"]["contactPoints"][number],
) {
  return !("isActive" in point) || point.isActive;
}

export function RentalContractWizard({
  mode,
  contract,
  canUpdate = true,
  initialStep = 1,
}: {
  mode: "create" | "edit";
  contract?: RentalContract;
  canUpdate?: boolean;
  initialStep?: 1 | 2;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const propertyCache = useRef(new Map<string, RentalPropertySearchItem>());
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RentalPartyDraft | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<{
    role: RentalContractPartyRole;
    party: RentalPartyDraft | null;
  } | null>(null);
  const [parties, setParties] = useState<RentalPartyDraft[]>(
    contract?.parties ?? [],
  );
  const [propertyOption, setPropertyOption] =
    useState<SearchComboboxOption | null>(
      contract?.property
        ? {
            value: contract.property.id,
            label: contract.property.title,
            description: contract.property.isActive ? "Activa" : "Inactiva",
          }
        : null,
    );
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

  const editable =
    canUpdate &&
    (mode === "create" || ["DRAFT", "ACTIVE"].includes(contract?.status ?? ""));
  const duration = durationLabel(values.startsOn, values.endsOn);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const markChanged = () => {
    setDirty(true);
    setError(null);
  };

  const setField = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    markChanged();
  };

  const loadProperties = async (query: string) => {
    const result = await searchRentalPropertiesAction(query);
    if (!result.ok) throw new Error(result.error);
    result.value.items.forEach((property) =>
      propertyCache.current.set(property.id, property),
    );
    return result.value.items.map((property) => ({
      value: property.id,
      label: property.formattedAddress || property.title,
      description: [
        property.internalCode,
        property.title,
        property.isActive ? "Activa" : "Inactiva",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  };

  const selectProperty = (option: SearchComboboxOption | null) => {
    setPropertyOption(option);
    const property = option ? propertyCache.current.get(option.value) : null;
    if (!property) {
      setValues((current) => ({ ...current, propertyId: "" }));
      markChanged();
      return;
    }
    setValues((current) => ({
      ...current,
      propertyId: property.id,
      propertyCountryId: property.countryId ?? "",
      propertyCountrySnapshot:
        !property.country || property.country === "AR"
          ? "Argentina"
          : property.country,
      propertyStreetSnapshot: property.street || property.title,
      propertyStreetNumberSnapshot: property.streetNumber ?? "",
      propertyFloorSnapshot: property.floor ?? "",
      propertyUnitSnapshot: property.apartment ?? "",
      propertyPostalCodeSnapshot: property.postalCode ?? "",
    }));
    setLocation({
      provinceId: property.provinceId ?? "",
      provinceName: property.province ?? "",
      localityId: property.localityId ?? "",
      localityName: property.city ?? "",
      neighborhoodId: property.neighborhoodId ?? "",
      neighborhoodName: property.neighborhood ?? "",
    });
    markChanged();
  };

  const validateDraft = () => {
    if (!values.propertyStreetSnapshot.trim() || !values.startsOn)
      return "Para guardar el borrador, completá al menos la calle y la fecha de inicio.";
    return null;
  };

  const validateStepOne = () => {
    if (!values.startsOn || !values.endsOn)
      return "Completá las fechas de inicio y finalización.";
    if (values.endsOn < minimumEnd(values.startsOn))
      return "La vigencia debe ser de al menos un mes calendario.";
    if (
      !values.propertyStreetSnapshot.trim() ||
      !values.propertyStreetNumberSnapshot.trim()
    )
      return "Completá la calle y el número de la dirección contractual.";
    if (!location.provinceName || !location.localityName)
      return "Completá la provincia y la localidad de la dirección contractual.";
    return null;
  };

  const validateStepTwo = () => {
    const renters = parties.filter((party) => party.role === "RENTER");
    if (renters.length === 0)
      return "Agregá al menos un inquilino para continuar.";
    if (renters.filter((party) => party.isPrimary).length !== 1)
      return "Elegí exactamente un inquilino como referente principal.";
    return null;
  };

  const payload = () => ({
    propertyId: values.propertyId || null,
    propertyCountryId: values.propertyCountryId || null,
    propertyProvinceId: location.provinceId || null,
    propertyLocalityId: location.localityId || null,
    propertyNeighborhoodId: location.neighborhoodId || null,
    propertyCountrySnapshot: values.propertyCountrySnapshot || "Argentina",
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
      isPrimary: party.isPrimary,
      notificationRoutes: party.notificationRoutes.map(
        ({ channel, contactPointId, isEnabled }) => ({
          channel,
          contactPointId,
          isEnabled,
        }),
      ),
    })),
  });

  const persist = (leaveWizard = false) => {
    const validation = validateDraft();
    if (validation) {
      setError(validation);
      return toast.error(validation);
    }
    setError(null);
    startTransition(async () => {
      const result = contract
        ? await updateRentalContractAction(contract.id, payload())
        : await createRentalContractAction(payload());
      if (!result.ok) {
        setError(result.error);
        return toast.error(result.error);
      }
      setDirty(false);
      toast.success(
        contract ? "Borrador actualizado." : "Contrato creado como borrador.",
      );
      if (leaveWizard) router.push(`/alquileres/${result.value.id}`);
      else if (!contract)
        router.replace(`/alquileres/${result.value.id}/editar?paso=${step}`);
      else router.refresh();
    });
  };

  const next = () => {
    const validation = step === 1 ? validateStepOne() : validateStepTwo();
    if (validation) {
      setError(validation);
      return toast.error(validation);
    }
    setError(null);
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else persist(true);
  };

  const saveParty = (party: RentalPartyDraft) => {
    setParties((current) => {
      const withoutEdited = party.id
        ? current.filter((item) => item.id !== party.id)
        : current;
      const alreadyPrimary = withoutEdited.some(
        (item) => item.role === "RENTER" && item.isPrimary,
      );
      const nextParty = {
        ...party,
        id: party.id ?? `draft-${crypto.randomUUID()}`,
        isPrimary:
          party.role === "RENTER" ? party.isPrimary || !alreadyPrimary : false,
      };
      return party.id
        ? current.map((item) => (item.id === party.id ? nextParty : item))
        : [...current, nextParty];
    });
    setPanel(null);
    markChanged();
  };

  const setPrimary = (partyId?: string) => {
    setParties((current) =>
      current.map((party) => ({
        ...party,
        isPrimary: party.role === "RENTER" && party.id === partyId,
      })),
    );
    markChanged();
  };

  const removeParty = () => {
    if (!removeTarget) return;
    setParties((current) => {
      const next = current.filter((party) => party.id !== removeTarget.id);
      const renters = next.filter((party) => party.role === "RENTER");
      if (removeTarget.isPrimary && renters[0]) {
        return next.map((party) =>
          party.id === renters[0]?.id ? { ...party, isPrimary: true } : party,
        );
      }
      return next;
    });
    setRemoveTarget(null);
    markChanged();
  };

  const refreshContact = (contact: RentalContact) => {
    setParties((current) =>
      current.map((party) =>
        party.contactId === contact.id ? { ...party, contact } : party,
      ),
    );
  };

  const renderPartyColumn = (role: RentalContractPartyRole) => {
    const items = parties.filter((party) => party.role === role);
    const renter = role === "RENTER";
    return (
      <section className="min-h-[360px] rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {renter ? "Inquilinos" : "Propietarios"}
              </h3>
              <Badge variant={renter ? "success" : "neutral"}>
                {renter ? "Requerido" : "Opcional"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {renter
                ? "Debe existir al menos un inquilino en el contrato."
                : "Podés agregar uno o más propietarios."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline-primary"
            disabled={!editable || pending}
            onClick={() => setPanel({ role, party: null })}
          >
            + Agregar {renter ? "inquilino" : "propietario"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((party) => {
            const email = party.contact.contactPoints.find(
              (point) =>
                pointActive(point) && point.type === "EMAIL" && point.isDefault,
            );
            const phone = party.contact.contactPoints.find(
              (point) =>
                pointActive(point) && point.type === "PHONE" && point.isDefault,
            );
            return (
              <article
                key={party.id ?? `${party.role}-${party.contactId}`}
                className="rounded-xl border border-border bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(party.contact.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {party.contact.name}
                      </p>
                      {party.isPrimary ? (
                        <Badge variant="success">Referente principal</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {party.contact.documentNumber
                        ? `${party.contact.documentType ?? "Documento"} ${party.contact.documentNumber}`
                        : "Sin documento informado"}
                    </p>
                    {email ? (
                      <p className="mt-2 truncate text-sm text-muted">
                        ✉ {email.value} {email.isDefault ? "(Principal)" : ""}
                      </p>
                    ) : null}
                    {phone ? (
                      <p className="mt-1 truncate text-sm text-muted">
                        ☎ {phone.value}
                        {phone.canReceiveWhatsapp || phone.canReceiveSms
                          ? ` (${[phone.canReceiveWhatsapp ? "WhatsApp" : null, phone.canReceiveSms ? "SMS" : null].filter(Boolean).join(" · ")})`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  {editable ? (
                    <DropdownMenu
                      ariaLabel={`Acciones de ${party.contact.name}`}
                      trigger={
                        <span className="flex size-8 items-center justify-center rounded-md text-lg text-muted hover:bg-surface-alt">
                          ⋯
                        </span>
                      }
                      items={[
                        ...(renter && !party.isPrimary
                          ? [
                              {
                                id: "primary",
                                label: "Marcar como referente",
                                onSelect: () => setPrimary(party.id),
                              },
                            ]
                          : []),
                        {
                          id: "edit",
                          label: "Editar persona",
                          onSelect: () => setPanel({ role, party }),
                        },
                        {
                          id: "remove",
                          label: "Quitar del contrato",
                          destructive: true,
                          onSelect: () => setRemoveTarget(party),
                        },
                      ]}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
              <p className="font-medium text-foreground">
                {renter ? "Aún no hay inquilinos" : "Aún no hay propietarios"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {renter
                  ? "Agregá al menos uno para poder continuar."
                  : "Podés agregarlos cuando lo necesites."}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const steps = useMemo(
    () => [
      {
        id: "1",
        label: "Información básica",
        description: "Inmueble, dirección y vigencia",
        status: step === 1 ? ("current" as const) : ("completed" as const),
      },
      {
        id: "2",
        label: "Partes",
        description: "Inquilinos y propietarios",
        status: step === 2 ? ("current" as const) : ("pending" as const),
      },
      {
        id: "3",
        label: "Alquiler",
        description: "Valor y actualización",
        status: "pending" as const,
        disabled: true,
      },
      {
        id: "4",
        label: "Obligaciones",
        description: "Servicios e impuestos",
        status: "pending" as const,
        disabled: true,
      },
      {
        id: "5",
        label: "Avisos",
        description: "Destinatarios y contenido",
        status: "pending" as const,
        disabled: true,
      },
    ],
    [step],
  );

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            {contract ? (
              <span>
                Número interno:{" "}
                <strong className="text-foreground">
                  {contract.internalNumber}
                </strong>
              </span>
            ) : (
              <span>El número interno se asignará al guardar el borrador.</span>
            )}
          </div>
          {contract ? (
            <Badge variant="neutral">
              {contract.status === "DRAFT"
                ? "Borrador"
                : contract.status === "ACTIVE"
                  ? "Activo"
                  : contract.status === "ENDED"
                    ? "Finalizado"
                    : "Cancelado"}
            </Badge>
          ) : null}
        </div>
        <Stepper
          items={steps}
          ariaLabel="Pasos del contrato de alquiler"
          onStepChange={(id) => {
            if (id === "1" || (id === "2" && step === 2))
              setStep(Number(id) as 1 | 2);
          }}
        />

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="items-start">
                <div>
                  <CardTitle>Inmueble y vigencia</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Seleccioná el inmueble de referencia y definí el período del
                    contrato.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-7">
                  <FormField>
                    <Label>Inmueble de referencia (opcional)</Label>
                    <SearchCombobox
                      value={propertyOption}
                      onChange={selectProperty}
                      loadOptions={loadProperties}
                      minQueryLength={2}
                      disabled={!editable || pending}
                      placeholder="Buscar por dirección, referencia o propiedad…"
                      searchPlaceholder="Escribí al menos 2 caracteres"
                      loadingMessage="Buscando inmuebles…"
                      emptyMessage="No encontramos inmuebles con esa búsqueda"
                    />
                    <HelperText>
                      Precarga la dirección contractual, que seguirá siendo
                      editable sin modificar la Property.
                    </HelperText>
                  </FormField>
                  <Button
                    type="button"
                    variant="outline-primary"
                    disabled={!editable || pending}
                    onClick={() => selectProperty(null)}
                  >
                    + Continuar sin inmueble registrado
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
                  <FormField>
                    <Label required>Fecha de inicio</Label>
                    <DatePicker
                      value={values.startsOn}
                      disabled={!editable || pending}
                      onChange={(value) => {
                        setField("startsOn", value);
                        if (
                          values.endsOn &&
                          value &&
                          values.endsOn < minimumEnd(value)
                        )
                          setField("endsOn", "");
                      }}
                    />
                  </FormField>
                  <FormField>
                    <Label required>Fecha de finalización</Label>
                    <DatePicker
                      value={values.endsOn}
                      min={minimumEnd(values.startsOn)}
                      disabled={!editable || pending || !values.startsOn}
                      onChange={(value) => setField("endsOn", value)}
                    />
                  </FormField>
                  <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary sm:col-span-2">
                    {duration
                      ? `Duración del contrato: ${duration}`
                      : "La vigencia mínima es de un mes calendario."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="items-start">
                <div>
                  <CardTitle>Dirección contractual</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Dirección real utilizada para administrar este contrato.
                    Argentina es el país implícito.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <FormField className="xl:col-span-2">
                  <Label required>Calle</Label>
                  <Input
                    value={values.propertyStreetSnapshot}
                    disabled={!editable || pending}
                    onChange={(event) =>
                      setField("propertyStreetSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Label required>Número</Label>
                  <Input
                    value={values.propertyStreetNumberSnapshot}
                    disabled={!editable || pending}
                    onChange={(event) =>
                      setField(
                        "propertyStreetNumberSnapshot",
                        event.target.value,
                      )
                    }
                  />
                </FormField>
                <FormField>
                  <Label>Piso</Label>
                  <Input
                    value={values.propertyFloorSnapshot}
                    disabled={!editable || pending}
                    onChange={(event) =>
                      setField("propertyFloorSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Label>Departamento</Label>
                  <Input
                    value={values.propertyUnitSnapshot}
                    disabled={!editable || pending}
                    onChange={(event) =>
                      setField("propertyUnitSnapshot", event.target.value)
                    }
                  />
                </FormField>
                <PropertyLocationFields
                  value={location}
                  disabled={!editable || pending}
                  onChange={(next) => {
                    setLocation(next);
                    markChanged();
                  }}
                />
                <FormField>
                  <Label>Código postal</Label>
                  <Input
                    value={values.propertyPostalCodeSnapshot}
                    disabled={!editable || pending}
                    onChange={(event) =>
                      setField("propertyPostalCodeSnapshot", event.target.value)
                    }
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="items-start">
                <div>
                  <CardTitle>Observaciones del contrato</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Información administrativa, condiciones particulares o
                    referencias útiles.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <FormField>
                  <Label>Observación general</Label>
                  <Textarea
                    value={values.notes}
                    maxLength={500}
                    rows={4}
                    disabled={!editable || pending}
                    placeholder="Ej.: condiciones especiales, referencias internas, notas para la administración…"
                    onChange={(event) => setField("notes", event.target.value)}
                  />
                  <HelperText className="text-right">
                    {values.notes.length} / 500
                  </HelperText>
                </FormField>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader className="items-start">
              <div>
                <CardTitle>Partes del contrato</CardTitle>
                <p className="mt-1 text-sm text-muted">
                  Agregá los inquilinos y, si corresponde, los propietarios.
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {renderPartyColumn("RENTER")}
              {renderPartyColumn("LANDLORD")}
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-border bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step === 1 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  dirty
                    ? setConfirmCancel(true)
                    : router.push("/alquileres/contratos")
                }
              >
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setStep(1)}
              >
                ← Anterior
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              loading={pending}
              disabled={!editable}
              onClick={() => persist(false)}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              loading={pending}
              disabled={!editable}
              onClick={next}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      </div>

      {panel ? (
        <RentalContactPanel
          open
          role={panel.role}
          party={panel.party}
          excludedContactIds={parties
            .filter((party) => party.role === panel.role)
            .map((party) => party.contactId)}
          onClose={() => setPanel(null)}
          onContactUpserted={refreshContact}
          onSaved={saveParty}
        />
      ) : null}
      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setDirty(false);
          router.push("/alquileres/contratos");
        }}
        title="Salir sin guardar"
        description="Los cambios del contrato que todavía no guardaste se perderán."
        confirmLabel="Salir sin guardar"
      />
      <ConfirmModal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeParty}
        title={`Quitar ${removeTarget?.role === "RENTER" ? "inquilino" : "propietario"}`}
        description="La persona dejará de estar asociada al contrato cuando guardes el borrador. No se eliminará de la agenda."
        confirmLabel="Quitar del contrato"
      />
    </>
  );
}
