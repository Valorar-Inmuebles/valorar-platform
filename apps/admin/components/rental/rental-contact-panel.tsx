"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { ConfirmModal } from "@repo/ui/modal";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { SearchCombobox } from "@repo/ui/search-combobox";
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
import { TabPanel, Tabs } from "@repo/ui/tabs";
import { useToast } from "@repo/ui/toast";
import {
  addRentalContactPointAction,
  createRentalContactAction,
  getRentalContactAction,
  markRentalContactPointDefaultAction,
  searchRentalContactsAction,
  updateRentalContactAction,
  updateRentalContactPointAction,
} from "@/lib/api/rental-actions";
import type {
  ContactDocumentType,
  ContactPointType,
  RentalContact,
  RentalContactSearchItem,
  RentalContractNotificationRoute,
  RentalContractPartyRole,
} from "@/lib/api/types/rental";

export type RentalPartyDraft = {
  id?: string;
  contactId: string;
  role: RentalContractPartyRole;
  isPrimary: boolean;
  contact: RentalContact | RentalContactSearchItem;
  notificationRoutes: RentalContractNotificationRoute[];
};

type PointDraft = {
  key: string;
  id?: string;
  type: ContactPointType;
  value: string;
  label: string;
  isDefault: boolean;
  isActive: boolean;
  canReceiveSms: boolean;
  canReceiveWhatsapp: boolean;
};

const documentOptions = [
  { value: "", label: "Sin especificar" },
  { value: "DNI", label: "DNI" },
  { value: "CUIT", label: "CUIT" },
  { value: "CUIL", label: "CUIL" },
  { value: "PASSPORT", label: "Pasaporte" },
];

