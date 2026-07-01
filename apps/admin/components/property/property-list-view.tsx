"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@repo/ui/card";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyListFilters } from "@/components/property/property-list-filters";
import { PropertyRowActions } from "@/components/property/property-row-actions";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import type { DashboardAttentionFilter, DashboardFilterSets } from "@/lib/api/types/dashboard";
import type { AdminProperty } from "@/lib/api/types/property";
import type { PropertyPublishabilitySummaryById } from "@/lib/api/types/property-publishability-summary";
import { getPropertyTypeLabel } from "@/lib/format/property-labels";
import {
  countByCommercialStatus,
  filterPropertiesForList,
  PROPERTY_ATTENTION_FILTER_LABELS,
  resolveRowPublicUrl,
  resolveRowStatusVariant,
  type PropertyCommercialFilter,
} from "@/lib/property/property-list";
import type { ActiveListingCountsByPropertyId } from "@/lib/property/active-listing-counts";
import { buildPropertyListHref } from "@/lib/property/property-list-url";

type PropertyListViewProps = {
  properties: AdminProperty[];
  summaryByPropertyId: PropertyPublishabilitySummaryById;
  activeListingCountsByPropertyId?: ActiveListingCountsByPropertyId;
  initialCommercialFilter?: PropertyCommercialFilter;
  initialAttentionFilter?: DashboardAttentionFilter | null;
  attentionFilterSets?: DashboardFilterSets | null;
};

function formatLocation(property: AdminProperty): string {
  return [property.neighborhood, property.city].filter(Boolean).join(", ");
}

function resolveEmptyState(
  commercialFilter: PropertyCommercialFilter,
  searchQuery: string,
  attentionFilter: DashboardAttentionFilter | null,
): { title: string; description: string } {
  if (searchQuery.trim()) {
    return {
      title: "Sin resultados",
      description:
        "No hay propiedades que coincidan con la búsqueda. Probá con otro título, código, ciudad o barrio.",
    };
  }

  if (attentionFilter) {
    return {
      title: PROPERTY_ATTENTION_FILTER_LABELS[attentionFilter],
      description:
        "No hay propiedades en este filtro de atención. Volvé al dashboard o limpiá el filtro.",
    };
  }

  switch (commercialFilter) {
    case "active":
      return {
        title: "Sin propiedades activas",
        description:
          "No hay propiedades activas en este tenant. Creá una nueva o restaurá una archivada.",
      };
    case "published":
      return {
        title: "Sin propiedades publicadas",
        description:
          "No hay propiedades publicadas. Revisá imágenes, precios y publicaciones activas.",
      };
    case "commercial-draft":
      return {
        title: "Sin borradores comerciales",
        description:
          "No hay borradores comerciales. Completá imágenes, precios o publicaciones para avanzar.",
      };
    case "archived":
      return {
        title: "No hay propiedades archivadas",
        description:
          "Las propiedades archivadas dejan de estar activas y no se publican en la web.",
      };
    default:
      return {
        title: "Sin resultados",
        description:
          "No hay propiedades en este filtro. Probá otra categoría o limpiá la búsqueda.",
      };
  }
}

export function PropertyListView({
  properties,
  summaryByPropertyId,
  activeListingCountsByPropertyId = {},
  initialCommercialFilter = "all",
  initialAttentionFilter = null,
  attentionFilterSets = null,
}: PropertyListViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [commercialFilter, setCommercialFilter] =
    useState<PropertyCommercialFilter>(initialCommercialFilter);
  const [attentionFilter, setAttentionFilter] = useState(
    initialAttentionFilter,
  );

  useEffect(() => {
    setCommercialFilter(initialCommercialFilter);
  }, [initialCommercialFilter]);

  useEffect(() => {
    setAttentionFilter(initialAttentionFilter);
  }, [initialAttentionFilter]);

  const counts = useMemo(
    () => countByCommercialStatus(properties, summaryByPropertyId),
    [properties, summaryByPropertyId],
  );

  const filteredProperties = useMemo(
    () =>
      filterPropertiesForList(properties, summaryByPropertyId, {
        searchQuery,
        commercialFilter,
        attentionFilter,
        attentionFilterSets,
      }),
    [
      properties,
      summaryByPropertyId,
      searchQuery,
      commercialFilter,
      attentionFilter,
      attentionFilterSets,
    ],
  );

  const emptyState = resolveEmptyState(
    commercialFilter,
    searchQuery,
    attentionFilter,
  );

  const handleCommercialFilterChange = (value: PropertyCommercialFilter) => {
    setCommercialFilter(value);
    setAttentionFilter(null);
    router.replace(buildPropertyListHref(value), { scroll: false });
  };

  const clearAttentionFilter = () => {
    setAttentionFilter(null);
    router.replace(buildPropertyListHref(commercialFilter), { scroll: false });
  };

  return (
    <div className="space-y-4">
      {attentionFilter ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50/70 px-3 py-2 ring-1 ring-amber-200/80">
          <p className="text-sm text-foreground">
            Filtro de atención:{" "}
            <span className="font-medium">
              {PROPERTY_ATTENTION_FILTER_LABELS[attentionFilter]}
            </span>
          </p>
          <button
            type="button"
            onClick={clearAttentionFilter}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Limpiar filtro
          </button>
        </div>
      ) : null}

      <PropertyListFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        commercialFilter={commercialFilter}
        onCommercialFilterChange={handleCommercialFilterChange}
        counts={counts}
      />

      {filteredProperties.length === 0 ? (
        <PropertyEmptyState
          title={emptyState.title}
          description={emptyState.description}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Propiedad</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Ubicación</th>
                    <th className="px-4 py-3 font-medium">Estado comercial</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property) => {
                    const summary = summaryByPropertyId[property.id];
                    const statusVariant = resolveRowStatusVariant(
                      property,
                      summary,
                    );
                    const publicUrl = resolveRowPublicUrl(property, summary);

                    return (
                      <tr
                        key={property.id}
                        className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <Link
                              href={`/propiedades/${property.id}`}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              {property.title}
                            </Link>
                            {property.internalCode ? (
                              <p className="mt-0.5 text-xs text-muted">
                                {property.internalCode}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {getPropertyTypeLabel(property.propertyType)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatLocation(property) || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <PropertyStatusBadge status={statusVariant} />
                        </td>
                        <td className="px-4 py-3">
                          <PropertyRowActions
                            property={property}
                            publicUrl={publicUrl}
                            activeListingsCount={
                              activeListingCountsByPropertyId[property.id] ?? 0
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted">
            Mostrando {filteredProperties.length} de {properties.length}{" "}
            {properties.length === 1 ? "propiedad" : "propiedades"}.
            {commercialFilter !== "all" ||
            searchQuery.trim() ||
            attentionFilter
              ? " Filtros aplicados en el navegador."
              : null}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
