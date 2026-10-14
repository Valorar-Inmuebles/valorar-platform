"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { useToast } from "@repo/ui/toast";
import {
  createRentalConceptAction,
  setRentalConceptActiveAction,
} from "@/lib/api/rental-actions";
import type { RentalConcept } from "@/lib/api/types/rental";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function RentalConceptManager({
  initialConcepts,
}: {
  initialConcepts: RentalConcept[];
}) {
  const { toast } = useToast();
  const [concepts, setConcepts] = useState(initialConcepts);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);
  const closePanel = () => {
    if (submitting.current) return;
    setPanelOpen(false);
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await createRentalConceptAction({ name, slug });
        if (!result.ok) return toast.error(result.error);
        setConcepts((current) => [...current, result.value]);
        submitting.current = false;
        closePanel();
        setName("");
        setSlug("");
        toast.success("Concepto personalizado creado.");
      } catch {
        toast.error("No se pudo crear el concepto. Intentá nuevamente.");
      } finally {
        submitting.current = false;
      }
    });
  };

  const toggle = (concept: RentalConcept) => {
    startTransition(async () => {
      const result = await setRentalConceptActiveAction(
        concept.id,
        !concept.isActive,
      );
      if (!result.ok) return toast.error(result.error);
      setConcepts((current) =>
        current.map((item) => (item.id === concept.id ? result.value : item)),
      );
      toast.success(
        result.value.isActive ? "Concepto activado." : "Concepto desactivado.",
      );
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-wrap">
          <CardTitle>Catálogo de conceptos</CardTitle>
          <Button type="button" size="sm" onClick={() => setPanelOpen(true)}>
            Agregar concepto
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {concepts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no hay conceptos. Agregá el primero para comenzar.
            </p>
          ) : null}
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <p className="min-w-0 break-words text-sm font-medium">
                {concept.name}
              </p>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Badge variant={concept.isActive ? "success" : "neutral"}>
                  {concept.isActive ? "Activo" : "Inactivo"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggle(concept)}
                  disabled={isPending}
                >
                  {concept.isActive ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <SidePanel
        open={panelOpen}
        onClose={closePanel}
        width="sm"
        closeOnOverlay={!isPending}
      >
        <SidePanelHeader>
          <SidePanelTitle>Agregar concepto</SidePanelTitle>
          <SidePanelDescription>
            Creá un concepto para las obligaciones de alquiler.
          </SidePanelDescription>
        </SidePanelHeader>
        <SidePanelContent>
          <form
            id="create-rental-concept"
            onSubmit={create}
            className="space-y-4"
          >
            <FormField>
              <Label htmlFor="concept-name" required>
                Nombre
              </Label>
              <Input
                id="concept-name"
                value={name}
                required
                maxLength={120}
                disabled={isPending}
                onChange={(event) => {
                  setName(event.target.value);
                  setSlug(slugify(event.target.value));
                }}
              />
            </FormField>
            <FormField>
              <Label htmlFor="concept-slug" required>
                Slug
              </Label>
              <Input
                id="concept-slug"
                value={slug}
                required
                minLength={2}
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                disabled={isPending}
                onChange={(event) => setSlug(slugify(event.target.value))}
              />
            </FormField>
          </form>
        </SidePanelContent>
        <SidePanelFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={closePanel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-rental-concept"
            loading={isPending}
            disabled={isPending || !name.trim() || slug.length < 2}
          >
            Crear concepto
          </Button>
        </SidePanelFooter>
      </SidePanel>
    </>
  );
}