function pointKey() {
  return `point-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function contactPoints(
  contact?: RentalContact | RentalContactSearchItem | null,
): PointDraft[] {
  if (!contact) return [];
  return contact.contactPoints.map((point) => ({
    key: point.id,
    id: point.id,
    type: point.type,
    value: point.value,
    label: point.label ?? "",
    isDefault: point.isDefault,
    isActive: "isActive" in point ? point.isActive : true,
    canReceiveSms: point.canReceiveSms,
    canReceiveWhatsapp: point.canReceiveWhatsapp,
  }));
}

function primaryPoint(points: PointDraft[], type: ContactPointType) {
  return points.find(
    (point) => point.type === type && point.isActive && point.isDefault,
  );
}

function ContactPointEditor({
  points,
  disabled,
  onChange,
}: {
  points: PointDraft[];
  disabled: boolean;
  onChange: (points: PointDraft[]) => void;
}) {
  const update = (key: string, patch: Partial<PointDraft>) =>
    onChange(
      points.map((point) =>
        point.key === key ? { ...point, ...patch } : point,
      ),
    );

  const setPrimary = (key: string, type: ContactPointType) =>
    onChange(
      points.map((point) => ({
        ...point,
        isDefault:
          point.type === type && point.isActive
            ? point.key === key
            : point.isDefault,
      })),
    );

  const add = (type: ContactPointType) => {
    const hasActive = points.some(
      (point) => point.type === type && point.isActive,
    );
    onChange([
      ...points,
      {
        key: pointKey(),
        type,
        value: "",
        label: "",
        isDefault: !hasActive,
        isActive: true,
        canReceiveSms: false,
        canReceiveWhatsapp: type === "PHONE",
      },
    ]);
  };

  const remove = (point: PointDraft) => {
    const next = point.id
      ? points.map((item) =>
          item.key === point.key
            ? { ...item, isActive: false, isDefault: false }
            : item,
        )
      : points.filter((item) => item.key !== point.key);
    const sameType = next.filter(
      (item) => item.type === point.type && item.isActive,
    );
    if (sameType.length && !primaryPoint(next, point.type)) {
      const first = sameType[0];
      onChange(
        next.map((item) =>
          item.key === first?.key ? { ...item, isDefault: true } : item,
        ),
      );
    } else onChange(next);
  };

  return (
    <div className="space-y-5">
      {(["EMAIL", "PHONE"] as ContactPointType[]).map((type) => {
        const items = points.filter((point) => point.type === type);
        return (
          <section key={type} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {type === "EMAIL" ? "Emails" : "Teléfonos"}
                </h4>
                <HelperText>
                  Podés cargar varios y elegir uno principal.
                </HelperText>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => add(type)}
              >
                Agregar
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                No hay {type === "EMAIL" ? "emails" : "teléfonos"} cargados.
              </p>
            ) : null}
            {items.map((point) => (
              <div
                key={point.key}
                className="space-y-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <Input
                    type={type === "EMAIL" ? "email" : "tel"}
                    value={point.value}
                    disabled={disabled || !point.isActive}
                    placeholder={
                      type === "EMAIL" ? "persona@email.com" : "+54 9 11…"
                    }
                    aria-label={type === "EMAIL" ? "Email" : "Teléfono"}
                    onChange={(event) =>
                      update(point.key, { value: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                      point.isActive
                        ? remove(point)
                        : update(point.key, {
                            isActive: true,
                            isDefault: !primaryPoint(points, type),
                          })
                    }
                  >
                    {point.isActive ? "Quitar" : "Reactivar"}
                  </Button>
                </div>
                {point.isActive ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <Switch
                      label="Principal"
                      checked={point.isDefault}
                      disabled={disabled}
                      onChange={() => setPrimary(point.key, type)}
                    />
                    {type === "PHONE" ? (
                      <>
                        <Switch
                          label="WhatsApp"
                          checked={point.canReceiveWhatsapp}
                          disabled={disabled}
                          onChange={(checked) =>
                            update(point.key, { canReceiveWhatsapp: checked })
                          }
                        />
                        <Switch
                          label="SMS"
                          checked={point.canReceiveSms}
                          disabled={disabled}
                          onChange={(checked) =>
                            update(point.key, { canReceiveSms: checked })
                          }
                        />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <Badge variant="neutral">Desactivado</Badge>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function RentalContactPanel({
  open,
  role,
  party,
  excludedContactIds,
  onClose,
  onContactUpserted,
  onSaved,
}: {
  open: boolean;
  role: RentalContractPartyRole;
  party: RentalPartyDraft | null;
  excludedContactIds: string[];
  onClose: () => void;
  onContactUpserted: (contact: RentalContact) => void;
  onSaved: (party: RentalPartyDraft) => void;
}) {
  const { toast } = useToast();
  const cache = useRef(new Map<string, RentalContactSearchItem>());
  const [tab, setTab] = useState("existing");
  const [selected, setSelected] = useState<
    RentalContact | RentalContactSearchItem | null
  >(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState<ContactDocumentType | "">(
    "",
  );
  const [documentNumber, setDocumentNumber] = useState("");
  const [points, setPoints] = useState<PointDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pending, startTransition] = useTransition();

  const roleLabel = role === "RENTER" ? "inquilino" : "propietario";

  const resetPerson = (
    contact?: RentalContact | RentalContactSearchItem | null,
  ) => {
    setName(contact?.name ?? "");
    setDocumentType(contact?.documentType ?? "");
    setDocumentNumber(contact?.documentNumber ?? "");
    setPoints(contactPoints(contact));
    setDirty(false);
  };

  useEffect(() => {
    if (!open) return;
    setTab("existing");
    setSelected(party?.contact ?? null);
    setEditing(false);
    resetPerson(null);
  }, [open, party]);

  const loadOptions = async (query: string) => {
    const result = await searchRentalContactsAction(query);
    if (!result.ok) throw new Error(result.error);
    result.value.items.forEach((contact) =>
      cache.current.set(contact.id, contact),
    );
    return result.value.items.map((contact) => ({
      value: contact.id,
      label: contact.name,
      description: [
        contact.documentNumber
          ? `${contact.documentType ?? "Documento"} ${contact.documentNumber}`
          : null,
        contact.contactPoints.find((point) => point.isDefault)?.value,
        contact.isActive ? null : "Inactiva",
      ]
        .filter(Boolean)
        .join(" · "),
      disabled:
        excludedContactIds.includes(contact.id) &&
        contact.id !== party?.contactId,
    }));
  };

  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

  const editExisting = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await getRentalContactAction(selected.id);
      if (!result.ok) return toast.error(result.error);
      setSelected(result.value);
      resetPerson(result.value);
      setEditing(true);
    });
  };

  const validatePerson = () => {
    if (!name.trim()) return "Ingresá el nombre de la persona.";
    if (Boolean(documentType) !== Boolean(documentNumber.trim()))
      return "Completá tipo y número de documento, o dejá ambos vacíos.";
    if (points.some((point) => point.isActive && !point.value.trim()))
      return "Completá o quitá los medios de contacto vacíos.";
    const active = points.filter(
      (point) => point.isActive && point.value.trim(),
    );
    for (const type of ["EMAIL", "PHONE"] as ContactPointType[]) {
      const typed = active.filter((point) => point.type === type);
      if (typed.length && typed.filter((point) => point.isDefault).length !== 1)
        return `Elegí exactamente un ${type === "EMAIL" ? "email" : "teléfono"} principal.`;
    }
    return null;
  };

  const savePerson = () => {
    const validation = validatePerson();
    if (validation) return toast.error(validation);
    startTransition(async () => {
      if (!editing) {
        const result = await createRentalContactAction({
          name: name.trim(),
          documentType: documentType || undefined,
          documentNumber: documentNumber.trim() || undefined,
          contactPoints: points
            .filter((point) => point.isActive && point.value.trim())
            .map((point) => ({
              type: point.type,
              value: point.value.trim(),
              label: point.label || undefined,
              isDefault: point.isDefault,
              canReceiveSms: point.type === "PHONE" && point.canReceiveSms,
              canReceiveWhatsapp:
                point.type === "PHONE" && point.canReceiveWhatsapp,
            })),
        });
        if (!result.ok) return toast.error(result.error);
        setSelected(result.value);
        onContactUpserted(result.value);
        setDirty(false);
        setEditing(false);
        setTab("existing");
        toast.success("Persona creada.");
        return;
      }
      if (!selected) return;
      const contactResult = await updateRentalContactAction(selected.id, {
        name: name.trim(),
        documentType: documentType || undefined,
        documentNumber: documentNumber.trim() || undefined,
      });
      if (!contactResult.ok) return toast.error(contactResult.error);

      const ordered = [...points].sort(
        (a, b) => Number(a.isDefault) - Number(b.isDefault),
      );
      const ids = new Map<string, string>();
      for (const point of ordered) {
        if (point.id) {
          const result = await updateRentalContactPointAction(
            selected.id,
            point.id,
            {
              value: point.value.trim(),
              label: point.label || undefined,
              isDefault: point.isDefault,
              isActive: point.isActive,
              canReceiveSms: point.type === "PHONE" && point.canReceiveSms,
              canReceiveWhatsapp:
                point.type === "PHONE" && point.canReceiveWhatsapp,
            },
          );
          if (!result.ok) return toast.error(result.error);
          ids.set(point.key, result.value.id);
        } else if (point.isActive && point.value.trim()) {
          const result = await addRentalContactPointAction(selected.id, {
            type: point.type,
            value: point.value.trim(),
            label: point.label || undefined,
            isDefault: false,
            canReceiveSms: point.type === "PHONE" && point.canReceiveSms,
            canReceiveWhatsapp:
              point.type === "PHONE" && point.canReceiveWhatsapp,
          });
          if (!result.ok) return toast.error(result.error);
          ids.set(point.key, result.value.id);
        }
      }
      for (const point of points.filter(
        (item) => item.isActive && item.isDefault,
      )) {
        const id = ids.get(point.key) ?? point.id;
        if (!id) continue;
        const result = await markRentalContactPointDefaultAction(
          selected.id,
          id,
        );
        if (!result.ok) return toast.error(result.error);
      }
      const refreshed = await getRentalContactAction(selected.id);
      if (!refreshed.ok) return toast.error(refreshed.error);
      setSelected(refreshed.value);
      onContactUpserted(refreshed.value);
      setDirty(false);
      setEditing(false);
      toast.success("Datos de la persona actualizados.");
    });
  };

  const addParty = () => {
    if (!selected) return toast.error("Seleccioná o creá una persona.");
    onSaved({
      id: party?.id,
      contactId: selected.id,
      role,
      isPrimary: party?.isPrimary ?? false,
      contact: selected,
      notificationRoutes: party?.notificationRoutes ?? [],
    });
    setDirty(false);
    onClose();
  };

  const renderPersonForm = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField className="sm:col-span-2">
          <Label required>Nombre completo</Label>
          <Input
            value={name}
            disabled={pending}
            onChange={(event) => {
              setName(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <FormField>
          <Label>Tipo de documento</Label>
          <Select
            value={documentType}
            options={documentOptions}
            disabled={pending}
            onChange={(value) => {
              setDocumentType(value as ContactDocumentType | "");
              setDirty(true);
            }}
          />
        </FormField>
        <FormField>
          <Label>Número de documento</Label>
          <Input
            value={documentNumber}
            disabled={pending}
            onChange={(event) => {
              setDocumentNumber(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
      </div>
      <ContactPointEditor
        points={points}
        disabled={pending}
        onChange={(value) => {
          setPoints(value);
          setDirty(true);
        }}
      />
      <Button type="button" loading={pending} onClick={savePerson}>
        {editing ? "Guardar cambios" : "Crear persona"}
      </Button>
    </div>
  );

  return (
    <>
      <SidePanel
        open={open}
        onClose={requestClose}
        closeOnOverlay={!dirty}
        width="lg"
      >
        <SidePanelHeader>
          <SidePanelTitle>
            {party ? "Editar" : "Agregar"} {roleLabel}
          </SidePanelTitle>
          <SidePanelDescription>
            Buscá una persona existente o creá una nueva.
          </SidePanelDescription>
        </SidePanelHeader>
        <SidePanelContent className="space-y-5">
          <Tabs
            id="rental-person-tabs"
            ariaLabel="Origen de la persona"
            value={tab}
            items={[
              { value: "existing", label: "Buscar existente" },
              { value: "new", label: "Nueva persona" },
            ]}
            onChange={(value) => {
              if (dirty) return setConfirmClose(true);
              setTab(value);
              setEditing(false);
              if (value === "new") {
                setSelected(null);
                resetPerson(null);
              }
            }}
          />
          <TabPanel
            tabsId="rental-person-tabs"
            index={0}
            value={tab}
            tabValue="existing"
            className="space-y-5 pt-1"
          >
            {!editing ? (
              <>
                <FormField>
                  <Label>Buscar persona</Label>
                  <SearchCombobox
                    value={
                      selected
                        ? { value: selected.id, label: selected.name }
                        : null
                    }
                    onChange={(option) =>
                      setSelected(
                        option
                          ? (cache.current.get(option.value) ?? null)
                          : null,
                      )
                    }
                    loadOptions={loadOptions}
                    minQueryLength={2}
                    placeholder="Nombre, DNI, CUIT, CUIL, email o teléfono…"
                    searchPlaceholder="Escribí al menos 2 caracteres"
                    emptyMessage="No encontramos personas con esa búsqueda"
                    loadingMessage="Buscando personas…"
                  />
                  <HelperText>No cargamos toda la agenda al abrir.</HelperText>
                </FormField>
                {selected ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                    <p className="font-semibold text-foreground">
                      {selected.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {selected.documentNumber
                        ? `${selected.documentType ?? "Documento"} ${selected.documentNumber}`
                        : "Sin documento informado"}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {selected.contactPoints
                        .map((point) => point.value)
                        .join(" · ") || "Sin medios de contacto"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-3"
                      loading={pending}
                      onClick={editExisting}
                    >
                      Administrar datos de contacto
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="font-medium text-foreground">
                      ¿No encontrás la persona?
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Podés crearla con sus datos y medios de contacto.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={() => {
                        setTab("new");
                        resetPerson(null);
                      }}
                    >
                      Crear nueva persona
                    </Button>
                  </div>
                )}
              </>
            ) : (
              renderPersonForm()
            )}
          </TabPanel>
          <TabPanel
            tabsId="rental-person-tabs"
            index={1}
            value={tab}
            tabValue="new"
            className="pt-1"
          >
            {renderPersonForm()}
          </TabPanel>
        </SidePanelContent>
        <SidePanelFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={requestClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selected || editing || tab !== "existing"}
            onClick={addParty}
          >
            Agregar como {roleLabel}
          </Button>
        </SidePanelFooter>
      </SidePanel>
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          setDirty(false);
          onClose();
        }}
        title="Descartar cambios de la persona"
        description="Los datos que todavía no guardaste se perderán."
        confirmLabel="Descartar cambios"
      />
    </>
  );
}
