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
import { replaceDevelopmentTypologyFeatureAssignmentsAction } from "@/lib/api/development-typology-feature-actions";
import type { AdminPropertyFeature } from "@/lib/api/types/property-feature";
import type { AdminDevelopmentTypologyFeatureAssignment } from "@/lib/api/types/development-typology-feature";
import {
  TYPOLOGY_FEATURE_CATEGORIES,
  TYPOLOGY_FEATURE_CATEGORY_ORDER,
} from "@/lib/development/feature-categories";
import {
  compareTypologyFeatureSlugs,
  isAllowedTypologyFeatureSlug,
} from "@/lib/development/typology-feature-slugs";
import { getFeatureCategoryLabel } from "@/lib/format/feature-labels";
import { cn } from "@/lib/cn";

type DevelopmentTypologyFeatureManagerProps = {
  typologyId: string;
  developmentId: string;
  catalog: AdminPropertyFeature[];
  assignments: AdminDevelopmentTypologyFeatureAssignment[];
};

function groupTypologyFeatures(catalog: AdminPropertyFeature[]) {
  const roomCatalog = catalog.filter(
    (feature) =>
      TYPOLOGY_FEATURE_CATEGORIES.includes(feature.category) &&
      isAllowedTypologyFeatureSlug(feature.slug),
  );

  return TYPOLOGY_FEATURE_CATEGORY_ORDER.map((category) => ({
    category,
    label: getFeatureCategoryLabel(category),
    items: roomCatalog
      .filter((feature) => feature.category === category)
      .sort((a, b) => compareTypologyFeatureSlugs(a.slug, b.slug)),
  })).filter((group) => group.items.length > 0);
}

export function DevelopmentTypologyFeatureManager({
  typologyId,
  developmentId,
  catalog,
  assignments,
}: DevelopmentTypologyFeatureManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(assignments.map((a) => a.featureId)),
  );

  const assignmentSignature = assignments
    .map((a) => a.featureId)
    .sort()
    .join(",");

  useEffect(() => {
    setSelectedIds(new Set(assignments.map((a) => a.featureId)));
    setError(null);
  }, [assignmentSignature, assignments]);

  const groups = useMemo(() => groupTypologyFeatures(catalog), [catalog]);

  const isDirty = useMemo(() => {
    const initial = new Set(assignments.map((a) => a.featureId));
    if (initial.size !== selectedIds.size) return true;
    for (const id of selectedIds) {
      if (!initial.has(id)) return true;
    }
    return false;
  }, [assignments, selectedIds]);

  const toggleFeature = (featureId: string) => {
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

    startTransition(async () => {
      const result = await replaceDevelopmentTypologyFeatureAssignmentsAction(
        typologyId,
        {
          features: Array.from(selectedIds).map((featureId) => ({ featureId })),
        },
        developmentId,
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Características de la unidad guardadas.");
      router.refresh();
    });
  };

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay características de ambientes disponibles en el catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Características de la unidad
          </h3>
          <p className="text-sm text-muted">
            Configuración de la unidad (baños, ambientes, etc.).
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSave}
          loading={isPending}
          disabled={!isDirty || isPending}
        >
          Guardar características
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      ) : null}

      {groups.map((group) => (
        <Card key={group.category}>
          <CardHeader className="flex-col items-start gap-1 border-b-0 pb-0">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((feature) => {
                const checked = selectedIds.has(feature.id);

                return (
                  <li key={feature.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        checked
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-white hover:border-primary/20 hover:bg-slate-50",
                        isPending && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary"
                        checked={checked}
                        disabled={isPending}
                        onChange={() => toggleFeature(feature.id)}
                      />
                      <span className="font-medium">{feature.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
