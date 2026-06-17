"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { ErrorMessage } from "@repo/ui/form-field";
import { useToast } from "@repo/ui/toast";
import { replacePropertyFeatureAssignmentsAction } from "@/lib/api/property-feature-actions";
import type {
  AdminPropertyFeature,
  AdminPropertyFeatureAssignment,
} from "@/lib/api/types/property-feature";
import {
  FEATURE_CATEGORY_ORDER,
  getFeatureCategoryLabel,
} from "@/lib/format/feature-labels";
import { cn } from "@/lib/cn";

type PropertyFeatureManagerProps = {
  propertyId: string;
  catalog: AdminPropertyFeature[];
  assignments: AdminPropertyFeatureAssignment[];
};

function groupFeaturesByCategory(catalog: AdminPropertyFeature[]) {
  return FEATURE_CATEGORY_ORDER.map((category) => ({
    category,
    label: getFeatureCategoryLabel(category),
    items: catalog.filter((feature) => feature.category === category),
  })).filter((group) => group.items.length > 0);
}

export function PropertyFeatureManager({
  propertyId,
  catalog,
  assignments,
}: PropertyFeatureManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(assignments.map((assignment) => assignment.featureId)),
  );

  const assignmentSignature = assignments
    .map((assignment) => assignment.featureId)
    .sort()
    .join(",");

  useEffect(() => {
    setSelectedIds(
      new Set(assignments.map((assignment) => assignment.featureId)),
    );
    setSuccessMessage(null);
    setError(null);
  }, [assignmentSignature, assignments]);

  const groups = useMemo(() => groupFeaturesByCategory(catalog), [catalog]);
  const selectedCount = selectedIds.size;
  const isDirty = useMemo(() => {
    const initial = new Set(assignments.map((a) => a.featureId));
    if (initial.size !== selectedIds.size) return true;
    for (const id of selectedIds) {
      if (!initial.has(id)) return true;
    }
    return false;
  }, [assignments, selectedIds]);

  const toggleFeature = (featureId: string) => {
    setSuccessMessage(null);
    setError(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const handleSave = () => {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await replacePropertyFeatureAssignmentsAction(propertyId, {
        features: Array.from(selectedIds).map((featureId) => ({ featureId })),
      });

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSuccessMessage("Características guardadas correctamente.");
      toast.success("Características guardadas correctamente.");
      router.refresh();
    });
  };

  if (catalog.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted">
          No hay características disponibles en el catálogo. Ejecutá el seed de
          desarrollo para cargar el catálogo global.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {selectedCount === 0
            ? "Ninguna característica seleccionada"
            : `${selectedCount} característica${selectedCount === 1 ? "" : "s"} seleccionada${selectedCount === 1 ? "" : "s"}`}
        </p>
        <Button
          onClick={handleSave}
          loading={isPending}
          disabled={!isDirty || isPending}
        >
          {isPending ? "Guardando…" : "Guardar características"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      ) : null}

      {successMessage && !isDirty ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <FeatureCategoryCard
            key={group.category}
            label={group.label}
            features={group.items}
            selectedIds={selectedIds}
            onToggle={toggleFeature}
            disabled={isPending}
          />
        ))}
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          onClick={handleSave}
          loading={isPending}
          disabled={!isDirty || isPending}
        >
          {isPending ? "Guardando…" : "Guardar características"}
        </Button>
      </div>
    </div>
  );
}

type FeatureCategoryCardProps = {
  label: string;
  features: AdminPropertyFeature[];
  selectedIds: Set<string>;
  onToggle: (featureId: string) => void;
  disabled: boolean;
};

function FeatureCategoryCard({
  label,
  features,
  selectedIds,
  onToggle,
  disabled,
}: FeatureCategoryCardProps) {
  const selectedInGroup = features.filter((feature) =>
    selectedIds.has(feature.id),
  ).length;

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1 border-b-0 pb-0">
        <CardTitle className="text-base">{label}</CardTitle>
        <p className="text-sm text-muted">
          {selectedInGroup} de {features.length} seleccionadas
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const checked = selectedIds.has(feature.id);

            return (
              <li key={feature.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border bg-white text-foreground hover:border-primary/20 hover:bg-slate-50",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(feature.id)}
                  />
                  <span className="font-medium">{feature.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
