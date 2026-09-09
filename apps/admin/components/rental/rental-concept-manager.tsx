"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
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
  const [isPending, startTransition] = useTransition();

  const create = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createRentalConceptAction({ name, slug });
      if (!result.ok) return toast.error(result.error);
      setConcepts((current) => [...current, result.value]);
      setName("");
      setSlug("");
      toast.success("Concepto personalizado creado.");
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
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo del tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{concept.name}</p>
                <p className="text-xs text-muted">
                  {concept.slug}
                  {concept.systemCode
                    ? ` · ${concept.systemCode}`
                    : " · Personalizado"}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
      <Card>
        <CardHeader>
          <CardTitle>Nuevo concepto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <FormField>
              <Label required>Nombre</Label>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSlug(slugify(event.target.value));
                }}
              />
            </FormField>
            <FormField>
              <Label required>Slug</Label>
              <Input
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
              />
            </FormField>
            <Button
              type="submit"
              loading={isPending}
              disabled={!name.trim() || !slug}
            >
              Crear concepto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
